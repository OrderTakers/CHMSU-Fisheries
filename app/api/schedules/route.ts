// app/api/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Schedule from '@/models/Schedule';
import Room from '@/models/Room';
import User from '@/models/User';
import Laboratory from '@/models/Laboratory';

// Connect to MongoDB
async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not configured');
  }
  
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
  }
}

// Helper function to parse time string to minutes
function parseTime(time: string): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

// Helper to get day from date
function getDayFromDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dateObj.getDay()];
  } catch {
    return 'Mon';
  }
}

// Type definitions for populated data
interface PopulatedRoom {
  _id: mongoose.Types.ObjectId;
  name: string;
  location?: string;
  laboratoryId?: mongoose.Types.ObjectId | any;
  metadata?: {
    roomNumber: string;
    building: string;
    floor: string;
    capacity?: number;
  };
}

interface PopulatedLaboratory {
  _id: mongoose.Types.ObjectId;
  name: string;
  location?: string;
}

interface PopulatedTeacher {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

// GET /api/schedules - fetch schedules
export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/schedules called");
    
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const laboratoryId = searchParams.get('laboratoryId');
    const roomId = searchParams.get('roomId');
    const schoolYear = searchParams.get('schoolYear');
    const semester = searchParams.get('semester');
    const teacherId = searchParams.get('teacherId');
    
    console.log("Query params:", { laboratoryId, roomId, schoolYear, semester, teacherId });
    
    // Build query
    const query: any = {};
    
    if (schoolYear && schoolYear !== 'null' && schoolYear !== 'undefined') {
      query.schoolYear = schoolYear;
    }
    
    if (semester && semester !== 'null' && semester !== 'undefined') {
      query.semester = semester;
    }
    
    if (roomId && roomId !== 'null' && roomId !== 'undefined') {
      try {
        query.roomId = new mongoose.Types.ObjectId(roomId);
      } catch (error) {
        console.error("Invalid roomId:", roomId);
      }
    }
    
    if (teacherId && teacherId !== 'null' && teacherId !== 'undefined') {
      try {
        query.teacher = new mongoose.Types.ObjectId(teacherId);
      } catch (error) {
        console.error("Invalid teacherId:", teacherId);
      }
    }
    
    // If laboratoryId is provided but not roomId, find all rooms in that lab
    if (laboratoryId && laboratoryId !== 'null' && laboratoryId !== 'undefined' && !roomId) {
      try {
        // Find all rooms in this laboratory
        const rooms = await Room.find({ laboratoryId }).select('_id');
        const roomIds = rooms.map((room: any) => room._id);
        
        if (roomIds.length > 0) {
          query.roomId = { $in: roomIds };
        } else {
          // If no rooms found, return empty array
          console.log("No rooms found for laboratory:", laboratoryId);
          return NextResponse.json([]);
        }
      } catch (error) {
        console.error("Error finding rooms for laboratory:", error);
      }
    }
    
    console.log("MongoDB query:", JSON.stringify(query));
    
    // Fetch schedules with proper population
    const schedules = await Schedule.find(query)
      .populate({
        path: 'teacher',
        model: User,
        select: 'firstName lastName email role'
      })
      .populate({
        path: 'roomId',
        model: Room,
        select: 'name location metadata laboratoryId'
      })
      .sort({ date: 1, startTime: 1 })
      .lean();
    
    console.log(`Found ${schedules.length} schedules from database`);
    
