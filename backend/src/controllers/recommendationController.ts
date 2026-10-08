import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';
import ProductActivity, { ActivityType } from '../models/ProductActivity';
import Wishlist from '../models/Wishlist';
import Order from '../models/Order';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

// Public for new users, personalized for signed-in users. One product query returns the ranked candidates.
export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 30);
    const userId = (req as AuthRequest).userId;
    if (!userId) {
      const products = await Product.find({ stock: { $gt: 0 } }).sort({ salesCount: -1, createdAt: -1 }).limit(limit).lean();
      res.json({ products, personalized: false });
      return;
    }
    const uid = new mongoose.Types.ObjectId(userId);
    const [activities, wishlist, orders, user] = await Promise.all([
      ProductActivity.find({ userId: uid, activityType: { $in: [ActivityType.RECOMMENDATION_VIEW, ActivityType.VIEW, ActivityType.CART, ActivityType.WISHLIST] } }).sort({ viewedAt: -1 }).limit(50).select('productId activityType').lean(),
      Wishlist.findOne({ userId: uid }).select('products').lean(),
      Order.find({ userId: uid, status: { $ne: 'CANCELLED' }, createdAt: { $gte: new Date(Date.now() - 90 * 86400000) } }).select('items.productId').lean(),
      User.findById(uid).select('favoriteCategories').lean(),
    ]);
    const scores = new Map<string, number>();
    const categories = new Set<string>(user?.favoriteCategories || []);
    const add = (id: unknown, score: number) => { if (id) scores.set(String(id), (scores.get(String(id)) || 0) + score); };
    const engagement = new Map<string, number>();
    activities.forEach((activity) => {
      const id = String(activity.productId);
      const weight = activity.activityType === ActivityType.WISHLIST ? 8 : activity.activityType === ActivityType.CART ? 6 : 3;
      engagement.set(id, Math.max(engagement.get(id) || 0, weight));
    });
    engagement.forEach((weight, id) => add(id, weight));
    (wishlist?.products || []).forEach((id: any) => add(id, 8));
    orders.forEach((o: any) => o.items.forEach((i: any) => add(i.productId, 5)));
    const purchasedIds = orders.flatMap((o: any) => o.items.map((i: any) => String(i.productId)));
    const excluded = new Set([...scores.keys(), ...purchasedIds]);
    const engagedProducts = await Product.find({ _id: { $in: Array.from(scores.keys()).map((id) => new mongoose.Types.ObjectId(id)) } }).select('category').lean();
    engagedProducts.forEach((p) => categories.add(p.category));
    const candidates = await Product.find({ stock: { $gt: 0 }, _id: { $nin: [...excluded].map((id) => new mongoose.Types.ObjectId(id)) } }).sort({ salesCount: -1, createdAt: -1 }).limit(100).lean();
    const weighted = candidates.map((p) => ({ p, score: (categories.has(p.category) ? 4 : 0) + Math.log1p(p.salesCount || 0) })).sort((a,b) => b.score - a.score);
    const products = weighted.slice(0, limit).map(({ p }) => p);
    res.json({ products, personalized: true });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ message: 'Failed to load recommendations' });
  }
};
