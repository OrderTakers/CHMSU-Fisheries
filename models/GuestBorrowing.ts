import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { randomBytes } from "crypto";

export interface IGuestBorrowing extends Document {
  requestId: string;
  schoolId: string;
  lastName: string;
  firstName: string;
  email: string; // Added email field
  course: string;
  year: string;
  section: string;
  purpose: string;
  equipmentId: string; // Store as string (itemId, not ObjectId)
  equipmentName: string;
  borrowDuration: string;
  requestedDate: Date;
  status: 'pending' | 'approved' | 'declined' | 'returned';
  adminNotes?: string;
  
  // OTP Verification Fields
  otp?: string;
  otpExpires?: Date;
  isVerified: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const guestBorrowingSchema = new Schema({
  requestId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `GBR-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`,
  },
  schoolId: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 50 
  },
  lastName: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 50 
  },
  firstName: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 50 
  },
  email: { // Added email field
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  course: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 100 
  },
  year: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 20 
  },
  section: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 20 
  },
  purpose: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 1000 
  },
  equipmentId: { 
    type: String, 
    required: true,
    // No ref here since it's not an ObjectId
  },
  equipmentName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  borrowDuration: { 
    type: String, 
    required: true,
    enum: ["1 day", "3 days", "1 week", "2 weeks", "1 month"],
    default: "1 week"
  },
  requestedDate: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    required: true,
    enum: ["pending", "approved", "declined", "returned"],
    default: "pending"
  },
  adminNotes: { 
    type: String, 
    trim: true, 
    maxlength: 500 
  },
  
  // OTP Verification Fields
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
});

// Index for faster queries
guestBorrowingSchema.index({ email: 1, status: 1 });
guestBorrowingSchema.index({ otp: 1 });
guestBorrowingSchema.index({ schoolId: 1, equipmentId: 1, status: 1 });

// Prevent duplicate pending requests for same equipment by same student
guestBorrowingSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'pending') {
    const existingRequest = await mongoose.models.GuestBorrowing.findOne({
      schoolId: this.schoolId,
      equipmentId: this.equipmentId,
      status: 'pending'
    });
    
    if (existingRequest) {
      const err = new Error('You already have a pending request for this equipment');
      next(err);
      return;
    }
  }
  next();
});

const GuestBorrowing: Model<IGuestBorrowing> = mongoose.models.GuestBorrowing || 
  mongoose.model<IGuestBorrowing>("GuestBorrowing", guestBorrowingSchema);
export default GuestBorrowing;