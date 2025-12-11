import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Returning from '@/models/Returning';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    const body = await request.json();
    
    console.log(`🔄 Updating return ${id} with:`, body);

    // Find the return record
    const returnRecord = await Returning.findById(id);
    if (!returnRecord) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Return record not found'
        },
        { status: 404 }
      );
    }

    // Auto-complete if status is being set to approved and there are no fees or fees are paid
    let updateData = { ...body };
    
    if (body.status === 'approved') {
      const hasFees = returnRecord.totalFee > 0;
      const feesPaid = returnRecord.isFeePaid;
      
      // Auto-complete if no fees or fees are already paid
      if (!hasFees || feesPaid) {
        updateData.status = 'completed';
        console.log(`✅ Auto-completing return ${id} - no fees or fees already paid`);
      }
    }

    const updatedReturn = await Returning.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedReturn) {
      throw new Error('Failed to update return record');
    }

    console.log(`✅ Successfully updated return ${id} to status: ${updatedReturn.status}`);

    return NextResponse.json({
      success: true,
      return: updatedReturn
    });

  } catch (error) {
    console.error('Error updating return:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update return record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    
    const returnRecord = await Returning.findById(id);
    if (!returnRecord) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Return record not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      return: returnRecord
    });

  } catch (error) {
    console.error('Error fetching return:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch return record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    
    const deletedReturn = await Returning.findByIdAndDelete(id);
    if (!deletedReturn) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Return record not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Return record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting return:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete return record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}