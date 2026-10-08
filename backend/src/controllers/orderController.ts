import { Response } from 'express';
import mongoose from 'mongoose';

import { AuthRequest } from '../middleware/auth';
import Order from '../models/Order';
import Product from '../models/Product';
import Cart from '../models/Cart';
import { getIO } from '../sockets/server';
import { sendNotification } from './notificationController';
import { recordProductInteraction } from '../services/recentlyViewedService';
import { ActivityType } from '../models/ProductActivity';

interface CheckoutItem {
  productId: string;
  quantity: number;
  price?: number;
  size?: string;
  color?: string;
}

const normalizeVariant = (
  value?: string
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
};

const variantsMatch = (
  item: {
    size?: string;
    color?: string;
  },
  size?: string,
  color?: string
): boolean => {
  return (
    (item.size ?? undefined) === (size ?? undefined) &&
    (item.color ?? undefined) === (color ?? undefined)
  );
};

const getProductVariantData = (
  product: unknown
): {
  sizes: string[];
  colors: string[];
} => {
  const productData = product as {
    sizes?: unknown;
    colors?: unknown;
  };

  return {
    sizes: Array.isArray(productData.sizes)
      ? productData.sizes.filter(
          (value): value is string =>
            typeof value === 'string'
        )
      : [],

    colors: Array.isArray(productData.colors)
      ? productData.colors.filter(
          (value): value is string =>
            typeof value === 'string'
        )
      : [],
  };
};

export const createOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({
      message: 'Authentication required',
    });
    return;
  }

  const { items } = req.body;

  if (req.body?.paymentMethod && req.body.paymentMethod !== 'CASH_ON_DELIVERY') {
    res.status(400).json({ message: 'Use the secure payment checkout for online payments' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      message: 'Order items are required',
    });
    return;
  }

  const userId = new mongoose.Types.ObjectId(req.userId);

  const session = await mongoose.startSession();

  try {
    let createdOrderId: mongoose.Types.ObjectId | null = null;

    await session.withTransaction(async () => {
      /*
       * Load the user's current cart inside the transaction.
       * The cart is the source of truth for checkout.
       */
      const cart = await Cart.findOne({
        userId,
      }).session(session);

      if (!cart || cart.items.length === 0) {
        throw new Error('Your cart is empty');
      }

      /*
       * Only active cart items can be checked out.
       */
      const activeCartItems = cart.items.filter(
        (item) => !item.savedForLater
      );

      if (activeCartItems.length === 0) {
        throw new Error(
          'Your cart has no items available for checkout'
        );
      }

      /*
       * Validate the request against the actual cart.
       */
      const checkoutItems =
        items as CheckoutItem[];

      const orderItems: {
        productId: mongoose.Types.ObjectId;
        quantity: number;
        price: number;
        size?: string;
        color?: string;
      }[] = [];

      let totalAmount = 0;

      for (const requestedItem of checkoutItems) {
        const {
          productId,
          quantity,
        } = requestedItem;

        const normalizedSize =
          normalizeVariant(requestedItem.size);

        const normalizedColor =
          normalizeVariant(requestedItem.color);

        if (
          !productId ||
          !Number.isInteger(quantity) ||
          quantity < 1
        ) {
          throw new Error(
            'Each item requires productId and valid quantity'
          );
        }

        if (
          !mongoose.Types.ObjectId.isValid(
            productId
          )
        ) {
          throw new Error(
            `Invalid productId: ${productId}`
          );
        }

        /*
         * Find the exact variant in the cart.
         * This prevents checking out an arbitrary
         * quantity/product that isn't actually in
         * the user's cart.
         */
        const cartItem = activeCartItems.find(
          (item) =>
            item.productId.toString() ===
              productId &&
            variantsMatch(
              item,
              normalizedSize,
              normalizedColor
            )
        );

        if (!cartItem) {
          throw new Error(
            `Product ${productId} is not available in your cart`
          );
        }

        if (quantity !== cartItem.quantity) {
          throw new Error(
            `Cart quantity changed for product ${productId}. Please refresh your cart.`
          );
        }

        /*
         * Read the latest product information.
         */
        const product =
          await Product.findById(
            productId
          )
            .session(session)
            .lean();

        /*
         * Product no longer exists.
         */
        if (!product) {
          throw new Error(
            `Product ${productId} is no longer available`
          );
        }

        /*
         * Validate selected variants again.
         */
        const {
  sizes,
  colors,
} = getProductVariantData(product);

if (
  normalizedSize &&
  sizes.length > 0 &&
  !sizes.includes(normalizedSize)
) {
  throw new Error(
    `${product.name}: selected size ${normalizedSize} is no longer available`
  );
}

if (
  normalizedColor &&
  colors.length > 0 &&
  !colors.includes(normalizedColor)
) {
  throw new Error(
    `${product.name}: selected color ${normalizedColor} is no longer available`
  );
}

        /*
         * Detect price changes.
         *
         * The frontend sends the current cart items,
         * while the backend compares against the
         * latest database price.
         *
         * If the frontend supplied a price, use it
         * only for change detection. The backend
         * always uses the database price for the
         * final order.
         */
        const clientPrice =
          typeof requestedItem.price === 'number'
            ? requestedItem.price
            : undefined;

        if (
          clientPrice !== undefined &&
          clientPrice !== product.price
        ) {
          throw new Error(
            `${product.name}: price has changed from ₹${clientPrice} to ₹${product.price}. Please review your cart.`
          );
        }

        /*
         * Final stock validation.
         */
        if (product.stock < quantity) {
          throw new Error(
            `${product.name}: only ${product.stock} item(s) available in stock`
          );
        }

        totalAmount +=
          product.price * quantity;

        orderItems.push({
          productId:
            new mongoose.Types.ObjectId(
              productId
            ),
          quantity,
          price: product.price,
          size: normalizedSize,
          color: normalizedColor,
        });
      }

      /*
       * Make sure the request did not omit any
       * active cart items.
       */
      if (
        orderItems.length !==
        activeCartItems.length
      ) {
        throw new Error(
          'Cart changed. Please refresh your cart and try again.'
        );
      }

      /*
       * Atomically decrement stock.
       *
       * The stock condition prevents another
       * simultaneous checkout from taking stock
       * below zero.
       */
      for (const item of orderItems) {
        const updatedProduct =
          await Product.findOneAndUpdate(
            {
              _id: item.productId,
              stock: {
                $gte: item.quantity,
              },
            },
            {
              $inc: {
                stock: -item.quantity,
                salesCount: item.quantity,
              },
            },
            {
              session,
              new: true,
            }
          );

        if (!updatedProduct) {
          throw new Error(
            `Stock changed for product ${item.productId}. Please review your cart and try again.`
          );
        }
      }

      /*
       * Create the order only after all validation
       * and stock updates are successful.
       */
      const [order] = await Order.create(
        [
          {
            userId,
            items: orderItems,
            totalAmount,
            paymentMethod: 'CASH_ON_DELIVERY',
            paymentStatus: 'PENDING',
            invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            status: 'PROCESSING',
            deliveryTimeline: [{ status: 'PROCESSING', note: 'Order placed and confirmed', at: new Date() }],
          },
        ],
        {
          session,
        }
      );

      createdOrderId = order._id;

      /*
       * Remove only purchased items from the cart.
       *
       * Saved-for-later items remain.
       */
      cart.items = cart.items.filter(
        (item) => item.savedForLater
      );

      await cart.save({
        session,
      });
    });

    getIO().to(`user:${userId.toString()}`).emit('cartUpdated');
    await sendNotification(userId.toString(), 'order', 'Order confirmed', 'Your order has been placed successfully.');

    /*
     * Return the committed order.
     */
    const order = createdOrderId
      ? await Order.findById(createdOrderId)
          .populate(
            'items.productId'
          )
      : null;
    for (const item of order?.items || []) await recordProductInteraction(userId.toString(), item.productId.toString(), ActivityType.PURCHASE);

    res.status(201).json({
      message: 'Order placed successfully',
      order,
    });
  } catch (error) {
    console.error(
      'Create order error:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to create order';

    res.status(400).json({
      message,
    });
  } finally {
    await session.endSession();
  }
};

