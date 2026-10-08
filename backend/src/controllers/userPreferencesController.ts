import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { getIO } from '../sockets/server';

export const getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.userId).select('themePreference notificationPreferences favoriteCategories').lean();
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json({ preferences: user });
};
export const updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  const update: Record<string, unknown> = {};
  const { themePreference, notificationPreferences, favoriteCategories } = req.body;
  if (themePreference !== undefined) {
    if (!['system','light','dark'].includes(themePreference)) { res.status(400).json({ message: 'Invalid themePreference' }); return; }
    update.themePreference = themePreference;
  }
  if (notificationPreferences && typeof notificationPreferences === 'object') {
    update.notificationPreferences = Object.fromEntries(Object.entries(notificationPreferences).filter(([,v]) => typeof v === 'boolean'));
  }
  if (Array.isArray(favoriteCategories)) update.favoriteCategories = favoriteCategories.filter((v: unknown) => typeof v === 'string').slice(0, 30);
  const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true, runValidators: true }).select('themePreference notificationPreferences favoriteCategories').lean();
  if (Array.isArray(favoriteCategories)) getIO().to(`user:${req.userId}`).emit('recommendationsUpdated');
  res.json({ preferences: user });
};
