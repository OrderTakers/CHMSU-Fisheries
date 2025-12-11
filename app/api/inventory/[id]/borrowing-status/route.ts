// app/api/inventory/[id]/borrowing-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Inventory from '@/models/Inventory';

// MongoDB connection utility
async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MongoDB connection string not configured');
  }

  try {
    await mongoose.connect(mongoUri, { bufferCommands: false });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Helper function to safely convert _id to string
function safeIdToString(obj: any): string {
  if (obj && obj._id) {
    if (typeof obj._id.toString === 'function') {
      return obj._id.toString();
    }
    return String(obj._id);
  }
  return '';
}

// Helper function to format date for display
function formatDateForDisplay(dateString: string | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
}

// PUT /api/inventory/[id]/borrowing-status - update borrowing status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const { id } = params;
    const body = await request.json();

    console.log('📝 PUT request for borrowing status for ID:', id);
    console.log('📦 Request body:', body);

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const { canBeBorrowed } = body;

    if (canBeBorrowed === undefined) {
      return NextResponse.json({ 
        error: 'Missing required field: canBeBorrowed is required' 
      }, { status: 400 });
    }

    // Check if item exists
    const existingItem = await Inventory.findById(id);
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    console.log('🔧 Current canBeBorrowed:', existingItem.canBeBorrowed);
    console.log('🔧 New canBeBorrowed value:', canBeBorrowed);

    // Update the borrowing status
    const updatedItem = await Inventory.findByIdAndUpdate(
      id,
      { canBeBorrowed },
      { new: true, runValidators: true }
    ).select('_id itemId name description condition category maintenanceNeeds calibration quantity availableQuantity status canBeBorrowed isDisposed createdAt updatedAt');

    if (!updatedItem) {
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }

    // Convert the updated item to a plain object
    const updatedObj = updatedItem.toObject();
    
    const serializedItem = {
      ...updatedObj,
      _id: safeIdToString(updatedObj),
      canBeBorrowed: updatedObj.canBeBorrowed !== undefined ? updatedObj.canBeBorrowed : true,
      isDisposed: updatedObj.isDisposed || false,
      createdAt: updatedObj.createdAt ? new Date(updatedObj.createdAt).toISOString() : '',
      updatedAt: updatedObj.updatedAt ? new Date(updatedObj.updatedAt).toISOString() : ''
    };

    console.log('✅ Borrowing status updated successfully:', serializedItem.itemId);
    console.log('🔧 New canBeBorrowed value:', serializedItem.canBeBorrowed);

    return NextResponse.json({
      success: true,
      message: `Item ${canBeBorrowed ? 'enabled' : 'disabled'} for borrowing successfully`,
      item: serializedItem
    }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error updating borrowing status:', error);

    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: `Validation Error: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to update borrowing status',
      details: error.message 
    }, { status: 500 });
  }
}

// GET /api/inventory/[id]/borrowing-status - get borrowing status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    console.log('📝 GET request for borrowing status for ID:', id);

    const item = await Inventory.findById(id)
      .select('_id itemId name condition category maintenanceNeeds calibration quantity availableQuantity status canBeBorrowed isDisposed')
      .lean();

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check borrowing availability based on conditions
    const canBeBorrowed = (item.canBeBorrowed !== false) &&
      item.condition !== 'Under Maintenance' &&
      ['Excellent', 'Good', 'Fair'].includes(item.condition) &&
      item.maintenanceNeeds === 'No' &&
      item.status === 'Active' &&
      item.availableQuantity > 0;

    const borrowingInfo = {
      itemId: item.itemId,
      name: item.name,
      canBeBorrowed: item.canBeBorrowed !== undefined ? item.canBeBorrowed : true,
      isEligibleForBorrowing: canBeBorrowed,
      conditions: {
        condition: item.condition,
        category: item.category,
        maintenanceNeeds: item.maintenanceNeeds,
        calibration: item.calibration,
        status: item.status,
        availableQuantity: item.availableQuantity,
        isDisposed: item.isDisposed || false
      },
      eligibilityCheck: canBeBorrowed ? 
        'Item is eligible for borrowing' : 
        `Item is not eligible for borrowing due to: ${item.condition === 'Under Maintenance' ? 'Under Maintenance' : 
          !['Excellent', 'Good', 'Fair'].includes(item.condition) ? `Condition: ${item.condition}` :
          item.maintenanceNeeds !== 'No' ? 'Maintenance needed' :
          item.status !== 'Active' ? `Status: ${item.status}` :
          item.availableQuantity <= 0 ? 'Out of stock' :
          item.canBeBorrowed === false ? 'Borrowing disabled' :
          'Unknown reason'}`
    };

    console.log('✅ Borrowing status retrieved:', borrowingInfo);

    return NextResponse.json({
      success: true,
      borrowingInfo
    }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error getting borrowing status:', error);
    return NextResponse.json({ 
      error: 'Failed to get borrowing status',
      details: error.message 
    }, { status: 500 });
  }
}