import { Schema, model, models, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  userId: Types.ObjectId;
  roomId: Types.ObjectId;
  laboratoryId: Types.ObjectId;
  scanTime: Date;
  status: 'present' | 'late' | 'absent';
  type: 'check-in' | 'check-out';
  scannedBy: 'qr' | 'manual';
  session?: string;
  notes?: string;
}

const attendanceSchema = new Schema<IAttendance>({
  userId: { 
    type: Schema.Types.ObjectId, 
    required: true, 
    ref: 'User' 
  },
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
  scanTime: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ['present', 'late', 'absent'], 
    default: 'present' 
  },
  type: { 
    type: String, 
    enum: ['check-in', 'check-out'], 
    required: true 
  },
  scannedBy: { 
    type: String, 
    enum: ['qr', 'manual'], 
    default: 'qr' 
  },
  session: { 
    type: String, 
    trim: true 
  },
  notes: {
    type: String,
    maxlength: 500,
    trim: true
  }
}, { 
  timestamps: true 
});

attendanceSchema.index({ userId: 1, roomId: 1, scanTime: -1 });
attendanceSchema.index({ roomId: 1, scanTime: -1 });
attendanceSchema.index({ laboratoryId: 1, scanTime: -1 });

export const Attendance = models.Attendance || model<IAttendance>('Attendance', attendanceSchema);