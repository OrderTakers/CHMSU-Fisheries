import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Feedback from '@/models/Feedback';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const userRole = searchParams.get('userRole');
    const rating = searchParams.get('rating');
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    
    if (!includeAll) {
      query.isActive = true;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (userRole && userRole !== 'all') {
      query.userRole = userRole;
    }
    
    if (rating && rating !== 'all') {
      query.rating = parseInt(rating);
    }
    
    // Get total count
    const total = await Feedback.countDocuments(query);
    
    // Get feedbacks
    const feedbacks = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v -deviceInfo') // Exclude sensitive fields
      .lean();
    
    // Calculate average rating
    const avgRatingResult = await Feedback.aggregate([
      { $match: query },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);
    
    const averageRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;
    
    return NextResponse.json(
      { 
        feedbacks,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        averageRating: averageRating.toFixed(1)
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}