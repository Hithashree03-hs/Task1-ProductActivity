import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import NotificationLog from '../models/NotificationLog';

export const registerToken = async (req: AuthRequest, res: Response): Promise<void> => {
  const token = req.body?.token;
  if (typeof token !== 'string' || !token.startsWith('ExponentPushToken[')) { res.status(400).json({ message: 'Valid Expo push token required' }); return; }
  await User.updateOne({ _id: req.userId }, { $addToSet: { expoPushTokens: token } });
  res.status(200).json({ message: 'Device registered' });
};

export const sendNotification = async (userId: string, category: string, title: string, body: string, scheduledAt?: Date): Promise<void> => {
  const user = await User.findById(userId).select('expoPushTokens notificationPreferences').lean();
  const prefs: any = user?.notificationPreferences;
  const enabled = prefs instanceof Map ? prefs.get(category) !== false : prefs?.[category] !== false;
  if (!user || !enabled) return;
  if (scheduledAt && scheduledAt.getTime() > Date.now()) {
    await NotificationLog.create({ userId, category, title, body, status: 'SCHEDULED', scheduledAt });
    return;
  }
  if (!user.expoPushTokens.length) { await NotificationLog.create({ userId, category, title, body, status: 'FAILED' }); return; }
  const messages = user.expoPushTokens.map((to) => ({ to, title, body, sound: 'default', data: { category } }));
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messages) });
    const result: any = await response.json();
    const tickets = result.data || [];
    await Promise.all(user.expoPushTokens.map(async (token, i) => {
      const ticket = tickets[i];
      const ok = response.ok && ticket?.status === 'ok';
      await NotificationLog.create({ userId, category, title, body, status: ok ? 'SENT' : 'FAILED', ticketId: ticket?.id });
      if (ticket?.details?.error === 'DeviceNotRegistered') await User.updateOne({ _id: userId }, { $pull: { expoPushTokens: token } });
    }));
  } catch { await NotificationLog.create({ userId, category, title, body, status: 'FAILED' }); }
};

export const getNotificationHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const logs = await NotificationLog.find({ userId: req.userId }).sort({ createdAt: -1 }).skip((page-1)*20).limit(20).lean();
  res.json({ notifications: logs, page });
};
