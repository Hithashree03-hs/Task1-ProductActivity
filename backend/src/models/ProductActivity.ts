import mongoose, { Document, Schema } from 'mongoose';

export enum ActivityType {
  VIEW = 'VIEW',
  CART = 'CART',
  WISHLIST = 'WISHLIST',
  PURCHASE = 'PURCHASE',
  RECOMMENDATION_VIEW = 'RECOMMENDATION_VIEW',
}

export interface IProductActivity extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  activityType: ActivityType;
  viewedAt: Date;
}

const productActivitySchema = new Schema<IProductActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    activityType: {
      type: String,
      enum: Object.values(ActivityType),
      required: true,
    },

    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate records for the same
// user + product + activity type.
productActivitySchema.index(
  {
    userId: 1,
    productId: 1,
    activityType: 1,
  },
  {
    unique: true,
  }
);

// Makes Recently Viewed queries fast.
productActivitySchema.index({
  userId: 1,
  activityType: 1,
  viewedAt: -1,
});

const ProductActivity = mongoose.model<IProductActivity>(
  'ProductActivity',
  productActivitySchema
);

export default ProductActivity;
