import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Returning from '@/models/Returning';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { equipmentName: { $regex: search, $options: 'i' } },
        { borrowerName: { $regex: search, $options: 'i' } },
        { equipmentItemId: { $regex: search, $options: 'i' } },
        { roomReturned: { $regex: search, $options: 'i' } }
      ];
    }

    // Get returns with pagination
    const returns = await Returning.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Returning.countDocuments(filter);

    return NextResponse.json({
      success: true,
      returns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      }
    });

  } catch (error) {
    console.error('Error fetching returns:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch returns',
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
    
    // Auto-approve the return if no damage or minor damage
    const autoApproveConditions = body.damageSeverity === 'None' || 
                                 body.damageSeverity === 'Minor';
    
    // Auto-complete if no fees or fees are already paid
    const hasFees = (body.totalFee || 0) > 0;
    const feesPaid = body.isFeePaid || false;
    const shouldAutoComplete = !hasFees || feesPaid;
    
    let status = 'pending';
    
    if (autoApproveConditions) {
      status = shouldAutoComplete ? 'completed' : 'approved';
    }
    
    const newReturnData = {
      ...body,
      status: status,
      updatedAt: new Date()
    };
    
    const newReturn = new Returning(newReturnData);
    await newReturn.save();

    console.log(`✅ Return created with status: ${newReturn.status}`);
    console.log(`📊 Damage severity: ${body.damageSeverity}, Auto-approved: ${autoApproveConditions}, Auto-completed: ${shouldAutoComplete}`);

    return NextResponse.json({
      success: true,
      return: newReturn,
      message: autoApproveConditions ? 
        (shouldAutoComplete ? 
          'Return automatically completed (no/minor damage & no fees)' : 
          'Return automatically approved (no/minor damage)') : 
        'Return requires manual review (moderate/severe damage)'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating return:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create return record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}