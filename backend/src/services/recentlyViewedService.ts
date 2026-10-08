import ProductActivity, {
  ActivityType,
} from '../models/ProductActivity';
import Product from '../models/Product';
import mongoose from 'mongoose';
import { getIO } from '../sockets/server';

const MAX_RECENTLY_VIEWED = 20;
const MAX_RECOMMENDATION_HISTORY = 50;

/**
 * Record a product view for a logged-in user.
 *
 * If the user has already viewed the product, update its
 * viewedAt timestamp instead of creating a duplicate.
 */
export const recordProductView = async (
  userId: string,
  productId: string
): Promise<void> => {
  const viewedAt = new Date();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const productObjectId = new mongoose.Types.ObjectId(productId);
  await Promise.all([ActivityType.VIEW, ActivityType.RECOMMENDATION_VIEW].map((activityType) => upsertActivity(userObjectId, productObjectId, activityType, viewedAt)));
  await Promise.all(([
    [ActivityType.VIEW, MAX_RECENTLY_VIEWED],
    [ActivityType.RECOMMENDATION_VIEW, MAX_RECOMMENDATION_HISTORY],
  ] as Array<[ActivityType, number]>).map(async ([activityType, maximum]) => {
    const stale = await ProductActivity.find({ userId: userObjectId, activityType })
      .sort({ viewedAt: -1 }).skip(maximum).select('_id').lean();
    if (stale.length) await ProductActivity.deleteMany({ _id: { $in: stale.map((item) => item._id) } });
  }));

  // Notify all connected devices for this user.
  getIO()
    .to(`user:${userId}`)
    .emit('recentlyViewedUpdated');
  getIO().to(`user:${userId}`).emit('recommendationsUpdated');
};

const upsertActivity = async (userId: mongoose.Types.ObjectId, productId: mongoose.Types.ObjectId, activityType: ActivityType, viewedAt = new Date()): Promise<void> => {
  try {
    await ProductActivity.findOneAndUpdate({ userId, productId, activityType }, { $set: { viewedAt } }, { upsert: true, new: true });
  } catch (error) {
    if ((error as any)?.code !== 11000) throw error;
    await ProductActivity.updateOne({ userId, productId, activityType }, { $set: { viewedAt } });
  }
};

/**
 * Get the latest 20 recently viewed products for a user.
 */
export const getRecentlyViewedProducts = async (
  userId: string
) => {
  const activities = await ProductActivity.find({
    userId: new mongoose.Types.ObjectId(userId),
    activityType: ActivityType.VIEW,
  })
    .sort({ viewedAt: -1 })
    .limit(MAX_RECENTLY_VIEWED)
    .populate('productId')
    .lean();

  return activities
    .filter((activity) => activity.productId)
    .map((activity) => ({
      product: activity.productId,
      viewedAt: activity.viewedAt,
    }));
};

/**
 * Merge locally stored anonymous history with
 * the logged-in user's server-side history.
 */
export const mergeRecentlyViewed = async (
  userId: string,
  localHistory: Array<{
    productId: string;
    viewedAt: string | Date;
  }>
): Promise<void> => {
  const serverActivities = await ProductActivity.find({
    userId: new mongoose.Types.ObjectId(userId),
    activityType: ActivityType.VIEW,
  })
    .sort({ viewedAt: -1 })
    .limit(MAX_RECOMMENDATION_HISTORY)
    .lean();

  const mergedHistory = new Map<
    string,
    {
      productId: string;
      viewedAt: Date;
    }
  >();

  // Add server history first.
  for (const activity of serverActivities) {
    mergedHistory.set(activity.productId.toString(), {
      productId: activity.productId.toString(),
      viewedAt: activity.viewedAt,
    });
  }

  // Add local anonymous history.
  // If the product already exists, keep the latest viewedAt.
  for (const item of localHistory) {
    const existing = mergedHistory.get(item.productId);
    const localViewedAt = new Date(item.viewedAt);

    if (
      !existing ||
      localViewedAt.getTime() > existing.viewedAt.getTime()
    ) {
      mergedHistory.set(item.productId, {
        productId: item.productId,
        viewedAt: localViewedAt,
      });
    }
  }

  // Sort newest first and keep only 20.
  const merged = Array.from(mergedHistory.values())
    .sort(
      (a, b) =>
        b.viewedAt.getTime() - a.viewedAt.getTime()
    )
    .slice(0, MAX_RECENTLY_VIEWED);

  // Remove existing server-side VIEW records.
  await ProductActivity.deleteMany({
    userId: new mongoose.Types.ObjectId(userId),
    activityType: ActivityType.VIEW,
  });

  // Verify that the products still exist before inserting.
  const productIds = merged.map(
    (item) =>
      new mongoose.Types.ObjectId(item.productId)
  );

  const existingProducts = await Product.find({
    _id: { $in: productIds },
  })
    .select('_id')
    .lean();

  const existingProductIds = new Set(
    existingProducts.map(
      (product) => product._id.toString()
    )
  );

  const activitiesToInsert = merged
    .filter((item) =>
      existingProductIds.has(item.productId)
    )
    .map((item) => ({
      userId: new mongoose.Types.ObjectId(userId),
      productId: new mongoose.Types.ObjectId(
        item.productId
      ),
      activityType: ActivityType.VIEW,
      viewedAt: item.viewedAt,
    }));

  if (activitiesToInsert.length > 0) {
    await ProductActivity.insertMany(
      activitiesToInsert
    );
  }

  const recommendationActivities = activitiesToInsert.slice(0, MAX_RECOMMENDATION_HISTORY).map((item) => ({ ...item, activityType: ActivityType.RECOMMENDATION_VIEW }));
  await ProductActivity.deleteMany({ userId: new mongoose.Types.ObjectId(userId), activityType: ActivityType.RECOMMENDATION_VIEW });
  if (recommendationActivities.length) await ProductActivity.insertMany(recommendationActivities);

  // Notify all connected devices that the user's
  // Recently Viewed history has changed after the merge.
  getIO()
    .to(`user:${userId}`)
    .emit('recentlyViewedUpdated');
  getIO().to(`user:${userId}`).emit('recommendationsUpdated');
};

export const recordProductInteraction = async (userId: string, productId: string, activityType: ActivityType): Promise<void> => {
  await upsertActivity(new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(productId), activityType);
  getIO().to(`user:${userId}`).emit('recommendationsUpdated');
};

export const removeProductInteraction = async (userId: string, productId: string, activityType: ActivityType): Promise<void> => {
  await ProductActivity.deleteOne({ userId: new mongoose.Types.ObjectId(userId), productId: new mongoose.Types.ObjectId(productId), activityType });
  getIO().to(`user:${userId}`).emit('recommendationsUpdated');
};
