import mongoose, { Document, Schema } from 'mongoose';

export interface INoteBreakdown {
  noteType: number;
  targetBox: string;
  image: string;
}

export interface ITransaction extends Document {
  batchId: mongoose.Types.ObjectId;
  batchName: string;
  totalAmount: number;
  breakdown: INoteBreakdown[];
  donorName: string;
  donorPhone: string;
  timestamp: Date;
  sequenceId: number;
}

const NoteBreakdownSchema: Schema = new Schema({
  noteType: { type: Number, required: true },
  targetBox: { type: String, required: true },
  image: { type: String, required: true }
});

const TransactionSchema: Schema = new Schema({
  batchId: {
    type: Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  batchName: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  breakdown: [NoteBreakdownSchema],
  donorName: {
    type: String,
    default: 'Anonymous'
  },
  donorPhone: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sequenceId: {
    type: Number,
    default: 0
  }
});

TransactionSchema.index({ timestamp: -1 });
TransactionSchema.index({ batchId: 1, timestamp: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);