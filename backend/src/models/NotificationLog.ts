import mongoose, { Schema, Document } from 'mongoose';
export interface INotificationLog extends Document { userId: mongoose.Types.ObjectId; category: string; title: string; body: string; status: 'SENT'|'DELIVERED'|'FAILED'|'SCHEDULED'|'SENDING'|'CANCELLED'; ticketId?: string; deviceHash?: string; scheduledAt?: Date; receiptCheckedAt?: Date; }
const schema = new Schema<INotificationLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, category: { type: String, required: true },
  title: { type: String, required: true }, body: { type: String, required: true },
  status: { type: String, enum: ['SENT','DELIVERED','FAILED','SCHEDULED','SENDING','CANCELLED'], required: true }, ticketId: String, deviceHash: String, scheduledAt: Date, receiptCheckedAt: Date,
}, { timestamps: true });
schema.index({ userId: 1, createdAt: -1 });
export default mongoose.model<INotificationLog>('NotificationLog', schema);
