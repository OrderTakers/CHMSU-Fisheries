import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import Inventory from '@/models/Inventory';
import mongoose from 'mongoose';

// PATCH /api/borrowings/[id] - Update borrowing status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    // Await the params for Next.js 15
    const { id } = await params;
    const body = await request.json();
    const { status, remarks, adminRemarks } = body;

    console.log(`API: Updating borrowing ${id} to status: ${status}`);

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Find the borrowing record
    const borrowing = await Borrowing.findById(id);
    if (!borrowing) {
      return NextResponse.json(
        { success: false, error: 'Borrowing request not found' },
        { status: 404 }
      );
    }

    console.log(`API: Current borrowing status: ${borrowing.status}`);
    console.log(`API: Borrowing equipmentId: ${borrowing.equipmentId}`);

    // Handle approval - subtract from inventory
    if (status === 'approved' && borrowing.status === 'pending') {
      let equipment;
      try {
        // Find equipment - borrowing.equipmentId should be the actual MongoDB _id
        equipment = await Inventory.findById(borrowing.equipmentId);
        
        if (!equipment) {
          console.log(`API: Equipment not found with _id: ${borrowing.equipmentId}`);
          return NextResponse.json(
            { success: false, error: `Equipment not found with ID: ${borrowing.equipmentId}` },
            { status: 404 }
          );
        }
      } catch (equipmentError) {
        console.error('API: Error finding equipment:', equipmentError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Error finding equipment',
            details: equipmentError instanceof Error ? equipmentError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }

      // Check if equipment has enough available quantity
      if (equipment.availableQuantity < borrowing.quantity) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Not enough items available. Requested: ${borrowing.quantity}, Available: ${equipment.availableQuantity}` 
          },
          { status: 400 }
        );
      }

      // Check if equipment can be borrowed
      if (equipment.canBeBorrowed === false) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'This equipment is not available for borrowing' 
          },
          { status: 400 }
        );
      }

      // Calculate new quantities with safety checks
      const newAvailableQuantity = Math.max(0, equipment.availableQuantity - borrowing.quantity);
      const newBorrowedQuantity = Math.max(0, (equipment.borrowedQuantity || 0) + borrowing.quantity);

      console.log(`API: Updating equipment quantities. Old available: ${equipment.availableQuantity}, New available: ${newAvailableQuantity}`);

      // Update equipment using direct MongoDB update to avoid validation issues
      await Inventory.updateOne(
        { _id: equipment._id },
        { 
          $set: {
            availableQuantity: newAvailableQuantity,
            borrowedQuantity: newBorrowedQuantity,
            status: newAvailableQuantity === 0 ? 'borrowed' : equipment.status
          }
        }
      );

      // Update borrowing
      borrowing.status = 'approved';
      borrowing.approvedDate = new Date();
      borrowing.approvedBy = 'admin';
      borrowing.adminRemarks = adminRemarks || remarks;
      await borrowing.save();
      
      console.log(`API: Borrowing ${id} approved successfully`);
      
    } else if (status === 'rejected') {
      borrowing.status = 'rejected';
      borrowing.adminRemarks = adminRemarks || remarks;
      await borrowing.save();
      console.log(`API: Borrowing ${id} rejected`);
      
    } else if (status === 'returned' && (borrowing.status === 'approved' || borrowing.status === 'released')) {
      // Handle item return - add back to inventory
      let equipment;
      try {
        equipment = await Inventory.findById(borrowing.equipmentId);
        
        if (equipment) {
          const newAvailableQuantity = Math.max(0, equipment.availableQuantity + borrowing.quantity);
          const newBorrowedQuantity = Math.max(0, (equipment.borrowedQuantity || 0) - borrowing.quantity);

          await Inventory.updateOne(
            { _id: equipment._id },
            { 
              $set: {
                availableQuantity: newAvailableQuantity,
                borrowedQuantity: newBorrowedQuantity,
                status: newAvailableQuantity > 0 ? 'available' : equipment.status
              }
            }
          );
        }
      } catch (equipmentError) {
        console.error('API: Error finding equipment for return:', equipmentError);
        // Continue even if equipment not found
      }

      borrowing.status = 'returned';
      borrowing.actualReturnDate = new Date();
      borrowing.adminRemarks = adminRemarks || remarks;
      await borrowing.save();
      console.log(`API: Borrowing ${id} marked as returned`);
      
    } else {
      borrowing.status = status;
      if (adminRemarks || remarks) {
        borrowing.adminRemarks = adminRemarks || remarks;
      }
      await borrowing.save();
      console.log(`API: Borrowing ${id} status updated to ${status}`);
    }

    // Populate the equipment data for response
    await borrowing.populate('equipmentId', 'itemId name category condition cost yearPurchased roomAssigned image availableQuantity quantity borrowedQuantity status');

    return NextResponse.json({
      success: true,
      message: `Borrowing request ${status} successfully`,
      borrowing
    });

  } catch (error: any) {
    console.error('API: Error updating borrowing:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update borrowing request',
        details: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET /api/borrowings/[id] - Get single borrowing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    // Await the params for Next.js 15
    const { id } = await params;
    const borrowing = await Borrowing.findById(id).populate('equipmentId');

    if (!borrowing) {
      return NextResponse.json(
        { success: false, error: 'Borrowing request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      borrowing
    });

  } catch (error) {
    console.error('API: Error fetching borrowing:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch borrowing request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/borrowings/[id] - Delete borrowing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    // Await the params for Next.js 15
    const { id } = await params;
    const borrowing = await Borrowing.findById(id);

    if (!borrowing) {
      return NextResponse.json(
        { success: false, error: 'Borrowing request not found' },
        { status: 404 }
      );
    }

    // If it's an approved borrowing, return the quantity to inventory
    if (borrowing.status === 'approved' || borrowing.status === 'released') {
      let equipment;
      try {
        equipment = await Inventory.findById(borrowing.equipmentId);
        
        if (equipment) {
          const newAvailableQuantity = Math.max(0, equipment.availableQuantity + borrowing.quantity);
          const newBorrowedQuantity = Math.max(0, (equipment.borrowedQuantity || 0) - borrowing.quantity);

          await Inventory.updateOne(
            { _id: equipment._id },
            { 
              $set: {
                availableQuantity: newAvailableQuantity,
                borrowedQuantity: newBorrowedQuantity,
                status: newAvailableQuantity > 0 ? 'available' : equipment.status
              }
            }
          );
        }
      } catch (equipmentError) {
        console.error('API: Error finding equipment for delete:', equipmentError);
        // Continue even if equipment not found
      }
    }

    await Borrowing.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Borrowing request deleted successfully'
    });

  } catch (error) {
    console.error('API: Error deleting borrowing:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete borrowing request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}