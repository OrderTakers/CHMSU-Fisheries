// models/Inventory.ts
import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { randomBytes } from "crypto";

export interface MaintenanceHistory {
  date: string;
  action: string;
  performedBy: string;
  notes?: string;
}

export interface CalibrationHistory {
  date: string;
  performedBy: string;
  calibrator: string;
  notes?: string;
}

export interface Specification {
  name: string;
  value: string;
  unit?: string;
}

export interface IInventory extends Document {
  _id: Types.ObjectId;
  itemId: string;
  name: string;
  description?: string;
  specifications: Specification[];
  condition: string;
  category: string;
  cost: number;
  yearPurchased: string;
  maintenanceNeeds: string;
  calibration: string;
  roomAssigned: string;
  calibrator: string;
  images: string[];
  maintenanceHistory: MaintenanceHistory[];
  calibrationHistory: CalibrationHistory[];
  lastMaintenance?: string;
  nextMaintenance?: string;
  expirationDate?: Date | null;
  quantity: number;
  availableQuantity: number;
  status: string;
  qrCode: string;
  calibrationQuantity: number;
  disposalQuantity: number;
  maintenanceQuantity: number;
  borrowedQuantity: number;
  isDisposed: boolean;
  
  // ✅ NEW: Field to control borrowing capability
  canBeBorrowed: boolean;
  
  // Virtual properties
  id: string;
  isExpired: boolean;
  daysUntilExpiration: number | null;
  primaryImage: string;
  realAvailableQuantity: number;
  unavailableQuantity: number;
  maintenanceAdjustedAvailable: number;
  borrowingAvailableQuantity: number;
  isAvailable: boolean;
  
  // Methods
  canBeBorrowedCheck(requestedQuantity?: number): {
    canBorrow: boolean;
    reason: string;
    borrowingAvailableQuantity: number;
  };
  
  getRealTimeAvailability(
    startDate: Date,
    endDate: Date,
    requestedQuantity?: number
  ): Promise<{
    totalQuantity: number;
    availableQuantity: number;
    realAvailableQuantity: number;
    borrowingAvailableQuantity: number;
    bookedQuantity: number;
    remainingAvailable: number;
    canBorrow: boolean;
    maintenanceImpact: number;
    calibrationImpact: number;
    disposalImpact: number;
    borrowedImpact: number;
    borrowingRestricted: boolean;
    overlappingBookings?: number;
    reason: string;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
interface InventoryModel extends Model<IInventory> {
  findAvailableForBorrowing(borrowerType?: string): Promise<IInventory[]>;
  updateBorrowingStatus(
    itemId: string | Types.ObjectId,
    canBeBorrowed: boolean
  ): Promise<IInventory | null>;
}

const specificationSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  value: { 
    type: String, 
    required: true,
    trim: true
  },
  unit: { 
    type: String, 
    trim: true
  }
}, {
  _id: false
});

const maintenanceHistorySchema = new Schema({
  date: { 
    type: String, 
    required: true 
  },
  action: { 
    type: String, 
    required: true,
    trim: true
  },
  performedBy: { 
    type: String, 
    required: true,
    trim: true
  },
  notes: { 
    type: String,
    trim: true
  },
}, {
  _id: false
});

const calibrationHistorySchema = new Schema({
  date: { 
    type: String, 
    required: true 
  },
  performedBy: { 
    type: String, 
    required: true,
    trim: true
  },
  calibrator: { 
    type: String, 
    required: true,
    trim: true
  },
  notes: { 
    type: String,
    trim: true
  },
}, {
  _id: false
});

