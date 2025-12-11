import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Maintenance from '@/models/Maintenance';
import Inventory from '@/models/Inventory';
import { Types } from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    // Await the params object first
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid maintenance ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { maintainedQuantity } = body;

    // Find maintenance record
    const maintenance = await Maintenance.findById(id);
    if (!maintenance) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    // Validate maintained quantity
    const newMaintainedQuantity = parseInt(maintainedQuantity) || 0;
    if (newMaintainedQuantity > maintenance.quantity) {
      return NextResponse.json(
        { success: false, error: 'Maintained quantity cannot exceed total quantity' },
        { status: 400 }
      );
    }

    if (newMaintainedQuantity < (maintenance.maintainedQuantity || 0)) {
      return NextResponse.json(
        { success: false, error: 'Maintained quantity cannot be decreased' },
        { status: 400 }
      );
    }

    const previousMaintainedQuantity = maintenance.maintainedQuantity || 0;
    
    // Calculate the actual quantity difference that needs to be moved to available
    const quantityDifference = newMaintainedQuantity - previousMaintainedQuantity;

    // Update maintenance record
    maintenance.maintainedQuantity = newMaintainedQuantity;
    maintenance.remainingQuantity = maintenance.quantity - newMaintainedQuantity;

    // Auto-update status based on quantity
    if (newMaintainedQuantity > 0 && maintenance.status === 'Scheduled') {
      maintenance.status = 'In Progress';
    }

    if (newMaintainedQuantity === maintenance.quantity) {
      maintenance.status = 'Completed';
      maintenance.completedDate = new Date();
    }

    await maintenance.save();

    // Update inventory quantities - FIXED LOGIC
    if (quantityDifference > 0) {
      const equipment = await Inventory.findById(maintenance.equipmentId);
      if (equipment) {
        // Move the maintained units from maintenance back to available
        await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
          $inc: {
            availableQuantity: quantityDifference,
            maintenanceQuantity: -quantityDifference
          }
        });

        // Update equipment condition based on remaining maintenance
        const remainingMaintenance = maintenance.quantity - newMaintainedQuantity;
        if (remainingMaintenance === 0) {
          // All units maintained - equipment is fully available
          await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
            condition: 'Good',
            maintenanceNeeds: 'No',
            nextMaintenance: maintenance.nextMaintenance || equipment.nextMaintenance
          });
        } else if (remainingMaintenance > 0 && equipment.condition !== 'Under Maintenance') {
          // Some units still need maintenance
          await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
            condition: 'Under Maintenance',
            maintenanceNeeds: 'Scheduled',
            nextMaintenance: maintenance.nextMaintenance || equipment.nextMaintenance
          });
        }
      }
    }

    // Populate the updated maintenance record
    const updatedMaintenance = await Maintenance.findById(id)
      .populate('equipmentId', 'name itemId category condition availableQuantity maintenanceQuantity quantity nextMaintenance')
      .populate('assignedTo', 'firstName lastName');

    return NextResponse.json({
      success: true,
      data: updatedMaintenance,
      message: 'Maintenance quantity updated successfully'
    });
  } catch (error) {
    console.error('Error updating maintenance quantity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance quantity' },
      { status: 500 }
    );
  }
}