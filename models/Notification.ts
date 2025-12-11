// backend/models/Notification.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Type definitions
export interface IAction {
  text?: string;
  actionType?: 'view' | 'approve' | 'reject' | 'review' | 'dismiss' | 'custom';
  url?: string;
  data?: any;
}

export interface INotification extends Document {
  // User who will receive the notification
  recipientId: string;
  recipientSchoolID: string;
  recipientRole: 'admin' | 'student' | 'faculty';
  recipientName: string;
  recipientEmail?: string;

  // Notification details
  title: string;
  message: string;
  
  // Notification type and category
  type: NotificationType;
  category: NotificationCategory;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Related data
  relatedModel: 'Borrowing' | 'Approval' | 'Rejection' | 'Inventory' | 'User' | 'Maintenance' | 'Announcement' | 'Returning' | 'Schedule' | null;
  relatedId?: Types.ObjectId;

  // Read status and tracking
  isRead: boolean;
  isArchived: boolean;
  readAt?: Date;
  archivedAt?: Date;

  // Action buttons
  actions: IAction[];

  // Metadata
  metadata: Record<string, any>;

  // Virtuals
  formattedTime: string;
  icon: string;
  color: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  markAsRead(): Promise<INotification>;
  archive(): Promise<INotification>;
}

// Notification types
export type NotificationType =
  // Borrowing related
  | 'borrowing_request'
  | 'borrowing_approved'
  | 'borrowing_rejected'
  | 'borrowing_released'
  | 'borrowing_returned'
  | 'borrowing_overdue'
  | 'borrowing_cancelled'
  
  // Faculty borrowing types
  | 'faculty_borrowing_request'
  | 'faculty_borrowing_approved'
  | 'faculty_borrowing_rejected'
  | 'faculty_borrowing_released'
  | 'faculty_borrowing_cancelled'
  
  // Faculty return notification types
  | 'faculty_return_deadline_reminder'
  | 'faculty_equipment_returned_admin'
  | 'faculty_return_late_warning'
  | 'faculty_return_completed'
  
  // Maintenance related
  | 'maintenance_scheduled'
  | 'maintenance_assigned_faculty'
  | 'maintenance_in_progress'
  | 'maintenance_completed'
  | 'maintenance_cancelled'
  | 'maintenance_overdue'
  
  // Equipment under maintenance notification for admin
  | 'equipment_under_maintenance_admin'
  | 'equipment_maintenance_completed_admin'
  | 'equipment_maintenance_disposed_admin'
  
  // Equipment related
  | 'equipment_added'
  | 'equipment_updated'
  | 'equipment_disposed'
  | 'equipment_low_stock'
  
  // User related
  | 'user_registration'
  | 'user_approved'
  | 'user_deactivated'
  
  // System related - Announcement types
  | 'system_announcement'
  | 'announcement_created'
  | 'announcement_updated'
  | 'announcement_deleted'
  | 'announcement_targeted'
  | 'system_maintenance'
  | 'system_update'
  
  // Return related notifications
  | 'return_deadline_reminder'
  | 'equipment_returned_admin'
  | 'return_late_warning'
  | 'return_completed_student'
  
  // Schedule notification types
  | 'schedule_created_student'
  | 'schedule_created_faculty'
  | 'schedule_updated_student'
  | 'schedule_updated_faculty'
  | 'schedule_cancelled_student'
  | 'schedule_cancelled_faculty';

export type NotificationCategory = 'borrowing' | 'maintenance' | 'inventory' | 'user' | 'system' | 'announcement';

// Interface for static methods
interface INotificationModel extends Model<INotification> {
  createNotification(data: CreateNotificationData): Promise<INotification>;
  getUserNotifications(userId: string, options?: NotificationQueryOptions): Promise<{
    notifications: INotification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    unreadCount: number;
  }>;
  markAllAsRead(userId: string): Promise<any>;
  getNotificationStats(userId: string): Promise<{
    byType: Array<{ _id: string; count: number; unread: number }>;
    total: number;
    unread: number;
    read: number;
  }>;
}

// Type for createNotification data
export interface CreateNotificationData {
  type: NotificationType;
  recipientId: string;
  recipientSchoolID: string;
  recipientRole: 'admin' | 'student' | 'faculty';
  recipientName: string;
  recipientEmail?: string;
  relatedModel?: 'Borrowing' | 'Approval' | 'Rejection' | 'Inventory' | 'User' | 'Maintenance' | 'Announcement' | 'Returning' | 'Schedule' | null;
  relatedId?: Types.ObjectId;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Template specific data (will vary by type)
  [key: string]: any;
}

// Type for query options
export interface NotificationQueryOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  archived?: boolean;
  type?: NotificationType;
  category?: NotificationCategory;
}

