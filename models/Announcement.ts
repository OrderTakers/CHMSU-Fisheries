// backend/models/Announcement.ts
import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// Interface for ReadBy subdocument
interface IReadBy {
  user: Types.ObjectId;
  readAt: Date;
}

// Interface for Attachments subdocument
interface IAttachment {
  filename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  base64Data: string; // Store base64 data
  uploadedAt: Date;
}

// Interface for Statistics subdocument
interface IStatistics {
  totalRecipients: number;
  readCount: number;
  clickCount: number;
}

// Main Announcement Interface
export interface IAnnouncement extends Document {
  announcementId: string;
  title: string;
  message: string;
  type: 'general' | 'maintenance' | 'urgent' | 'update' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetAudience: ('all' | 'students' | 'faculty' | 'admin' | 'specific')[];
  specificUsers: Types.ObjectId[];
  scheduledFor?: Date;
  expiresAt?: Date;
  isActive: boolean;
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: Types.ObjectId;
  createdByName: string;
  readBy: IReadBy[];
  attachments: IAttachment[];
  statistics: IStatistics;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
interface AnnouncementModel extends Model<IAnnouncement> {
  generateAnnouncementId(): Promise<string>;
}

const announcementSchema = new Schema<IAnnouncement, AnnouncementModel>({
  announcementId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: 'TEMP-ID'
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters long'],
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: {
      values: ['general', 'maintenance', 'urgent', 'update', 'reminder'],
      message: '{VALUE} is not a valid announcement type'
    },
    default: 'general'
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: '{VALUE} is not a valid priority level'
    },
    default: 'medium'
  },
  targetAudience: {
    type: [String],
    required: [true, 'Target audience is required'],
    enum: {
      values: ['all', 'students', 'faculty', 'admin', 'specific'],
      message: '{VALUE} is not a valid audience type'
    },
    default: ['all'],
    validate: {
      validator: function(arr: string[]) {
        return Array.isArray(arr) && arr.length > 0;
      },
      message: 'Target audience must be a non-empty array'
    }
  },
  specificUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  scheduledFor: {
    type: Date,
    validate: {
      validator: function(this: IAnnouncement, value: Date) {
        if (!value) return true;
        return value > new Date();
      },
      message: 'Scheduled date must be in the future'
    }
  },
  expiresAt: {
    type: Date,
    validate: {
      validator: function(this: IAnnouncement, value: Date) {
        if (!value) return true;
        return value > new Date();
      },
      message: 'Expiration date must be in the future'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  createdByName: {
    type: String,
    required: [true, 'Creator name is required'],
    trim: true
  },
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    filename: {
      type: String,
      required: [true, 'Filename is required for attachments']
    },
    fileUrl: {
      type: String,
      default: ''
    },
    fileType: {
      type: String,
      required: [true, 'File type is required for attachments']
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required for attachments'],
      min: [0, 'File size cannot be negative']
    },
    base64Data: {
      type: String,
      required: [true, 'Base64 data is required for attachments']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  statistics: {
    totalRecipients: {
      type: Number,
      default: 0,
      min: [0, 'Total recipients cannot be negative']
    },
    readCount: {
      type: Number,
      default: 0,
      min: [0, 'Read count cannot be negative']
    },
    clickCount: {
      type: Number,
      default: 0,
      min: [0, 'Click count cannot be negative']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for 'id'
announcementSchema.virtual('id').get(function(this: IAnnouncement) {
  return (this._id as Types.ObjectId).toHexString();
});

// Virtual for checking if announcement is expired
announcementSchema.virtual('isExpired').get(function(this: IAnnouncement) {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual for checking if announcement is scheduled
announcementSchema.virtual('isScheduled').get(function(this: IAnnouncement) {
  if (!this.scheduledFor) return false;
  return new Date() < this.scheduledFor;
});

// Static method to generate announcement ID
announcementSchema.statics.generateAnnouncementId = async function(): Promise<string> {
  const AnnouncementModel = this as AnnouncementModel;
  let announcementId: string = '';
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    attempts++;
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    announcementId = `ANN-${timestamp}-${randomStr}`;
    
    try {
      const existingAnnouncement = await AnnouncementModel.findOne({ announcementId });
      if (!existingAnnouncement) {
        isUnique = true;
      }
    } catch (error) {
      console.error('Error checking for unique announcement ID:', error);
    }
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate unique announcement ID after 10 attempts');
  }
  
  return announcementId;
};

// Pre-save middleware for generating announcement ID
announcementSchema.pre('save', async function(this: IAnnouncement, next) {
  try {
    console.log('Pre-save middleware for announcement:', {
      isNew: this.isNew,
      hasAnnouncementId: !!this.announcementId,
      currentAnnouncementId: this.announcementId
    });

    // Generate announcement ID for new documents
    if (this.isNew || this.announcementId === 'TEMP-ID') {
      console.log('Generating new announcement ID...');
      const AnnouncementModel = this.constructor as AnnouncementModel;
      const newAnnouncementId = await AnnouncementModel.generateAnnouncementId();
      console.log('Generated announcementId:', newAnnouncementId);
      this.announcementId = newAnnouncementId;
    }
    
    // Check expiration
    if (this.expiresAt && new Date() > this.expiresAt) {
      this.isActive = false;
    }
    
    // Set publishedAt if publishing for the first time
    if (this.isPublished && !this.publishedAt) {
      this.publishedAt = new Date();
    }
    
    next();
  } catch (error) {
    console.error('Error in announcement pre-save middleware:', error);
    next(error as Error);
  }
});

// Indexes for better query performance
announcementSchema.index({ announcementId: 1 });
announcementSchema.index({ isActive: 1, isPublished: 1 });
announcementSchema.index({ type: 1, priority: 1 });
announcementSchema.index({ createdBy: 1 });
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ scheduledFor: 1 });
announcementSchema.index({ expiresAt: 1 });

// Compound indexes for common queries
announcementSchema.index({ isActive: 1, isPublished: 1, type: 1 });
announcementSchema.index({ targetAudience: 1, isActive: 1 });

// Create and export the model
const Announcement = mongoose.model<IAnnouncement, AnnouncementModel>('Announcement', announcementSchema);
export default Announcement;