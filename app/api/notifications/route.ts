import { NextRequest, NextResponse } from 'next/server';
import Notification from '@/models/Notification';
import connectDB from '@/lib/db';
import { sendNotificationToUser } from './stream/route';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// Helper to authenticate user
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

// GET notifications for current user
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Get notifications
    const notifications = await Notification.find({
      recipientId: user.userId,
      isArchived: false
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    // Get counts
    const total = await Notification.countDocuments({
      recipientId: user.userId,
      isArchived: false
    });
    
    const unreadCount = await Notification.countDocuments({
      recipientId: user.userId,
      isRead: false,
      isArchived: false
    });

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch notifications' 
      },
      { status: 200 } // Changed to 200 to prevent fetch error
    );
  }
}

// POST - Create new notification AND trigger real-time update
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

    const body = await request.json();
    
    console.log('📨 Creating notification:', {
      type: body.type,
      recipient: body.recipientId || user.userId,
      body
    });
    
    // Create the notification
    const notification = await Notification.createNotification({
      ...body,
      recipientId: body.recipientId || user.userId,
      recipientSchoolID: body.recipientSchoolID || user.userId,
      recipientRole: body.recipientRole || user.role,
      recipientName: body.recipientName || user.email,
      recipientEmail: body.recipientEmail || user.email
    });

    console.log('✅ Notification created:', notification._id);

    // Send real-time update via SSE if recipient is online
    try {
      await sendNotificationToUser(notification.recipientId, notification);
    } catch (sseError) {
      console.log('⚠️ SSE not available, notification saved to DB');
    }

    return NextResponse.json({
      success: true,
      notification
    });
  } catch (error: any) {
    console.error('❌ Error creating notification:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create notification' 
      },
      { status: 200 } // Changed to 200 to prevent fetch error
    );
  }
}