// Schema definition
const notificationSchema = new Schema<INotification>({
  // User who will receive the notification
  recipientId: {
    type: String,
    required: true,
    trim: true
  },
  recipientSchoolID: {
    type: String,
    required: true,
    trim: true
  },
  recipientRole: {
    type: String,
    enum: ['admin', 'student', 'faculty'],
    required: true
  },
  recipientName: {
    type: String,
    required: true,
    trim: true
  },
  recipientEmail: {
    type: String,
    trim: true,
    lowercase: true
  },

  // Notification details
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  // Notification type and category - UPDATED with announcement types
  type: {
    type: String,
    required: true,
    enum: [
      // Borrowing related
      'borrowing_request',
      'borrowing_approved',
      'borrowing_rejected',
      'borrowing_released',
      'borrowing_returned',
      'borrowing_overdue',
      'borrowing_cancelled',
      
      // Faculty borrowing types
      'faculty_borrowing_request',
      'faculty_borrowing_approved',
      'faculty_borrowing_rejected',
      'faculty_borrowing_released',
      'faculty_borrowing_cancelled',
      
      // Faculty return notification types
      'faculty_return_deadline_reminder',
      'faculty_equipment_returned_admin',
      'faculty_return_late_warning',
      'faculty_return_completed',
      
      // Maintenance related
      'maintenance_scheduled',
      'maintenance_assigned_faculty',
      'maintenance_in_progress',
      'maintenance_completed',
      'maintenance_cancelled',
      'maintenance_overdue',
      
      // Equipment under maintenance notification for admin
      'equipment_under_maintenance_admin',
      'equipment_maintenance_completed_admin',
      'equipment_maintenance_disposed_admin',
      
      // Equipment related
      'equipment_added',
      'equipment_updated',
      'equipment_disposed',
      'equipment_low_stock',
      
      // User related
      'user_registration',
      'user_approved',
      'user_deactivated',
      
      // System related - ADDED: Announcement types
      'system_announcement',
      'announcement_created',
      'announcement_updated',
      'announcement_deleted',
      'announcement_targeted',
      'system_maintenance',
      'system_update',
      
      // Return related notifications
      'return_deadline_reminder',
      'equipment_returned_admin',
      'return_late_warning',
      'return_completed_student',
      
      // Schedule notification types
      'schedule_created_student',
      'schedule_created_faculty',
      'schedule_updated_student',
      'schedule_updated_faculty',
      'schedule_cancelled_student',
      'schedule_cancelled_faculty'
    ] as NotificationType[]
  },
  category: {
    type: String,
    enum: ['borrowing', 'maintenance', 'inventory', 'user', 'system', 'announcement'] as NotificationCategory[],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Related data
  relatedModel: {
    type: String,
    enum: ['Borrowing', 'Approval', 'Rejection', 'Inventory', 'User', 'Maintenance', 'Announcement', 'Returning', 'Schedule', null],
    default: null
  },
  relatedId: {
    type: Schema.Types.ObjectId,
    default: null
  },

  // Read status and tracking
  isRead: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  archivedAt: {
    type: Date,
    default: null
  },

  // Action buttons (for mobile notifications)
  actions: [{
    text: {
      type: String,
      trim: true
    },
    actionType: {
      type: String,
      enum: ['view', 'approve', 'reject', 'review', 'dismiss', 'custom']
    },
    url: {
      type: String,
      trim: true
    },
    data: {
      type: Schema.Types.Mixed
    }
  }],

  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientSchoolID: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ relatedModel: 1, relatedId: 1 });
notificationSchema.index({ createdAt: -1 });

// Virtual for formatted date
notificationSchema.virtual('formattedTime').get(function(this: INotification) {
  const now = new Date();
  const diffMs = now.getTime() - this.createdAt.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return this.createdAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
});

// Virtual for notification icon based on type - UPDATED with announcement icons
notificationSchema.virtual('icon').get(function(this: INotification) {
  const icons: Record<NotificationType, string> = {
    // Borrowing icons
    borrowing_request: '📋',
    borrowing_approved: '✅',
    borrowing_rejected: '❌',
    borrowing_released: '📦',
    borrowing_returned: '🔄',
    borrowing_overdue: '⚠️',
    borrowing_cancelled: '🗑️',
    
    // Faculty borrowing icons
    faculty_borrowing_request: '👨‍🏫',
    faculty_borrowing_approved: '✅',
    faculty_borrowing_rejected: '❌',
    faculty_borrowing_released: '📦',
    faculty_borrowing_cancelled: '🗑️',
    
    // Faculty return icons
    faculty_return_deadline_reminder: '⏰',
    faculty_equipment_returned_admin: '📦',
    faculty_return_late_warning: '🚨',
    faculty_return_completed: '✅',
    
    // Maintenance icons
    maintenance_scheduled: '📅',
    maintenance_assigned_faculty: '🔧',
    maintenance_in_progress: '⚙️',
    maintenance_completed: '✅',
    maintenance_cancelled: '🚫',
    maintenance_overdue: '⚠️',
    
    // Equipment maintenance admin icons
    equipment_under_maintenance_admin: '🔧',
    equipment_maintenance_completed_admin: '✅',
    equipment_maintenance_disposed_admin: '🗑️',
    
    // Equipment icons
    equipment_added: '➕',
    equipment_updated: '✏️',
    equipment_disposed: '♻️',
    equipment_low_stock: '📉',
    
    // User icons
    user_registration: '👤',
    user_approved: '👥',
    user_deactivated: '🚷',
    
    // System icons - ADDED: Announcement icons
    system_announcement: '📢',
    announcement_created: '📢',
    announcement_updated: '✏️',
    announcement_deleted: '🗑️',
    announcement_targeted: '🎯',
    system_maintenance: '⚙️',
    system_update: '🔄',
    
    // Return icons
    return_deadline_reminder: '⏰',
    equipment_returned_admin: '📦',
    return_late_warning: '🚨',
    return_completed_student: '✅',
    
    // Schedule icons
    schedule_created_student: '📚',
    schedule_created_faculty: '👨‍🏫',
    schedule_updated_student: '✏️',
    schedule_updated_faculty: '📝',
    schedule_cancelled_student: '🚫',
    schedule_cancelled_faculty: '❌'
  };
  return icons[this.type] || '🔔';
});

// Virtual for notification color based on priority
notificationSchema.virtual('color').get(function(this: INotification) {
  const colors: Record<string, string> = {
    low: 'blue',
    medium: 'green',
    high: 'orange',
    urgent: 'red'
  };
  return colors[this.priority] || 'green';
});

// Pre-save middleware to set category based on type - UPDATED with announcement types
notificationSchema.pre('save', function(next) {
  if (!this.category) {
    const typeCategories: Record<NotificationType, NotificationCategory> = {
      // Student borrowing
      'borrowing_request': 'borrowing',
      'borrowing_approved': 'borrowing',
      'borrowing_rejected': 'borrowing',
      'borrowing_released': 'borrowing',
      'borrowing_returned': 'borrowing',
      'borrowing_overdue': 'borrowing',
      'borrowing_cancelled': 'borrowing',
      
      // Faculty borrowing
      'faculty_borrowing_request': 'borrowing',
      'faculty_borrowing_approved': 'borrowing',
      'faculty_borrowing_rejected': 'borrowing',
      'faculty_borrowing_released': 'borrowing',
      'faculty_borrowing_cancelled': 'borrowing',
      
      // Faculty return types
      'faculty_return_deadline_reminder': 'borrowing',
      'faculty_equipment_returned_admin': 'borrowing',
      'faculty_return_late_warning': 'borrowing',
      'faculty_return_completed': 'borrowing',
      
      // Maintenance types
      'maintenance_scheduled': 'maintenance',
      'maintenance_assigned_faculty': 'maintenance',
      'maintenance_in_progress': 'maintenance',
      'maintenance_completed': 'maintenance',
      'maintenance_cancelled': 'maintenance',
      'maintenance_overdue': 'maintenance',
      
      // Equipment maintenance admin types
      'equipment_under_maintenance_admin': 'maintenance',
      'equipment_maintenance_completed_admin': 'maintenance',
      'equipment_maintenance_disposed_admin': 'maintenance',
      
      // Equipment types
      'equipment_added': 'inventory',
      'equipment_updated': 'inventory',
      'equipment_disposed': 'inventory',
      'equipment_low_stock': 'inventory',
      
      // User types
      'user_registration': 'user',
      'user_approved': 'user',
      'user_deactivated': 'user',
      
      // System types - ADDED: Announcement types
      'system_announcement': 'system',
      'announcement_created': 'announcement',
      'announcement_updated': 'announcement',
      'announcement_deleted': 'announcement',
      'announcement_targeted': 'announcement',
      'system_maintenance': 'system',
      'system_update': 'system',
      
      // Return types
      'return_deadline_reminder': 'borrowing',
      'equipment_returned_admin': 'borrowing',
      'return_late_warning': 'borrowing',
      'return_completed_student': 'borrowing',
      
      // Schedule types
      'schedule_created_student': 'system',
      'schedule_created_faculty': 'system',
      'schedule_updated_student': 'system',
      'schedule_updated_faculty': 'system',
      'schedule_cancelled_student': 'system',
      'schedule_cancelled_faculty': 'system'
    };
    this.category = typeCategories[this.type] || 'system';
  }
  
  // Ensure recipientEmail is lowercase
  if (this.recipientEmail) {
    this.recipientEmail = this.recipientEmail.toLowerCase();
  }
  
  // Ensure we don't have any notificationId field (causing duplicate key error)
  if ((this as any).notificationId !== undefined) {
    delete (this as any).notificationId;
  }
  
  next();
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function(this: INotification): Promise<INotification> {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Instance method to archive
notificationSchema.methods.archive = async function(this: INotification): Promise<INotification> {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

// Template function type
type TemplateFunction = (data: any) => {
  title: string;
  message: string;
  category: NotificationCategory;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actions?: IAction[];
  metadata?: Record<string, any>;
};

// Default template for missing notification types
const defaultTemplate: TemplateFunction = (data) => ({
  title: 'Notification',
  message: 'You have a new notification.',
  category: 'system' as NotificationCategory,
  actions: [
    { text: 'Dismiss', actionType: 'dismiss' }
  ],
  metadata: {}
});

// Static method to create notification template - COMPLETE with announcement templates
notificationSchema.statics.createNotification = async function(data: CreateNotificationData): Promise<INotification> {
  const templates: Partial<Record<NotificationType, TemplateFunction>> = {
    // Student borrowing templates
    borrowing_approved: (data) => ({
      title: 'Borrowing Request Approved',
      message: `Your borrowing request for ${data.equipmentName} (${data.quantity} unit${data.quantity > 1 ? 's' : ''}) has been approved. Borrow date: ${new Date(data.borrowDate).toLocaleDateString()}`,
      category: 'borrowing' as NotificationCategory,
      actions: [
        { text: 'View Details', actionType: 'view', url: `/student/borrowings/${data.borrowingId}` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        quantity: data.quantity,
        borrowDate: data.borrowDate,
        approvedBy: data.approvedBy
      }
    }),

    borrowing_rejected: (data) => ({
      title: 'Borrowing Request Rejected',
      message: `Your borrowing request for ${data.equipmentName} has been rejected. Reason: ${data.reason}`,
      category: 'borrowing' as NotificationCategory,
      actions: [
        { text: 'View Details', actionType: 'view', url: `/student/borrowings/${data.borrowingId}` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        reason: data.reason,
        rejectedBy: data.rejectedBy
      }
    }),

    borrowing_request: (data) => ({
      title: 'New Borrowing Request',
      message: `${data.studentName} requested to borrow ${data.equipmentName} (${data.quantity} unit${data.quantity > 1 ? 's' : ''})`,
      category: 'borrowing' as NotificationCategory,
      actions: [
        { text: 'Review', actionType: 'view', url: `/admin/requests/pending/${data.borrowingId}` },
        { text: 'Approve', actionType: 'approve', data: { borrowingId: data.borrowingId } },
        { text: 'Reject', actionType: 'reject', data: { borrowingId: data.borrowingId } }
      ],
      metadata: {
        studentName: data.studentName,
        studentId: data.studentId,
        equipmentName: data.equipmentName,
        quantity: data.quantity,
        purpose: data.purpose
      }
    }),

    // Faculty borrowing request template
    faculty_borrowing_request: (data) => ({
      title: 'New Faculty Borrowing Request',
      message: `Faculty ${data.facultyName} requested to borrow ${data.equipmentName} (${data.quantity} unit${data.quantity > 1 ? 's' : ''})`,
      category: 'borrowing' as NotificationCategory,
      actions: [
        { text: 'Review', actionType: 'view', url: `/admin/requests/pending` },
        { text: 'Approve', actionType: 'approve', data: { borrowingId: data.borrowingId } },
        { text: 'Reject', actionType: 'reject', data: { borrowingId: data.borrowingId } }
      ],
      metadata: {
        facultyName: data.facultyName,
        facultyId: data.facultyId,
        equipmentName: data.equipmentName,
        quantity: data.quantity,
        purpose: data.purpose,
        borrowerType: 'faculty'
      }
    }),

    // Faculty borrowing approved template
    faculty_borrowing_approved: (data) => ({
      title: 'Faculty Borrowing Request Approved',
      message: `Your faculty borrowing request for ${data.equipmentName} (${data.quantity} unit${data.quantity > 1 ? 's' : ''}) has been approved by ${data.approvedBy}.`,
      category: 'borrowing' as NotificationCategory,
      actions: [
        { text: 'View Details', actionType: 'view', url: `/faculty/borrowings/${data.borrowingId}` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        quantity: data.quantity,
        approvedBy: data.approvedBy,
        borrowDate: data.borrowDate,
        returnDate: data.returnDate,
        borrowerType: 'faculty'
      }
    }),

    // Faculty borrowing rejected template
    faculty_borrowing_rejected: (data) => ({
      title: 'Faculty Borrowing Request Rejected',
      message: `Your faculty borrowing request for ${data.equipmentName} was rejected. Reason: ${data.reason}`,
      category: 'borrowing' as NotificationCategory,
      actions: [
        { text: 'View Details', actionType: 'view', url: `/faculty/borrowings/${data.borrowingId}` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        reason: data.reason,
        rejectedBy: data.rejectedBy,
        borrowerType: 'faculty'
      }
    }),

    borrowing_returned: (data) => ({
      title: 'Equipment Returned',
      message: `${data.equipmentName} has been returned by ${data.studentName}`,
      category: 'borrowing' as NotificationCategory,
      actions: [
        { text: 'View Details', actionType: 'view', url: `/admin/returns/${data.returnId}` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        studentName: data.studentName,
        conditionOnReturn: data.conditionOnReturn,
        returnedDate: data.returnedDate
      }
    }),

    // Return deadline reminder
    return_deadline_reminder: (data) => ({
      title: 'Return Equipment Reminder',
      message: `Please return ${data.equipmentName} by 4:00 PM today. School closes at 5:00 PM.`,
      category: 'borrowing' as NotificationCategory,
      priority: 'urgent',
      actions: [
        { 
          text: 'Return Now', 
          actionType: 'view', 
          url: `/student/returns/borrowed/${data.studentId}` 
        }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        equipmentId: data.equipmentId,
        borrowId: data.borrowId,
        returnDeadline: data.returnDeadline,
        schoolClosingTime: '17:00',
        reminderTime: '16:00'
      }
    }),

    // Faculty return deadline reminder
    faculty_return_deadline_reminder: (data) => ({
      title: 'Faculty Return Deadline Reminder',
      message: `Please return ${data.equipmentName} by 4:00 PM today. School closes at 5:00 PM.`,
      category: 'borrowing' as NotificationCategory,
      priority: 'urgent',
      actions: [
        { 
          text: 'Return Now', 
          actionType: 'view', 
          url: `/faculty/returns/borrowed/${data.facultyId}` 
        }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        equipmentId: data.equipmentId,
        borrowId: data.borrowId,
        facultyId: data.facultyId,
        facultyName: data.facultyName,
        returnDeadline: data.returnDeadline,
        schoolClosingTime: '17:00',
        reminderTime: '16:00',
        borrowerType: 'faculty'
      }
    }),

    // Equipment returned notification for admin
    equipment_returned_admin: (data) => ({
      title: 'Equipment Returned by Student',
      message: `${data.studentName} has returned ${data.equipmentName} on ${data.returnDate}`,
      category: 'borrowing' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'Verify Return', 
          actionType: 'view', 
          url: `/admin/returns/${data.returnId}` 
        }
      ],
      metadata: {
        studentName: data.studentName,
        studentId: data.studentId,
        equipmentName: data.equipmentName,
        returnDate: data.returnDate,
        returnTime: data.returnTime,
        condition: data.condition,
        returnId: data.returnId
      }
    }),

    // Equipment returned by faculty notification for admin
    faculty_equipment_returned_admin: (data) => ({
      title: 'Equipment Returned by Faculty',
      message: `Faculty ${data.facultyName} has returned ${data.equipmentName} on ${data.returnDate}`,
      category: 'borrowing' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'Verify Return', 
          actionType: 'view', 
          url: `/admin/returns/${data.returnId}` 
        }
      ],
      metadata: {
        facultyName: data.facultyName,
        facultyId: data.facultyId,
        equipmentName: data.equipmentName,
        returnDate: data.returnDate,
        returnTime: data.returnTime,
        condition: data.condition,
        returnId: data.returnId,
        borrowerType: 'faculty'
      }
    }),

    // Late return warning
    return_late_warning: (data) => ({
      title: 'Late Return Warning',
      message: `${data.equipmentName} was returned after 4:00 PM on ${data.returnDate}. School closes at 5:00 PM.`,
      category: 'borrowing' as NotificationCategory,
      priority: 'high',
      actions: [
        { 
          text: 'Review', 
          actionType: 'view', 
          url: `/admin/returns/${data.returnId}` 
        }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        studentName: data.studentName,
        returnDate: data.returnDate,
        returnTime: data.returnTime,
        deadlineTime: '16:00',
        schoolClosingTime: '17:00',
        minutesLate: data.minutesLate,
        returnId: data.returnId
      }
    }),

    // Faculty late return warning
    faculty_return_late_warning: (data) => ({
      title: 'Faculty Late Return Warning',
      message: `Faculty ${data.facultyName} returned ${data.equipmentName} at ${data.returnTime} (${data.minutesLate} minutes after 4:00 PM deadline). School closes at 5:00 PM.`,
      category: 'borrowing' as NotificationCategory,
      priority: 'high',
      actions: [
        { 
          text: 'Review', 
          actionType: 'view', 
          url: `/admin/returns/${data.returnId}` 
        }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        facultyName: data.facultyName,
        returnDate: data.returnDate,
        returnTime: data.returnTime,
        deadlineTime: '16:00',
        schoolClosingTime: '17:00',
        minutesLate: data.minutesLate,
        returnId: data.returnId,
        borrowerType: 'faculty'
      }
    }),

    // Return completed notification for student
    return_completed_student: (data) => ({
      title: 'Return Completed',
      message: `Your return of ${data.equipmentName} has been verified. Thank you!`,
      category: 'borrowing' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'View Details', 
          actionType: 'view', 
          url: `/student/returns/user/${data.studentId}` 
        }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        returnDate: data.returnDate,
        verifiedBy: data.verifiedBy,
        conditionOnReturn: data.conditionOnReturn
      }
    }),

    // Return completed notification for faculty
    faculty_return_completed: (data) => ({
      title: 'Faculty Return Completed',
      message: `Your return of ${data.equipmentName} has been verified by ${data.verifiedBy}.`,
      category: 'borrowing' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'View Details', 
          actionType: 'view', 
          url: `/faculty/returns/user/${data.facultyId}` 
        }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        returnDate: data.returnDate,
        verifiedBy: data.verifiedBy,
        conditionOnReturn: data.conditionOnReturn,
        borrowerType: 'faculty'
      }
    }),

    // Maintenance templates
    maintenance_scheduled: (data) => ({
      title: 'Maintenance Scheduled',
      message: `You have been assigned to perform ${data.maintenanceType || 'maintenance'} on ${data.equipmentName} (${data.quantity} unit${data.quantity > 1 ? 's' : ''}) due on ${new Date(data.dueDate).toLocaleDateString()}`,
      category: 'maintenance' as NotificationCategory,
      priority: 'medium',
      actions: [
        { text: 'View Details', actionType: 'view', url: `/faculty/maintenance/${data.maintenanceId}` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        equipmentId: data.equipmentId,
        maintenanceId: data.maintenanceId,
        maintenanceType: data.maintenanceType || 'maintenance',
        quantity: data.quantity,
        scheduledDate: data.scheduledDate,
        dueDate: data.dueDate,
        priority: data.priority || 'Medium',
        description: data.description
      }
    }),

    // Maintenance assigned to faculty
    maintenance_assigned_faculty: (data) => ({
      title: 'Maintenance Assigned',
      message: `You have been assigned ${data.maintenanceType || 'maintenance'} for ${data.equipmentName}. Please review the schedule.`,
      category: 'maintenance' as NotificationCategory,
      priority: 'medium',
      actions: [
        { text: 'View Assignment', actionType: 'view', url: `/faculty/maintenance/${data.maintenanceId}` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        equipmentId: data.equipmentId,
        maintenanceId: data.maintenanceId,
        maintenanceType: data.maintenanceType || 'maintenance',
        assignedBy: data.assignedBy,
        assignedDate: data.assignedDate
      }
    }),

    // Equipment under maintenance notification for admin
    equipment_under_maintenance_admin: (data) => ({
      title: 'Equipment Under Maintenance',
      message: `${data.equipmentName} (${data.quantity} unit${data.quantity > 1 ? 's' : ''}) is now under ${data.maintenanceType || 'maintenance'} by ${data.facultyName}`,
      category: 'maintenance' as NotificationCategory,
      priority: 'medium',
      actions: [
        { text: 'View Maintenance', actionType: 'view', url: `/admin/maintenance/${data.maintenanceId}` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        equipmentId: data.equipmentId,
        maintenanceId: data.maintenanceId,
        maintenanceType: data.maintenanceType || 'maintenance',
        quantity: data.quantity,
        facultyName: data.facultyName,
        facultyId: data.facultyId,
        scheduledDate: data.scheduledDate,
        dueDate: data.dueDate,
        status: 'In Progress'
      }
    }),

    // Equipment maintenance completed notification for admin
    equipment_maintenance_completed_admin: (data) => ({
      title: 'Maintenance Completed',
      message: `${data.facultyName} has completed ${data.maintenanceType || 'maintenance'} on ${data.equipmentName} (${data.quantity} unit${data.quantity > 1 ? 's' : ''})`,
      category: 'maintenance' as NotificationCategory,
      priority: 'medium',
      actions: [
        { text: 'View Report', actionType: 'view', url: `/admin/maintenance/${data.maintenanceId}` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        equipmentId: data.equipmentId,
        maintenanceId: data.maintenanceId,
        maintenanceType: data.maintenanceType || 'maintenance',
        quantity: data.quantity,
        facultyName: data.facultyName,
        facultyId: data.facultyId,
        completedDate: data.completedDate,
        conditionAfter: data.conditionAfter,
        findings: data.findings,
        totalCost: data.totalCost
      }
    }),

    // Equipment disposed during maintenance notification for admin
    equipment_maintenance_disposed_admin: (data) => ({
      title: 'Equipment Disposed During Maintenance',
      message: `${data.facultyName} has disposed ${data.disposedQuantity} unit${data.disposedQuantity > 1 ? 's' : ''} of ${data.equipmentName} during ${data.maintenanceType || 'maintenance'}. Reason: ${data.reason}`,
      category: 'maintenance' as NotificationCategory,
      priority: 'high',
      actions: [
        { text: 'View Details', actionType: 'view', url: `/admin/maintenance/${data.maintenanceId}` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        equipmentId: data.equipmentId,
        maintenanceId: data.maintenanceId,
        maintenanceType: data.maintenanceType || 'maintenance',
        disposedQuantity: data.disposedQuantity,
        totalQuantity: data.totalQuantity,
        facultyName: data.facultyName,
        facultyId: data.facultyId,
        reason: data.reason,
        disposalDate: data.disposalDate
      }
    }),

    // Maintenance overdue notification
    maintenance_overdue: (data) => ({
      title: 'Maintenance Overdue',
      message: `Maintenance for ${data.equipmentName} (${data.quantity} unit${data.quantity > 1 ? 's' : ''}) is overdue by ${data.overdueDays} day${data.overdueDays > 1 ? 's' : ''}`,
      category: 'maintenance' as NotificationCategory,
      priority: 'urgent',
      actions: [
        { text: 'Complete Now', actionType: 'view', url: `/faculty/maintenance/${data.maintenanceId}/complete` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        equipmentId: data.equipmentId,
        maintenanceId: data.maintenanceId,
        maintenanceType: data.maintenanceType || 'maintenance',
        quantity: data.quantity,
        dueDate: data.dueDate,
        overdueDays: data.overdueDays,
        facultyName: data.facultyName,
        facultyId: data.facultyId
      }
    }),

    // User registration template
    user_registration: (data) => ({
      title: 'New User Registration',
      message: `New ${data.role} account created: ${data.userName} (${data.email})`,
      category: 'user' as NotificationCategory,
      actions: [
        { text: 'View User', actionType: 'view', url: `/admin/users/${data.userId}` }
      ],
      metadata: {
        userName: data.userName,
        email: data.email,
        role: data.role,
        registrationDate: data.registrationDate
      }
    }),

    // Equipment low stock template
    equipment_low_stock: (data) => ({
      title: 'Low Stock Alert',
      message: `${data.equipmentName} is running low. Current stock: ${data.currentQuantity}/${data.totalQuantity}`,
      category: 'inventory' as NotificationCategory,
      actions: [
        { text: 'View Equipment', actionType: 'view', url: `/admin/inventory/${data.equipmentId}` },
        { text: 'Restock', actionType: 'custom', url: `/admin/inventory/${data.equipmentId}/restock` }
      ],
      metadata: {
        equipmentName: data.equipmentName,
        currentQuantity: data.currentQuantity,
        totalQuantity: data.totalQuantity,
        threshold: data.threshold || 5
      }
    }),

    // System announcement template
    system_announcement: (data) => ({
      title: data.title || 'System Announcement',
      message: data.message,
      category: 'system' as NotificationCategory,
      actions: [
        { text: 'Dismiss', actionType: 'dismiss' }
      ],
      metadata: {
        announcementId: data.announcementId,
        postedBy: data.postedBy
      }
    }),

    // ADDED: Announcement created template (for admins/faculty who can see all announcements)
    announcement_created: (data) => ({
      title: 'New Announcement Published',
      message: `${data.createdBy} has published a new announcement: "${data.title}"`,
      category: 'announcement' as NotificationCategory,
      priority: data.priority || 'medium',
      actions: [
        { 
          text: 'View Announcement', 
          actionType: 'view', 
          url: `/announcements/${data.announcementId || data._id}` 
        }
      ],
      metadata: {
        announcementId: data.announcementId || data._id,
        title: data.title,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByRole: data.createdByRole,
        type: data.type,
        priority: data.priority,
        targetAudience: data.targetAudience,
        hasAttachments: data.hasAttachments || false
      }
    }),

    // ADDED: Announcement updated template
    announcement_updated: (data) => ({
      title: 'Announcement Updated',
      message: `${data.updatedBy} has updated the announcement: "${data.title}"`,
      category: 'announcement' as NotificationCategory,
      priority: data.priority || 'medium',
      actions: [
        { 
          text: 'View Updates', 
          actionType: 'view', 
          url: `/announcements/${data.announcementId || data._id}` 
        }
      ],
      metadata: {
        announcementId: data.announcementId || data._id,
        title: data.title,
        updatedBy: data.updatedBy,
        updatedByName: data.updatedByName,
        changes: data.changes || [],
        version: data.version || 1,
        type: data.type,
        priority: data.priority
      }
    }),

    // ADDED: Announcement deleted template (for admins/faculty)
    announcement_deleted: (data) => ({
      title: 'Announcement Deleted',
      message: `${data.deletedBy} has deleted the announcement: "${data.title}"`,
      category: 'announcement' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'View All Announcements', 
          actionType: 'view', 
          url: `/announcements` 
        }
      ],
      metadata: {
        title: data.title,
        deletedBy: data.deletedBy,
        deletedByName: data.deletedByName,
        deletedDate: data.deletedDate,
        announcementId: data.announcementId,
        type: data.type
      }
    }),

    // ADDED: Targeted announcement template (for specific users)
    announcement_targeted: (data) => ({
      title: 'New Announcement for You',
      message: `${data.createdBy} has published an announcement specifically for you: "${data.title}"`,
      category: 'announcement' as NotificationCategory,
      priority: data.priority || 'medium',
      actions: [
        { 
          text: 'View Announcement', 
          actionType: 'view', 
          url: `/announcements/${data.announcementId || data._id}` 
        }
      ],
      metadata: {
        announcementId: data.announcementId || data._id,
        title: data.title,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        type: data.type,
        priority: data.priority,
        isTargeted: true,
        targetReason: data.targetReason || 'Personal notification'
      }
    }),

    // Schedule notification templates
    schedule_created_student: (data) => ({
      title: 'New Class Scheduled',
      message: `You have a new ${data.subjectName} class scheduled for ${new Date(data.date).toLocaleDateString()} at ${data.startTime}. Room: ${data.roomName}`,
      category: 'system' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'View Schedule', 
          actionType: 'view', 
          url: `/student/schedule` 
        }
      ],
      metadata: {
        subjectName: data.subjectName,
        className: data.className,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        roomName: data.roomName,
        teacherName: data.teacherName,
        year: data.year,
        section: data.section,
        scheduleId: data.scheduleId
      }
    }),

    schedule_created_faculty: (data) => ({
      title: 'New Class Assigned',
      message: `You have been assigned to teach ${data.subjectName} for ${data.year}-${data.section} on ${new Date(data.date).toLocaleDateString()} at ${data.startTime}. Room: ${data.roomName}`,
      category: 'system' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'View Schedule', 
          actionType: 'view', 
          url: `/faculty/schedule` 
        }
      ],
      metadata: {
        subjectName: data.subjectName,
        className: data.className,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        roomName: data.roomName,
        year: data.year,
        section: data.section,
        studentCount: data.studentCount || 0,
        scheduleId: data.scheduleId
      }
    }),

    schedule_updated_student: (data) => ({
      title: 'Class Schedule Updated',
      message: `Your ${data.subjectName} class has been updated. New schedule: ${new Date(data.date).toLocaleDateString()} at ${data.startTime}. Room: ${data.roomName}`,
      category: 'system' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'View Schedule', 
          actionType: 'view', 
          url: `/student/schedule` 
        }
      ],
      metadata: {
        subjectName: data.subjectName,
        className: data.className,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        roomName: data.roomName,
        teacherName: data.teacherName,
        year: data.year,
        section: data.section,
        scheduleId: data.scheduleId,
        changes: data.changes || []
      }
    }),

    schedule_updated_faculty: (data) => ({
      title: 'Class Assignment Updated',
      message: `Your ${data.subjectName} class assignment has been updated. New schedule: ${new Date(data.date).toLocaleDateString()} at ${data.startTime}. Room: ${data.roomName}`,
      category: 'system' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'View Schedule', 
          actionType: 'view', 
          url: `/faculty/schedule` 
        }
      ],
      metadata: {
        subjectName: data.subjectName,
        className: data.className,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        roomName: data.roomName,
        year: data.year,
        section: data.section,
        scheduleId: data.scheduleId,
        changes: data.changes || []
      }
    }),

    schedule_cancelled_student: (data) => ({
      title: 'Class Cancelled',
      message: `Your ${data.subjectName} class scheduled for ${new Date(data.date).toLocaleDateString()} has been cancelled.`,
      category: 'system' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'View Schedule', 
          actionType: 'view', 
          url: `/student/schedule` 
        }
      ],
      metadata: {
        subjectName: data.subjectName,
        className: data.className,
        date: data.date,
        scheduleId: data.scheduleId,
        cancellationReason: data.cancellationReason || 'No reason provided'
      }
    }),

    schedule_cancelled_faculty: (data) => ({
      title: 'Class Assignment Cancelled',
      message: `Your ${data.subjectName} class assignment for ${new Date(data.date).toLocaleDateString()} has been cancelled.`,
      category: 'system' as NotificationCategory,
      priority: 'medium',
      actions: [
        { 
          text: 'View Schedule', 
          actionType: 'view', 
          url: `/faculty/schedule` 
        }
      ],
      metadata: {
        subjectName: data.subjectName,
        className: data.className,
        date: data.date,
        scheduleId: data.scheduleId,
        cancellationReason: data.cancellationReason || 'No reason provided'
      }
    })
  };

  const template = templates[data.type] || defaultTemplate;
  
  const templateData = template(data);

  const notificationData = {
    recipientId: data.recipientId,
    recipientSchoolID: data.recipientSchoolID,
    recipientRole: data.recipientRole,
    recipientName: data.recipientName,
    recipientEmail: data.recipientEmail,
    title: templateData.title,
    message: templateData.message,
    type: data.type,
    category: templateData.category,
    priority: templateData.priority || data.priority || 'medium',
    relatedModel: data.relatedModel,
    relatedId: data.relatedId,
    actions: templateData.actions || [],
    metadata: templateData.metadata || {}
  };

  console.log('📨 Creating notification with data:', {
    type: data.type,
    category: notificationData.category,
    recipient: data.recipientName,
    title: notificationData.title
  });

  return this.create(notificationData);
};

