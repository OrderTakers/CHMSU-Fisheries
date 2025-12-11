import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Schedule from '@/models/Schedule';

interface ScheduleResponse {
  _id: string;
  scheduleId: string;
  subjectName: string;
  className: string;
  year: number;
  section: string;
  schoolYear: string;
  semester: string;
  teacher: any;
  teacherName: string;
  roomId: any;
  roomName: string;
  day: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  timeSlot: string;
  students: any[];
  status: string;
  semesterLocked: boolean;
  qrCode?: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

const transformScheduleResponse = (doc: any): ScheduleResponse => ({
  _id: doc._id.toString(),
  scheduleId: doc.scheduleId,
  subjectName: doc.subjectName,
  className: doc.className,
  year: doc.year,
  section: doc.section,
  schoolYear: doc.schoolYear,
  semester: doc.semester,
  teacher: doc.teacher,
  teacherName: doc.teacherName,
  roomId: doc.roomId,
  roomName: doc.roomName,
  day: doc.day,
  date: doc.date,
  startTime: doc.startTime,
  endTime: doc.endTime,
  duration: doc.duration,
  timeSlot: doc.timeSlot,
  students: doc.students,
  status: doc.status,
  semesterLocked: doc.semesterLocked,
  qrCode: doc.qrCode,
  metadata: doc.metadata,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const schoolYear = searchParams.get('schoolYear');
    const semester = searchParams.get('semester');
    const filtersParam = searchParams.get('filters');

    if (!schoolYear || !semester) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    let filters = {};
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch {
        return NextResponse.json(
          { error: 'Invalid filters parameter' },
          { status: 400 }
        );
      }
    }

    const schedules = await Schedule.getSchedulesBySemester(
      schoolYear,
      semester as '1st' | '2nd',
      filters
    );

    const response = schedules.map(transformScheduleResponse);

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get schedules', details: error.message },
      { status: 500 }
    );
  }
}