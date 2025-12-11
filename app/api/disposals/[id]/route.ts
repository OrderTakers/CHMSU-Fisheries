// app/api/disposals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import Disposal from '@/models/Disposal';
import Inventory from '@/models/Inventory';

// GET /api/disposals/[id] - fetch a single disposal record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const { id } = params;

    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Disposal ID is required' }, { status: 400 });
    }

    console.log('🗑️ Fetching disposal record with ID:', id);

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid disposal ID format' }, { status: 400 });
    }

    const disposal = await Disposal.findById(id)
      .populate('inventoryItem', 'itemId name quantity availableQuantity cost')
      .populate('disposedById', 'firstName lastName email role')
      .lean();

    if (!disposal) {
      return NextResponse.json({ error: 'Disposal record not found' }, { status: 404 });
    }

    const inventoryItem = disposal.inventoryItem as any;
    const disposedByUser = disposal.disposedById as any;

    const serializedDisposal = {
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

    return NextResponse.json(serializedDisposal, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching disposal record:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch disposal record',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT /api/disposals/[id] - update a disposal record
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const { id } = params;
    const body = await request.json();

    const { status, salvageValue, notes } = body;

    console.log('🗑️ PUT request received for disposal ID:', id, 'with data:', { status, salvageValue, notes });

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid disposal ID format' }, { status: 400 });
    }

    const disposal = await Disposal.findById(id);
    if (!disposal) {
      return NextResponse.json({ error: 'Disposal record not found' }, { status: 404 });
    }

    console.log('📋 Current disposal status:', disposal.status, 'Requested status:', status);

    const session = await Disposal.startSession();
    session.startTransaction();

    try {
      if (status && status !== disposal.status) {
        if (status === 'Cancelled') {
          console.log('🔄 Cancelling disposal - restoring inventory quantities');
          const inventoryItem = await Inventory.findById(disposal.inventoryItem);
          if (inventoryItem) {
            const inventoryData = inventoryItem.toObject();
            
            console.log('📦 Restoring inventory:', {
              previousQuantity: inventoryData.quantity,
              previousAvailable: inventoryData.availableQuantity,
              previousDisposal: inventoryData.disposalQuantity || 0,
              restoredQuantity: disposal.disposalQuantity
            });

            const restoreResult = await Inventory.findByIdAndUpdate(
              disposal.inventoryItem,
              {
                $set: {
                  quantity: inventoryData.quantity + disposal.disposalQuantity,
                  availableQuantity: inventoryData.availableQuantity + disposal.disposalQuantity,
                  disposalQuantity: Math.max(0, (inventoryData.disposalQuantity || 0) - disposal.disposalQuantity),
                  status: 'Active',
                  condition: inventoryData.availableQuantity + disposal.disposalQuantity > 0 ? 'Good' : 'Out of Stock',
                  isDisposed: false
                }
              },
              { session, new: true }
            );
            console.log('✅ Reactivating inventory item:', restoreResult);
          }
        } else if (status === 'Completed') {
          console.log('✅ Completing disposal record');
          const inventoryItem = await Inventory.findById(disposal.inventoryItem);
          if (inventoryItem) {
            console.log('📦 Verifying inventory status for completed disposal');
            const inventoryData = inventoryItem.toObject();
            console.log('Inventory status after completion:', {
              quantity: inventoryData.quantity,
              availableQuantity: inventoryData.availableQuantity,
              disposalQuantity: inventoryData.disposalQuantity,
              status: inventoryData.status
            });
          }
        }
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (salvageValue !== undefined) updateData.salvageValue = salvageValue;
      if (notes !== undefined) updateData.notes = notes;

      console.log('📝 Updating disposal with data:', updateData);

      const updatedDisposal = await Disposal.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true, session }
      )
      .populate('inventoryItem', 'itemId name quantity availableQuantity cost')
      .populate('disposedById', 'firstName lastName email role');

      if (!updatedDisposal) {
        throw new Error('Failed to update disposal record');
      }

      await session.commitTransaction();
      session.endSession();

      const inventoryItem = updatedDisposal.inventoryItem as any;
      const disposedByUser = updatedDisposal.disposedById as any;

      const disposalObject = updatedDisposal.toObject() as any;
      
      const serializedDisposal = {
        ...disposalObject,
        _id: disposalObject._id.toString(),
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

      console.log('✅ Disposal record updated successfully');

      return NextResponse.json(serializedDisposal, { status: 200 });

    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Error updating disposal record:', error);

    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: `Validation Error: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to update disposal record',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE /api/disposals/[id] - delete a disposal record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const { id } = params;

    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Disposal ID is required' }, { status: 400 });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid disposal ID format' }, { status: 400 });
    }

    const disposal = await Disposal.findById(id);
    if (!disposal) {
      return NextResponse.json({ error: 'Disposal record not found' }, { status: 404 });
    }

    console.log('🗑️ Deleting disposal record:', id);

    const session = await Disposal.startSession();
    session.startTransaction();

    try {
      const inventoryItem = await Inventory.findById(disposal.inventoryItem);
      if (inventoryItem) {
        const inventoryData = inventoryItem.toObject();
        
        console.log('📦 Restoring inventory before deletion:', {
          previousQuantity: inventoryData.quantity,
          previousAvailable: inventoryData.availableQuantity,
          previousDisposal: inventoryData.disposalQuantity || 0,
          restoredQuantity: disposal.disposalQuantity
        });

        const restoreResult = await Inventory.findByIdAndUpdate(
          disposal.inventoryItem,
          {
            $set: {
              quantity: inventoryData.quantity + disposal.disposalQuantity,
              availableQuantity: inventoryData.availableQuantity + disposal.disposalQuantity,
              disposalQuantity: Math.max(0, (inventoryData.disposalQuantity || 0) - disposal.disposalQuantity),
              status: 'Active',
              condition: inventoryData.availableQuantity + disposal.disposalQuantity > 0 ? 'Good' : 'Out of Stock',
              isDisposed: false
            }
          },
          { session, new: true }
        );
        console.log('✅ Inventory restored:', restoreResult);
      }

      await Disposal.findByIdAndDelete(id, { session });

      await session.commitTransaction();
      session.endSession();

      console.log('✅ Disposal record deleted successfully');

      return NextResponse.json({ message: 'Disposal record deleted successfully' }, { status: 200 });

    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Error deleting disposal record:', error);
    return NextResponse.json({ 
      error: 'Failed to delete disposal record',
      details: error.message 
    }, { status: 500 });
  }
}