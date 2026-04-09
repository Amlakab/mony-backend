import mongoose, { Document, Schema } from 'mongoose';

export interface ICollectionEvent extends Document {
  batchId: mongoose.Types.ObjectId;
  boxNumber: number;
  amount: number;
  donorName: string;
  donorPhone: string;
  timestamp: Date;
}

const CollectionEventSchema: Schema = new Schema({
  batchId: {
    type: Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  boxNumber: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
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
  }
});

CollectionEventSchema.index({ batchId: 1, timestamp: -1 });

export default mongoose.model<ICollectionEvent>('CollectionEvent', CollectionEventSchema);