import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IPartUsed {
  name: string;
  quantity: number;
  cost: number;
}

// Define interface for instance methods
interface IMaintenanceMethods {
  getIsOverdue(): boolean;
  getDaysUntilDue(): number;
  getCompletionRate(): number;
}

// Define interface for static methods
interface MaintenanceModel extends Model<IMaintenance, {}, IMaintenanceMethods> {
  findByStatus(status: string): Promise<IMaintenance[]>;
  findOverdue(): Promise<IMaintenance[]>;
  findByEquipment(equipmentId: Types.ObjectId): Promise<IMaintenance[]>;
}

// Define interface for virtual fields in JSON output
interface IMaintenanceVirtuals {
  isOverdue: boolean;
  daysUntilDue: number;
  completionRate: number;
  quantityCompletionRate: number;
  formattedScheduledDate?: string;
  formattedDueDate?: string;
  formattedNextMaintenance?: string;
}

// Main interface - ADD THE nextMaintenance FIELD
export interface IMaintenance extends Document, IMaintenanceMethods, IMaintenanceVirtuals {
  equipmentId: Types.ObjectId;
  itemId: string;
  equipmentName: string;
  category: string;
  type: string;
  quantity: number;
  availableQuantity: number;
  maintainedQuantity: number;
  remainingQuantity: number;
  scheduledDate: Date;
  dueDate: Date;
  completedDate?: Date;
  nextMaintenance?: Date; // ADD THIS FIELD
  assignedTo: Types.ObjectId;
  assignedToName: string;
  status: string;
  priority: string;
  description?: string;
  notes?: string;
  findings?: string;
  actionsTaken?: string;
  partsUsed: IPartUsed[];
  totalCost: number;
  estimatedDuration: number;
  actualDuration?: number;
  beforeImages: string[];
  afterImages: string[];
  qrCode?: string;
  createdBy: Types.ObjectId;
  createdByName: string;
  wasDisposed: boolean;
  disposedQuantity: number;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

const partUsedSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 1
  },
  cost: { 
    type: Number, 
    required: true,
    min: 0
  }
}, {
  _id: false
});

const maintenanceSchema = new Schema<IMaintenance, MaintenanceModel, IMaintenanceMethods>({
  equipmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  itemId: {
    type: String,
    required: true,
    trim: true
  },
  equipmentName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
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
    default: "Equipment"
  },
  type: {
    type: String,
    required: true,
    enum: ['Maintenance', 'Calibration', 'Repair'],
    default: 'Maintenance'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  availableQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  maintainedQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  remainingQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date
  },
  nextMaintenance: { // ADD THIS FIELD
    type: Date
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedToName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Overdue', 'Cancelled'],
    default: 'Scheduled'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  description: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  findings: {
    type: String,
    trim: true
  },
  actionsTaken: {
    type: String,
    trim: true
  },
  partsUsed: [partUsedSchema],
  totalCost: {
    type: Number,
    default: 0,
    min: 0
  },
  estimatedDuration: {
    type: Number,
    default: 1,
    min: 0
  },
  actualDuration: {
    type: Number,
    min: 0
  },
  beforeImages: [{
    type: String
  }],
  afterImages: [{
    type: String
  }],
  qrCode: {
    type: String,
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: {
    type: String,
    required: true,
    trim: true
  },
  wasDisposed: {
    type: Boolean,
    default: false
  },
  disposedQuantity: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Calculate and add virtual fields directly
      const isOverdue = ret.status === 'Scheduled' && new Date() > new Date(ret.dueDate);
      
      const today = new Date();
      const due = new Date(ret.dueDate);
      const diffTime = due.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let completionRate = 0;
      if (ret.status === 'Completed') completionRate = 100;
      else if (ret.status === 'In Progress') completionRate = 50;
      else if (ret.status === 'Scheduled') completionRate = 0;
      
      // Calculate quantity completion rate
      const quantityCompletionRate = ret.quantity > 0 ? 
        Math.round((ret.maintainedQuantity / ret.quantity) * 100) : 0;
      
      // Use the higher completion rate
      const finalCompletionRate = Math.max(completionRate, quantityCompletionRate);
      
      // Add virtual fields to the returned object
      return {
        ...ret,
        isOverdue,
        daysUntilDue,
        completionRate: finalCompletionRate,
        quantityCompletionRate
      };
    }
  },
  toObject: { virtuals: true }
});

// Instance methods
maintenanceSchema.methods.getIsOverdue = function(): boolean {
  return this.status === 'Scheduled' && new Date() > this.dueDate;
};

