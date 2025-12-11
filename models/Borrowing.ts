import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBorrowing extends Document {
  equipmentId: Types.ObjectId;
  borrowerType: 'student' | 'faculty' | 'guest';
  borrowerId: string;
  borrowerName: string;
  borrowerEmail: string;
  purpose: string;
  quantity: number;
  description?: string;
  remarks?: string;
  status: 'pending' | 'approved' | 'rejected' | 'released' | 'returned' | 'overdue' | 'return_requested' | 'return_approved' | 'return_rejected';
  requestedDate: Date;
  intendedBorrowDate: Date;
  intendedReturnDate: Date;
  approvedDate?: Date;
  releasedDate?: Date;
  actualReturnDate?: Date;
  approvedBy?: string;
  releasedBy?: string;
  receivedBy?: string;
  adminRemarks?: string;
  conditionOnBorrow?: string;
  conditionOnReturn?: string;
  damageReport?: string;
  roomAssigned?: string; // Room where equipment was borrowed from/returned to
  laboratoryId?: string;
  penaltyFee: number;
  isOverdue: boolean;
  // Return process fields
  returnRequestDate?: Date;
  returnApprovedDate?: Date;
  returnStatus?: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const borrowingSchema: Schema<IBorrowing> = new Schema<IBorrowing>({
  equipmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  borrowerType: {
    type: String,
    required: true,
    enum: ['student', 'faculty', 'guest'],
    default: 'student'
  },
  borrowerId: {
    type: String,
    required: true
  },
  borrowerName: {
    type: String,
    required: true,
    trim: true
  },
  borrowerEmail: {
    type: String,
    required: true,
    trim: true
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
  description: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'released', 'returned', 'overdue', 'return_requested', 'return_approved', 'return_rejected'],
    default: 'pending'
  },
  requestedDate: {
    type: Date,
    default: Date.now
  },
  intendedBorrowDate: {
    type: Date,
    required: true
  },
  intendedReturnDate: {
    type: Date,
    required: true
  },
  approvedDate: {
    type: Date
  },
  releasedDate: {
    type: Date
  },
  actualReturnDate: {
    type: Date
  },
  approvedBy: {
    type: String
  },
  releasedBy: {
    type: String
  },
  receivedBy: {
    type: String
  },
  adminRemarks: {
    type: String,
    trim: true
  },
  conditionOnBorrow: {
    type: String,
    trim: true
  },
  conditionOnReturn: {
    type: String,
    trim: true
  },
  damageReport: {
    type: String,
    trim: true
  },
  roomAssigned: {
    type: String,
    default: '',
    trim: true
  },
  laboratoryId: {
    type: String,
    default: 'default-lab',
  },
  penaltyFee: {
    type: Number,
    default: 0,
    min: 0
  },
  // Return process fields
  returnRequestDate: {
    type: Date
  },
  returnApprovedDate: {
    type: Date
  },
  returnStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  }
}, { 
  timestamps: true 
});

// Indexes
borrowingSchema.index({ equipmentId: 1, status: 1 });
borrowingSchema.index({ borrowerId: 1, status: 1 });
borrowingSchema.index({ intendedBorrowDate: 1 });
borrowingSchema.index({ intendedReturnDate: 1 });
borrowingSchema.index({ roomAssigned: 1 });

// Virtual for overdue status
borrowingSchema.virtual('isOverdue').get(function(this: IBorrowing) {
  if (this.status === 'released' && this.intendedReturnDate < new Date()) {
    return true;
  }
  return false;
});

// Pre-save middleware to handle overdue status
borrowingSchema.pre('save', function(next) {
  if (this.status === 'released' && this.intendedReturnDate < new Date()) {
    this.status = 'overdue';
  }
  next();
});

// Static method to approve borrowing and update inventory
borrowingSchema.statics.approveBorrowing = async function(borrowingId: string, approvedBy: string, remarks?: string) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const borrowing = await this.findById(borrowingId).session(session);
    if (!borrowing) {
      throw new Error('Borrowing request not found');
    }

    if (borrowing.status !== 'pending') {
      throw new Error('Borrowing request is not pending');
    }

    // Get the equipment with session for transaction
    const equipment = await mongoose.model('Inventory').findById(borrowing.equipmentId).session(session);
    if (!equipment) {
      throw new Error('Equipment not found');
    }

    // Check if enough quantity is available
    if (equipment.availableQuantity < borrowing.quantity) {
      throw new Error(`Not enough items available. Requested: ${borrowing.quantity}, Available: ${equipment.availableQuantity}`);
    }

    // Update equipment available quantity
    equipment.availableQuantity -= borrowing.quantity;
    equipment.borrowedQuantity = (equipment.borrowedQuantity || 0) + borrowing.quantity;
    
    // Set roomAssigned from equipment's room
    if (equipment.roomAssigned) {
      borrowing.roomAssigned = equipment.roomAssigned;
    }
    
    await equipment.save({ session });

    // Update borrowing status
    borrowing.status = 'approved';
    borrowing.approvedBy = approvedBy;
    borrowing.approvedDate = new Date();
    borrowing.adminRemarks = remarks;
    await borrowing.save({ session });

    await session.commitTransaction();
    
    return borrowing;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Static method to handle item return
borrowingSchema.statics.returnItem = async function(borrowingId: string, conditionOnReturn?: string, damageReport?: string, receivedBy?: string) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const borrowing = await this.findById(borrowingId).session(session);
    if (!borrowing) {
      throw new Error('Borrowing request not found');
    }

    if (borrowing.status !== 'approved' && borrowing.status !== 'released') {
      throw new Error('Item is not currently borrowed');
    }

    // Update equipment quantity
    const equipment = await mongoose.model('Inventory').findById(borrowing.equipmentId).session(session);
    if (equipment) {
      equipment.availableQuantity += borrowing.quantity;
      equipment.borrowedQuantity = Math.max(0, (equipment.borrowedQuantity || 0) - borrowing.quantity);
      await equipment.save({ session });
    }

    // Update borrowing
    borrowing.status = 'returned';
    borrowing.actualReturnDate = new Date();
    borrowing.conditionOnReturn = conditionOnReturn;
    borrowing.damageReport = damageReport;
    borrowing.receivedBy = receivedBy;
    await borrowing.save({ session });

    await session.commitTransaction();
    
    return borrowing;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Static methods
borrowingSchema.statics.findActiveBorrowings = function() {
  return this.find({ 
    status: { $in: ['approved', 'released'] } 
  }).populate('equipmentId');
};

borrowingSchema.statics.findByBorrower = function(borrowerId: string) {
  return this.find({ borrowerId })
    .populate('equipmentId')
    .sort({ requestedDate: -1 });
};

const Borrowing: Model<IBorrowing> = mongoose.model<IBorrowing>('Borrowing', borrowingSchema);

export default Borrowing;