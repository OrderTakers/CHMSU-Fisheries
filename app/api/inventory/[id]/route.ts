// app/api/inventory/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Inventory from '@/models/Inventory';
import Maintenance from '@/models/Maintenance';
import User from '@/models/User';

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

// Helper function to ensure image is properly formatted for display
function formatImageForDisplay(image: string): string {
  if (!image || typeof image !== 'string') {
    return '';
  }

  // If it's already a data URL or HTTP URL, return as is
  if (image.startsWith('data:image/') || image.startsWith('https://') || image.startsWith('http://')) {
    return image;
  }

  // Return empty string if it doesn't look like valid image data
  return image || '';
}

// Helper function to process images array
function formatImagesArrayForDisplay(images: any[]): string[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map(img => {
      if (typeof img === 'string') {
        return formatImageForDisplay(img);
      }
      return '';
    })
    .filter(img => img !== '');
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

// GET /api/inventory/[id] - fetch a single inventory item
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

    console.log('📦 Fetching inventory item with ID:', id);

    const item = await Inventory.findById(id)
      .select('_id itemId name description specifications condition category cost yearPurchased maintenanceNeeds calibration roomAssigned calibrator images maintenanceHistory calibrationHistory lastMaintenance nextMaintenance expirationDate quantity availableQuantity status qrCode calibrationQuantity disposalQuantity maintenanceQuantity borrowedQuantity canBeBorrowed isDisposed createdAt updatedAt')
      .lean();

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Process images for display
    const displayImages = formatImagesArrayForDisplay(item.images || []);

    console.log('🖼️  Images array processed:', displayImages.length);
    console.log('🔧 Can Be Borrowed:', item.canBeBorrowed);

    // Format dates for consistent display
    const formattedNextMaintenance = formatDateForDisplay(item.nextMaintenance);
    const formattedLastMaintenance = formatDateForDisplay(item.lastMaintenance);
    const formattedExpirationDate = item.expirationDate ? new Date(item.expirationDate).toISOString().split('T')[0] : '';

    // Convert dates to strings for JSON serialization
    const serializedItem = {
      ...item,
      _id: safeIdToString(item),
      images: displayImages,
      yearPurchased: item.yearPurchased || '',
      lastMaintenance: formattedLastMaintenance,
      nextMaintenance: formattedNextMaintenance,
      expirationDate: formattedExpirationDate,
      canBeBorrowed: item.canBeBorrowed !== undefined ? item.canBeBorrowed : true,
      isDisposed: item.isDisposed || false,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : '',
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : ''
    };

    return NextResponse.json(serializedItem, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching inventory item:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory item' }, { status: 500 });
  }
}

