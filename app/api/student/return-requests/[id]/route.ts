import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Returning from '@/models/Returning';
import Borrowing from '@/models/Borrowing';
import User from '@/models/User';
import Room from '@/models/Room';
import mongoose from 'mongoose';

interface PopulatedEquipment {
  _id: mongoose.Types.ObjectId;
  name: string;
  itemId: string;
  condition: string;
  category: string;
  images: string[];
  specifications?: any[];
  roomAssigned?: string;
}

interface ReturnRequestWithType {
  _id: string;
  type: 'return_record' | 'borrowing';
  equipmentId?: PopulatedEquipment | mongoose.Types.ObjectId | null;
  borrowingId?: mongoose.Types.ObjectId | null;
  [key: string]: any;
}

// GET - Get single return request details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // For testing, use test user
    const user = await User.findOne({ email: 'student@example.com' });
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'User not found' 
      }, { status: 404 });
    }

    const { id } = params;

    // Try to find in Returning model first
    let returnRequestData: any = await Returning.findOne({
      _id: id,
      borrowerId: user._id
    })
      .populate<{ equipmentId: PopulatedEquipment }>('equipmentId', 'name itemId condition category images specifications roomAssigned')
      .populate('borrowingId')
      .lean();

    let returnRequest: ReturnRequestWithType | null = null;
    
    // If found in Returning model
    if (returnRequestData) {
      returnRequest = {
        ...returnRequestData,
        type: 'return_record',
        _id: returnRequestData._id?.toString() || id
      } as ReturnRequestWithType;
    } else {
      // If not found in Returning model, check Borrowing model
      const borrowing = await Borrowing.findOne({
        _id: id,
        borrowerId: user._id
      })
        .populate<{ equipmentId: PopulatedEquipment }>('equipmentId', 'name itemId condition category images specifications roomAssigned')
        .lean();

      if (!borrowing) {
        return NextResponse.json(
          { success: false, error: 'Return request not found' },
          { status: 404 }
        );
      }

      returnRequest = {
        ...borrowing,
        type: 'borrowing',
        _id: borrowing._id?.toString() || id
      } as ReturnRequestWithType;
    }

    // Get room details
    const equipment = returnRequest.equipmentId as PopulatedEquipment;
    let roomDetails = null;
    
    if (equipment?.roomAssigned) {
      try {
        const roomAssigned = equipment.roomAssigned;
        
        if (mongoose.Types.ObjectId.isValid(roomAssigned)) {
          roomDetails = await Room.findById(roomAssigned).lean();
        }
        
        if (!roomDetails && typeof roomAssigned === 'string') {
          roomDetails = await Room.findOne({ 
            name: roomAssigned 
          }).lean();
        }
      } catch (error) {
        console.log('Room not found:', error);
      }
    }

    return NextResponse.json({
      success: true,
      returnRequest: {
        ...returnRequest,
        roomDetails
      }
    });

  } catch (error: any) {
    console.error('Error fetching return request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch return request', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update return request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // For testing, use test user
    const user = await User.findOne({ email: 'student@example.com' });
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'User not found' 
      }, { status: 404 });
    }

    const { id } = params;
    const body = await request.json();
    const { conditionOnReturn, damageDescription, damageSeverity = 'None' } = body;

    // First, check if it's a Returning record
    let returnRecord = await Returning.findOne({
      _id: id,
      borrowerId: user._id,
      status: { $in: ['pending', 'rejected'] }
    });

    if (returnRecord) {
      // Update Returning record
      if (conditionOnReturn !== undefined) returnRecord.conditionAfter = conditionOnReturn;
      if (damageDescription !== undefined) returnRecord.damageDescription = damageDescription;
      returnRecord.damageSeverity = damageSeverity;
      returnRecord.status = 'pending'; // Reset to pending if it was rejected
      
      await returnRecord.save();

      // Also update the corresponding Borrowing record
      await Borrowing.findByIdAndUpdate(returnRecord.borrowingId, {
        conditionOnReturn: conditionOnReturn,
        damageReport: damageDescription,
        status: 'return_requested'
      });

      return NextResponse.json({
        success: true,
        message: 'Return request updated successfully',
        returnId: returnRecord._id?.toString() || id,
        status: returnRecord.status
      });
    }

    // If not a Returning record, check if it's a Borrowing record
    const borrowing = await Borrowing.findOne({
      _id: id,
      borrowerId: user._id,
      status: { $in: ['released', 'return_requested', 'return_rejected'] }
    });

    if (!borrowing) {
      return NextResponse.json(
        { success: false, error: 'Record not found or not eligible for update' },
        { status: 404 }
      );
    }

    // Update borrowing details
    if (conditionOnReturn !== undefined) borrowing.conditionOnReturn = conditionOnReturn;
    if (damageDescription !== undefined) borrowing.damageReport = damageDescription;
    
    // Update status back to return_requested if it was rejected
    if (borrowing.status === 'return_rejected') {
      borrowing.status = 'return_requested';
    }

    await borrowing.save();

    return NextResponse.json({
      success: true,
      message: 'Return request updated successfully',
      borrowing: {
        _id: borrowing._id?.toString() || id,
        status: borrowing.status
      }
    });

  } catch (error: any) {
    console.error('Error updating return request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update return request', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Cancel return request
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    await connectDB();
    
    // For testing, use test user
    const user = await User.findOne({ email: 'student@example.com' }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      
      return NextResponse.json({ 
        success: false,
        error: 'User not found' 
      }, { status: 404 });
    }

    const { id } = params;

    // Check if it's a Returning record
    const returnRecord = await Returning.findOne({
      _id: id,
      borrowerId: user._id,
      status: 'pending'
    }).session(session);

    if (returnRecord) {
      // Update the corresponding Borrowing record back to 'released'
      await Borrowing.findByIdAndUpdate(
        returnRecord.borrowingId,
        { 
          status: 'released',
          conditionOnReturn: '',
          damageReport: '',
          returnRequestDate: undefined
        },
        { session }
      );

      // Delete the return record
      await Returning.findByIdAndDelete(id, { session });

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({
        success: true,
        message: 'Return request cancelled successfully'
      });
    }

    // If it's a Borrowing record, just update the status
    const borrowing = await Borrowing.findOne({
      _id: id,
      borrowerId: user._id,
      status: 'return_requested'
    }).session(session);

    if (!borrowing) {
      await session.abortTransaction();
      session.endSession();
      
      return NextResponse.json(
        { success: false, error: 'Record not found or cannot be cancelled' },
        { status: 404 }
      );
    }

    // Update borrowing status back to 'released'
    borrowing.status = 'released';
    borrowing.conditionOnReturn = '';
    borrowing.damageReport = '';
    borrowing.returnRequestDate = undefined;
    await borrowing.save({ session });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({
      success: true,
      message: 'Return request cancelled successfully',
      borrowing: {
        _id: borrowing._id?.toString() || id,
        status: borrowing.status
      }
    });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error cancelling return request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel return request', details: error.message },
      { status: 500 }
    );
  }
}