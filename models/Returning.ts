import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReturning extends Document {
  borrowingId: mongoose.Types.ObjectId;
  equipmentId: mongoose.Types.ObjectId;
  borrowerType: 'student' | 'faculty' | 'guest';
  borrowerId: mongoose.Types.ObjectId;
  borrowerName: string;
  borrowerEmail: string;
  equipmentName: string;
  equipmentItemId: string;
  intendedReturnDate: Date;
  actualReturnDate: Date;
  conditionBefore: string;
  conditionAfter: string;
  damageDescription: string;
  damageImages: string[];
  damageSeverity: 'None' | 'Minor' | 'Moderate' | 'Severe';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  isLate: boolean;
  lateDays: number;
  penaltyFee: number;
  damageFee: number;
  totalFee: number;
  isFeePaid: boolean;
  remarks: string;
  roomReturned: string;
  imageMetadata: Record<string, any>;
  returnDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReturningSchema: Schema<IReturning> = new Schema(
  {
    borrowingId: {
      type: Schema.Types.ObjectId,
      ref: 'Borrowing',
      required: true
    },
    equipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true
    },
    borrowerType: {
      type: String,
      enum: ['student', 'faculty', 'guest'],
      required: true
    },
    borrowerId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'borrowerType'
    },
    borrowerName: {
      type: String,
      required: true,
      trim: true
    },
    borrowerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    equipmentName: {
      type: String,
      required: true,
      trim: true
    },
    equipmentItemId: {
      type: String,
      required: true,
      trim: true
    },
    intendedReturnDate: {
      type: Date,
      required: true
    },
    actualReturnDate: {
      type: Date,
      required: true
    },
    conditionBefore: {
      type: String,
      required: true,
      trim: true
    },
    conditionAfter: {
      type: String,
      required: true,
      trim: true
    },
    damageDescription: {
      type: String,
      default: ''
    },
    damageImages: [{
      type: String
    }],
    damageSeverity: {
      type: String,
      enum: ['None', 'Minor', 'Moderate', 'Severe'],
      default: 'None'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending'
    },
    isLate: {
      type: Boolean,
      default: false
    },
    lateDays: {
      type: Number,
      default: 0,
      min: 0
    },
    penaltyFee: {
      type: Number,
      default: 0,
      min: 0
    },
    damageFee: {
      type: Number,
      default: 0,
      min: 0
    },
    totalFee: {
      type: Number,
      default: 0,
      min: 0
    },
    isFeePaid: {
      type: Boolean,
      default: false
    },
    remarks: {
      type: String,
      default: ''
    },
    roomReturned: {
      type: String,
      required: true,
      trim: true
    },
    imageMetadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    returnDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Pre-save middleware
ReturningSchema.pre<IReturning>('save', function(next) {
  // Calculate total fee
  this.totalFee = this.penaltyFee + this.damageFee;
  
  // Calculate late days
  if (this.actualReturnDate > this.intendedReturnDate) {
    const timeDiff = this.actualReturnDate.getTime() - this.intendedReturnDate.getTime();
    this.lateDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    this.isLate = this.lateDays > 0;
  } else {
    this.lateDays = 0;
    this.isLate = false;
  }
  
  next();
});

// Indexes
ReturningSchema.index({ borrowingId: 1 });
ReturningSchema.index({ equipmentId: 1 });
ReturningSchema.index({ borrowerId: 1 });
ReturningSchema.index({ status: 1 });
ReturningSchema.index({ createdAt: -1 });

const Returning: Model<IReturning> = mongoose.models.Returning || mongoose.model<IReturning>('Returning', ReturningSchema);

export default Returning;