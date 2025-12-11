// models/Disposal.ts
import mongoose, { Schema, Document, Model, models } from 'mongoose';

export interface IDisposal extends Document {
  inventoryItem: mongoose.Types.ObjectId;
  itemId: string;
  equipmentName: string;
  category: string;
  reason: string;
  description: string;
  disposedBy: string;
  disposedById?: mongoose.Types.ObjectId;
  originalCost: number;
  salvageValue: number;
  disposalMethod: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
  disposalDate: Date;
  disposalQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const DisposalSchema: Schema = new Schema(
  {
    inventoryItem: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },
    itemId: {
      type: String,
      required: true,
    },
    equipmentName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    disposedBy: {
      type: String,
      required: true,
    },
    disposedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    originalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    salvageValue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    disposalMethod: {
      type: String,
      required: true,
      enum: ['Recycle', 'Landfill', 'Incineration', 'Hazardous Waste', 'Donation', 'Other'],
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    notes: {
      type: String,
      default: '',
    },
    disposalDate: {
      type: Date,
      required: true,
    },
    disposalQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for better query performance
DisposalSchema.index({ inventoryItem: 1 });
DisposalSchema.index({ status: 1 });
DisposalSchema.index({ disposalDate: 1 });

const Disposal: Model<IDisposal> = models.Disposal || mongoose.model<IDisposal>('Disposal', DisposalSchema);

export default Disposal;