export const getOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(
        req.userId
      ),
    };
    if (typeof req.query.status === 'string' && req.query.status !== 'ALL') filter.status = req.query.status;
    if (typeof req.query.paymentMethod === 'string' && req.query.paymentMethod !== 'ALL') filter.paymentMethod = req.query.paymentMethod;
    if (typeof req.query.from === 'string' || typeof req.query.to === 'string') {
      const range: Record<string, Date> = {};
      if (typeof req.query.from === 'string' && !Number.isNaN(Date.parse(req.query.from))) range.$gte = new Date(req.query.from);
      if (typeof req.query.to === 'string' && !Number.isNaN(Date.parse(req.query.to))) range.$lte = new Date(req.query.to);
      if (Object.keys(range).length) filter.createdAt = range;
    }
    const sort: Record<string, 1 | -1> = req.query.sort === 'oldest' ? { createdAt: 1 } : req.query.sort === 'amount-low' ? { totalAmount: 1 } : req.query.sort === 'amount-high' ? { totalAmount: -1 } : { createdAt: -1 };
    const [orders, total] = await Promise.all([Order.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('items.productId'), Order.countDocuments(filter)]);

    res.status(200).json({
      orders, page, limit, total, pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(
      'Get orders error:',
      error
    );

    res.status(500).json({
      message: 'Failed to load orders',
    });
  }
};

