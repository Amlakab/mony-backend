import mongoose, { Document, Schema } from 'mongoose';

export interface IBox {
  total: number;
  noteCount: number;
  lastUpdated: Date;
}

export interface IBatch extends Document {
  name: string;
  description: string;
  isActive: boolean;
  boxes: {
    box_5: IBox;
    box_10: IBox;
    box_50: IBox;
    box_100: IBox;
    box_200: IBox;
  };
  totalCollected: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BoxSchema: Schema = new Schema({
  total: { type: Number, default: 0 },
  noteCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

const BatchSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  boxes: {
    box_5: { type: BoxSchema, default: () => ({ total: 0, noteCount: 0 }) },
    box_10: { type: BoxSchema, default: () => ({ total: 0, noteCount: 0 }) },
    box_50: { type: BoxSchema, default: () => ({ total: 0, noteCount: 0 }) },
    box_100: { type: BoxSchema, default: () => ({ total: 0, noteCount: 0 }) },
    box_200: { type: BoxSchema, default: () => ({ total: 0, noteCount: 0 }) }
  },
  totalCollected: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IBatch>('Batch', BatchSchema);