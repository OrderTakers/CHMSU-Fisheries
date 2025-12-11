import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Schedule from '@/models/Schedule';

// Helper to generate schedule ID
function generateScheduleId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `SCH-${timestamp}-${randomStr}-${randomNum}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ error: 'No MongoDB URI' }, { status: 500 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Find all schedules without scheduleId
    const schedulesWithoutId = await Schedule.find({
      $or: [
        { scheduleId: { $exists: false } },
        { scheduleId: null },
        { scheduleId: '' }
      ]
    });

    console.log(`Found ${schedulesWithoutId.length} schedules without scheduleId`);

    // Add scheduleId to each
    const updates = [];
    for (const schedule of schedulesWithoutId) {
      const newScheduleId = generateScheduleId();
      updates.push(
        Schedule.findByIdAndUpdate(schedule._id, {
          $set: { scheduleId: newScheduleId }
        })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({
      message: `Added scheduleId to ${updates.length} schedules`,
      fixedCount: updates.length
    });
  } catch (error: any) {
    console.error("Error fixing schedules:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}