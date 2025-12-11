// models/Report.ts - UPDATED WITH BORROWING FIELDS
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// Enums for type safety
export enum ReportType {
  INVENTORY_STATUS = 'inventory_status',
  EQUIPMENT_USAGE = 'equipment_usage',
  BORROWING_TRENDS = 'borrowing_trends', 
  USER_ACTIVITY = 'user_activity',
  CATEGORY_DISTRIBUTION = 'category_distribution',
  MAINTENANCE_STATUS = 'maintenance_status',
  MAINTENANCE_ANALYTICS = 'maintenance_analytics',
  MAINTENANCE_COST_ANALYSIS = 'maintenance_cost_analysis',
  DAMAGE_REPORTS = 'damage_reports',
  ANNOUNCEMENT_ANALYTICS = 'announcement_analytics',
  BORROWING_ANALYTICS = 'borrowing_analytics' // NEW
}

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Interface for the summary object
export interface ReportSummary {
  // Inventory fields
  totalItems?: number;
  availableItems?: number;
  totalValue?: number;
  utilizationRate?: number;
  categoriesCount?: number;
  itemsCount?: number;
  
  // Equipment usage fields
  totalEquipment?: number;
  totalInUse?: number;
  totalAvailable?: number;
  averageUsageRate?: number;
  highUsageItems?: number;
  totalEquipmentValue?: number;
  
  // Maintenance fields
  urgentRepairs?: number;
  upcomingCalibrations?: number;
  scheduledMaintenance?: number;
  maintenanceCost?: number;
  repairCost?: number;
  replacementValue?: number;
  damageRate?: number;
  
  // Category distribution
  totalCategories?: number;
  largestCategory?: string;
  mostAvailableCategory?: string;
  averageItemsPerCategory?: number;
  
  // Maintenance analytics fields
  totalMaintenanceTasks?: number;
  completedMaintenance?: number;
  overdueMaintenance?: number;
  averageMaintenanceCost?: number;
  totalMaintenanceCost?: number;
  maintenanceByType?: Record<string, number>;
  maintenanceByPriority?: Record<string, number>;
  topEquipment?: Array<{name: string, count: number, cost: number}>;
  maintenanceEfficiency?: number;
  averageCompletionTime?: number;
  highestMaintenanceCost?: number;
  
  // NEW: Borrowing analytics fields
  totalBorrowings?: number;
  activeBorrowings?: number;
  pendingBorrowings?: number;
  completedBorrowings?: number;
  overdueBorrowings?: number;
  borrowingCompletionRate?: number;
  averageBorrowingDuration?: number;
  mostBorrowedItems?: Array<{name: string, count: number}>;
  borrowingByUserType?: Record<string, number>;
  borrowingTrends?: Array<{period: string, count: number}>;
  totalBorrowingValue?: number;
  
  // User activity
  activeUsers?: number;
  totalActions?: number;
  averageActions?: number;
}

// Interface for filters object
export interface ReportFilters {
  category?: string;
  room?: string;
  status?: string;
  userType?: string;
  maintenanceType?: string;
  priority?: string;
  assignedTo?: string;
  borrowerType?: string; // NEW
  borrowingStatus?: string; // NEW
}

// Interface for Report document with proper _id typing
export interface IReport extends Document {
  _id: Types.ObjectId;
  reportId: string;
  title: string;
  type: ReportType;
  period: ReportPeriod;
  startDate: Date;
  endDate: Date;
  data: Record<string, any>;
  summary?: ReportSummary;
  generatedBy: Types.ObjectId;
  generatedByName: string;
  filters?: ReportFilters;
  status: ReportStatus;
  fileUrl?: string;
  isSaved: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual property
  id: string;
}

// Helper function to generate report ID
export function generateReportId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RPT-${timestamp}-${randomStr}`;
}

// Schema definition
const reportSchema = new Schema<IReport>({
  reportId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: () => generateReportId()
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(ReportType)
  },
  period: {
    type: String,
    required: true,
    enum: Object.values(ReportPeriod)
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  data: {
    type: Schema.Types.Mixed,
    required: true
  },
  summary: {
    type: Schema.Types.Mixed,
    default: {}
  },
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedByName: {
    type: String,
    required: true,
    trim: true
  },
  filters: {
    type: Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: Object.values(ReportStatus),
    default: ReportStatus.COMPLETED
  },
  fileUrl: {
    type: String,
    trim: true
  },
  isSaved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for 'id' - FIXED: Properly typed _id access
reportSchema.virtual('id').get(function(this: IReport) {
  return (this._id as Types.ObjectId).toString();
});

// Index for better query performance
reportSchema.index({ type: 1, startDate: -1 });
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ reportId: 1 });
reportSchema.index({ status: 1 });

// Check if model exists to prevent OverwriteModelError
const Report = mongoose.models.Report || mongoose.model<IReport>('Report', reportSchema);

export default Report;