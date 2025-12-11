import { Schema, model, models, Document } from 'mongoose';

export interface ILaboratory extends Document {
  name: string;
  location?: string;
}

const laboratorySchema = new Schema<ILaboratory>({
  name: { type: String, required: true, trim: true },
  location: { type: String, maxlength: 50, trim: true },
}, { timestamps: true });

// Create the model
const Laboratory = models.Laboratory || model<ILaboratory>('Laboratory', laboratorySchema);

export default Laboratory; // Add default export