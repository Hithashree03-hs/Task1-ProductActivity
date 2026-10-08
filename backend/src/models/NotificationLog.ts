import mongoose, { Schema, Document } from 'mongoose';
export interface INotificationLog extends Document { userId: mongoose.Types.ObjectId; category: string; title: string; body: string; status: 'SENT'|'FAILED'|'SCHEDULED'; ticketId?: string; scheduledAt?: Date; }
const schema = new Schema<INotificationLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, category: { type: String, required: true },
  title: { type: String, required: true }, body: { type: String, required: true },
  status: { type: String, enum: ['SENT','FAILED','SCHEDULED'], required: true }, ticketId: String, scheduledAt: Date,
}, { timestamps: true });
schema.index({ userId: 1, createdAt: -1 });
export default mongoose.model<INotificationLog>('NotificationLog', schema);
