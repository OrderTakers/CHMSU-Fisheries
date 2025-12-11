import { Schema, model, models, Document, Types } from 'mongoose';

export interface IQRCode extends Document {
  roomId: Types.ObjectId;
  laboratoryId: Types.ObjectId;
  code: string;
  isActive: boolean;
  expiresAt?: Date;
  createdBy: Types.ObjectId;
  purpose: 'attendance' | 'equipment' | 'general';
}

const qrCodeSchema = new Schema<IQRCode>({
  roomId: { 
    type: Schema.Types.ObjectId, 
    required: true, 
    ref: 'Room' 
  },
  laboratoryId: { 
    type: Schema.Types.ObjectId, 
    required: true, 
    ref: 'Laboratory' 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  expiresAt: { 
    type: Date 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    required: true, 
    ref: 'User' 
  },
  purpose: {
    type: String,
    enum: ['attendance', 'equipment', 'general'],
    default: 'attendance'
  }
}, { 
  timestamps: true 
});

qrCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
qrCodeSchema.index({ roomId: 1, isActive: 1 });

export const QRCode = models.QRCode || model<IQRCode>('QRCode', qrCodeSchema);