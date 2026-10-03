import ProductActivity, {
  ActivityType,
} from '../models/ProductActivity';
import Order from '../models/Order';
import mongoose from 'mongoose';

export const getContinueShoppingProducts = async (
  userId: string
) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Get products the user has purchased in completed orders.
  const completedOrders = await Order.find({
    userId: userObjectId,
    status: 'COMPLETED',
  })
    .select('items.productId')
    .lean();

  const purchasedProductIds = new Set<string>();

  for (const order of completedOrders) {
    for (const item of order.items) {
      purchasedProductIds.add(item.productId.toString());
    }
  }

  // Get recently viewed products.
  const viewedProducts = await ProductActivity.find({
    userId: userObjectId,
    activityType: ActivityType.VIEW,
  })
    .sort({ viewedAt: -1 })
    .limit(20)
    .populate('productId')
    .lean();

  // Keep only products that have not been purchased.
  return viewedProducts
    .filter((activity) => {
      if (!activity.productId) {
        return false;
      }

      const productId = activity.productId._id.toString();

      return !purchasedProductIds.has(productId);
    })
    .map((activity) => ({
      product: activity.productId,
      viewedAt: activity.viewedAt,
    }));
};