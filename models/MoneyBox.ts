import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction {
  amount: number;
  donorName: string;
  donorPhone: string;
  createdAt: Date;
}

export interface IMoneyBox extends Document {
  batchId: mongoose.Types.ObjectId;
  boxNumber: number;
  totalAmount: number;
  transactions: ITransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const MoneyBoxSchema: Schema = new Schema({
  batchId: {
    type: Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  boxNumber: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  transactions: [{
    amount: { type: Number, required: true },
    donorName: { type: String, default: 'Anonymous' },
    donorPhone: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

MoneyBoxSchema.index({ batchId: 1, boxNumber: 1 }, { unique: true });

export default mongoose.model<IMoneyBox>('MoneyBox', MoneyBoxSchema);