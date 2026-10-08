import mongoose, { Document, Schema } from 'mongoose';
export interface IInternalEvent extends Document { eventId: string; type: string; payload: Record<string, unknown>; status: 'PROCESSING'|'PROCESSED'|'FAILED'; }
const schema = new Schema<IInternalEvent>({ eventId: { type: String, required: true, unique: true }, type: { type: String, required: true }, payload: { type: Schema.Types.Mixed, required: true }, status: { type: String, enum: ['PROCESSING','PROCESSED','FAILED'], default: 'PROCESSING' } }, { timestamps: true });
export default mongoose.model<IInternalEvent>('InternalEvent', schema);
