// app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Inventory from '@/models/Inventory';
import Maintenance from '@/models/Maintenance';
import User from '@/models/User';
import { Types } from 'mongoose';

// MongoDB connection utility
async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  try {
    await mongoose.connect(mongoUri, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
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

// GET /api/inventory - fetch all inventory items
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const includeDisposed = searchParams.get('includeDisposed') === 'true';
    const includeRoomData = searchParams.get('includeRoomData') === 'true';

    // Build filter object
    const filter: any = {};

    // Exclude disposed items by default
    if (!includeDisposed) {
      filter.status = { $ne: 'Disposed' };
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (condition && condition !== 'all') {
      filter.condition = condition;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    // Search filter
    if (search) {
      filter.$or = [
        { itemId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('📦 Fetching inventory with filter:', filter);

    const inventory = await Inventory.find(filter)
      .select('_id itemId name description specifications condition category cost yearPurchased maintenanceNeeds calibration roomAssigned calibrator images maintenanceHistory calibrationHistory lastMaintenance nextMaintenance expirationDate quantity availableQuantity status qrCode calibrationQuantity disposalQuantity maintenanceQuantity borrowedQuantity canBeBorrowed isDisposed createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean()
      .maxTimeMS(30000);

    console.log(`✅ Found ${inventory.length} inventory items`);

    // Convert dates to strings for JSON serialization and handle images
    const serializedInventory = inventory.map(item => {
      // Process images for display
      const displayImages = formatImagesArrayForDisplay(item.images || []);

      if (displayImages.length > 0) {
        console.log(`🖼️  Processed ${displayImages.length} images for item: ${item.name}`);
      }

      // Format dates for consistent display
      const formattedNextMaintenance = formatDateForDisplay(item.nextMaintenance);
      const formattedLastMaintenance = formatDateForDisplay(item.lastMaintenance);
      const formattedExpirationDate = item.expirationDate ? new Date(item.expirationDate).toISOString().split('T')[0] : '';

      return {
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
    });

    return NextResponse.json(serializedInventory, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching inventory:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch inventory',
      details: error.message 
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

// POST /api/inventory - create a new inventory item
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
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

    console.log('📝 POST request received for new item');
    console.log('🖼️  Images array provided:', Array.isArray(images) ? images.length : 'Not an array');
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

    const newItemData: any = {
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
      maintenanceHistory: [],
      calibrationHistory: [],
      lastMaintenance: formattedLastMaintenance,
      nextMaintenance: formattedNextMaintenance,
      expirationDate: formattedExpirationDate,
      quantity,
      availableQuantity: availableQuantity || quantity,
      status: status || 'Active',
      calibrationQuantity: 0,
      disposalQuantity: 0,
      maintenanceQuantity: 0,
      borrowedQuantity: 0,
      canBeBorrowed: canBeBorrowed !== undefined ? canBeBorrowed : true
    };

    console.log('💾 Creating new item in database...');

    const newItem = new Inventory(newItemData);
    const savedItem = await newItem.save();

    // Convert the saved item to a plain object
    const savedItemObj = savedItem.toObject();
    
    // Format images for response
    const responseImages = formatImagesArrayForDisplay(savedItemObj.images || []);

    // Format dates for response
    const responseNextMaintenance = formatDateForDisplay(savedItemObj.nextMaintenance);
    const responseLastMaintenance = formatDateForDisplay(savedItemObj.lastMaintenance);
    const responseExpirationDate = savedItemObj.expirationDate ? new Date(savedItemObj.expirationDate).toISOString().split('T')[0] : '';

    // Convert dates to strings for JSON serialization
    const serializedItem = {
      ...savedItemObj,
      _id: safeIdToString(savedItemObj),
      images: responseImages,
      yearPurchased: savedItemObj.yearPurchased || '',
      lastMaintenance: responseLastMaintenance,
      nextMaintenance: responseNextMaintenance,
      expirationDate: responseExpirationDate,
      canBeBorrowed: savedItemObj.canBeBorrowed !== undefined ? savedItemObj.canBeBorrowed : true,
      createdAt: savedItemObj.createdAt ? savedItemObj.createdAt.toISOString() : '',
      updatedAt: savedItemObj.updatedAt ? savedItemObj.updatedAt.toISOString() : ''
    };

    console.log('✅ Item created successfully:', serializedItem.itemId);
    console.log('🖼️  Images array in response:', serializedItem.images.length);
    console.log('📅 Last Maintenance set to:', serializedItem.lastMaintenance);
    console.log('📅 Next Maintenance set to:', serializedItem.nextMaintenance);
    console.log('🔧 Can Be Borrowed set to:', serializedItem.canBeBorrowed);

    return NextResponse.json(serializedItem, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating inventory item:', error);

    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: `Validation Error: ${error.message}` }, { status: 400 });
    }

    if (error.code === 11000) {
      return NextResponse.json({ error: 'Item with this ID already exists' }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to create inventory item',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT /api/inventory/[id] - update an inventory item
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const item = await Inventory.findById(id);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const updateData: any = { ...body };

    // Handle calibrator changes and sync with maintenance assignedTo
    if (body.calibrator && body.calibrator !== 'none') {
      // Find faculty user by email
      const facultyUser = await User.findOne({
        email: body.calibrator,
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
    } else if (body.calibrator === 'none' || body.calibrator === '') {
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

    // Handle date fields formatting with synchronization
    if (body.nextMaintenance) {
      try {
        const nextMaintenanceDate = new Date(body.nextMaintenance);
        if (!isNaN(nextMaintenanceDate.getTime())) {
          updateData.nextMaintenance = nextMaintenanceDate.toISOString();
          
          // SYNC FIX: Update related maintenance records when nextMaintenance changes
          await Maintenance.updateMany(
            { equipmentId: id, status: { $in: ['Scheduled', 'In Progress'] } },
            { $set: { nextMaintenance: nextMaintenanceDate.toISOString() } }
          );
        } else {
          console.warn('Invalid nextMaintenance date provided:', body.nextMaintenance);
        }
      } catch (error) {
        console.error('Invalid nextMaintenance date:', error);
      }
    }

    if (body.lastMaintenance) {
      try {
        const lastMaintenanceDate = new Date(body.lastMaintenance);
        if (!isNaN(lastMaintenanceDate.getTime())) {
          updateData.lastMaintenance = lastMaintenanceDate.toISOString();
          
          // SYNC FIX: Update related maintenance records when lastMaintenance changes
          await Maintenance.updateMany(
            { equipmentId: id, status: 'Completed' },
            { 
              $set: { 
                completedDate: lastMaintenanceDate.toISOString(),
                scheduledDate: lastMaintenanceDate.toISOString() 
              } 
            }
          );
        } else {
          console.warn('Invalid lastMaintenance date provided:', body.lastMaintenance);
        }
      } catch (error) {
        console.error('Invalid lastMaintenance date:', error);
      }
    }

    if (body.expirationDate) {
      try {
        const expirationDate = new Date(body.expirationDate);
        if (!isNaN(expirationDate.getTime())) {
          updateData.expirationDate = expirationDate;
        } else {
          console.warn('Invalid expirationDate provided:', body.expirationDate);
        }
      } catch (error) {
        console.error('Invalid expirationDate:', error);
      }
    }

    // Handle canBeBorrowed field
    if (body.canBeBorrowed !== undefined) {
      updateData.canBeBorrowed = body.canBeBorrowed;
    }

    const updatedItem = await Inventory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    // Check if updatedItem is null
    if (!updatedItem) {
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }

    // Convert the updated item to a plain object
    const updatedItemObj = updatedItem.toObject();
    
    // Format images for response
    const responseImages = formatImagesArrayForDisplay(updatedItemObj.images || []);

    // Format dates for response
    const responseNextMaintenance = formatDateForDisplay(updatedItemObj.nextMaintenance);
    const responseLastMaintenance = formatDateForDisplay(updatedItemObj.lastMaintenance);
    const responseExpirationDate = updatedItemObj.expirationDate ? new Date(updatedItemObj.expirationDate).toISOString().split('T')[0] : '';

    const serializedItem = {
      ...updatedItemObj,
      _id: safeIdToString(updatedItemObj),
      images: responseImages,
      yearPurchased: updatedItemObj.yearPurchased || '',
      lastMaintenance: responseLastMaintenance,
      nextMaintenance: responseNextMaintenance,
      expirationDate: responseExpirationDate,
      canBeBorrowed: updatedItemObj.canBeBorrowed !== undefined ? updatedItemObj.canBeBorrowed : true,
      createdAt: updatedItemObj.createdAt ? updatedItemObj.createdAt.toISOString() : '',
      updatedAt: updatedItemObj.updatedAt ? updatedItemObj.updatedAt.toISOString() : ''
    };

    return NextResponse.json(serializedItem, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error updating inventory item:', error);
    return NextResponse.json({ 
      error: 'Failed to update inventory item',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE /api/inventory/[id] - delete an inventory item
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const item = await Inventory.findById(id);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // SYNC FIX: Delete related maintenance records when inventory item is deleted
    await Maintenance.deleteMany({ equipmentId: id });

    await Inventory.findByIdAndDelete(id);

    return NextResponse.json({ 
      message: 'Item deleted successfully' 
    }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error deleting inventory item:', error);
    return NextResponse.json({ 
      error: 'Failed to delete inventory item',
      details: error.message 
    }, { status: 500 });
  }
} 