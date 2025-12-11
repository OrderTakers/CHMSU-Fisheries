import { Schema, model, models, Document } from 'mongoose';

export interface IRoom extends Document {
  name: string;
  laboratoryId: string;
  location?: string;
  metadata?: {
    roomNumber: string;
    building: string;
    floor: string;
    capacity?: number;
  };
}

const roomSchema = new Schema<IRoom>({
  name: { type: String, required: true, trim: true },
  laboratoryId: { type: String, required: true, ref: 'Laboratory' },
  location: { type: String, maxlength: 50, trim: true },
  metadata: {
    roomNumber: { type: String, trim: true },
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    capacity: { type: Number },
  },
}, { timestamps: true });

// Create the model
const Room = models.Room || model<IRoom>('Room', roomSchema);

export default Room; // Add default export