    // Get laboratory info for each room
    const transformedSchedules = await Promise.all(
      schedules.map(async (schedule: any) => {
        // Get laboratory info from room
        let laboratoryId = '';
        let laboratoryName = '';
        
        if (schedule.roomId) {
          try {
            const room = await Room.findById(schedule.roomId._id || schedule.roomId)
              .populate({
                path: 'laboratoryId',
                model: Laboratory,
                select: 'name location'
              })
              .lean();
            
            if (room) {
              const roomData = room as any;
              if (roomData.laboratoryId) {
                const lab = roomData.laboratoryId as PopulatedLaboratory;
                laboratoryId = lab._id?.toString() || '';
                laboratoryName = lab.name || '';
              }
            }
          } catch (error) {
            console.error("Error fetching laboratory info:", error);
          }
        }
        
        // Get teacher info
        const teacher = schedule.teacher as PopulatedTeacher;
        const teacherId = teacher?._id?.toString() || schedule.teacher || '';
        
        let teacherName = schedule.teacherName || '';
        if (!teacherName && teacher) {
          if (teacher.firstName && teacher.lastName) {
            teacherName = `${teacher.firstName} ${teacher.lastName}`.trim();
          }
        }
        
        // Get room info
        const room = schedule.roomId as PopulatedRoom;
        const roomName = schedule.roomName || room?.name || '';
        
        // Ensure day exists
        let day = schedule.day;
        if (!day && schedule.date) {
          day = getDayFromDate(schedule.date);
        }
        
        // Generate yearSection
        const yearSection = `${schedule.year || 1}-${schedule.section || 'A'}`;
        
        return {
          id: schedule._id?.toString() || '',
          _id: schedule._id?.toString() || '',
          scheduleId: schedule.scheduleId || schedule._id?.toString() || '',
          subjectName: schedule.subjectName || 'Untitled Subject',
          className: schedule.className || 'Untitled Class',
          year: schedule.year || 1,
          section: schedule.section || 'A',
          yearSection: yearSection,
          schoolYear: schedule.schoolYear || '2025-2026',
          semester: schedule.semester || '1st',
          semesterDisplay: `${schedule.semester || '1st'} Semester`,
          teacher: teacherId,
          teacherName: teacherName,
          laboratoryId: laboratoryId,
          laboratoryName: laboratoryName,
          roomId: room?._id?.toString() || schedule.roomId || '',
          roomName: roomName,
          day: day || 'Mon',
          date: schedule.date?.toISOString() || new Date().toISOString(),
          startTime: schedule.startTime || '08:00',
          endTime: schedule.endTime || '09:00',
          duration: schedule.duration || 60,
          timeSlot: schedule.timeSlot || `${schedule.startTime || '08:00'}-${schedule.endTime || '09:00'}`,
          status: schedule.status || 'scheduled',
          semesterLocked: schedule.semesterLocked || false,
          metadata: schedule.metadata || {
            recurring: false,
            recurrencePattern: 'weekly',
            maxStudents: 30
          },
          students: schedule.students?.map((s: any) => s.toString()) || [],
          qrCode: schedule.qrCode || '',
          createdAt: schedule.createdAt?.toISOString(),
          updatedAt: schedule.updatedAt?.toISOString()
        };
      })
    );
    