const inventorySchema = new Schema({
  itemId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    default: () => `INV-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`,
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  specifications: [specificationSchema],
  condition: { 
    type: String, 
    required: true, 
    enum: ["Excellent", "Good", "Fair", "Poor", "Damaged", "Needs Repair", "Out of Stock", "Under Maintenance"],
    default: "Good",
  },
  category: { 
    type: String, 
    required: true,
    enum: [
      "Equipment",
      "Consumables", 
      "Materials",
      "Instruments",
      "Furniture",
      "Electronics",
      "Liquids",
      "Safety Gear",
      "Lab Supplies",
      "Tools"
    ],
    default: "Equipment",
  },
  cost: { 
    type: Number, 
    required: true, 
    min: 0,
    max: 100000000
  },
  yearPurchased: { 
    type: String, 
    default: () => new Date().getFullYear().toString()
  },
  maintenanceNeeds: { 
    type: String, 
    required: true,
    enum: ["Yes", "No", "Scheduled"],
    default: "No",
  },
  calibration: { 
    type: String, 
    required: true,
    enum: ["Yes", "No", "Due Soon", "Calibrated"],
    default: "No",
  },
  roomAssigned: { 
    type: String, 
    required: true,
    default: "",
    trim: true,
    maxlength: 100
  },
  calibrator: { 
    type: String, 
    default: "",
    trim: true,
    maxlength: 100
  },
  images: [{
    type: String,
    default: [],
    validate: {
      validator: function(value: string) {
        if (!value) return true;
        return value.startsWith('data:image/') || value.startsWith('http');
      },
      message: "Image must be a valid base64 string or URL"
    }
  }],
  maintenanceHistory: [maintenanceHistorySchema],
  calibrationHistory: [calibrationHistorySchema],
  lastMaintenance: {
    type: String,
    default: ""
  },
  nextMaintenance: {
    type: String,
    default: ""
  },
  expirationDate: {
    type: Date,
    default: null
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    max: 100000,
    default: 1
  },
  availableQuantity: {
    type: Number,
    required: true,
    min: 0,
    max: 100000,
    default: 1
  },
  status: {
    type: String,
    required: true,
    enum: ["Active", "Inactive", "Disposed", "Expired"],
    default: "Active"
  },
  qrCode: {
    type: String,
    default: ""
  },
  calibrationQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  disposalQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  isDisposed: {
    type: Boolean,
    default: false,
  },
  maintenanceQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  borrowedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  // ✅ ADDED: Field to control borrowing capability
  canBeBorrowed: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
});

// Indexes
inventorySchema.index({ category: 1, condition: 1 });
inventorySchema.index({ maintenanceNeeds: 1, calibration: 1 });
inventorySchema.index({ roomAssigned: 1 });
inventorySchema.index({ createdAt: -1 });
inventorySchema.index({ nextMaintenance: 1 });
inventorySchema.index({ expirationDate: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ canBeBorrowed: 1 });

// Virtual for 'id'
inventorySchema.virtual('id').get(function(this: IInventory) {
  return this._id.toHexString();
});

// Virtual for checking if item is expired
inventorySchema.virtual('isExpired').get(function(this: IInventory) {
  if (!this.expirationDate) return false;
  const expiration = new Date(this.expirationDate);
  return expiration < new Date();
});

