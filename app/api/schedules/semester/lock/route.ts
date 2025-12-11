import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Schedule from '@/models/Schedule';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { schoolYear, semester, action } = body;

    if (!schoolYear || !semester || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['lock', 'unlock'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'lock') {
      result = await Schedule.lockSemesterSchedules(schoolYear, semester as '1st' | '2nd');
    } else {
      result = await Schedule.unlockSemesterSchedules(schoolYear, semester as '1st' | '2nd');
    }

    return NextResponse.json({
      message: `Semester ${action}ed successfully`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to lock/unlock semester', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const schoolYear = searchParams.get('schoolYear');
    const semester = searchParams.get('semester');

    if (!schoolYear || !semester) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const lockedSchedule = await Schedule.findOne({
      schoolYear,
      semester,
      semesterLocked: true
    });

    return NextResponse.json({
      locked: !!lockedSchedule,
      schoolYear,
      semester
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check lock status', details: error.message },
      { status: 500 }
    );
  }
}