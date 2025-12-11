import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Approval from '@/models/Approvals';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const borrowingId = searchParams.get('borrowingId');

    const filter: any = {};
    if (borrowingId) {
      filter.borrowingId = borrowingId;
    }

    const approvals = await Approval.find(filter).lean();

    return NextResponse.json({
      success: true,
      approvals,
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch approval records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'borrowingId',
      'equipmentId',
      'studentId',
      'studentName',
      'studentEmail',
      'equipmentName',
      'itemId',
      'purpose',
      'intendedBorrowDate',
      'intendedReturnDate',
      'roomAssigned'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { 
            success: false,
            error: `Missing required field: ${field}` 
          },
          { status: 400 }
        );
      }
    }

    // Create new approval
    const approval = new Approval({
      ...body,
      status: 'pending'
    });

    await approval.save();

    return NextResponse.json(
      { 
        success: true,
        message: 'Approval request created successfully', 
        approval 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating approval:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create approval request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}