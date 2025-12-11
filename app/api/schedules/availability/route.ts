import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Schedule from '@/models/Schedule';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const date = searchParams.get('date');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const excludeScheduleId = searchParams.get('excludeScheduleId');

    if (!roomId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const isAvailable = await Schedule.checkAvailability(
      roomId,
      new Date(date),
      startTime,
      endTime,
      excludeScheduleId || undefined
    );

    return NextResponse.json({ available: isAvailable });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check availability', details: error.message },
      { status: 500 }
    );
  }
}