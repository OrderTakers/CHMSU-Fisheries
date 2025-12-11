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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    await connectDB();

    const { action } = await request.json();
    
    const notification = await Notification.findById(params.id);
    if (!notification) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Notification not found' 
        },
        { status: 404 }
      );
    }

    // Check ownership
    if (notification.recipientId !== user.userId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized access to notification' 
        },
        { status: 403 }
      );
    }

    let updatedNotification;
    if (action === 'read') {
      updatedNotification = await notification.markAsRead();
    } else if (action === 'archive') {
      updatedNotification = await notification.archive();
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid action' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: updatedNotification
    });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update notification' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    await connectDB();

    const notification = await Notification.findById(params.id);
    if (!notification) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Notification not found' 
        },
        { status: 404 }
      );
    }

    // Check ownership
    if (notification.recipientId !== user.userId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized access to notification' 
        },
        { status: 403 }
      );
    }

    await notification.deleteOne();

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to delete notification' 
      },
      { status: 500 }
    );
  }
}