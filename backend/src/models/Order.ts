import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURNED';
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  providerOrderId?: string;
  providerPaymentId?: string;
  invoiceNumber: string;
  deliveryTimeline: Array<{ status: string; note: string; at: Date }>;
  cancellationReason?: string;
  returnReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    size: {
      type: String,
      trim: true,
    },

    color: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      default: [],
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED'],
      default: 'PROCESSING',
    },
    paymentMethod: { type: String, enum: ['CASH_ON_DELIVERY', 'CARD', 'UPI', 'WALLET', 'RAZORPAY'], default: 'CASH_ON_DELIVERY' },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    providerOrderId: { type: String, sparse: true, unique: true },
    providerPaymentId: { type: String, sparse: true, unique: true },
    invoiceNumber: { type: String, unique: true, sparse: true },
    deliveryTimeline: [{ status: { type: String, required: true }, note: { type: String, default: '' }, at: { type: Date, default: Date.now } }],
    cancellationReason: { type: String, trim: true, maxlength: 500 },
    returnReason: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({
  userId: 1,
  createdAt: -1,
});
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ userId: 1, paymentMethod: 1, createdAt: -1 });

const Order = mongoose.model<IOrder>('Order', orderSchema);

export default Order;