maintenanceSchema.methods.getDaysUntilDue = function(): number {
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

maintenanceSchema.methods.getCompletionRate = function(): number {
  if (this.status === 'Completed') return 100;
  if (this.status === 'In Progress') return 50;
  if (this.status === 'Scheduled') return 0;
  
  // Calculate based on maintained quantity
  if (this.quantity > 0) {
    return Math.round((this.maintainedQuantity / this.quantity) * 100);
  }
  
  return 0;
};

// Static methods
maintenanceSchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).populate('equipmentId').populate('assignedTo');
};

maintenanceSchema.statics.findOverdue = function() {
  return this.find({ 
    status: 'Scheduled', 
    dueDate: { $lt: new Date() } 
  }).populate('equipmentId').populate('assignedTo');
};

maintenanceSchema.statics.findByEquipment = function(equipmentId: Types.ObjectId) {
  return this.find({ equipmentId })
    .populate('assignedTo')
    .sort({ scheduledDate: -1 });
};

// Virtual fields
maintenanceSchema.virtual('isOverdue').get(function() {
  return this.status === 'Scheduled' && new Date() > this.dueDate;
});

maintenanceSchema.virtual('daysUntilDue').get(function() {
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

maintenanceSchema.virtual('completionRate').get(function() {
  if (this.status === 'Completed') return 100;
  if (this.status === 'In Progress') return 50;
  if (this.status === 'Scheduled') return 0;
  
  // Calculate based on maintained quantity
  if (this.quantity > 0) {
    return Math.round((this.maintainedQuantity / this.quantity) * 100);
  }
  
  return 0;
});

maintenanceSchema.virtual('quantityCompletionRate').get(function() {
  if (this.quantity > 0) {
    return Math.round((this.maintainedQuantity / this.quantity) * 100);
  }
  return 0;
});

maintenanceSchema.virtual('formattedScheduledDate').get(function() {
  return this.scheduledDate?.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

maintenanceSchema.virtual('formattedDueDate').get(function() {
  return this.dueDate?.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

maintenanceSchema.virtual('formattedNextMaintenance').get(function() {
  return this.nextMaintenance?.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Middleware to auto-update status to Overdue
maintenanceSchema.pre('save', function(next) {
  if (this.status === 'Scheduled' && new Date() > this.dueDate) {
    this.status = 'Overdue';
  }
  
  // Auto-calculate total cost from parts used
  if (this.partsUsed && this.partsUsed.length > 0) {
    this.totalCost = this.partsUsed.reduce((total, part) => {
      return total + (part.quantity * part.cost);
    }, 0);
  }
  
  // Update remaining quantity
  this.remainingQuantity = this.quantity - this.maintainedQuantity;
  
  // Auto-update status based on maintained quantity
  if (this.maintainedQuantity > 0 && this.status === 'Scheduled') {
    this.status = 'In Progress';
  }
  
  if (this.maintainedQuantity === this.quantity && this.status !== 'Completed') {
    this.status = 'Completed';
    if (!this.completedDate) {
      this.completedDate = new Date();
    }
  }
  
  // Set completed date when status changes to Completed
  if (this.isModified('status') && this.status === 'Completed' && !this.completedDate) {
    this.completedDate = new Date();
  }
  
  // Calculate actual duration when completed
  if (this.status === 'Completed' && this.scheduledDate && this.completedDate && !this.actualDuration) {
    const start = new Date(this.scheduledDate);
    const end = new Date(this.completedDate);
    const diffTime = end.getTime() - start.getTime();
    this.actualDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Duration in days
  }
  
  // Auto-calculate next maintenance if not set
  if (!this.nextMaintenance && this.dueDate && this.estimatedDuration) {
    const nextDate = new Date(this.dueDate);
    nextDate.setDate(nextDate.getDate() + this.estimatedDuration);
    this.nextMaintenance = nextDate;
  }
  
  next();
});

// Indexes for better performance
maintenanceSchema.index({ equipmentId: 1 });
maintenanceSchema.index({ assignedTo: 1 });
maintenanceSchema.index({ status: 1 });
maintenanceSchema.index({ dueDate: 1 });
maintenanceSchema.index({ scheduledDate: 1 });
maintenanceSchema.index({ createdBy: 1 });
maintenanceSchema.index({ type: 1 });
maintenanceSchema.index({ priority: 1 });
maintenanceSchema.index({ createdAt: -1 });
maintenanceSchema.index({ nextMaintenance: 1 }); // ADD INDEX FOR NEXT MAINTENANCE

// Next.js compatible model definition
const Maintenance = (mongoose.models.Maintenance as MaintenanceModel) || 
  mongoose.model<IMaintenance, MaintenanceModel>('Maintenance', maintenanceSchema);

export default Maintenance;