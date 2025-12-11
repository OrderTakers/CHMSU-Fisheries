import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import Returning from '@/models/Returning';
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
  roomAssigned?: string;
}

interface ProcessedReturnRequest {
  _id: string;
  type: 'return_record' | 'borrowing';
  equipmentId?: any;
  equipmentName: string;
  equipmentItemId: string;
  quantity: number;
  status: string;
  intendedReturnDate: Date;
  releasedDate?: Date;
  actualReturnDate?: Date;
  conditionOnBorrow?: string;
  conditionOnReturn?: string;
  roomAssigned?: string;
  roomDetails?: any;
  damageReport?: string;
  damageSeverity?: string;
  penaltyFee: number;
  damageFee?: number;
  totalFee?: number;
  isLate?: boolean;
  lateDays?: number;
  isFeePaid?: boolean;
  remarks?: string;
  isOverdue: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

// GET - Fetch user's return requests and eligible borrowings
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    console.log('GET /api/user/return-requests called');
    
    // For testing, use test user
    const user = await User.findOne({ email: 'student@example.com' });
    if (!user) {
      return NextResponse.json({ 
        success: true,
        error: 'Test user not found',
        returnRequests: [],
        count: 0,
        message: 'No return requests found'
      });
    }

    console.log(`Fetching data for user: ${user.email} (${user._id})`);