    console.log(`Returning ${transformedSchedules.length} transformed schedules`);
    return NextResponse.json(transformedSchedules);
    
  } catch (error: any) {
    console.error("Unexpected error in GET /api/schedules:", error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/schedules - create a new schedule
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/schedules called");
    
    await connectToDatabase();
    
    const body = await request.json();
    console.log("Request body:", body);
    
    // Basic validation
    if (!body.subjectName?.trim()) {
      return NextResponse.json(
        { error: 'Subject name is required' },
        { status: 400 }
      );
    }
    
    if (!body.roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }
    
    // Calculate duration
    let duration = body.duration;
    if (body.startTime && body.endTime) {
      const start = parseTime(body.startTime);
      const end = parseTime(body.endTime);
      duration = end - start;
      
      if (duration <= 0) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    }
    
    // Parse date and ensure day
    let date = body.date ? new Date(body.date) : new Date();
    let day = body.day;
    if (!day) {
      day = getDayFromDate(date);
    }
    
    // Check if room exists and get room name
    const room = await Room.findById(body.roomId).lean() as PopulatedRoom | null;
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    // Check if teacher exists if provided
    let teacherName = body.teacherName || '';
    if (body.teacher && body.teacher !== 'no-faculty') {
      try {
        const teacher = await User.findById(body.teacher).lean() as PopulatedTeacher | null;
        if (teacher) {
          teacherName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
        }
      } catch (error) {
        console.warn("Teacher not found, continuing without teacher name");
      }
    }
    
    // Generate schedule ID
    const scheduleId = `SCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate QR code
    const qrCode = `QR-${scheduleId}`;
    
    // Prepare schedule data according to model
    const scheduleData: any = {
      scheduleId,
      subjectName: body.subjectName.trim(),
      className: body.className?.trim() || body.subjectName.trim(),
      year: body.year || 1,
      section: (body.section || 'A').toUpperCase(),
      schoolYear: body.schoolYear || '2025-2026',
      semester: body.semester || '1st',
      teacherName: teacherName,
      roomId: new mongoose.Types.ObjectId(body.roomId),
      roomName: room.name || '',
      day: day,
      date: date,
      startTime: body.startTime || '08:00',
      endTime: body.endTime || '09:00',
      duration: duration || 60,
      timeSlot: `${body.startTime || '08:00'}-${body.endTime || '09:00'}`,
      status: body.status || 'scheduled',
      semesterLocked: body.semesterLocked || false,
      metadata: {
        recurring: body.recurring || false,
        recurrencePattern: body.recurrencePattern || 'weekly',
        maxStudents: body.maxStudents || 30
      },
      qrCode: qrCode
    };
    
    // Add teacher ObjectId if provided
    if (body.teacher && body.teacher !== 'no-faculty') {
      scheduleData.teacher = new mongoose.Types.ObjectId(body.teacher);
    }
    
    console.log("Creating schedule with data:", scheduleData);
    
    // Create new schedule
    const newSchedule = await Schedule.create(scheduleData);
    
    console.log("Schedule created:", newSchedule._id, "Schedule ID:", newSchedule.scheduleId);
    
    const newScheduleObj = newSchedule.toObject();
    
    // Generate yearSection for response
    const yearSection = `${newScheduleObj.year || 1}-${newScheduleObj.section || 'A'}`;
    
    // Get laboratory info for response
    let laboratoryId = '';
    let laboratoryName = '';
    try {
      const roomWithLab = await Room.findById(body.roomId)
        .populate({
          path: 'laboratoryId',
          model: Laboratory,
          select: 'name'
        })
        .lean();
      
      if (roomWithLab) {
        const roomData = roomWithLab as any;
        if (roomData.laboratoryId) {
          const lab = roomData.laboratoryId as PopulatedLaboratory;
          laboratoryId = lab._id?.toString() || '';
          laboratoryName = lab.name || '';
        }
      }
    } catch (error) {
      console.error("Error fetching laboratory:", error);
    }
    
    const responseData = {
      id: (newScheduleObj as any)._id.toString(),
      _id: (newScheduleObj as any)._id.toString(),
      scheduleId: newScheduleObj.scheduleId || '',
      subjectName: newScheduleObj.subjectName || '',
      className: newScheduleObj.className || '',
      year: newScheduleObj.year || 1,
      section: newScheduleObj.section || '',
      yearSection: yearSection,
      schoolYear: newScheduleObj.schoolYear || '',
      semester: newScheduleObj.semester || '',
      semesterDisplay: `${newScheduleObj.semester || ''} Semester`,
      teacher: newScheduleObj.teacher?.toString() || null,
      teacherName: newScheduleObj.teacherName || '',
      laboratoryId: laboratoryId,
      laboratoryName: laboratoryName,
      roomId: newScheduleObj.roomId?.toString() || '',
      roomName: newScheduleObj.roomName || '',
      day: newScheduleObj.day || '',
      date: newScheduleObj.date?.toISOString() || new Date().toISOString(),
      startTime: newScheduleObj.startTime || '',
      endTime: newScheduleObj.endTime || '',
      duration: newScheduleObj.duration || 0,
      timeSlot: newScheduleObj.timeSlot || '',
      status: newScheduleObj.status || '',
      semesterLocked: newScheduleObj.semesterLocked || false,
      metadata: newScheduleObj.metadata || {},
      students: newScheduleObj.students || [],
      qrCode: newScheduleObj.qrCode || '',
      createdAt: (newScheduleObj as any).createdAt?.toISOString(),
      updatedAt: (newScheduleObj as any).updatedAt?.toISOString()
    };
    
    return NextResponse.json(responseData, { status: 201 });
    
  } catch (error: any) {
    console.error("Failed to save schedule:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message).join(', ');
      console.error("Validation errors:", messages);
      
      return NextResponse.json(
        { error: `Validation failed: ${messages}` },
        { status: 400 }
      );
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Schedule ID already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create schedule', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/schedules - update a schedule
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Check if schedule exists
    const existingSchedule = await Schedule.findById(id);
    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    // Calculate duration if times are provided
    if (body.startTime && body.endTime) {
      const start = parseTime(body.startTime);
      const end = parseTime(body.endTime);
      body.duration = end - start;
      body.timeSlot = `${body.startTime}-${body.endTime}`;
    }
    
    // Parse date if provided
    if (body.date) {
      body.date = new Date(body.date);
    }
    
    // Convert ObjectIds if needed
    const updateData: any = { ...body };
    
    if (body.roomId) {
      updateData.roomId = new mongoose.Types.ObjectId(body.roomId);
      
      // Get new room name
      const room = await Room.findById(body.roomId) as PopulatedRoom | null;
      if (room) {
        updateData.roomName = room.name;
      }
    }
    
    if (body.teacher && body.teacher !== 'no-faculty') {
      updateData.teacher = new mongoose.Types.ObjectId(body.teacher);
      
      // Get teacher name
      const teacher = await User.findById(body.teacher) as PopulatedTeacher | null;
      if (teacher) {
        updateData.teacherName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
      }
    } else if (body.teacher === 'no-faculty') {
      updateData.teacher = null;
      updateData.teacherName = '';
    }
    
    // Update the schedule
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    const updatedScheduleObj = updatedSchedule.toObject();
    
    // Generate yearSection for response
    const yearSection = `${updatedScheduleObj.year || 1}-${updatedScheduleObj.section || 'A'}`;
    
    // Get laboratory info for response
    let laboratoryId = '';
    let laboratoryName = '';
    try {
      const room = await Room.findById(updatedScheduleObj.roomId)
        .populate({
          path: 'laboratoryId',
          model: Laboratory,
          select: 'name'
        })
        .lean();
      
      if (room) {
        const roomData = room as any;
        if (roomData.laboratoryId) {
          const lab = roomData.laboratoryId as PopulatedLaboratory;
          laboratoryId = lab._id?.toString() || '';
          laboratoryName = lab.name || '';
        }
      }
    } catch (error) {
      console.error("Error fetching laboratory:", error);
    }
    
    const responseData = {
      id: (updatedScheduleObj as any)._id.toString(),
      _id: (updatedScheduleObj as any)._id.toString(),
      scheduleId: updatedScheduleObj.scheduleId || '',
      subjectName: updatedScheduleObj.subjectName || '',
      className: updatedScheduleObj.className || '',
      year: updatedScheduleObj.year || 1,
      section: updatedScheduleObj.section || '',
      yearSection: yearSection,
      schoolYear: updatedScheduleObj.schoolYear || '',
      semester: updatedScheduleObj.semester || '',
      semesterDisplay: `${updatedScheduleObj.semester || ''} Semester`,
      teacher: updatedScheduleObj.teacher?.toString() || null,
      teacherName: updatedScheduleObj.teacherName || '',
      laboratoryId: laboratoryId,
      laboratoryName: laboratoryName,
      roomId: updatedScheduleObj.roomId?.toString() || '',
      roomName: updatedScheduleObj.roomName || '',
      day: updatedScheduleObj.day || '',
      date: updatedScheduleObj.date?.toISOString() || new Date().toISOString(),
      startTime: updatedScheduleObj.startTime || '',
      endTime: updatedScheduleObj.endTime || '',
      duration: updatedScheduleObj.duration || 0,
      timeSlot: updatedScheduleObj.timeSlot || '',
      status: updatedScheduleObj.status || '',
      semesterLocked: updatedScheduleObj.semesterLocked || false,
      metadata: updatedScheduleObj.metadata || {},
      students: updatedScheduleObj.students?.map((s: any) => s.toString()) || [],
      qrCode: updatedScheduleObj.qrCode || '',
      createdAt: (updatedScheduleObj as any).createdAt?.toISOString(),
      updatedAt: (updatedScheduleObj as any).updatedAt?.toISOString()
    };
    
    return NextResponse.json(responseData);
    
  } catch (error: any) {
    console.error("Error in PUT /api/schedules:", error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update schedule', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules - delete a schedule
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const roomId = searchParams.get('roomId');
    const schoolYear = searchParams.get('schoolYear');
    const semester = searchParams.get('semester');
    
    console.log("DELETE params:", { id, roomId, schoolYear, semester });
    
    if (!id && !roomId) {
      return NextResponse.json(
        { error: 'Schedule ID or Room ID required' },
        { status: 400 }
      );
    }
    
    if (id) {
      // Delete single schedule
      const schedule = await Schedule.findById(id);
      if (!schedule) {
        return NextResponse.json(
          { error: 'Schedule not found' },
          { status: 404 }
        );
      }
      
      await Schedule.findByIdAndDelete(id);
      console.log(`Deleted schedule ${id}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Schedule deleted successfully' 
      });
    } else if (roomId) {
      // Delete all schedules for a room
      const query: any = { roomId: new mongoose.Types.ObjectId(roomId) };
      if (schoolYear) query.schoolYear = schoolYear;
      if (semester) query.semester = semester;
      
      console.log("Deleting with query:", query);
      
      const result = await Schedule.deleteMany(query);
      console.log(`Deleted ${result.deletedCount} schedules`);
      return NextResponse.json({ 
        success: true,
        message: `${result.deletedCount} schedule(s) deleted successfully` 
      });
    }
    
    return NextResponse.json({ 
      success: false,
      message: 'No action taken' 
    });
    
  } catch (error: any) {
    console.error("Error in DELETE /api/schedules:", error);
    return NextResponse.json(
      { error: 'Failed to delete schedule', details: error.message },
      { status: 500 }
    );
  }
}