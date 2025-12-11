import { Schema, model, models, Document, Types } from 'mongoose';

export interface IApproval extends Document {
  _id: Types.ObjectId;
  borrowingId: Types.ObjectId;
  equipmentId: Types.ObjectId;
  studentId: string;
  studentName: string;
  studentEmail: string;
  equipmentName: string;
  itemId: string;
  purpose: string;
  quantity: number;
  intendedBorrowDate: Date;
  intendedReturnDate: Date;
  requestedDate: Date;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  roomAssigned: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  remarks?: string;
  approvedBy?: string;
  approvedDate?: Date;
  rejectedBy?: string;
  rejectedDate?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalSchema = new Schema<IApproval>({
  borrowingId: {
    type: Schema.Types.ObjectId,
    ref: 'Borrowing',
    required: true,
    index: true
  },
  equipmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  studentEmail: {
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
  itemId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  intendedBorrowDate: {
    type: Date,
    required: true
  },
  intendedReturnDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(this: IApproval, value: Date) {
        return value > this.intendedBorrowDate;
      },
      message: 'Return date must be after borrow date'
    }
  },
  requestedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  roomAssigned: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  remarks: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvedDate: {
    type: Date
  },
  rejectedBy: {
    type: String,
    trim: true
  },
  rejectedDate: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true, // This automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
ApprovalSchema.index({ status: 1, priority: -1, createdAt: -1 });
ApprovalSchema.index({ studentId: 1, status: 1 });
ApprovalSchema.index({ equipmentId: 1, status: 1 });
ApprovalSchema.index({ intendedBorrowDate: 1, intendedReturnDate: 1 });

// Virtual for checking if request is overdue (if still pending and intendedBorrowDate has passed)
ApprovalSchema.virtual('isOverdue').get(function(this: IApproval) {
  return this.status === 'pending' && new Date() > this.intendedBorrowDate;
});

// Virtual for duration in days
ApprovalSchema.virtual('durationDays').get(function(this: IApproval) {
  const diffTime = Math.abs(this.intendedReturnDate.getTime() - this.intendedBorrowDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to update updatedAt
ApprovalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find pending approvals
ApprovalSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ priority: -1, createdAt: 1 });
};

// Static method to find approvals by student
ApprovalSchema.statics.findByStudent = function(studentId: string) {
  return this.find({ studentId }).sort({ createdAt: -1 });
};

// Static method to find approvals by equipment
ApprovalSchema.statics.findByEquipment = function(equipmentId: Types.ObjectId) {
  return this.find({ equipmentId }).sort({ createdAt: -1 });
};

// Static method to find urgent approvals
ApprovalSchema.statics.findUrgent = function() {
  return this.find({ priority: 'urgent', status: 'pending' }).sort({ createdAt: 1 });
};

// Instance method to approve request
ApprovalSchema.methods.approve = function(approvedBy: string, remarks?: string) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedDate = new Date();
  if (remarks) this.remarks = remarks;
  return this.save();
};

// Instance method to reject request
ApprovalSchema.methods.reject = function(rejectedBy: string, rejectionReason: string, remarks?: string) {
  this.status = 'rejected';
  this.rejectedBy = rejectedBy;
  this.rejectedDate = new Date();
  this.rejectionReason = rejectionReason;
  if (remarks) this.remarks = remarks;
  return this.save();
};

// Instance method to check if can be approved (not expired)
ApprovalSchema.methods.canBeApproved = function() {
  return this.status === 'pending' && new Date() <= this.intendedBorrowDate;
};

// Check if the model exists before creating it
export const Approval = models.Approval || model<IApproval>('Approval', ApprovalSchema);

export default Approval;