// Virtual for days until expiration
inventorySchema.virtual('daysUntilExpiration').get(function(this: IInventory) {
  if (!this.expirationDate) return null;
  const today = new Date();
  const expiration = new Date(this.expirationDate);
  const diffTime = expiration.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for primary image
inventorySchema.virtual('primaryImage').get(function(this: IInventory) {
  return this.images && this.images.length > 0 ? this.images[0] : '';
});

// ✅ FIXED: Real available quantity considering ALL impacts AND borrowing capability
inventorySchema.virtual('realAvailableQuantity').get(function(this: IInventory) {
  const maintenanceImpact = this.maintenanceQuantity || 0;
  const calibrationImpact = this.calibrationQuantity || 0;
  const disposalImpact = this.disposalQuantity || 0;
  const borrowedImpact = this.borrowedQuantity || 0;
  
  return Math.max(0, this.quantity - maintenanceImpact - calibrationImpact - disposalImpact - borrowedImpact);
});

// ✅ FIXED: Virtual for borrowing available quantity (considers canBeBorrowed flag)
inventorySchema.virtual('borrowingAvailableQuantity').get(function(this: IInventory) {
  // If equipment cannot be borrowed, return 0
  if (!this.canBeBorrowed) {
    return 0;
  }
  
  const realAvailable = this.realAvailableQuantity;
  // Only return available if equipment is in good condition and not under maintenance
  if (
    this.condition !== 'Under Maintenance' &&
    ['Excellent', 'Good', 'Fair'].includes(this.condition) &&
    this.maintenanceNeeds === 'No' &&
    this.status === 'Active'
  ) {
    return realAvailable;
  }
  
  return 0;
});

// ✅ FIXED: Virtual for total unavailable quantity
inventorySchema.virtual('unavailableQuantity').get(function(this: IInventory) {
  const maintenanceImpact = this.maintenanceQuantity || 0;
  const calibrationImpact = this.calibrationQuantity || 0;
  const disposalImpact = this.disposalQuantity || 0;
  const borrowedImpact = this.borrowedQuantity || 0;
  
  return maintenanceImpact + calibrationImpact + disposalImpact + borrowedImpact;
});

// ✅ FIXED: Virtual for maintenance-adjusted available quantity
inventorySchema.virtual('maintenanceAdjustedAvailable').get(function(this: IInventory) {
  return this.realAvailableQuantity;
});

// Virtual for checking if item is available
inventorySchema.virtual('isAvailable').get(function(this: IInventory) {
  return this.status === "Active" && this.availableQuantity > 0;
});

// ✅ FIXED: Middleware to update available quantity based on real available quantity
inventorySchema.pre('save', function(next) {
  if (this.expirationDate && this.expirationDate < new Date() && this.status === 'Active') {
    this.status = 'Expired';
  }
  
  if (this.condition === "Needs Repair" && this.maintenanceNeeds === "No") {
    this.maintenanceNeeds = "Yes";
  }
  
  // ✅ IMPORTANT: Calculate and update availableQuantity based on realAvailableQuantity
  const maintenanceImpact = this.maintenanceQuantity || 0;
  const calibrationImpact = this.calibrationQuantity || 0;
  const disposalImpact = this.disposalQuantity || 0;
  const borrowedImpact = this.borrowedQuantity || 0;
  
  this.availableQuantity = Math.max(0, this.quantity - maintenanceImpact - calibrationImpact - disposalImpact - borrowedImpact);
  
  // Ensure borrowed quantity doesn't exceed total quantity
  if (this.borrowedQuantity > this.quantity) {
    this.borrowedQuantity = this.quantity;
  }
  
  // Update status based on quantity and disposal status
  if (this.quantity === 0 || this.isDisposed) {
    this.status = "Disposed";
    this.condition = "Out of Stock";
  } else if (this.availableQuantity === 0 && this.condition !== "Under Maintenance") {
    this.condition = "Out of Stock";
  }
  
  // Generate QR code if not exists
  if (!this.qrCode && this.itemId) {
    const qrData = encodeURIComponent(JSON.stringify({
      itemId: this.itemId,
      name: this.name,
      category: this.category
    }));
    this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;
  }
  
  next();
});

// ✅ ADDED: Instance method to check if equipment can be borrowed considering all impacts AND borrowing capability
inventorySchema.methods.canBeBorrowedCheck = function(this: IInventory, requestedQuantity: number = 1) {
  // Check if equipment is allowed to be borrowed
  if (!this.canBeBorrowed) {
    return {
      canBorrow: false,
      reason: 'This equipment is not available for borrowing',
      borrowingAvailableQuantity: 0
    };
  }
  
  const borrowingAvailable = this.borrowingAvailableQuantity;
  const canBorrow = borrowingAvailable >= requestedQuantity;
  
  return {
    canBorrow,
    reason: canBorrow ? 'Available for borrowing' : 
      borrowingAvailable < requestedQuantity ? `Only ${borrowingAvailable} units available for borrowing` :
      `Equipment condition: ${this.condition}, Maintenance: ${this.maintenanceNeeds}, Status: ${this.status}`,
    borrowingAvailableQuantity: borrowingAvailable
  };
};

// ✅ ADDED: Method to check real-time availability considering ALL impacts AND borrowing capability
inventorySchema.methods.getRealTimeAvailability = async function(
  this: IInventory,
  startDate: Date,
  endDate: Date,
  requestedQuantity: number = 1
) {
  const Borrowing = mongoose.model('Borrowing');
  
  // First check if equipment can be borrowed at all
  if (!this.canBeBorrowed) {
    return {
      totalQuantity: this.quantity,
      availableQuantity: this.availableQuantity,
      realAvailableQuantity: this.realAvailableQuantity,
      borrowingAvailableQuantity: 0,
      bookedQuantity: 0,
      remainingAvailable: 0,
      canBorrow: false,
      maintenanceImpact: this.maintenanceQuantity,
      calibrationImpact: this.calibrationQuantity,
      disposalImpact: this.disposalQuantity,
      borrowedImpact: this.borrowedQuantity,
      borrowingRestricted: true,
      reason: 'This equipment is not available for borrowing'
    };
  }
  
  // Get borrowing available quantity
  const borrowingAvailable = this.borrowingAvailableQuantity;

  // If no borrowing availability, return immediately
  if (borrowingAvailable <= 0) {
    return {
      totalQuantity: this.quantity,
      availableQuantity: this.availableQuantity,
      realAvailableQuantity: this.realAvailableQuantity,
      borrowingAvailableQuantity: borrowingAvailable,
      bookedQuantity: 0,
      remainingAvailable: 0,
      canBorrow: false,
      maintenanceImpact: this.maintenanceQuantity,
      calibrationImpact: this.calibrationQuantity,
      disposalImpact: this.disposalQuantity,
      borrowedImpact: this.borrowedQuantity,
      borrowingRestricted: false,
      reason: 'No equipment available for borrowing due to condition, maintenance, calibration, disposal, or existing borrowings'
    };
  }

  // Get overlapping approved/released borrowings
  const overlappingBorrowings = await Borrowing.find({
    equipmentId: this._id,
    status: { $in: ['approved', 'released'] },
    $or: [
      {
        intendedBorrowDate: { $lte: endDate },
        intendedReturnDate: { $gte: startDate }
      }
    ]
  });

  // Calculate total quantity already booked during this period
  const totalBookedQuantity = overlappingBorrowings.reduce((total: number, borrowing: any) => {
    return total + (borrowing.quantity || 1);
  }, 0);

  // Calculate remaining available quantity during this period considering all impacts
  const remainingAvailableQuantity = Math.max(0, borrowingAvailable - totalBookedQuantity);

  return {
    totalQuantity: this.quantity,
    availableQuantity: this.availableQuantity,
    realAvailableQuantity: this.realAvailableQuantity,
    borrowingAvailableQuantity: borrowingAvailable,
    bookedQuantity: totalBookedQuantity,
    remainingAvailable: remainingAvailableQuantity,
    canBorrow: remainingAvailableQuantity >= requestedQuantity,
    maintenanceImpact: this.maintenanceQuantity,
    calibrationImpact: this.calibrationQuantity,
    disposalImpact: this.disposalQuantity,
    borrowedImpact: this.borrowedQuantity,
    borrowingRestricted: false,
    overlappingBookings: overlappingBorrowings.length,
    reason: remainingAvailableQuantity >= requestedQuantity ? 
      'Available for borrowing' : 
      `Only ${remainingAvailableQuantity} available during this period (${this.maintenanceQuantity} under maintenance, ${this.calibrationQuantity} scheduled for calibration, ${this.disposalQuantity} disposed, ${this.borrowedQuantity} currently borrowed)`
  };
};

// ✅ ADDED: Static method to find equipment available for borrowing considering the canBeBorrowed field
inventorySchema.statics.findAvailableForBorrowing = async function(
  this: Model<IInventory>,
  borrowerType: string = 'student'
): Promise<IInventory[]> {
  const query = {
    canBeBorrowed: true,
    condition: { $in: ['Excellent', 'Good', 'Fair'] },
    maintenanceNeeds: 'No',
    status: 'Active',
    $expr: { $gt: [{ $subtract: ['$quantity', { $add: ['$maintenanceQuantity', '$calibrationQuantity', '$disposalQuantity', '$borrowedQuantity'] }] }, 0] }
  };
  
  return this.find(query);
};

// ✅ ADDED: Static method to update canBeBorrowed status
inventorySchema.statics.updateBorrowingStatus = async function(
  this: Model<IInventory>,
  itemId: string | Types.ObjectId,
  canBeBorrowed: boolean
): Promise<IInventory | null> {
  return this.findByIdAndUpdate(
    itemId,
    { canBeBorrowed },
    { new: true, runValidators: true }
  );
};

// Ensure virtuals are included in toJSON and toObject
inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

// Check if model exists to prevent OverwriteModelError
const Inventory = (mongoose.models.Inventory as InventoryModel) || 
  mongoose.model<IInventory, InventoryModel>("Inventory", inventorySchema);

export default Inventory;