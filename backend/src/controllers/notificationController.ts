import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import NotificationLog from '../models/NotificationLog';
import Cart from '../models/Cart';

const encryptionKey = (): Buffer => {
  const secret = process.env.PUSH_TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error('PUSH_TOKEN_ENCRYPTION_KEY must be configured with at least 32 characters');
  return createHash('sha256').update(secret).digest();
};
const encryptToken = (value: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
};
const decryptToken = (value: string): string => {
  const raw = Buffer.from(value, 'base64'); const iv = raw.subarray(0, 12); const tag = raw.subarray(12, 28);
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
};
const tokenHash = (value: string): string => createHash('sha256').update(value).digest('hex');

export const registerToken = async (req: AuthRequest, res: Response): Promise<void> => {
  const token = req.body?.token;
  if (typeof token !== 'string' || !/^Expo(nent)?PushToken\[[^\]]+\]$/.test(token)) { res.status(400).json({ message: 'Valid Expo push token required' }); return; }
  const hash = tokenHash(token);
  await User.updateOne({ _id: req.userId, 'expoPushTokens.hash': { $ne: hash } }, { $push: { expoPushTokens: { hash, encryptedToken: encryptToken(token) } } });
  res.status(200).json({ message: 'Device registered' });
};

const preferenceEnabled = (prefs: any, category: string): boolean => prefs instanceof Map ? prefs.get(category) !== false : prefs?.[category] !== false;

export const sendNotification = async (userId: string, category: string, title: string, body: string, scheduledAt?: Date): Promise<boolean> => {
  const user = await User.findById(userId).select('expoPushTokens notificationPreferences').lean();
  if (!user || !preferenceEnabled(user.notificationPreferences, category)) return false;
  if (scheduledAt && scheduledAt.getTime() > Date.now()) {
    await NotificationLog.create({ userId, category, title, body, status: 'SCHEDULED', scheduledAt }); return true;
  }
  if (!user.expoPushTokens?.length) { await NotificationLog.create({ userId, category, title, body, status: 'FAILED' }); return false; }
  let anyAccepted = false;
  const devices = user.expoPushTokens.map(({ hash, encryptedToken }) => ({ hash, token: decryptToken(encryptedToken) }));
  for (let offset = 0; offset < devices.length; offset += 100) {
    const batch = devices.slice(offset, offset + 100);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) }, body: JSON.stringify(batch.map(({ token }) => ({ to: token, title, body, sound: 'default', data: { category } }))) });
      const result: any = await response.json(); const tickets = result.data || [];
      await Promise.all(batch.map(async (device, i) => {
        const ticket = tickets[i]; const ok = response.ok && ticket?.status === 'ok';
        anyAccepted ||= ok;
        await NotificationLog.create({ userId, category, title, body, status: ok ? 'SENT' : 'FAILED', ticketId: ticket?.id, deviceHash: device.hash });
        if (ticket?.details?.error === 'DeviceNotRegistered') await User.updateOne({ _id: userId }, { $pull: { expoPushTokens: { hash: device.hash } } });
      }));
    } catch { await Promise.all(batch.map((device) => NotificationLog.create({ userId, category, title, body, status: 'FAILED', deviceHash: device.hash }))); }
  }
  return anyAccepted;
};

export const dispatchScheduledNotifications = async (): Promise<void> => {
  await NotificationLog.updateMany({ status: 'SENDING', updatedAt: { $lte: new Date(Date.now() - 10 * 60_000) } }, { $set: { status: 'SCHEDULED' } });
  const due = await NotificationLog.find({ status: 'SCHEDULED', scheduledAt: { $lte: new Date() } }).sort({ scheduledAt: 1 }).limit(50);
  for (const item of due) {
    const claimed = await NotificationLog.findOneAndUpdate({ _id: item._id, status: 'SCHEDULED' }, { $set: { status: 'SENDING' } });
    if (!claimed) continue;
    try { item.status = await sendNotification(item.userId.toString(), item.category, item.title, item.body) ? 'SENT' : 'FAILED'; }
    catch { item.status = 'FAILED'; }
    await item.save();
  }
};

export const scheduleAbandonedCartReminders = async (): Promise<void> => {
  const staleBefore = new Date(Date.now() - 60 * 60_000);
  const carts = await Cart.find({ updatedAt: { $lte: staleBefore }, items: { $elemMatch: { savedForLater: { $ne: true } } } }).select('userId items updatedAt abandonedReminderScheduledAt').limit(500).lean();
  for (const cart of carts) {
    const target = new Date(new Date(cart.updatedAt).getTime() + 24 * 60 * 60_000);
    if (cart.abandonedReminderScheduledAt && new Date(cart.abandonedReminderScheduledAt).getTime() === target.getTime()) continue;
    await NotificationLog.updateMany({ userId: cart.userId, category: 'cart', status: 'SCHEDULED' }, { $set: { status: 'CANCELLED' } });
    await Cart.collection.updateOne({ _id: cart._id }, { $set: { abandonedReminderScheduledAt: target } });
    await sendNotification(cart.userId.toString(), 'cart', 'Still thinking it over?', 'Your cart is waiting. Come back to finish checkout.', target);
  }
};

export const processPushReceipts = async (): Promise<void> => {
  const sent = await NotificationLog.find({ status: 'SENT', ticketId: { $exists: true }, createdAt: { $lte: new Date(Date.now() - 15 * 60_000) }, $or: [{ receiptCheckedAt: { $exists: false } }, { receiptCheckedAt: { $lte: new Date(Date.now() - 24 * 60 * 60_000) } }] }).limit(300);
  for (let offset = 0; offset < sent.length; offset += 100) {
    const batch = sent.slice(offset, offset + 100);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) }, body: JSON.stringify({ ids: batch.map((item) => item.ticketId) }) });
      const result: any = await response.json();
      for (const item of batch) {
        const receipt = result.data?.[item.ticketId!];
        item.receiptCheckedAt = new Date();
        if (!receipt) { await item.save(); continue; }
        item.status = receipt.status === 'ok' ? 'DELIVERED' : 'FAILED'; await item.save();
        if (receipt.details?.error === 'DeviceNotRegistered' && item.deviceHash) await User.updateOne({ _id: item.userId }, { $pull: { expoPushTokens: { hash: item.deviceHash } } });
      }
    } catch (error) { console.error('Expo receipt check failed:', error); }
  }
};

export const getNotificationHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const [notifications, total] = await Promise.all([NotificationLog.find({ userId: req.userId }).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).lean(), NotificationLog.countDocuments({ userId: req.userId })]);
  res.json({ notifications, page, pages: Math.ceil(total / 20), total });
};
