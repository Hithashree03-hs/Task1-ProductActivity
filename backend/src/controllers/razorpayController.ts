import { createHmac, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Cart from '../models/Cart';
import Order from '../models/Order';
import PaymentEvent from '../models/PaymentEvent';
import PaymentIntent, { IPaymentIntent } from '../models/PaymentIntent';
import Product from '../models/Product';
import { ActivityType } from '../models/ProductActivity';
import { recordProductInteraction } from '../services/recentlyViewedService';
import { getIO } from '../sockets/server';
import { sendNotification } from './notificationController';

const apiBase = 'https://api.razorpay.com/v1';
const keyId = () => process.env.RAZORPAY_KEY_ID || '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET || '';

const razorpayFetch = async (path: string, init: RequestInit = {}): Promise<any> => {
  if (!keyId() || !keySecret()) throw new Error('Razorpay is not configured on the server');
  const auth = Buffer.from(`${keyId()}:${keySecret()}`).toString('base64');
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.description || 'Razorpay request failed');
  return body;
};

const safeEqualHex = (expectedHex: string, provided: unknown): boolean => {
  if (typeof provided !== 'string' || !/^[a-f0-9]{64}$/i.test(provided)) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const received = Buffer.from(provided, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
};

const verifyCheckoutSignature = (orderId: string, paymentId: string, signature: unknown): boolean => {
  if (!keySecret()) return false;
  const expected = createHmac('sha256', keySecret()).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
};

const paymentSignatureValid = (body: Buffer, signature: unknown): boolean => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || secret.length < 16 || !Buffer.isBuffer(body)) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return safeEqualHex(expected, signature);
};

const logPaymentEvent = async (providerEventId: string, intentId: mongoose.Types.ObjectId, type: string, payload: Record<string, unknown>, session?: mongoose.ClientSession, orderId?: mongoose.Types.ObjectId): Promise<void> => {
  await PaymentEvent.create([{ providerEventId, intentId, orderId, type, payload }], session ? { session } : {});
};

