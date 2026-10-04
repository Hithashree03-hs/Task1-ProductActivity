import ProductActivity, {
  ActivityType,
} from '../models/ProductActivity';
import Product from '../models/Product';
import mongoose from 'mongoose';
import { getIO } from '../sockets/server';

const MAX_RECENTLY_VIEWED = 20;

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
  await ProductActivity.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      productId: new mongoose.Types.ObjectId(productId),
      activityType: ActivityType.VIEW,
    },
    {
      $set: {
        viewedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  // Keep only the latest 20 viewed products.
  const activities = await ProductActivity.find({
    userId: new mongoose.Types.ObjectId(userId),
    activityType: ActivityType.VIEW,
  })
    .sort({ viewedAt: -1 })
    .select('_id')
    .lean();

  if (activities.length > MAX_RECENTLY_VIEWED) {
    const idsToDelete = activities
      .slice(MAX_RECENTLY_VIEWED)
      .map((activity) => activity._id);

    await ProductActivity.deleteMany({
      _id: { $in: idsToDelete },
    });
  }

  // Notify all connected devices for this user.
  getIO()
    .to(`user:${userId}`)
    .emit('recentlyViewedUpdated');
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

  // Notify all connected devices that the user's
  // Recently Viewed history has changed after the merge.
  getIO()
    .to(`user:${userId}`)
    .emit('recentlyViewedUpdated');
};