// Static method to get notifications for a user
notificationSchema.statics.getUserNotifications = async function(
  userId: string, 
  options: NotificationQueryOptions = {}
): Promise<{
  notifications: INotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}> {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    archived = false,
    type = null,
    category = null
  } = options;

  const query: any = { recipientId: userId, isArchived: archived };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  if (type) {
    query.type = type;
  }
  
  if (category) {
    query.category = category;
  }

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as any))
      .lean(),
    this.countDocuments(query),
    this.countDocuments({ recipientId: userId, isRead: false, isArchived: false })
  ]);

  return {
    notifications: notifications as INotification[],
    pagination: {
      page: parseInt(page as any),
      limit: parseInt(limit as any),
      total,
      pages: Math.ceil(total / limit)
    },
    unreadCount
  };
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function(userId: string): Promise<any> {
  return this.updateMany(
    { recipientId: userId, isRead: false },
    { 
      isRead: true,
      readAt: new Date()
    }
  );
};

// Static method to get notification stats
notificationSchema.statics.getNotificationStats = async function(userId: string): Promise<{
  byType: Array<{ _id: string; count: number; unread: number }>;
  total: number;
  unread: number;
  read: number;
}> {
  const stats = await this.aggregate([
    {
      $match: {
        recipientId: userId,
        isArchived: false
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        unread: {
          $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  const total = await this.countDocuments({ recipientId: userId, isArchived: false });
  const unread = await this.countDocuments({ 
    recipientId: userId, 
    isRead: false, 
    isArchived: false 
  });

  return {
    byType: stats,
    total,
    unread,
    read: total - unread
  };
};

// Create and export the model
const Notification = mongoose.model<INotification, INotificationModel>('Notification', notificationSchema);

export default Notification;