const verifyCapturedPayment = async (paymentId: string, intent: IPaymentIntent): Promise<any> => {
  const payment = await razorpayFetch(`/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
  if (payment.order_id !== intent.providerOrderId || payment.amount !== intent.amountMinor || payment.currency !== intent.currency) {
    throw new Error('Payment does not match the pending checkout');
  }
  if (payment.status !== 'captured') throw new Error('Payment is not captured yet. Please wait for confirmation.');
  return payment;
};

const requestRefund = async (intent: IPaymentIntent, paymentId: string): Promise<void> => {
  await PaymentIntent.updateOne({ _id: intent._id, status: { $ne: 'PAID' } }, { $set: { status: 'REFUND_PENDING', providerPaymentId: paymentId } });
  await PaymentEvent.updateOne(
    { providerEventId: `captured-for-refund:${paymentId}` },
    { $setOnInsert: { intentId: intent._id, type: 'payment.captured_refund_required', payload: { paymentId, providerOrderId: intent.providerOrderId } } },
    { upsert: true },
  );
  try {
    const refund = await razorpayFetch(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount: intent.amountMinor, receipt: `refund-${intent._id.toString()}`.slice(0, 40), notes: { paymentIntentId: intent._id.toString() } }),
    });
    await PaymentIntent.updateOne({ _id: intent._id }, { $set: { status: refund.status === 'processed' ? 'REFUNDED' : 'REFUND_PENDING' } });
      await PaymentEvent.updateOne(
      { providerEventId: `refund-request:${paymentId}` },
      { $setOnInsert: { intentId: intent._id, type: 'refund.requested', payload: { paymentId, refundId: refund.id, status: refund.status } } },
      { upsert: true },
    );
  } catch (error) {
    console.error('Razorpay refund request failed; manual retry is required:', error);
  }
};

const settleCapturedPayment = async (intent: IPaymentIntent, payment: any, providerEventId: string): Promise<{ order: any | null; refundRequired: boolean }> => {
  const session = await mongoose.startSession();
  let orderId: mongoose.Types.ObjectId | null = null;
  let refundRequired = false;
  try {
    await session.withTransaction(async () => {
      const duplicate = await PaymentEvent.findOne({ providerEventId }).session(session);
      if (duplicate) {
        const settled = intent.orderId ? await Order.findById(intent.orderId).session(session) : null;
        orderId = settled?._id || null;
        return;
      }

      const current = await PaymentIntent.findById(intent._id).session(session);
      if (!current) throw new Error('Payment checkout was not found');
      if (current.status === 'PAID' && current.orderId) {
        orderId = current.orderId;
        await logPaymentEvent(providerEventId, current._id, 'payment.captured', { paymentId: payment.id, providerOrderId: current.providerOrderId }, session, current.orderId);
        return;
      }
      if (current.status !== 'CREATED' || current.expiresAt.getTime() < Date.now()) {
        current.status = current.status === 'CREATED' ? 'EXPIRED' : current.status;
        current.providerPaymentId = payment.id;
        await current.save({ session });
        await logPaymentEvent(providerEventId, current._id, 'payment.captured_late', { paymentId: payment.id, providerOrderId: current.providerOrderId }, session);
        refundRequired = true;
        return;
      }

      for (const line of current.items) {
        const updated = await Product.findOneAndUpdate(
          { _id: line.productId, stock: { $gte: line.quantity } },
          { $inc: { stock: -line.quantity, salesCount: line.quantity } },
          { new: true, session },
        );
        if (!updated) throw new Error('STOCK_UNAVAILABLE_AFTER_PAYMENT');
      }

      const [order] = await Order.create([{
        userId: current.userId,
        items: current.items,
        totalAmount: current.totalAmount,
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PAID',
        providerOrderId: current.providerOrderId,
        providerPaymentId: payment.id,
        invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        status: 'PROCESSING',
        deliveryTimeline: [
          { status: 'PROCESSING', note: 'Order placed and payment confirmed', at: new Date() },
          { status: 'PAYMENT_PAID', note: `Razorpay payment ${payment.id} captured`, at: new Date() },
        ],
      }], { session });
      current.status = 'PAID';
      current.providerPaymentId = payment.id;
      current.orderId = order._id;
      await current.save({ session });
      const cart = await Cart.findOne({ userId: current.userId }).session(session);
      if (cart) {
        const paidItems = new Map(current.items.map((line) => [line.cartItemId.toString(), line.quantity]));
        cart.items = cart.items.filter((line) => paidItems.get(line._id?.toString() || '') !== line.quantity);
        await cart.save({ session });
      }
      await logPaymentEvent(providerEventId, current._id, 'payment.captured', { paymentId: payment.id, providerOrderId: current.providerOrderId, amount: payment.amount, currency: payment.currency }, session, order._id);
      orderId = order._id;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'STOCK_UNAVAILABLE_AFTER_PAYMENT') {
      refundRequired = true;
    } else {
      throw error;
    }
  } finally {
    await session.endSession();
  }

  if (refundRequired) {
    await requestRefund(intent, payment.id);
    return { order: null, refundRequired: true };
  }
  if (orderId) {
    const order = await Order.findById(orderId).populate('items.productId');
    if (order) {
      await Promise.all(order.items.map((item) => recordProductInteraction(order.userId.toString(), item.productId.toString(), ActivityType.PURCHASE)));
      getIO().to(`user:${order.userId.toString()}`).emit('cartUpdated');
      await sendNotification(order.userId.toString(), 'payment', 'Payment confirmed', 'Your order is paid and being prepared.');
    }
    return { order, refundRequired: false };
  }
  return { order: null, refundRequired: false };
};

export const createRazorpayIntent = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) { res.status(401).json({ message: 'Authentication required' }); return; }
  try {
    const cart = await Cart.findOne({ userId: req.userId }).populate('items.productId');
    const active = (cart?.items || []).filter((line) => !line.savedForLater && line.productId);
    if (!active.length) { res.status(400).json({ message: 'Your cart has no items available for checkout' }); return; }

    const lines: IPaymentIntent['items'] = [];
    let totalAmount = 0;
    for (const line of active) {
      const product = line.productId as any;
      if (!product?._id) { res.status(400).json({ message: 'A product in your cart is no longer available' }); return; }
      if (!line._id) { res.status(409).json({ message: 'Refresh your cart before starting secure checkout' }); return; }
      if (product.stock < line.quantity) { res.status(409).json({ message: `${product.name}: only ${product.stock} item(s) are in stock` }); return; }
      if (line.priceAtAdd !== undefined && line.priceAtAdd !== product.price) { res.status(409).json({ message: `${product.name}: the price changed. Review your cart before paying.` }); return; }
      const size = line.size?.trim() || undefined;
      const color = line.color?.trim() || undefined;
      if (size && product.sizes?.length && !product.sizes.includes(size)) { res.status(409).json({ message: `${product.name}: the selected size is no longer available` }); return; }
      if (color && product.colors?.length && !product.colors.includes(color)) { res.status(409).json({ message: `${product.name}: the selected color is no longer available` }); return; }
      lines.push({ cartItemId: line._id, productId: product._id, quantity: line.quantity, price: product.price, size, color });
      totalAmount += product.price * line.quantity;
    }
    const amountMinor = Math.round(totalAmount * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 100) { res.status(400).json({ message: 'The payment total must be at least ₹1.00' }); return; }

    const intentId = new mongoose.Types.ObjectId();
    const razorOrder = await razorpayFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({ amount: amountMinor, currency: 'INR', receipt: `cart-${intentId.toString()}`.slice(0, 40), notes: { paymentIntentId: intentId.toString(), userId: req.userId } }),
    });
    const intent = await PaymentIntent.create({
      _id: intentId,
      userId: req.userId,
      items: lines,
      totalAmount: amountMinor / 100,
      amountMinor,
      currency: 'INR',
      providerOrderId: razorOrder.id,
      status: 'CREATED',
      expiresAt: new Date(Date.now() + 15 * 60_000),
    });
    res.status(201).json({ paymentIntentId: intent._id, keyId: keyId(), providerOrderId: razorOrder.id, amount: amountMinor, currency: 'INR' });
  } catch (error) {
    res.status(503).json({ message: error instanceof Error ? error.message : 'Could not start Razorpay checkout' });
  }
};

export const expirePendingPaymentIntents = async (): Promise<void> => {
  await PaymentIntent.updateMany({ status: 'CREATED', expiresAt: { $lte: new Date() } }, { $set: { status: 'EXPIRED' } });
};

export const verifyRazorpayCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) { res.status(401).json({ message: 'Authentication required' }); return; }
  const { razorpay_order_id: providerOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  if (typeof providerOrderId !== 'string' || typeof paymentId !== 'string' || !verifyCheckoutSignature(providerOrderId, paymentId, signature)) {
    res.status(400).json({ message: 'Razorpay payment signature is invalid' }); return;
  }
  try {
    const intent = await PaymentIntent.findOne({ _id: req.params.intentId, userId: req.userId, providerOrderId });
    if (!intent) { res.status(404).json({ message: 'Payment checkout was not found' }); return; }
    if (intent.status === 'PAID' && intent.orderId) {
      res.json({ message: 'Payment already confirmed', order: await Order.findById(intent.orderId) }); return;
    }
    const payment = await verifyCapturedPayment(paymentId, intent);
    const result = await settleCapturedPayment(intent, payment, `checkout:${paymentId}`);
    if (result.refundRequired) { res.status(409).json({ message: 'Payment succeeded after checkout expired or stock changed. A refund has been initiated.' }); return; }
    if (!result.order) { res.status(409).json({ message: 'Payment is being reconciled. Please refresh your order history shortly.' }); return; }
    res.json({ message: 'Payment verified', order: result.order });
  } catch (error) {
    if ((error as any)?.code === 11000) {
      const intent = await PaymentIntent.findOne({ _id: req.params.intentId, userId: req.userId });
      if (intent?.status === 'PAID' && intent.orderId) { res.json({ message: 'Payment already confirmed', order: await Order.findById(intent.orderId) }); return; }
    }
    res.status(400).json({ message: error instanceof Error ? error.message : 'Could not verify payment' });
  }
};

export const razorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  if (!Buffer.isBuffer(req.body) || !paymentSignatureValid(req.body, req.header('x-razorpay-signature'))) { res.status(401).json({ message: 'Invalid Razorpay webhook signature' }); return; }
  const eventId = req.header('x-razorpay-event-id');
  let body: any;
  try { body = JSON.parse(req.body.toString('utf8')); } catch { res.status(400).json({ message: 'Invalid webhook JSON' }); return; }
  if (!eventId || eventId.length > 200 || typeof body?.event !== 'string') { res.status(400).json({ message: 'Razorpay event id and type are required' }); return; }
  try {
    const previous = await PaymentEvent.findOne({ providerEventId: `webhook:${eventId}` });
    if (previous) { res.status(200).json({ received: true, duplicate: true }); return; }
    const payment = body.payload?.payment?.entity;
    const refund = body.payload?.refund?.entity;
    if (body.event === 'payment.captured') {
      if (!payment?.order_id || !payment?.id) { res.status(400).json({ message: 'Captured payment payload is incomplete' }); return; }
      if (payment.status !== 'captured') { res.status(400).json({ message: 'Razorpay payment is not captured' }); return; }
      const intent = await PaymentIntent.findOne({ providerOrderId: payment.order_id });
      if (!intent) { res.status(404).json({ message: 'Payment checkout was not found' }); return; }
      if (payment.amount !== intent.amountMinor || payment.currency !== intent.currency) { res.status(400).json({ message: 'Payment amount or currency does not match checkout' }); return; }
      const result = await settleCapturedPayment(intent, payment, `webhook:${eventId}`);
      res.status(200).json({ received: true, refunded: result.refundRequired }); return;
    }
    if (body.event === 'payment.failed') {
      if (!payment?.order_id || !payment?.id) { res.status(400).json({ message: 'Failed payment payload is incomplete' }); return; }
      const intent = await PaymentIntent.findOne({ providerOrderId: payment.order_id });
      if (!intent) { res.status(404).json({ message: 'Payment checkout was not found' }); return; }
      // A failed attempt does not close the Razorpay order; Checkout may retry it.
      await logPaymentEvent(`webhook:${eventId}`, intent._id, 'payment.failed', { paymentId: payment.id, providerOrderId: payment.order_id, reason: payment.error_description || payment.error_reason || 'Payment failed' });
      res.status(200).json({ received: true }); return;
    }
    if (body.event === 'refund.processed') {
      if (!refund?.payment_id) { res.status(400).json({ message: 'Refund payload is incomplete' }); return; }
      const intent = await PaymentIntent.findOne({ providerPaymentId: refund.payment_id });
      if (!intent) { res.status(404).json({ message: 'Payment checkout was not found' }); return; }
      await PaymentIntent.updateOne({ _id: intent._id }, { $set: { status: 'REFUNDED' } });
      if (intent.orderId) await Order.updateOne({ _id: intent.orderId }, { $set: { paymentStatus: 'REFUNDED' }, $push: { deliveryTimeline: { status: 'PAYMENT_REFUNDED', note: 'Razorpay refund processed', at: new Date() } } });
      await logPaymentEvent(`webhook:${eventId}`, intent._id, 'refund.processed', { refundId: refund.id, paymentId: refund.payment_id, amount: refund.amount });
      res.status(200).json({ received: true }); return;
    }
    res.status(400).json({ message: `Unsupported Razorpay event: ${body.event}` });
  } catch (error) {
    if ((error as any)?.code === 11000) { res.status(200).json({ received: true, duplicate: true }); return; }
    console.error('Razorpay webhook processing failed:', error);
    res.status(500).json({ message: 'Webhook processing failed; Razorpay can retry this event' });
  }
};
