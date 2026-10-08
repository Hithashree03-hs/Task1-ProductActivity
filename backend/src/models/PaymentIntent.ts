import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentIntentItem {
  cartItemId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

export interface IPaymentIntent extends Document {
  userId: mongoose.Types.ObjectId;
  items: IPaymentIntentItem[];
  totalAmount: number;
  amountMinor: number;
  currency: string;
  providerOrderId: string;
  providerPaymentId?: string;
  orderId?: mongoose.Types.ObjectId;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUND_PENDING' | 'REFUNDED';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IPaymentIntent>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    cartItemId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    size: { type: String, trim: true },
    color: { type: String, trim: true },
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  amountMinor: { type: Number, required: true, min: 1 },
  currency: { type: String, required: true, default: 'INR' },
  providerOrderId: { type: String, required: true, unique: true },
  providerPaymentId: { type: String, sparse: true, unique: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  status: { type: String, enum: ['CREATED', 'PAID', 'FAILED', 'EXPIRED', 'REFUND_PENDING', 'REFUNDED'], default: 'CREATED' },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

schema.index({ userId: 1, createdAt: -1 });
export default mongoose.model<IPaymentIntent>('PaymentIntent', schema);
