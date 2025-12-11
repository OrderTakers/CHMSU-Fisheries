// app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Feedback from '@/models/Feedback';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const { 
      rating, 
      comment, 
      userRole, 
      userRoleDetails, 
      anonymousUserId,
      appVersion,
      deviceInfo 
    } = body;

    // Basic validation
    if (!rating || !comment || !userRole) {
      return NextResponse.json(
        { 
          error: 'Rating, comment, and user role are required',
          message: 'Please provide all required fields'
        },
        { status: 400 }
      );
    }

    // Validate rating range
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { 
          error: 'Rating must be an integer between 1 and 5',
          message: 'Please provide a valid rating (1-5)'
        },
        { status: 400 }
      );
    }

    // Validate user role
    if (!['student', 'faculty'].includes(userRole)) {
      return NextResponse.json(
        { 
          error: 'Invalid user role',
          message: 'User role must be either "student" or "faculty"'
        },
        { status: 400 }
      );
    }

    // Validate student details if role is student
    if (userRole === 'student') {
      if (!userRoleDetails || !userRoleDetails.year || !userRoleDetails.section) {
        return NextResponse.json(
          { 
            error: 'Year and section are required for student feedback',
            message: 'Please provide your year and section'
          },
          { status: 400 }
        );
      }

      // Validate year range
      if (userRoleDetails.year < 1 || userRoleDetails.year > 4) {
        return NextResponse.json(
          { 
            error: 'Year must be between 1 and 4',
            message: 'Please provide a valid year (1-4)'
          },
          { status: 400 }
        );
      }
    }

    // Create new feedback
    const feedbackData: any = {
      rating,
      comment,
      userRole,
      userRoleDetails: userRole === 'student' ? userRoleDetails : undefined,
      anonymousUserId,
      appVersion: appVersion || '1.0.0',
      deviceInfo: deviceInfo || 'Unknown',
      status: 'pending'
    };

    // Remove undefined values for student feedback
    if (userRole !== 'student') {
      delete feedbackData.userRoleDetails;
    }

    const feedback = new Feedback(feedbackData);
    await feedback.save();

    return NextResponse.json(
      { 
        message: 'Feedback submitted successfully!',
        feedback: {
          feedbackId: feedback.feedbackId,
          rating: feedback.rating,
          comment: feedback.comment,
          userRole: feedback.userRole,
          status: feedback.status,
          createdAt: feedback.createdAt
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Feedback submission error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          error: 'Duplicate feedback ID',
          message: 'There was an issue submitting your feedback. Please try again.'
        },
        { status: 409 }
      );
    }

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          message: error.message || 'Please check your input and try again.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Something went wrong. Please try again later.'
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve feedback (if needed)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // For admin purposes only - you should add authentication
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userRole = searchParams.get('userRole');
    
    const query: any = { isActive: true };
    
    if (status) query.status = status;
    if (userRole) query.userRole = userRole;
    
    const feedbacks = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-__v -anonymousUserId -deviceInfo'); // Exclude sensitive fields
    
    return NextResponse.json(
      { 
        message: 'Feedback retrieved successfully',
        feedbacks,
        count: feedbacks.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Feedback retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}