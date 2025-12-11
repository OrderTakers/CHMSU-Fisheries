// app/api/maintenance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Maintenance from '@/models/Maintenance';
import Inventory from '@/models/Inventory';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Fetch all data in one go
    const [maintenance, equipment, faculty] = await Promise.all([
      // Maintenance records with populated data
      Maintenance.find({})
        .populate('equipmentId', 'name itemId category condition availableQuantity maintenanceQuantity quantity nextMaintenance lastMaintenance calibrator')
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean(),
      
      // Equipment items
      Inventory.find({ 
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
        },
        status: 'Active'
      })
      .select('name itemId category condition maintenanceNeeds availableQuantity maintenanceQuantity quantity nextMaintenance lastMaintenance calibrator')
      .sort({ name: 1 })
      .lean(),
      
      // Faculty users
      User.find({ 
        role: 'faculty',
        status: 'active'
      })
      .select('firstName lastName email schoolID')
      .sort({ firstName: 1 })
      .lean()
    ]);

    // Format maintenance data with proper date handling
    const formattedMaintenance = maintenance.map((item: any) => {
      // Calculate days until due
      const dueDate = new Date(item.dueDate);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate completion rate
      const maintainedQty = item.maintainedQuantity || 0;
      const totalQty = item.quantity || 1;
      const completionRate = item.status === 'Completed' ? 100 : Math.round((maintainedQty / totalQty) * 100);
      
      // Format dates function
      const formatDate = (dateString: string) => {
        if (!dateString) return 'Not set';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return 'Invalid date';
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch (error) {
          return 'Invalid date';
        }
      };

      // Proper nextMaintenance handling
      const hasNextMaintenance = item.nextMaintenance && item.nextMaintenance !== '' && !isNaN(new Date(item.nextMaintenance).getTime());
      const nextMaintenanceValue = hasNextMaintenance ? item.nextMaintenance : '';

      return {
        ...item,
        // Ensure nextMaintenance is properly set
        nextMaintenance: nextMaintenanceValue,
        // Add formatted dates for display
        formattedScheduledDate: formatDate(item.scheduledDate),
        formattedDueDate: formatDate(item.dueDate),
        formattedNextMaintenance: hasNextMaintenance ? formatDate(item.nextMaintenance) : 'Not set',
        // Calculate additional fields
        isOverdue: item.status !== 'Completed' && daysUntilDue < 0,
        daysUntilDue,
        completionRate,
        quantityCompletionRate: completionRate,
        // Ensure quantity fields are properly set
        maintainedQuantity: item.maintainedQuantity || 0,
        remainingQuantity: item.remainingQuantity || (item.quantity - (item.maintainedQuantity || 0)),
        availableQuantity: item.availableQuantity || item.quantity
      };
    });

    // Calculate stats based on quantities
    const stats = await calculateMaintenanceStats();

    // Format faculty with full names
    const facultyWithFullName = faculty.map((user: any) => ({
      ...user,
      fullName: `${user.firstName} ${user.lastName}`
    }));

    return NextResponse.json({
      success: true,
      data: formattedMaintenance,
      equipment,
      faculty: facultyWithFullName,
      stats
    });
  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance data' },
      { status: 500 }
    );
  }
}