    // 1. First, get all existing return requests from Returning model
    const existingReturns = await Returning.find({
      borrowerId: user._id
    })
      .populate('borrowingId')
      .populate<{ equipmentId: PopulatedEquipment }>('equipmentId', 'name itemId condition category images roomAssigned')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${existingReturns.length} existing return records`);

    // 2. Get borrowings that are eligible for return (released but not yet returned)
    const eligibleBorrowings = await Borrowing.find({
      borrowerId: user._id,
      status: { $in: ['released', 'return_requested', 'return_approved', 'return_rejected'] }
    })
      .populate<{ equipmentId: PopulatedEquipment }>('equipmentId', 'name itemId condition category images roomAssigned')
      .sort({ releasedDate: -1, requestedDate: -1 })
      .lean();

    console.log(`Found ${eligibleBorrowings.length} eligible borrowings`);

    // Process existing returns
    const processedReturns: ProcessedReturnRequest[] = await Promise.all(
      existingReturns.map(async (returnRecord: any) => {
        const borrowing = returnRecord.borrowingId;
        const equipment = returnRecord.equipmentId as PopulatedEquipment;
        let roomDetails = null;
        
        // Get room details
        if (equipment?.roomAssigned) {
          try {
            const roomAssigned = equipment.roomAssigned;
            
            // Try to find room by ID first
            if (mongoose.Types.ObjectId.isValid(roomAssigned)) {
              roomDetails = await Room.findById(roomAssigned).lean();
            }
            
            // If not found by ID, try to find by name
            if (!roomDetails && typeof roomAssigned === 'string') {
              roomDetails = await Room.findOne({ 
                name: roomAssigned 
              }).lean();
            }
          } catch (error) {
            console.log('Room not found:', error);
          }
        }

        return {
          _id: returnRecord._id.toString(),
          type: 'return_record',
          borrowingId: borrowing?._id?.toString(),
          equipmentId: equipment,
          equipmentName: equipment?.name || 'Unknown Equipment',
          equipmentItemId: equipment?.itemId || 'N/A',
          quantity: borrowing?.quantity || 1,
          status: returnRecord.status,
          intendedReturnDate: borrowing?.intendedReturnDate || returnRecord.intendedReturnDate,
          releasedDate: borrowing?.releasedDate,
          actualReturnDate: returnRecord.actualReturnDate,
          conditionOnBorrow: borrowing?.conditionOnBorrow || returnRecord.conditionBefore,
          conditionOnReturn: returnRecord.conditionAfter,
          roomAssigned: equipment?.roomAssigned,
          roomDetails: roomDetails,
          damageReport: returnRecord.damageDescription,
          damageSeverity: returnRecord.damageSeverity,
          penaltyFee: returnRecord.penaltyFee || 0,
          damageFee: returnRecord.damageFee || 0,
          totalFee: returnRecord.totalFee || 0,
          isLate: returnRecord.isLate || false,
          lateDays: returnRecord.lateDays || 0,
          isFeePaid: returnRecord.isFeePaid || false,
          remarks: returnRecord.remarks,
          isOverdue: borrowing?.intendedReturnDate ? new Date(borrowing.intendedReturnDate) < new Date() : false,
          createdAt: returnRecord.createdAt,
          updatedAt: returnRecord.updatedAt
        } as ProcessedReturnRequest;
      })
    );

    // Process eligible borrowings that don't have return records yet
    const processedBorrowings: ProcessedReturnRequest[] = (await Promise.all(
      eligibleBorrowings.map(async (borrowing: any) => {
        // Check if this borrowing already has a return record
        const existingReturn = existingReturns.find(
          (r: any) => r.borrowingId?._id?.toString() === borrowing._id.toString()
        );

        if (existingReturn) {
          return null; // Skip if already has a return record
        }

        const equipment = borrowing.equipmentId as PopulatedEquipment;
        let roomDetails = null;
        let roomAssignedValue = borrowing.roomAssigned;
        
        // Get room assigned value
        if (!roomAssignedValue && equipment && typeof equipment === 'object' && 'roomAssigned' in equipment) {
          roomAssignedValue = equipment.roomAssigned;
        }
        
        // Get room details
        if (roomAssignedValue) {
          try {
            // Try to find room by ID first
            if (mongoose.Types.ObjectId.isValid(roomAssignedValue)) {
              roomDetails = await Room.findById(roomAssignedValue).lean();
            }
            
            // If not found by ID, try to find by name
            if (!roomDetails && typeof roomAssignedValue === 'string') {
              roomDetails = await Room.findOne({ 
                name: roomAssignedValue 
              }).lean();
            }
          } catch (error) {
            console.log('Room not found:', error);
          }
        }

        return {
          _id: borrowing._id.toString(),
          type: 'borrowing',
          equipmentId: equipment,
          equipmentName: equipment?.name || 'Unknown Equipment',
          equipmentItemId: equipment?.itemId || 'N/A',
          quantity: borrowing.quantity,
          status: borrowing.status,
          intendedReturnDate: borrowing.intendedReturnDate,
          releasedDate: borrowing.releasedDate,
          actualReturnDate: borrowing.actualReturnDate,
          conditionOnBorrow: borrowing.conditionOnBorrow,
          conditionOnReturn: borrowing.conditionOnReturn,
          roomAssigned: roomAssignedValue,
          roomDetails: roomDetails,
          damageReport: borrowing.damageReport,
          penaltyFee: borrowing.penaltyFee || 0,
          isOverdue: borrowing.intendedReturnDate ? new Date(borrowing.intendedReturnDate) < new Date() : false,
          createdAt: borrowing.createdAt,
          updatedAt: borrowing.updatedAt
        } as ProcessedReturnRequest;
      })
    )).filter((r): r is ProcessedReturnRequest => r !== null);

    // Combine both arrays
    const allReturnRequests: ProcessedReturnRequest[] = [...processedReturns, ...processedBorrowings];
    
    // Sort by date (newest first)
    allReturnRequests.sort((a: ProcessedReturnRequest, b: ProcessedReturnRequest) => {
      const dateA = new Date(a.createdAt || a.releasedDate || Date.now());
      const dateB = new Date(b.createdAt || b.releasedDate || Date.now());
      return dateB.getTime() - dateA.getTime();
    });

    // Calculate stats
    const total = allReturnRequests.length;
    const pending = allReturnRequests.filter((r: ProcessedReturnRequest) => 
      r.status === 'pending' || r.status === 'return_requested').length;
    const approved = allReturnRequests.filter((r: ProcessedReturnRequest) => 
      r.status === 'approved' || r.status === 'return_approved').length;
    const rejected = allReturnRequests.filter((r: ProcessedReturnRequest) => 
      r.status === 'rejected' || r.status === 'return_rejected').length;
    const completed = allReturnRequests.filter((r: ProcessedReturnRequest) => 
      r.status === 'completed' || r.status === 'returned').length;
    const overdue = allReturnRequests.filter((r: ProcessedReturnRequest) => r.isOverdue).length;

    return NextResponse.json({
      success: true,
      returnRequests: allReturnRequests,
      count: total,
      message: total === 0 ? 'No return requests found' : 'Return requests fetched successfully',
      stats: {
        total,
        pending,
        approved,
        rejected,
        completed,
        overdue,
      }
    });

  } catch (error: any) {
    console.error('Error fetching return requests:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch return requests', 
        details: error.message,
        returnRequests: []
      },
      { status: 500 }
    );
  }
}

// POST - Create a new return request (creates a Returning record)
export async function POST(request: NextRequest) {
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
        error: 'User not found. Please login first.' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { 
      borrowingId, 
      conditionOnReturn, 
      damageDescription,
      damageImages = [],
      damageSeverity = 'None'
    } = body;

    if (!borrowingId) {
      await session.abortTransaction();
      session.endSession();
      
      return NextResponse.json({ 
        success: false,
        error: 'Borrowing ID is required' 
      }, { status: 400 });
    }

    console.log('Creating return request for borrowing:', borrowingId);

    // Find the borrowing record
    const borrowing = await Borrowing.findOne({
      _id: borrowingId,
      borrowerId: user._id,
      status: 'released'
    })
      .populate<{ equipmentId: PopulatedEquipment }>('equipmentId')
      .session(session);

    if (!borrowing) {
      await session.abortTransaction();
      session.endSession();
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Borrowing record not found or not eligible for return',
          details: `Either the borrowing doesn't exist, or it's not in 'released' status`
        },
        { status: 404 }
      );
    }

    // Check if a return record already exists for this borrowing
    const existingReturn = await Returning.findOne({
      borrowingId: borrowing._id
    }).session(session);

    if (existingReturn) {
      await session.abortTransaction();
      session.endSession();
      
      return NextResponse.json(
        { 
          success: false,
          error: 'A return request already exists for this borrowing',
          returnId: existingReturn._id?.toString()
        },
        { status: 409 }
      );
    }

    // Get equipment details
    const equipment = borrowing.equipmentId as PopulatedEquipment;
    if (!equipment) {
      await session.abortTransaction();
      session.endSession();
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Equipment not found' 
        },
        { status: 404 }
      );
    }

    // Calculate if return is late
    const actualReturnDate = new Date();
    const isLate = actualReturnDate > borrowing.intendedReturnDate;
    const lateDays = isLate ? 
      Math.ceil((actualReturnDate.getTime() - borrowing.intendedReturnDate.getTime()) / (1000 * 3600 * 24)) : 
      0;
    
    // Calculate penalty fee (example: $5 per day late)
    const penaltyFee = lateDays * 5;

    // Create new return record
    const newReturn = new Returning({
      borrowingId: borrowing._id,
      equipmentId: equipment._id,
      borrowerType: 'student',
      borrowerId: user._id,
      borrowerName: `${user.firstName} ${user.lastName}`,
      borrowerEmail: user.email,
      equipmentName: equipment.name,
      equipmentItemId: equipment.itemId,
      intendedReturnDate: borrowing.intendedReturnDate,
      actualReturnDate: actualReturnDate,
      conditionBefore: borrowing.conditionOnBorrow || 'Good',
      conditionAfter: conditionOnReturn || 'Good',
      damageDescription: damageDescription || '',
      damageImages: damageImages,
      damageSeverity: damageSeverity,
      status: 'pending',
      isLate: isLate,
      lateDays: lateDays,
      penaltyFee: penaltyFee,
      damageFee: 0, // Would be calculated based on damage assessment
      totalFee: penaltyFee,
      isFeePaid: false,
      remarks: 'Return request submitted by student',
      roomReturned: equipment.roomAssigned || 'Main Laboratory',
      imageMetadata: {},
      returnDate: actualReturnDate
    });

    await newReturn.save({ session });

    // Update borrowing status to return_requested
    borrowing.status = 'return_requested';
    borrowing.conditionOnReturn = conditionOnReturn || '';
    borrowing.damageReport = damageDescription || '';
    borrowing.returnRequestDate = actualReturnDate;
    await borrowing.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log('Return request created successfully:', newReturn._id?.toString());

    return NextResponse.json({
      success: true,
      message: 'Return request submitted successfully',
      returnId: newReturn._id?.toString(),
      return: {
        _id: newReturn._id?.toString(),
        status: newReturn.status,
        returnDate: newReturn.returnDate,
        penaltyFee: newReturn.penaltyFee,
        isLate: newReturn.isLate,
        lateDays: newReturn.lateDays
      },
      borrowing: {
        _id: borrowing._id?.toString(),
        status: borrowing.status,
        returnRequestDate: borrowing.returnRequestDate
      }
    });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error creating return request:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create return request', 
        details: error.message
      },
      { status: 500 }
    );
  }
}