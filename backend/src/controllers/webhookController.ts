import { createHmac, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import Wishlist from '../models/Wishlist';
import User from '../models/User';
import PaymentEvent from '../models/PaymentEvent';
import InternalEvent from '../models/InternalEvent';
import { sendNotification } from './notificationController';

const verifySignature = (body: Buffer, signature: unknown, secretName: string): boolean => {
  const secret = process.env[secretName];
  if (!secret || secret.length < 32 || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
};
const parseBody = (req: Request): Record<string, any> | null => {
  if (!Buffer.isBuffer(req.body)) return null;
  try { return JSON.parse(req.body.toString('utf8')); } catch { return null; }
};

export const paymentWebhook = async (req: Request, res: Response): Promise<void> => {
  const body = parseBody(req);
  if (!body || !verifySignature(req.body as Buffer, req.header('x-payment-signature'), 'PAYMENT_WEBHOOK_SECRET')) { res.status(401).json({ message: 'Invalid payment webhook signature' }); return; }
  if (typeof body.id !== 'string' || typeof body.type !== 'string' || !mongoose.Types.ObjectId.isValid(body.data?.orderId)) { res.status(400).json({ message: 'Invalid payment event' }); return; }
  if (!['payment.succeeded', 'payment.failed', 'payment.refunded'].includes(body.type)) { res.status(400).json({ message: 'Unsupported payment event type' }); return; }
  const session = await mongoose.startSession(); let owner = '';
  try {
    await session.withTransaction(async () => {
      const previous = await PaymentEvent.findOne({ providerEventId: body.id }).session(session);
      if (previous) return;
      const order = await Order.findById(body.data.orderId).session(session);
      if (!order) throw new Error('Order not found');
      if (body.type === 'payment.succeeded' && (Number(body.data.amount) !== order.totalAmount || (body.data.currency && body.data.currency !== 'INR'))) throw new Error('Payment amount or currency does not match order');
      await PaymentEvent.create([{ providerEventId: body.id, orderId: order._id, type: body.type, payload: body }], { session });
      order.paymentStatus = body.type === 'payment.succeeded' ? 'PAID' : body.type === 'payment.refunded' ? 'REFUNDED' : 'FAILED';
      order.deliveryTimeline.push({ status: `PAYMENT_${order.paymentStatus}`, note: `Payment provider event ${body.type}`, at: new Date() } as any);
      await order.save({ session }); owner = order.userId.toString();
    });
    if (owner) await sendNotification(owner, 'payment', 'Payment update', `Payment status: ${body.type.split('.')[1]}.`);
    res.status(200).json({ received: true });
  } catch (error) {
    if ((error as any)?.code === 11000) { res.status(200).json({ received: true, duplicate: true }); return; }
    res.status(400).json({ message: error instanceof Error ? error.message : 'Payment event failed' });
  } finally { await session.endSession(); }
};

export const internalEventWebhook = async (req: Request, res: Response): Promise<void> => {
  const body = parseBody(req);
  if (!body || !verifySignature(req.body as Buffer, req.header('x-internal-signature'), 'INTERNAL_EVENTS_SECRET')) { res.status(401).json({ message: 'Invalid internal event signature' }); return; }
  if (typeof body.id !== 'string' || typeof body.type !== 'string') { res.status(400).json({ message: 'Event id and type are required' }); return; }
  try {
    const previous = await InternalEvent.findOne({ eventId: body.id });
    if (previous?.status === 'PROCESSED') { res.status(200).json({ received: true, duplicate: true }); return; }
    if (previous?.status === 'PROCESSING') { res.status(409).json({ message: 'Event is already processing' }); return; }
    if (previous) { previous.status = 'PROCESSING'; await previous.save(); }
    else await InternalEvent.create({ eventId: body.id, type: body.type, payload: body, status: 'PROCESSING' });
    if (body.type === 'product.updated') {
      if (!mongoose.Types.ObjectId.isValid(body.data?.productId)) throw new Error('Invalid product id');
      const product = await Product.findById(body.data.productId);
      if (!product) throw new Error('Product not found');
      const oldPrice = product.price; const oldStock = product.stock;
      if (Number.isFinite(body.data.price) && body.data.price >= 0) product.price = body.data.price;
      if (Number.isInteger(body.data.stock) && body.data.stock >= 0) product.stock = body.data.stock;
      await product.save();
      if (product.price < oldPrice || (oldStock <= 0 && product.stock > 0)) {
        const saved = await Wishlist.find({ products: product._id }).select('userId').lean();
        await Promise.all(saved.map(({ userId }) => sendNotification(userId.toString(), 'wishlist', oldStock <= 0 && product.stock > 0 ? 'Back in stock' : 'Wishlist price drop', oldStock <= 0 && product.stock > 0 ? `${product.name} is available again.` : `${product.name} is now ₹${product.price}.`)));
      }
    } else if (body.type === 'order.shipped' || body.type === 'order.delivered') {
      if (!mongoose.Types.ObjectId.isValid(body.data?.orderId)) throw new Error('Invalid order id');
      const status = body.type === 'order.shipped' ? 'SHIPPED' : 'DELIVERED';
      const order = await Order.findByIdAndUpdate(body.data.orderId, { $set: { status }, $push: { deliveryTimeline: { status, note: String(body.data.note || (status === 'SHIPPED' ? 'Order shipped' : 'Order delivered')), at: new Date() } } }, { new: true });
      if (!order) throw new Error('Order not found');
      await sendNotification(order.userId.toString(), 'shipping', status === 'SHIPPED' ? 'Your order is on its way' : 'Your order was delivered', String(body.data.note || `Order ${status.toLowerCase()}.`));
    } else if (body.type === 'promotion') {
      const users = await User.find({}).select('_id').lean();
      await Promise.all(users.map(({ _id }) => sendNotification(_id.toString(), 'promotions', String(body.data?.title || 'A new offer for you'), String(body.data?.body || 'Explore our latest offers.'))));
    } else throw new Error('Unsupported internal event type');
    await InternalEvent.updateOne({ eventId: body.id }, { $set: { status: 'PROCESSED' } });
    res.status(200).json({ received: true });
  } catch (error) {
    if ((error as any)?.code === 11000) { res.status(409).json({ message: 'Event is already processing' }); return; }
    await InternalEvent.updateOne({ eventId: body.id }, { $set: { status: 'FAILED' } }).catch(() => undefined);
    res.status(400).json({ message: error instanceof Error ? error.message : 'Internal event failed' });
  }
};
