// app/api/disposals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import Disposal from '@/models/Disposal';
import Inventory from '@/models/Inventory';
import User from '@/models/User';

// GET /api/disposals - fetch all disposal records
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    console.log('🗑️ GET /api/disposals - Fetching disposal records');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const method = searchParams.get('method');

    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (method && method !== 'all') {
      filter.disposalMethod = method;
    }

    console.log('🗑️ Fetching disposal records with filter:', filter);

    const disposals = await Disposal.find(filter)
      .populate('inventoryItem', 'itemId name quantity availableQuantity cost')
      .populate('disposedById', 'firstName lastName email role')
      .sort({ disposalDate: -1, createdAt: -1 })
      .lean();

    console.log(`✅ Found ${disposals.length} disposal records`);

    const serializedDisposals = disposals.map((disposal: any) => {
      const inventoryItem = disposal.inventoryItem as any;
      const disposedByUser = disposal.disposedById as any;
      
      return {
        ...disposal,
        _id: disposal._id.toString(),
        inventoryItem: inventoryItem ? {
          _id: inventoryItem._id?.toString() || '',
          itemId: inventoryItem.itemId || '',
          name: inventoryItem.name || '',
          quantity: inventoryItem.quantity || 0,
          availableQuantity: inventoryItem.availableQuantity || 0,
          cost: inventoryItem.cost || 0,
        } : null,
        disposedBy: disposedByUser ? 
          `${disposedByUser.firstName} ${disposedByUser.lastName}` : 
          disposal.disposedBy,
        disposedById: disposedByUser ? {
          _id: disposedByUser._id?.toString() || '',
          firstName: disposedByUser.firstName || '',
          lastName: disposedByUser.lastName || '',
          email: disposedByUser.email || '',
          role: disposedByUser.role || '',
        } : null,
        disposalDate: disposal.disposalDate ? new Date(disposal.disposalDate).toISOString() : '',
        createdAt: disposal.createdAt ? new Date(disposal.createdAt).toISOString() : '',
        updatedAt: disposal.updatedAt ? new Date(disposal.updatedAt).toISOString() : '',
      };
    });

    return NextResponse.json(serializedDisposals, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching disposal records:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch disposal records',
      details: error.message 
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

// POST /api/disposals - create a new disposal record
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const { 
      inventoryItemId,
      reason,
      description,
      disposedBy,
      disposedById,
      disposalMethod,
      notes,
      disposalDate,
      disposalQuantity
    } = body;

    console.log('🗑️ POST request received for new disposal:', {
      inventoryItemId,
      disposalQuantity,
      disposalMethod,
      disposedById
    });

    if (!inventoryItemId || !reason || !description || !disposedBy || !disposalMethod || !disposalDate || !disposalQuantity) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        missing: {
          inventoryItemId: !inventoryItemId,
          reason: !reason,
          description: !description,
          disposedBy: !disposedBy,
          disposalMethod: !disposalMethod,
          disposalDate: !disposalDate,
          disposalQuantity: !disposalQuantity
        }
      }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    if (disposalQuantity < 1) {
      return NextResponse.json({ 
        error: 'Disposal quantity must be at least 1' 
      }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    let validDisposedById = null;
    if (disposedById && disposedById !== 'unknown' && Types.ObjectId.isValid(disposedById)) {
      validDisposedById = new Types.ObjectId(disposedById);
    }

    const inventoryItem = await Inventory.findById(inventoryItemId);
    if (!inventoryItem) {
      return NextResponse.json({ 
        error: 'Inventory item not found' 
      }, { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    const inventoryData = inventoryItem.toObject();
    
    console.log('📦 Inventory item found:', {
      name: inventoryData.name,
      category: inventoryData.category,
      quantity: inventoryData.quantity,
      availableQuantity: inventoryData.availableQuantity,
      requestedQuantity: disposalQuantity
    });

    if (inventoryData.availableQuantity < disposalQuantity) {
      return NextResponse.json({ 
        error: `Not enough available quantity. Available: ${inventoryData.availableQuantity}, Requested: ${disposalQuantity}` 
      }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    const disposalData: any = {
      inventoryItem: new Types.ObjectId(inventoryItemId),
      itemId: inventoryData.itemId,
      equipmentName: inventoryData.name,
      category: inventoryData.category,
      reason,
      description,
      disposedBy,
      originalCost: inventoryData.cost || 0,
      salvageValue: 0,
      disposalMethod,
      status: 'Completed',
      notes: notes || '',
      disposalDate: new Date(disposalDate),
      disposalQuantity,
    };

    if (validDisposedById) {
      disposalData.disposedById = validDisposedById;
    }

    console.log('💾 Creating disposal record in database...', disposalData);

    const session = await Disposal.startSession();
    session.startTransaction();

    try {
      const newDisposal = new Disposal(disposalData);
      const savedDisposal = await newDisposal.save({ session });

      const updatedAvailableQuantity = inventoryData.availableQuantity - disposalQuantity;
      const updatedQuantity = inventoryData.quantity - disposalQuantity;
      const updatedDisposalQuantity = (inventoryData.disposalQuantity || 0) + disposalQuantity;
      
      console.log('🔄 Updating inventory quantities:', {
        previousQuantity: inventoryData.quantity,
        newQuantity: updatedQuantity,
        previousAvailable: inventoryData.availableQuantity,
        newAvailable: updatedAvailableQuantity,
        previousDisposal: inventoryData.disposalQuantity || 0,
        newDisposal: updatedDisposalQuantity
      });

      // If quantity becomes 0, mark as disposed and update status
      let updatePayload: any = {
        quantity: updatedQuantity,
        availableQuantity: updatedAvailableQuantity,
        disposalQuantity: updatedDisposalQuantity,
      };

      if (updatedQuantity === 0) {
        updatePayload.status = 'Disposed';
        updatePayload.condition = 'Out of Stock';
        updatePayload.isDisposed = true;
      } else if (updatedAvailableQuantity === 0) {
        updatePayload.condition = 'Out of Stock';
      }

      const updateResult = await Inventory.findByIdAndUpdate(
        inventoryItemId,
        { $set: updatePayload },
        { session, new: true }
      );

      console.log('✅ Inventory update result:', updateResult);

      if (!updateResult) {
        throw new Error('Failed to update inventory item');
      }

      await session.commitTransaction();
      session.endSession();

      const populatedDisposal = await Disposal.findById(savedDisposal._id)
        .populate('inventoryItem', 'itemId name quantity availableQuantity cost')
        .populate('disposedById', 'firstName lastName email role')
        .lean();

      const inventoryItemData = populatedDisposal?.inventoryItem as any;
      const disposedByUser = populatedDisposal?.disposedById as any;

      const disposalObject = populatedDisposal as any;
      
      const serializedDisposal = {
        ...disposalObject,
        _id: disposalObject._id.toString(),
        inventoryItem: inventoryItemData ? {
          _id: inventoryItemData._id?.toString() || '',
          itemId: inventoryItemData.itemId || '',
          name: inventoryItemData.name || '',
          quantity: inventoryItemData.quantity || 0,
          availableQuantity: inventoryItemData.availableQuantity || 0,
          cost: inventoryItemData.cost || 0,
        } : null,
        disposedBy: disposedByUser ? 
          `${disposedByUser.firstName} ${disposedByUser.lastName}` : 
          disposalObject.disposedBy,
        disposedById: disposedByUser ? {
          _id: disposedByUser._id?.toString() || '',
          firstName: disposedByUser.firstName || '',
          lastName: disposedByUser.lastName || '',
          email: disposedByUser.email || '',
          role: disposedByUser.role || '',
        } : null,
        disposalDate: disposalObject.disposalDate ? new Date(disposalObject.disposalDate).toISOString() : '',
        createdAt: disposalObject.createdAt ? new Date(disposalObject.createdAt).toISOString() : '',
        updatedAt: disposalObject.updatedAt ? new Date(disposalObject.updatedAt).toISOString() : '',
      };

      console.log('✅ Disposal record created successfully and inventory updated');

      return NextResponse.json(serializedDisposal, { 
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        }
      });

    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Error creating disposal record:', error);

    if (error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: `Validation Error: ${error.message}` 
      }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    return NextResponse.json({ 
      error: 'Failed to create disposal record',
      details: error.message 
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}