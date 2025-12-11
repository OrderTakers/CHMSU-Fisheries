// models/Schedule.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IScheduleMetadata {
  recurring: boolean;
  recurrencePattern: string;
  maxStudents: number;
}

export interface ISchedule {
  scheduleId: string;
  subjectName: string;
  className: string;
  year: number;
  section: string;
  schoolYear: string;
  semester: string;
  teacher: Types.ObjectId;
  teacherName: string;
  roomId: Types.ObjectId;
  roomName: string;
  day: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  timeSlot: string;
  status: string;
  semesterLocked: boolean;
  metadata: IScheduleMetadata;
  students: Types.ObjectId[];
  qrCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScheduleDocument extends ISchedule, Document {}

const ScheduleSchema: Schema = new Schema({
  scheduleId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  className: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    min: 1
  },
  section: {
    type: String,
    required: true,
    trim: true
  },
  schoolYear: {
    type: String,
    required: true,
    trim: true
  },
  semester: {
    type: String,
    required: true,
    trim: true
  },
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  teacherName: {
    type: String,
    required: true,
    trim: true
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  roomName: {
    type: String,
    required: true,
    trim: true
  },
  day: {
    type: String,
    required: true,
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  timeSlot: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  semesterLocked: {
    type: Boolean,
    default: false
  },
  metadata: {
    recurring: {
      type: Boolean,
      default: false
    },
    recurrencePattern: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      default: 'weekly'
    },
    maxStudents: {
      type: Number,
      default: 30,
      min: 1
    }
  },
  students: [{
    type: Schema.Types.ObjectId,
    ref: 'Student'
  }],
  qrCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
ScheduleSchema.index({ scheduleId: 1 });
ScheduleSchema.index({ teacher: 1 });
ScheduleSchema.index({ roomId: 1 });
ScheduleSchema.index({ date: 1 });
ScheduleSchema.index({ day: 1 });
ScheduleSchema.index({ status: 1 });
ScheduleSchema.index({ semester: 1, schoolYear: 1 });
ScheduleSchema.index({ teacher: 1, date: 1 });
ScheduleSchema.index({ roomId: 1, date: 1 });

// Pre-save middleware
ScheduleSchema.pre('save', function(next) {
  const schedule = this as unknown as IScheduleDocument;
  
  // Validate that startTime is before endTime
  if (schedule.startTime >= schedule.endTime) {
    next(new Error('startTime must be before endTime'));
    return;
  }
  
  // Validate duration matches the time difference
  const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
  const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const calculatedDuration = endMinutes - startMinutes;
  
  if (schedule.duration !== calculatedDuration) {
    next(new Error(`Duration ${schedule.duration} does not match time difference ${calculatedDuration}`));
    return;
  }
  
  next();
});

const Schedule = mongoose.model<IScheduleDocument>('Schedule', ScheduleSchema);

export default Schedule;