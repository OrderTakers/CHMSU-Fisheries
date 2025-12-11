import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Maintenance from '@/models/Maintenance';
import Inventory from '@/models/Inventory';
import User from '@/models/User';
import { Types } from 'mongoose';

export async function GET(
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

    const maintenance = await Maintenance.findById(id)
      .populate('equipmentId', 'name itemId category condition availableQuantity maintenanceQuantity quantity nextMaintenance')
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!maintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance record' },
      { status: 500 }
    );
  }
}

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

    // Check if maintenance exists
    const existingMaintenance = await Maintenance.findById(id);
    if (!existingMaintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    const requiredFields = ['equipmentName', 'itemId', 'scheduledDate', 'dueDate', 'assignedToName', 'quantity'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Find equipment
    const equipment = await Inventory.findOne({
      $or: [
        { name: body.equipmentName },
        { itemId: body.itemId }
      ],
      category: { 
        $in: [
          "Equipment",
          "Materials",
          "Instruments", 
          "Furniture",
          "Electronics",
          "Safety Gear",
          "Lab Supplies",
          "Tools"
        ]
      }
    });

    if (!equipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // Check if requested quantity is available (considering current maintenance)
    const currentMaintenanceQuantity = existingMaintenance.quantity;
    const newQuantity = parseInt(body.quantity) || 1;
    const availableForNewMaintenance = equipment.availableQuantity + currentMaintenanceQuantity;
    
    if (newQuantity > availableForNewMaintenance) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Only ${availableForNewMaintenance} units available. Requested ${newQuantity} units.` 
        },
        { status: 400 }
      );
    }

    // Find faculty user
    const facultyUser = await User.findOne({
      $or: [
        { firstName: { $regex: body.assignedToName, $options: 'i' } },
        { lastName: { $regex: body.assignedToName, $options: 'i' } },
        { 
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: body.assignedToName,
              options: 'i'
            }
          }
        }
      ],
      role: 'faculty'
    });

    if (!facultyUser) {
      return NextResponse.json(
        { success: false, error: 'Faculty member not found' },
        { status: 404 }
      );
    }

    // Calculate quantity difference for inventory update
    const quantityDifference = newQuantity - existingMaintenance.quantity;

    // Calculate next maintenance date
    const calculateNextMaintenance = (dueDate: string, estimatedDuration: number): string => {
      if (!dueDate) return '';
      const date = new Date(dueDate);
      date.setDate(date.getDate() + estimatedDuration);
      return date.toISOString();
    };

    const nextMaintenance = body.nextMaintenance || calculateNextMaintenance(body.dueDate, body.estimatedDuration);

    // Prepare update data
    const updateData = {
      ...body,
      equipmentId: equipment._id,
      assignedTo: facultyUser._id,
      assignedToName: `${facultyUser.firstName} ${facultyUser.lastName}`,
      scheduledDate: new Date(body.scheduledDate),
      dueDate: new Date(body.dueDate),
      nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : undefined,
      // Handle number fields safely
      quantity: newQuantity,
      estimatedDuration: parseInt(body.estimatedDuration) || 1,
      maintainedQuantity: parseInt(body.maintainedQuantity) || 0,
      totalCost: parseFloat(body.totalCost) || 0,
      // Calculate remaining quantity
      remainingQuantity: newQuantity - (parseInt(body.maintainedQuantity) || 0)
    };

    // Update maintenance record
    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('equipmentId', 'name itemId category condition availableQuantity maintenanceQuantity quantity nextMaintenance')
     .populate('assignedTo', 'firstName lastName');

    if (!updatedMaintenance) {
      return NextResponse.json(
        { success: false, error: 'Failed to update maintenance record' },
        { status: 500 }
      );
    }

    // Update equipment quantities if quantity changed
    if (quantityDifference !== 0) {
      await Inventory.findByIdAndUpdate(equipment._id, {
        $inc: {
          availableQuantity: -quantityDifference,
          maintenanceQuantity: quantityDifference
        }
      });
    }

    // Update equipment next maintenance date
    if (nextMaintenance) {
      await Inventory.findByIdAndUpdate(equipment._id, {
        nextMaintenance: new Date(nextMaintenance)
      });
    }

    // Update equipment status based on maintenance status
    if (body.status) {
      await updateEquipmentStatus(equipment._id, body.status, updatedMaintenance);
    }

    return NextResponse.json({
      success: true,
      data: updatedMaintenance,
      message: 'Maintenance record updated successfully'
    });
  } catch (error) {
    console.error('Error updating maintenance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance record' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Find maintenance record first to get equipment info
    const maintenance = await Maintenance.findById(id);
    if (!maintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    // Get current equipment state
    const equipment = await Inventory.findById(maintenance.equipmentId);
    if (!equipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // Calculate quantities to restore to inventory
    const maintainedToRestore = maintenance.maintainedQuantity || 0;
    const totalMaintenanceQuantity = maintenance.quantity;

    // Delete the maintenance record
    const deletedMaintenance = await Maintenance.findByIdAndDelete(id);

    if (!deletedMaintenance) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete maintenance record' },
        { status: 500 }
      );
    }

    // Update equipment quantities - restore maintained units to available, remove all from maintenance
    await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
      $inc: {
        availableQuantity: maintainedToRestore,
        maintenanceQuantity: -totalMaintenanceQuantity
      },
      maintenanceNeeds: equipment.maintenanceQuantity - totalMaintenanceQuantity <= 0 ? 'No' : equipment.maintenanceNeeds,
      condition: equipment.maintenanceQuantity - totalMaintenanceQuantity <= 0 ? 'Good' : equipment.condition,
      nextMaintenance: equipment.nextMaintenance // Keep existing next maintenance date
    });

    return NextResponse.json({
      success: true,
      message: 'Maintenance record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting maintenance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete maintenance record' },
      { status: 500 }
    );
  }
}

// PATCH endpoint for partial updates (like status updates)
export async function PATCH(
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

    // Check if maintenance exists
    const existingMaintenance = await Maintenance.findById(id);
    if (!existingMaintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData = { ...body };

    // Set completed date if status is being updated to Completed
    if (body.status === 'Completed' && !body.completedDate) {
      updateData.completedDate = new Date();
    }

    // Update maintenance record
    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('equipmentId', 'name itemId category condition availableQuantity maintenanceQuantity quantity nextMaintenance')
     .populate('assignedTo', 'firstName lastName');

    if (!updatedMaintenance) {
      return NextResponse.json(
        { success: false, error: 'Failed to update maintenance record' },
        { status: 500 }
      );
    }

    // Update equipment status based on maintenance status
    if (body.status) {
      await updateEquipmentStatus(updatedMaintenance.equipmentId._id, body.status, updatedMaintenance);
    }

    return NextResponse.json({
      success: true,
      data: updatedMaintenance,
      message: 'Maintenance record updated successfully'
    });
  } catch (error) {
    console.error('Error updating maintenance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance record' },
      { status: 500 }
    );
  }
}

// Helper function to update equipment status
async function updateEquipmentStatus(equipmentId: Types.ObjectId, status: string, maintenance: any) {
  let equipmentUpdate: any = {};
  
  switch (status) {
    case 'Completed':
      equipmentUpdate = {
        maintenanceNeeds: 'No',
        condition: 'Good'
      };
      // Move all maintained quantity to available
      if (maintenance.maintainedQuantity > 0) {
        equipmentUpdate.$inc = {
          availableQuantity: maintenance.maintainedQuantity,
          maintenanceQuantity: -maintenance.maintainedQuantity
        };
      }
      break;
    case 'In Progress':
      equipmentUpdate = {
        maintenanceNeeds: 'Scheduled',
        condition: 'Under Maintenance'
      };
      break;
    case 'Scheduled':
      equipmentUpdate = {
        maintenanceNeeds: 'Scheduled',
        condition: 'Under Maintenance'
      };
      break;
    case 'Overdue':
      equipmentUpdate = {
        maintenanceNeeds: 'Yes',
        condition: 'Needs Repair'
      };
      break;
    default:
      equipmentUpdate = {
        maintenanceNeeds: 'Scheduled',
        condition: 'Under Maintenance'
      };
  }

  // Update next maintenance date if available
  if (maintenance.nextMaintenance) {
    equipmentUpdate.nextMaintenance = maintenance.nextMaintenance;
  }

  if (Object.keys(equipmentUpdate).length > 0) {
    await Inventory.findByIdAndUpdate(equipmentId, equipmentUpdate);
  }
}