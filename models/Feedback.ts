import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// Interface for User Role Details
interface IUserRoleDetails {
  year?: number;
  section?: string;
}

// Interface for Admin Reply
interface IAdminReply {
  message?: string;
  repliedBy?: Types.ObjectId;
  repliedAt?: Date;
}

// Interface for Feedback Document
export interface IFeedback extends Document {
  feedbackId: string;
  rating: number;
  comment?: string;
  userRole: 'student' | 'faculty';
  userRoleDetails?: IUserRoleDetails;
  anonymousUserId?: string; // NEW: Anonymous user identifier
  adminReply?: IAdminReply;
  status: 'pending' | 'replied' | 'resolved';
  appVersion?: string;
  deviceInfo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  id: string;
  hasReply: boolean;
}

// Interface for Feedback Model with static methods
interface IFeedbackModel extends Model<IFeedback> {
  generateFeedbackId(): Promise<string>;
}

// Feedback Schema
const feedbackSchema = new Schema<IFeedback, IFeedbackModel>(
  {
    feedbackId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: function (this: IFeedback) {
        return `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      },
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5',
      },
    },
    comment: {
      type: String,
      required: false,
      trim: true,
      maxlength: 1000,
    },
    userRole: {
      type: String,
      required: true,
      enum: ['student', 'faculty'],
    },
    // Anonymous user reference - we only store role and year/section for analytics
    userRoleDetails: {
      year: {
        type: Number,
        required: false,
        min: 1,
        max: 4,
      },
      section: {
        type: String,
        required: false,
        trim: true,
        uppercase: true,
      },
    },
    // NEW: Anonymous user identifier (hashed user ID for personal tracking)
    anonymousUserId: {
      type: String,
      required: false,
      trim: true,
    },
    // Admin reply fields
    adminReply: {
      message: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
      repliedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      repliedAt: {
        type: Date,
      },
    },
    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'replied', 'resolved'],
      default: 'pending',
    },
    // Analytics
    appVersion: {
      type: String,
      trim: true,
    },
    deviceInfo: {
      type: String,
      trim: true,
    },
    // Soft delete
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for 'id'
feedbackSchema.virtual('id').get(function (this: IFeedback) {
  return (this._id as Types.ObjectId).toHexString();
});

// Virtual for checking if feedback has admin reply
feedbackSchema.virtual('hasReply').get(function (this: IFeedback) {
  return !!(this.adminReply && this.adminReply.message);
});

// Static method to generate feedback ID
feedbackSchema.statics.generateFeedbackId = async function (): Promise<string> {
  let feedbackId: string = '';
  let isUnique = false;

  while (!isUnique) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    feedbackId = `FB-${timestamp}-${randomStr}`;

    const existingFeedback = await this.findOne({ feedbackId });
    if (!existingFeedback) {
      isUnique = true;
    }
  }

  return feedbackId;
};

// Pre-save middleware
feedbackSchema.pre('save', async function (next) {
  try {
    // Type guard to ensure 'this' is IFeedback
    const feedback = this as unknown as IFeedback;

    if (this.isNew || feedback.feedbackId.startsWith('TEMP-')) {
      const newFeedbackId = await (this.constructor as IFeedbackModel).generateFeedbackId();
      feedback.feedbackId = newFeedbackId;
    }

    // Set userRoleDetails based on user role
    if (feedback.userRole === 'student' && feedback.userRoleDetails) {
      if (!feedback.userRoleDetails.year || !feedback.userRoleDetails.section) {
        const error = new Error('Year and section are required for student feedback');
        return next(error);
      }
    }

    next();
  } catch (error: unknown) {
    console.error('Error in feedback pre-save middleware:', error);
    
    if (error instanceof Error) {
      next(error);
    } else {
      // Handle unknown error type
      next(new Error('An unknown error occurred'));
    }
  }
});

// Index for better query performance
feedbackSchema.index({ userRole: 1, createdAt: -1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ isActive: 1 });
feedbackSchema.index({ anonymousUserId: 1 }); // NEW: Index for anonymous user tracking

// Ensure virtuals are included in toJSON and toObject
feedbackSchema.set('toJSON', { virtuals: true });
feedbackSchema.set('toObject', { virtuals: true });

// Create and export the model
const Feedback: IFeedbackModel = mongoose.model<IFeedback, IFeedbackModel>('Feedback', feedbackSchema);
export default Feedback;