export const requestOrderAction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ message: 'Authentication required' }); return; }
    const { action, reason } = req.body as { action?: string; reason?: string };
    const session = await mongoose.startSession();
    let updated: any;
    try {
      await session.withTransaction(async () => {
        const order = await Order.findOne({ _id: req.params.orderId, userId: req.userId }).session(session);
        if (!order) throw new Error('Order not found');
        if (action === 'cancel') {
          if (!['PENDING', 'PROCESSING'].includes(order.status)) throw new Error('This order can no longer be cancelled');
          for (const item of order.items) await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity, salesCount: -item.quantity } }, { session });
          order.status = 'CANCELLED'; order.cancellationReason = String(reason || '').slice(0, 500);
          order.deliveryTimeline.push({ status: 'CANCELLED', note: order.cancellationReason || 'Cancelled by customer', at: new Date() } as any);
        } else if (action === 'return') {
          if (!['DELIVERED', 'COMPLETED'].includes(order.status)) throw new Error('Returns can only be requested after delivery');
          order.status = 'RETURN_REQUESTED'; order.returnReason = String(reason || '').slice(0, 500);
          order.deliveryTimeline.push({ status: 'RETURN_REQUESTED', note: order.returnReason || 'Return requested', at: new Date() } as any);
        } else throw new Error('Unsupported order action');
        updated = await order.save({ session });
      });
    } finally { await session.endSession(); }
    res.json({ order: updated });
  } catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : 'Order action failed' }); }
};

export const reorderOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ message: 'Authentication required' }); return; }
    const order = await Order.findOne({ _id: req.params.orderId, userId: req.userId }).lean();
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(req.userId) }).session(session) || new Cart({ userId: new mongoose.Types.ObjectId(req.userId), items: [] });
        for (const line of order.items) {
          const product = await Product.findById(line.productId).session(session).lean();
          if (!product || product.stock <= 0) continue;
          const existing = cart.items.find((item) => !item.savedForLater && item.productId.toString() === line.productId.toString() && variantsMatch(item, line.size, line.color));
          const count = Math.min(line.quantity, product.stock);
          if (existing) existing.quantity = Math.min(product.stock, existing.quantity + count);
          else cart.items.push({ productId: line.productId, quantity: count, priceAtAdd: product.price, size: line.size, color: line.color, savedForLater: false });
        }
        await cart.save({ session });
      });
    } finally { await session.endSession(); }
    getIO().to(`user:${req.userId}`).emit('cartUpdated');
    res.json({ message: 'Available items were added to your cart' });
  } catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : 'Could not reorder' }); }
};

const pdfText = (value: string): string => value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/([\\()])/g, '\\$1');
export const downloadInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ message: 'Authentication required' }); return; }
    const order = await Order.findOne({ _id: req.params.orderId, userId: req.userId }).populate('items.productId').lean();
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    const lines = [`Invoice ${order.invoiceNumber || order._id}`, `Order: ${order._id}`, `Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, `Status: ${order.status}`, `Payment: ${order.paymentMethod} / ${order.paymentStatus}`, 'Items:'];
    for (const line of order.items as any[]) lines.push(`${line.productId?.name || 'Product'} | Qty ${line.quantity} | INR ${line.price} | ${(line.size || '')} ${(line.color || '')}`);
    lines.push(`Total: INR ${order.totalAmount}`, '', 'Delivery timeline:');
    for (const event of order.deliveryTimeline || []) lines.push(`${new Date(event.at).toLocaleString('en-IN')} - ${event.status}: ${event.note}`);
    const wrappedLines = lines.flatMap((line) => line.match(/.{1,76}(?:\s|$)|.{1,76}/g) || ['']);
    const pageLines: string[][] = [];
    for (let i = 0; i < wrappedLines.length; i += 35) pageLines.push(wrappedLines.slice(i, i + 35));
    const pageCount = Math.max(1, pageLines.length); const fontId = 3 + pageCount * 2;
    const pageIds = Array.from({ length: pageCount }, (_, index) => 3 + index * 2);
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`];
    for (let i = 0; i < pageCount; i++) {
      const contentId = pageIds[i] + 1;
      const commands = ['BT', '/F1 12 Tf', '50 790 Td', ...pageLines[i].flatMap((line, index) => index ? ['0 -20 Td', `(${pdfText(line)}) Tj`] : [`(${pdfText(line)}) Tj`]), 'ET', 'BT', '/F1 9 Tf', '500 24 Td', `(Page ${i + 1} of ${pageCount}) Tj`, 'ET'].join('\n');
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      objects.push(`<< /Length ${Buffer.byteLength(commands, 'latin1')} >>\nstream\n${commands}\nendstream`);
    }
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    let pdf = '%PDF-1.4\n'; const offsets = [0];
    for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf, 'latin1')); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
    const xref = Buffer.byteLength(pdf, 'latin1'); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${order.invoiceNumber || 'invoice'}.pdf"`); res.send(Buffer.from(pdf, 'latin1'));
  } catch { res.status(500).json({ message: 'Could not generate invoice' }); }
};
