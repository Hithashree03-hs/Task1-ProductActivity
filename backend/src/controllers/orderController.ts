import { Response } from 'express';
import mongoose from 'mongoose';

import { AuthRequest } from '../middleware/auth';
import Order from '../models/Order';
import Product from '../models/Product';
import Cart from '../models/Cart';
import { getIO } from '../sockets/server';
import { sendNotification } from './notificationController';

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
            status: 'COMPLETED',
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
    if (typeof req.query.status === 'string') filter.status = req.query.status;
    if (typeof req.query.from === 'string' || typeof req.query.to === 'string') {
      const range: Record<string, Date> = {};
      if (typeof req.query.from === 'string' && !Number.isNaN(Date.parse(req.query.from))) range.$gte = new Date(req.query.from);
      if (typeof req.query.to === 'string' && !Number.isNaN(Date.parse(req.query.to))) range.$lte = new Date(req.query.to);
      if (Object.keys(range).length) filter.createdAt = range;
    }
    const sortDirection = req.query.sort === 'oldest' ? 1 : -1;
    const [orders, total] = await Promise.all([Order.find(filter)
      .sort({ createdAt: sortDirection })
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