// Helper function to calculate stats
async function calculateMaintenanceStats() {
  try {
    const statsResult = await Maintenance.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$quantity' },
          completed: { 
            $sum: {
              $cond: [{ $eq: ['$status', 'Completed'] }, '$quantity', 0]
            }
          },
          inProgress: { 
            $sum: {
              $cond: [
                { $eq: ['$status', 'In Progress'] }, 
                '$quantity', 
                0
              ]
            }
          },
          scheduled: { 
            $sum: {
              $cond: [
                { $eq: ['$status', 'Scheduled'] }, 
                '$quantity', 
                0
              ]
            }
          },
          totalCost: { $sum: '$totalCost' }
        }
      }
    ]);

    const totalStats = statsResult[0] || {
      total: 0,
      completed: 0,
      inProgress: 0,
      scheduled: 0,
      totalCost: 0
    };

    // Calculate overdue separately
    const overdueCount = await Maintenance.countDocuments({
      status: { $in: ['Scheduled', 'In Progress'] },
      dueDate: { $lt: new Date() }
    });

    return {
      total: totalStats.total,
      completed: totalStats.completed,
      inProgress: totalStats.inProgress,
      overdue: overdueCount,
      totalCost: totalStats.totalCost || 0
    };
  } catch (error) {
    console.error('Error calculating stats:', error);
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      overdue: 0,
      totalCost: 0
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['equipmentName', 'itemId', 'scheduledDate', 'dueDate', 'nextMaintenance', 'assignedToName', 'quantity'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Find equipment by name or itemId to get the equipmentId
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
        { success: false, error: 'Equipment not found. Please select valid equipment.' },
        { status: 404 }
      );
    }

    // Check if requested quantity is available
    if (body.quantity > equipment.availableQuantity) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Only ${equipment.availableQuantity} units available. Requested ${body.quantity} units.` 
        },
        { status: 400 }
      );
    }

    // Find faculty user for assignedTo
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
        { success: false, error: 'Faculty member not found. Please assign to a valid faculty member.' },
        { status: 404 }
      );
    }

    // Enhanced nextMaintenance validation
    let nextMaintenanceDate;
    try {
      if (!body.nextMaintenance) {
        throw new Error('Next maintenance date is required');
      }
      
      nextMaintenanceDate = new Date(body.nextMaintenance);
      if (isNaN(nextMaintenanceDate.getTime())) {
        throw new Error('Invalid next maintenance date');
      }
      
      // Validate that next maintenance is after due date
      const dueDate = new Date(body.dueDate);
      if (nextMaintenanceDate <= dueDate) {
        throw new Error('Next maintenance date must be after the due date');
      }
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Invalid next maintenance date format' },
        { status: 400 }
      );
    }

    // Create maintenance record with quantity tracking
    const maintenanceData = {
      equipmentName: body.equipmentName,
      itemId: body.itemId,
      equipmentId: equipment._id,
      assignedTo: facultyUser._id,
      assignedToName: `${facultyUser.firstName} ${facultyUser.lastName}`,
      assignedToEmail: facultyUser.email, // Store email for synchronization
      createdBy: facultyUser._id,
      createdByName: `${facultyUser.firstName} ${facultyUser.lastName}`,
      category: equipment.category,
      type: body.type || 'Maintenance',
      priority: body.priority || 'Medium',
      status: body.status || 'Scheduled',
      description: body.description || '',
      scheduledDate: new Date(body.scheduledDate),
      dueDate: new Date(body.dueDate),
      nextMaintenance: nextMaintenanceDate,
      quantity: parseInt(body.quantity) || 1,
      availableQuantity: parseInt(body.quantity) || 1,
      maintainedQuantity: 0,
      remainingQuantity: parseInt(body.quantity) || 1,
      estimatedDuration: parseInt(body.estimatedDuration) || 1,
      partsUsed: body.partsUsed || [],
      totalCost: body.totalCost || 0
    };

    const maintenance = new Maintenance(maintenanceData);
    await maintenance.save();

    // CRITICAL SYNC FIX: Update equipment with calibrator from assigned faculty
    const quantityToMaintain = parseInt(body.quantity);
    await Inventory.findByIdAndUpdate(equipment._id, {
      $inc: {
        availableQuantity: -quantityToMaintain,
        maintenanceQuantity: quantityToMaintain
      },
      $set: {
        maintenanceNeeds: 'Scheduled',
        condition: quantityToMaintain === equipment.quantity ? 'Under Maintenance' : 
                  equipment.availableQuantity - quantityToMaintain === 0 ? 'Under Maintenance' : 'Needs Repair',
        nextMaintenance: nextMaintenanceDate,
        lastMaintenance: new Date(body.scheduledDate),
        // SYNC: Update calibrator to match assigned faculty
        calibrator: facultyUser.email
      }
    });

    // Populate the created maintenance record
    const populatedMaintenance = await Maintenance.findById(maintenance._id)
      .populate('equipmentId')
      .populate('assignedTo')
      .populate('createdBy');

    return NextResponse.json({
      success: true,
      data: populatedMaintenance,
      message: 'Maintenance record created successfully'
    });
  } catch (error: any) {
    console.error('Error creating maintenance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create maintenance record' },
      { status: 500 }
    );
  }
}

// PUT endpoint for updating maintenance - /api/maintenance/[id]
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Maintenance ID is required' },
        { status: 400 }
      );
    }

    const maintenance = await Maintenance.findById(id);
    if (!maintenance) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    // Update maintenance record
    const updateData: any = {
      ...body
    };

    // Handle assignedTo changes and sync with equipment calibrator
    if (body.assignedToName) {
      // Find faculty user for assignedTo
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

      if (facultyUser) {
        updateData.assignedTo = facultyUser._id;
        updateData.assignedToName = `${facultyUser.firstName} ${facultyUser.lastName}`;
        updateData.assignedToEmail = facultyUser.email;
        
        // SYNC FIX: Update equipment calibrator when assignedTo changes
        await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
          $set: {
            calibrator: facultyUser.email
          }
        });
      }
    }

    // Handle date fields
    if (body.scheduledDate) {
      updateData.scheduledDate = new Date(body.scheduledDate);
      
      // CRITICAL FIX: When scheduled date changes, update lastMaintenance in inventory
      await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
        $set: {
          lastMaintenance: new Date(body.scheduledDate)
        }
      });
    }
    
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    
    if (body.nextMaintenance) {
      try {
        const nextMaintenanceDate = new Date(body.nextMaintenance);
        if (!isNaN(nextMaintenanceDate.getTime())) {
          updateData.nextMaintenance = nextMaintenanceDate;
          
          // CRITICAL FIX: Also update the equipment's nextMaintenance
          await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
            $set: {
              nextMaintenance: nextMaintenanceDate
            }
          });
        } else {
          console.warn('Invalid next maintenance date provided:', body.nextMaintenance);
        }
      } catch (error) {
        console.error('Invalid next maintenance date:', error);
      }
    }
    
    if (body.completedDate) updateData.completedDate = new Date(body.completedDate);

    // Handle number fields
    if (body.quantity !== undefined) updateData.quantity = parseInt(body.quantity);
    if (body.estimatedDuration !== undefined) updateData.estimatedDuration = parseInt(body.estimatedDuration);
    if (body.maintainedQuantity !== undefined) updateData.maintainedQuantity = parseInt(body.maintainedQuantity);
    if (body.actualDuration !== undefined) updateData.actualDuration = parseInt(body.actualDuration);
    if (body.totalCost !== undefined) updateData.totalCost = parseFloat(body.totalCost);

    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('equipmentId')
    .populate('assignedTo')
    .populate('createdBy');

    return NextResponse.json({
      success: true,
      data: updatedMaintenance,
      message: 'Maintenance record updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating maintenance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update maintenance record' },
      { status: 500 }
    );
  }
}

// PATCH endpoint for partial updates - /api/maintenance/[id]
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Maintenance ID is required' },
        { status: 400 }
      );
    }

    const maintenance = await Maintenance.findById(id);
    if (!maintenance) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    const updateData: any = { ...body };

    // Handle assignedTo changes in PATCH and sync with equipment calibrator
    if (body.assignedToName) {
      // Find faculty user for assignedTo
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

      if (facultyUser) {
        updateData.assignedTo = facultyUser._id;
        updateData.assignedToName = `${facultyUser.firstName} ${facultyUser.lastName}`;
        updateData.assignedToEmail = facultyUser.email;
        
        // SYNC FIX: Update equipment calibrator when assignedTo changes in PATCH
        await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
          $set: {
            calibrator: facultyUser.email
          }
        });
      }
    }

    // Set completed date if status is being updated to Completed
    if (body.status === 'Completed' && !body.completedDate) {
      updateData.completedDate = new Date();
      
      // CRITICAL FIX: Update equipment's lastMaintenance when maintenance is completed
      await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
        $set: {
          lastMaintenance: new Date().toISOString(),
          condition: 'Good',
          maintenanceNeeds: 'No'
        },
        $inc: {
          availableQuantity: maintenance.quantity,
          maintenanceQuantity: -maintenance.quantity
        }
      });
    }

    // Handle maintained quantity updates
    if (body.maintainedQuantity !== undefined) {
      updateData.maintainedQuantity = parseInt(body.maintainedQuantity);
      updateData.remainingQuantity = maintenance.quantity - parseInt(body.maintainedQuantity);
      
      // Auto-update status based on maintained quantity
      if (parseInt(body.maintainedQuantity) > 0 && maintenance.status === 'Scheduled') {
        updateData.status = 'In Progress';
      }
      
      if (parseInt(body.maintainedQuantity) === maintenance.quantity) {
        updateData.status = 'Completed';
        if (!updateData.completedDate) {
          updateData.completedDate = new Date();
        }
        
        // CRITICAL FIX: Update equipment's lastMaintenance when all units are completed
        await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
          $set: {
            lastMaintenance: new Date().toISOString(),
            condition: 'Good',
            maintenanceNeeds: 'No'
          },
          $inc: {
            availableQuantity: maintenance.quantity,
            maintenanceQuantity: -maintenance.quantity
          }
        });
      }
    }

    // Enhanced nextMaintenance updates with validation and equipment sync
    if (body.nextMaintenance) {
      try {
        const nextMaintenanceDate = new Date(body.nextMaintenance);
        if (!isNaN(nextMaintenanceDate.getTime())) {
          updateData.nextMaintenance = nextMaintenanceDate;
          
          // CRITICAL FIX: Also update the equipment's nextMaintenance
          await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
            $set: {
              nextMaintenance: nextMaintenanceDate
            }
          });
        } else {
          console.warn('Invalid next maintenance date provided in PATCH:', body.nextMaintenance);
        }
      } catch (error) {
        console.error('Invalid next maintenance date in PATCH:', error);
      }
    }

    // Handle scheduled date changes in PATCH
    if (body.scheduledDate) {
      updateData.scheduledDate = new Date(body.scheduledDate);
      
      // CRITICAL FIX: When scheduled date changes, update lastMaintenance in inventory
      await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
        $set: {
          lastMaintenance: new Date(body.scheduledDate)
        }
      });
    }

    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('equipmentId')
    .populate('assignedTo')
    .populate('createdBy');

    return NextResponse.json({
      success: true,
      data: updatedMaintenance,
      message: 'Maintenance record updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating maintenance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update maintenance record' },
      { status: 500 }
    );
  }
}

// DELETE endpoint - /api/maintenance/[id]
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Maintenance ID is required' },
        { status: 400 }
      );
    }

    const maintenance = await Maintenance.findById(id);
    if (!maintenance) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    // Restore equipment quantities before deleting maintenance record
    if (maintenance.equipmentId) {
      await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
        $inc: {
          availableQuantity: maintenance.quantity,
          maintenanceQuantity: -maintenance.quantity
        },
        $set: {
          condition: 'Good',
          maintenanceNeeds: 'None',
          nextMaintenance: null // Clear nextMaintenance when maintenance is deleted
          // Note: We don't clear calibrator as there might be other maintenance records
        }
      });
    }

    await Maintenance.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Maintenance record deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting maintenance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete maintenance record' },
      { status: 500 }
    );
  }
}

// Specific endpoint for updating quantity - /api/maintenance/[id]/quantity
export async function PUT_QUANTITY(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Maintenance ID is required' },
        { status: 400 }
      );
    }

    const maintenance = await Maintenance.findById(id);
    if (!maintenance) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    const { maintainedQuantity } = body;

    if (maintainedQuantity === undefined || maintainedQuantity < 0 || maintainedQuantity > maintenance.quantity) {
      return NextResponse.json(
        { success: false, error: 'Invalid maintained quantity' },
        { status: 400 }
      );
    }

    const updateData: any = {
      maintainedQuantity: parseInt(maintainedQuantity),
      remainingQuantity: maintenance.quantity - parseInt(maintainedQuantity)
    };

    // Auto-update status based on maintained quantity
    if (parseInt(maintainedQuantity) > 0 && maintenance.status === 'Scheduled') {
      updateData.status = 'In Progress';
    }
    
    if (parseInt(maintainedQuantity) === maintenance.quantity) {
      updateData.status = 'Completed';
      updateData.completedDate = new Date();
      
      // CRITICAL FIX: When maintenance is completed, update equipment status and lastMaintenance
      await Inventory.findByIdAndUpdate(maintenance.equipmentId, {
        $inc: {
          availableQuantity: maintenance.quantity,
          maintenanceQuantity: -maintenance.quantity
        },
        $set: {
          condition: 'Good',
          maintenanceNeeds: 'No',
          lastMaintenance: new Date().toISOString()
        }
      });
    }

    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('equipmentId')
    .populate('assignedTo')
    .populate('createdBy');

    return NextResponse.json({
      success: true,
      data: updatedMaintenance,
      message: 'Maintenance quantity updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating maintenance quantity:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update maintenance quantity' },
      { status: 500 }
    );
  }
}