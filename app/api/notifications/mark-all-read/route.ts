import { NextRequest, NextResponse } from 'next/server';
import Notification from '@/models/Notification';
import connectDB from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

async function authenticateUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return null;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return null;
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };
    return decoded;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    await connectDB();

    const result = await Notification.updateMany(
      { 
        recipientId: user.userId, 
        isRead: false,
        isArchived: false 
      },
      { 
        isRead: true,
        readAt: new Date()
      }
    );

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    console.error('Error marking all as read:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to mark all as read' 
      },
      { status: 500 }
    );
  }
}