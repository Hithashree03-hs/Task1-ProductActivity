import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentEvent extends Document {
  providerEventId: string;
  orderId: mongoose.Types.ObjectId;
  type: string;
  payload: Record<string, unknown>;
  processedAt: Date;
}

const schema = new Schema<IPaymentEvent>({
  providerEventId: { type: String, required: true, unique: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  type: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  processedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ orderId: 1, createdAt: -1 });
export default mongoose.model<IPaymentEvent>('PaymentEvent', schema);
