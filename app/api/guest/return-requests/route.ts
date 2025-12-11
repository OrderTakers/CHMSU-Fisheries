import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import GuestBorrowing from '@/models/GuestBorrowing';
import Returning from '@/models/Returning';
import Inventory from '@/models/Inventory';
import mongoose from 'mongoose';

// POST: Create a new return request for guest
export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;
  
  try {
    await connectToDatabase();

    const body = await request.json();
    
    console.log('📦 Received return request data:', {
      requestId: body.requestId,
      equipmentId: body.equipmentId,
      schoolId: body.borrowerSchoolId,
      hasRequestId: !!body.requestId,
      hasEquipmentId: !!body.equipmentId,
      hasSchoolId: !!body.borrowerSchoolId,
      quantity: body.quantity || 1
    });

    // Validate required fields
    const requiredFields = [
      'equipmentId', 'equipmentName', 'requestId', 'borrowerName', 
      'borrowerEmail', 'borrowerSchoolId', 'conditionAfter', 'roomReturned'
    ];
    
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Find the original guest borrowing request
    console.log('🔍 Looking for borrowing request with:', {
      requestId: body.requestId,
      schoolId: body.borrowerSchoolId
    });

    const borrowingRequest = await GuestBorrowing.findOne({ 
      requestId: body.requestId,
      schoolId: body.borrowerSchoolId
    });

    if (!borrowingRequest) {
      console.error('❌ Guest borrowing request not found:', {
        requestId: body.requestId,
        schoolId: body.borrowerSchoolId
      });
      return NextResponse.json(
        { success: false, error: 'Guest borrowing request not found' },
        { status: 404 }
      );
    }

    // Type assertion for borrowingRequest to access dynamic properties
    const borrowingDoc = borrowingRequest as any;
    
    console.log('✅ Found borrowing request:', {
      id: borrowingDoc._id,
      requestId: borrowingDoc.requestId,
      status: borrowingDoc.status,
      equipmentId: borrowingDoc.equipmentId,
      quantity: borrowingDoc.quantity || 1
    });

    // Check if already returned
    if (borrowingDoc.status === 'returned') {
      return NextResponse.json(
        { success: false, error: 'Equipment has already been returned' },
        { status: 400 }
      );
    }

    // Check if request is approved
    if (borrowingDoc.status !== 'approved') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Only approved equipment can be returned. Current status: ${borrowingDoc.status}` 
        },
        { status: 400 }
      );
    }

    // Find the equipment using itemId from Inventory
    console.log('🔍 Looking for equipment with itemId:', body.equipmentId);
    const equipment = await Inventory.findOne({ itemId: body.equipmentId });
    
    if (!equipment) {
      console.error('❌ Equipment not found in inventory:', body.equipmentId);
      return NextResponse.json(
        { success: false, error: 'Equipment not found in inventory' },
        { status: 404 }
      );
    }

    // Type assertion for equipment to access dynamic properties
    const equipmentDoc = equipment as any;
    
    console.log('✅ Found equipment:', {
      id: equipmentDoc._id,
      itemId: equipmentDoc.itemId,
      name: equipmentDoc.name,
      condition: equipmentDoc.condition,
      quantity: equipmentDoc.quantity,
      borrowedQuantity: equipmentDoc.borrowedQuantity || 0,
      availableQuantity: equipmentDoc.availableQuantity || 0,
      isAvailable: equipmentDoc.isAvailable || false
    });

    // Get the quantity that was borrowed (default to 1 if not specified)
    const borrowedQuantity = borrowingDoc.quantity || 1;
    const returnedQuantity = body.quantity || borrowedQuantity;
    
    console.log('📊 Quantity details:', {
      borrowedQuantity,
      returnedQuantity,
      currentBorrowedQuantity: equipmentDoc.borrowedQuantity || 0,
      currentAvailableQuantity: equipmentDoc.availableQuantity || 0
    });

    // Validate that returned quantity doesn't exceed borrowed quantity
    if (returnedQuantity > borrowedQuantity) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Returned quantity (${returnedQuantity}) exceeds borrowed quantity (${borrowedQuantity})` 
        },
        { status: 400 }
      );
    }

    // Calculate fees and overdue status
    const requestedDate = new Date(borrowingDoc.requestedDate);
    const actualReturnDate = new Date(body.actualReturnDate || new Date());
    
    // Calculate expected return date based on borrow duration
    let daysToAdd = 0;
    switch (borrowingDoc.borrowDuration) {
      case '1 day': daysToAdd = 1; break;
      case '3 days': daysToAdd = 3; break;
      case '1 week': daysToAdd = 7; break;
      case '2 weeks': daysToAdd = 14; break;
      case '1 month': daysToAdd = 30; break;
      default: daysToAdd = 7;
    }
    
    const intendedReturnDate = new Date(requestedDate);
    intendedReturnDate.setDate(requestedDate.getDate() + daysToAdd);
    
    // Check if overdue
    const isLate = actualReturnDate > intendedReturnDate;
    const lateDays = isLate 
      ? Math.ceil((actualReturnDate.getTime() - intendedReturnDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    // Calculate penalty fee (₱50 per day overdue)
    const penaltyFee = isLate ? lateDays * 50 : 0;
    
    // Calculate damage fee based on severity
    let damageFee = 0;
    switch (body.damageSeverity) {
      case 'Minor':
        damageFee = 200;
        break;
      case 'Moderate':
        damageFee = 500;
        break;
      case 'Severe':
        damageFee = 1000;
        break;
      default:
        damageFee = 0;
    }

    // Start a transaction session
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create the return record for guest
      const returnData = {
        borrowingId: borrowingDoc._id,
        equipmentId: equipmentDoc._id,
        borrowerType: 'guest' as const,
        borrowerId: borrowingDoc._id,
        borrowerName: body.borrowerName,
        borrowerEmail: body.borrowerEmail,
        equipmentName: body.equipmentName,
        equipmentItemId: body.equipmentId,
        quantityReturned: returnedQuantity,
        intendedReturnDate,
        actualReturnDate,
        conditionBefore: 'Good',
        conditionAfter: body.conditionAfter,
        damageDescription: body.damageDescription || '',
        damageImages: body.damageImages || [],
        damageSeverity: body.damageSeverity || 'None',
        status: 'pending' as const,
        isLate,
        lateDays,
        penaltyFee,
        damageFee,
        totalFee: penaltyFee + damageFee,
        isFeePaid: false,
        remarks: body.remarks || '',
        roomReturned: body.roomReturned,
        imageMetadata: {
          count: body.damageImages?.length || 0,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'guest',
          equipmentId: body.equipmentId
        },
        returnDate: actualReturnDate
      };

      const returnRequest = new Returning(returnData);
      const savedReturnRequest = await returnRequest.save({ session });

      console.log('✅ Return request created:', savedReturnRequest._id);

      // Update guest borrowing request status to 'returned'
      borrowingDoc.status = 'returned';
      borrowingDoc.returnedDate = actualReturnDate;
      borrowingDoc.returnedQuantity = returnedQuantity;
      borrowingDoc.updatedAt = new Date();
      await borrowingDoc.save({ session });

      console.log('✅ Updated borrowing request status to returned');

      // CRITICAL: Update inventory - reduce borrowedQuantity and update availability
      let equipmentUpdate: any = {};
      
      // Calculate new borrowed quantity
      const currentBorrowedQuantity = equipmentDoc.borrowedQuantity || 0;
      const newBorrowedQuantity = Math.max(0, currentBorrowedQuantity - returnedQuantity);
      
      equipmentUpdate.borrowedQuantity = newBorrowedQuantity;
      
      // Update the condition based on how it was returned
      if (body.conditionAfter === 'Excellent' || body.conditionAfter === 'Good') {
        // If returned in good condition
        equipmentUpdate.condition = body.conditionAfter;
        equipmentUpdate.maintenanceNeeds = 'No';
        
        // Remove from maintenance if it was there
        if (equipmentDoc.maintenanceQuantity > 0) {
          equipmentUpdate.maintenanceQuantity = Math.max(0, equipmentDoc.maintenanceQuantity - returnedQuantity);
        }
      } else if (body.conditionAfter === 'Poor' || body.conditionAfter === 'Damaged') {
        // If damaged, mark as needs repair and add to maintenance
        equipmentUpdate.condition = 'Needs Repair';
        equipmentUpdate.maintenanceNeeds = 'Yes';
        equipmentUpdate.maintenanceQuantity = (equipmentDoc.maintenanceQuantity || 0) + returnedQuantity;
      } else {
        // Keep existing condition for other cases
        equipmentUpdate.condition = equipmentDoc.condition;
      }
      
      // Update isAvailable status based on borrowed quantity
      equipmentUpdate.isAvailable = newBorrowedQuantity < equipmentDoc.quantity;
      
      // Update available quantity (using the virtual field calculation)
      const totalQuantity = equipmentDoc.quantity;
      const maintenanceImpact = equipmentUpdate.maintenanceQuantity || equipmentDoc.maintenanceQuantity || 0;
      const calibrationImpact = equipmentDoc.calibrationQuantity || 0;
      const disposalImpact = equipmentDoc.disposalQuantity || 0;
      const borrowedImpact = newBorrowedQuantity;
      
      equipmentUpdate.availableQuantity = Math.max(0, totalQuantity - maintenanceImpact - calibrationImpact - disposalImpact - borrowedImpact);
      
      console.log('📊 Inventory update calculations:', {
        totalQuantity: equipmentDoc.quantity,
        oldBorrowedQuantity: currentBorrowedQuantity,
        newBorrowedQuantity,
        returnedQuantity,
        maintenanceImpact: equipmentUpdate.maintenanceQuantity,
        calibrationImpact,
        disposalImpact,
        availableQuantity: equipmentUpdate.availableQuantity,
        isAvailable: equipmentUpdate.isAvailable
      });
      
      // Update the equipment in inventory
      const updatedEquipment = await Inventory.findByIdAndUpdate(
        equipmentDoc._id,
        { $set: equipmentUpdate },
        { session, new: true, runValidators: true }
      );
      
      console.log('✅ Updated equipment in inventory:', {
        borrowedQuantity: updatedEquipment?.borrowedQuantity,
        availableQuantity: updatedEquipment?.availableQuantity,
        condition: updatedEquipment?.condition,
        maintenanceNeeds: updatedEquipment?.maintenanceNeeds,
        isAvailable: updatedEquipment?.isAvailable
      });

      // Commit the transaction
      await session.commitTransaction();
      console.log('✅ Transaction committed successfully');

      // Log email notification (placeholder)
      console.log('📧 Return confirmation email would be sent:', {
        to: body.borrowerEmail,
        subject: 'Equipment Return Request Submitted',
        equipmentName: body.equipmentName,
        returnId: (savedReturnRequest as any)._id.toString(),
        borrowerName: body.borrowerName,
        returnDate: actualReturnDate.toLocaleDateString(),
        quantityReturned: returnedQuantity,
        status: 'pending',
        totalFee: penaltyFee + damageFee,
        penaltyFee,
        damageFee,
        lateDays
      });

      return NextResponse.json({
        success: true,
        message: 'Return request submitted successfully',
        data: {
          returnId: (savedReturnRequest as any)._id.toString(),
          returnStatus: 'pending',
          equipmentName: body.equipmentName,
          quantityReturned: returnedQuantity,
          returnDate: actualReturnDate,
          fees: {
            penaltyFee,
            damageFee,
            totalFee: penaltyFee + damageFee,
            isLate,
            lateDays
          },
          nextSteps: 'Please bring the equipment to the specified return location for inspection.',
          inventoryUpdate: {
            borrowedQuantity: newBorrowedQuantity,
            availableQuantity: equipmentUpdate.availableQuantity,
            isAvailable: equipmentUpdate.isAvailable
          }
        }
      });

    } catch (transactionError: any) {
      // If any error occurs, abort the transaction
      if (session) {
        await session.abortTransaction();
      }
      console.error('❌ Transaction error:', transactionError);
      throw transactionError;
    } finally {
      if (session) {
        session.endSession();
      }
    }

  } catch (error: any) {
    console.error('❌ Error creating return request:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to submit return request',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET: Get return requests for a guest
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const schoolId = searchParams.get('schoolId');
    const requestId = searchParams.get('requestId');
    const status = searchParams.get('status');

    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Find guest's borrowing requests
    const query: any = { schoolId };
    if (requestId) {
      query.requestId = requestId;
    }

    const borrowingRequests = await GuestBorrowing.find(query);

    if (!borrowingRequests || borrowingRequests.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No borrowing requests found'
      });
    }

    // Get return requests for these guest borrowing requests
    const borrowingIds = borrowingRequests.map(req => req._id);
    
    const returnQuery: any = { 
      borrowerId: { $in: borrowingIds },
      borrowerType: 'guest'
    };
    
    if (status) {
      returnQuery.status = status;
    }

    const returnRequests = await Returning.find(returnQuery)
      .sort({ createdAt: -1 })
      .populate('equipmentId', 'name itemId category')
      .populate({
        path: 'borrowingId',
        model: 'GuestBorrowing',
        select: 'requestId purpose borrowDuration quantity'
      });

    // Properly typed response with type assertions
    const responseData = returnRequests.map((req: any) => ({
      _id: req._id ? req._id.toString() : '',
      returnId: req._id ? `RET-${req._id.toString().slice(-8).toUpperCase()}` : 'N/A',
      equipment: {
        name: req.equipmentName || '',
        itemId: req.equipmentItemId || '',
        category: req.equipmentId?.category || ''
      },
      borrowingRequest: {
        requestId: req.borrowingId?.requestId || req.equipmentItemId || '',
        purpose: req.borrowingId?.purpose || 'Guest borrowing',
        borrowDuration: req.borrowingId?.borrowDuration || '1 week',
        quantity: (req.borrowingId as any)?.quantity || 1
      },
      quantityReturned: (req as any).quantityReturned || 1,
      returnDate: req.actualReturnDate || new Date(),
      conditionAfter: req.conditionAfter || 'Good',
      damageSeverity: req.damageSeverity || 'None',
      status: req.status || 'pending',
      isLate: req.isLate || false,
      lateDays: req.lateDays || 0,
      fees: {
        penaltyFee: req.penaltyFee || 0,
        damageFee: req.damageFee || 0,
        totalFee: req.totalFee || 0,
        isFeePaid: req.isFeePaid || false
      },
      roomReturned: req.roomReturned || '',
      remarks: req.remarks || '',
      createdAt: req.createdAt || new Date(),
      updatedAt: req.updatedAt || new Date()
    }));

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    console.error('Error fetching return requests:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch return requests',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PATCH: Update return request (for admin approval, fee payment, etc.)
export async function PATCH(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;
  
  try {
    await connectToDatabase();

    const body = await request.json();
    const { returnId, action, adminNotes, feePayment } = body;

    if (!returnId) {
      return NextResponse.json(
        { success: false, error: 'Return ID is required' },
        { status: 400 }
      );
    }

    // Find return request
    const returnRequest = await Returning.findById(returnId);
    if (!returnRequest) {
      return NextResponse.json(
        { success: false, error: 'Return request not found' },
        { status: 404 }
      );
    }

    // Only handle guest returns in this route
    if (returnRequest.borrowerType !== 'guest') {
      return NextResponse.json(
        { success: false, error: 'This route only handles guest returns' },
        { status: 400 }
      );
    }

    // Type assertion for returnRequest to access dynamic properties
    const returnDoc = returnRequest as any;
    
    // Get return quantity
    const returnedQuantity = returnDoc.quantityReturned || 1;

    session = await mongoose.startSession();
    session.startTransaction();

    try {
      switch (action) {
        case 'approve':
          if (returnDoc.status !== 'pending') {
            throw new Error('Only pending returns can be approved');
          }
          
          returnDoc.status = 'approved';
          returnDoc.remarks = adminNotes || returnDoc.remarks;
          
          // Find equipment
          const equipment = await Inventory.findById(returnDoc.equipmentId);
          if (equipment) {
            // Type assertion for equipment
            const equipmentDoc = equipment as any;
            
            // When approving a return, we may need to adjust inventory further
            // For example, if equipment was marked as damaged but is actually repairable
            
            if (returnDoc.damageSeverity === 'None' && 
                (returnDoc.conditionAfter === 'Good' || returnDoc.conditionAfter === 'Excellent')) {
              // Equipment is in good condition, ensure it's available
              await Inventory.findByIdAndUpdate(
                equipmentDoc._id,
                { 
                  $set: {
                    condition: returnDoc.conditionAfter,
                    maintenanceNeeds: 'No'
                  },
                  $inc: { maintenanceQuantity: -returnedQuantity }
                },
                { session, new: true }
              );
            } else {
              // Equipment needs repair or is damaged
              // This should already be handled in the POST request
              // Just update remarks or additional notes
            }
          }
          break;

        case 'reject':
          if (returnDoc.status !== 'pending') {
            throw new Error('Only pending returns can be rejected');
          }
          
          returnDoc.status = 'rejected';
          returnDoc.remarks = adminNotes || returnDoc.remarks;
          
          // When rejecting a return, REVERT the inventory changes made during POST
          const borrowingRequest = await GuestBorrowing.findById(returnDoc.borrowingId);
          if (borrowingRequest) {
            // Type assertion for borrowingRequest
            const borrowingDoc = borrowingRequest as any;
            
            // Reset borrowing request status
            borrowingDoc.status = 'approved';
            borrowingDoc.returnedDate = null;
            borrowingDoc.returnedQuantity = 0;
            await borrowingDoc.save({ session });
          }
          
          // Revert inventory changes
          const equipmentReject = await Inventory.findById(returnDoc.equipmentId);
          if (equipmentReject) {
            // Type assertion for equipmentReject
            const equipmentDoc = equipmentReject as any;
            
            let equipmentUpdate: any = {};
            
            // Add back to borrowed quantity (reverse the reduction)
            const currentBorrowedQuantity = equipmentDoc.borrowedQuantity || 0;
            equipmentUpdate.borrowedQuantity = currentBorrowedQuantity + returnedQuantity;
            
            // Revert maintenance quantity if it was increased
            if (returnDoc.conditionAfter === 'Poor' || returnDoc.conditionAfter === 'Damaged') {
              const currentMaintenanceQuantity = equipmentDoc.maintenanceQuantity || 0;
              equipmentUpdate.maintenanceQuantity = Math.max(0, currentMaintenanceQuantity - returnedQuantity);
            }
            
            // Revert condition to what it was before
            if (returnDoc.conditionAfter === 'Excellent' || returnDoc.conditionAfter === 'Good') {
              equipmentUpdate.condition = 'Good'; // Default to Good
              equipmentUpdate.maintenanceNeeds = 'No';
            }
            
            // Recalculate available quantity
            const totalQuantity = equipmentDoc.quantity;
            const maintenanceImpact = equipmentUpdate.maintenanceQuantity || equipmentDoc.maintenanceQuantity || 0;
            const calibrationImpact = equipmentDoc.calibrationQuantity || 0;
            const disposalImpact = equipmentDoc.disposalQuantity || 0;
            const borrowedImpact = equipmentUpdate.borrowedQuantity;
            
            equipmentUpdate.availableQuantity = Math.max(0, totalQuantity - maintenanceImpact - calibrationImpact - disposalImpact - borrowedImpact);
            equipmentUpdate.isAvailable = equipmentUpdate.borrowedQuantity < totalQuantity;
            
            console.log('🔄 Reverting inventory for rejected return:', equipmentUpdate);
            
            await Inventory.findByIdAndUpdate(
              equipmentDoc._id,
              { $set: equipmentUpdate },
              { session, new: true }
            );
          }
          break;

        case 'complete':
          if (returnDoc.status !== 'approved') {
            throw new Error('Only approved returns can be completed');
          }
          
          returnDoc.status = 'completed';
          
          // Mark fee as paid if payment received
          if (feePayment) {
            returnDoc.isFeePaid = true;
          }
          break;

        case 'update_fee':
          returnDoc.penaltyFee = body.penaltyFee || returnDoc.penaltyFee;
          returnDoc.damageFee = body.damageFee || returnDoc.damageFee;
          returnDoc.totalFee = returnDoc.penaltyFee + returnDoc.damageFee;
          break;

        default:
          throw new Error('Invalid action');
      }

      returnDoc.updatedAt = new Date();
      const updatedReturnRequest = await returnDoc.save({ session });

      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        message: `Return request ${action}d successfully`,
        data: updatedReturnRequest
      });

    } catch (transactionError: any) {
      if (session) {
        await session.abortTransaction();
      }
      throw transactionError;
    } finally {
      if (session) {
        session.endSession();
      }
    }

  } catch (error: any) {
    console.error('Error updating return request:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update return request'
      },
      { status: 500 }
    );
  }
}