// PUT /api/inventory/[id] - update an inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const { id } = params;
    const body = await request.json();

    const { 
      name, 
      description,
      specifications,
      condition, 
      category, 
      cost, 
      yearPurchased, 
      maintenanceNeeds, 
      calibration, 
      roomAssigned, 
      calibrator, 
      images,
      lastMaintenance,
      nextMaintenance,
      expirationDate,
      quantity,
      availableQuantity,
      status,
      canBeBorrowed
    } = body;

    console.log('📝 PUT request received for ID:', id);
    console.log('🖼️  Images array in request:', Array.isArray(images) ? images.length : 'Not an array');
    console.log('🔧 Can Be Borrowed:', canBeBorrowed);

    // Validation
    if (!name || cost === undefined || quantity === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, cost, and quantity are required' 
      }, { status: 400 });
    }

    if (typeof cost !== 'number' || cost < 0) {
      return NextResponse.json({ error: 'Cost must be a non-negative number' }, { status: 400 });
    }

    if (typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }

    if (availableQuantity === undefined || availableQuantity < 0) {
      return NextResponse.json({ error: 'Available quantity cannot be negative' }, { status: 400 });
    }

    if (availableQuantity > quantity) {
      return NextResponse.json({ error: 'Available quantity cannot exceed total quantity' }, { status: 400 });
    }

    // Store images as provided
    const storedImages = Array.isArray(images) ? images : [];

    // Format dates properly
    let formattedNextMaintenance = '';
    if (nextMaintenance) {
      try {
        const nextMaintenanceDate = new Date(nextMaintenance);
        if (!isNaN(nextMaintenanceDate.getTime())) {
          formattedNextMaintenance = nextMaintenanceDate.toISOString();
        }
      } catch (error) {
        console.warn('Invalid nextMaintenance date provided:', nextMaintenance);
      }
    }

    let formattedLastMaintenance = '';
    if (lastMaintenance) {
      try {
        const lastMaintenanceDate = new Date(lastMaintenance);
        if (!isNaN(lastMaintenanceDate.getTime())) {
          formattedLastMaintenance = lastMaintenanceDate.toISOString();
        }
      } catch (error) {
        console.warn('Invalid lastMaintenance date provided:', lastMaintenance);
      }
    }

    let formattedExpirationDate = null;
    if (expirationDate) {
      try {
        const expirationDateObj = new Date(expirationDate);
        if (!isNaN(expirationDateObj.getTime())) {
          formattedExpirationDate = expirationDateObj;
        }
      } catch (error) {
        console.warn('Invalid expiration date provided:', expirationDate);
      }
    }

    // Check if item exists
    const existingItem = await Inventory.findById(id);
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const updateData: any = {
      name: name.trim(),
      description: description?.trim() || "",
      specifications: Array.isArray(specifications) ? specifications : [],
      condition: condition || 'Good',
      category: category || 'Equipment',
      cost,
      yearPurchased: yearPurchased || new Date().getFullYear().toString(),
      maintenanceNeeds: maintenanceNeeds || 'No',
      calibration: calibration || 'No',
      roomAssigned: roomAssigned || '',
      calibrator: calibrator || '',
      images: storedImages,
      lastMaintenance: formattedLastMaintenance,
      nextMaintenance: formattedNextMaintenance,
      expirationDate: formattedExpirationDate,
      quantity: quantity || 1,
      availableQuantity: availableQuantity || (quantity || 1),
      status: status || 'Active'
    };

    // Handle canBeBorrowed field
    if (canBeBorrowed !== undefined) {
      updateData.canBeBorrowed = canBeBorrowed;
    }

    // Handle calibrator changes and sync with maintenance assignedTo
    if (calibrator && calibrator !== 'none') {
      // Find faculty user by email
      const facultyUser = await User.findOne({
        email: calibrator,
        role: 'faculty'
      });

      if (facultyUser) {
        // SYNC FIX: Update related maintenance records when calibrator changes
        await Maintenance.updateMany(
          { 
            equipmentId: id, 
            status: { $in: ['Scheduled', 'In Progress'] } 
          },
          { 
            $set: { 
              assignedTo: facultyUser._id,
              assignedToName: `${facultyUser.firstName} ${facultyUser.lastName}`,
              assignedToEmail: facultyUser.email
            } 
          }
        );
      }
    } else if (calibrator === 'none' || calibrator === '') {
      // SYNC FIX: Clear assignedTo in maintenance records when calibrator is removed
      await Maintenance.updateMany(
        { 
          equipmentId: id, 
          status: { $in: ['Scheduled', 'In Progress'] } 
        },
        { 
          $set: { 
            assignedTo: null,
            assignedToName: '',
            assignedToEmail: ''
          } 
        }
      );
    }

    console.log('💾 Updating item in database...');

    const updatedItem = await Inventory.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('_id itemId name description specifications condition category cost yearPurchased maintenanceNeeds calibration roomAssigned calibrator images maintenanceHistory calibrationHistory lastMaintenance nextMaintenance expirationDate quantity availableQuantity status qrCode calibrationQuantity disposalQuantity maintenanceQuantity borrowedQuantity canBeBorrowed isDisposed createdAt updatedAt');

    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Convert the updated item to a plain object
    const updatedObj = updatedItem.toObject();
    
    // Format images for response
    const responseImages = formatImagesArrayForDisplay(updatedObj.images || []);

    // Format dates for response
    const responseNextMaintenance = formatDateForDisplay(updatedObj.nextMaintenance);
    const responseLastMaintenance = formatDateForDisplay(updatedObj.lastMaintenance);
    const responseExpirationDate = updatedObj.expirationDate ? new Date(updatedObj.expirationDate).toISOString().split('T')[0] : '';

    const serializedItem = {
      ...updatedObj,
      _id: safeIdToString(updatedObj),
      images: responseImages,
      yearPurchased: updatedObj.yearPurchased || '',
      lastMaintenance: responseLastMaintenance,
      nextMaintenance: responseNextMaintenance,
      expirationDate: responseExpirationDate,
      canBeBorrowed: updatedObj.canBeBorrowed !== undefined ? updatedObj.canBeBorrowed : true,
      isDisposed: updatedObj.isDisposed || false,
      createdAt: updatedObj.createdAt ? new Date(updatedObj.createdAt).toISOString() : '',
      updatedAt: updatedObj.updatedAt ? new Date(updatedObj.updatedAt).toISOString() : ''
    };

    console.log('✅ Item updated successfully:', serializedItem.itemId);
    console.log('🖼️  Images array in response:', serializedItem.images.length);
    console.log('🔧 Can Be Borrowed set to:', serializedItem.canBeBorrowed);

    return NextResponse.json(serializedItem, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error updating inventory item:', error);

    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: `Validation Error: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}

// DELETE /api/inventory/[id] - delete an inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Check if item exists
    const existingItem = await Inventory.findById(id);
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // SYNC FIX: Delete related maintenance records when inventory item is deleted
    await Maintenance.deleteMany({ equipmentId: id });

    const deletedItem = await Inventory.findByIdAndDelete(id);

    if (!deletedItem) {
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error deleting inventory item:', error);
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}