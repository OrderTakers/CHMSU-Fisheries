// app/api/reports/generate/route.ts - COMPLETE
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Inventory from "@/models/Inventory";
import User from "@/models/User";
import Borrowing from "@/models/Borrowing";

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

// Helper function to format date for display
function formatDateForDisplay(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
}

// POST /api/reports/generate - generate report data
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { reportType, filters = [], columns = [], sortBy = 'createdAt', sortOrder = 'desc' } = body;

    console.log('📈 Generating report of type:', reportType);

    let data: any[] = [];
    let query: any = {};

    // Build query based on filters
    if (filters && filters.length > 0) {
      filters.forEach((filter: any) => {
        switch (filter.operator) {
          case 'equals':
            query[filter.field] = filter.value;
            break;
          case 'contains':
            query[filter.field] = { $regex: filter.value, $options: 'i' };
            break;
          case 'greaterThan':
            query[filter.field] = { $gt: filter.value };
            break;
          case 'lessThan':
            query[filter.field] = { $lt: filter.value };
            break;
          case 'between':
            query[filter.field] = { $gte: filter.value, $lte: filter.value2 };
            break;
          case 'in':
            query[filter.field] = { $in: filter.value };
            break;
          case 'notEquals':
            query[filter.field] = { $ne: filter.value };
            break;
        }
      });
    }

    // Generate report based on type
    switch (reportType) {
      case 'inventory':
        data = await Inventory.find(query)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .lean();
        break;

      case 'maintenance':
        query.maintenanceNeeds = { $in: ['Yes', 'Scheduled'] };
        data = await Inventory.find(query)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .lean();
        break;

      case 'calibration':
        query.calibration = { $in: ['Yes', 'Due Soon'] };
        data = await Inventory.find(query)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .lean();
        break;

      case 'borrowing':
        data = await Borrowing.find(query)
          .populate('equipmentId', 'name itemId')
          .populate('borrowerId', 'firstName lastName email')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .lean();
        break;

      case 'financial':
        data = await Inventory.find(query)
          .select('itemId name category cost yearPurchased condition status quantity availableQuantity')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .lean();
        break;

      case 'disposal':
        query.isDisposed = true;
        data = await Inventory.find(query)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .lean();
        break;

      default:
        data = await Inventory.find(query)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .lean();
    }

    // Convert MongoDB objects to plain objects and handle _id conversion
    const processedData = data.map(item => {
      const plainItem = { ...item };
      
      // Convert _id to string
      plainItem._id = safeIdToString(item);
      
      // Handle populated fields
      if (item.equipmentId && typeof item.equipmentId === 'object') {
        plainItem.equipmentId = {
          ...item.equipmentId,
          _id: safeIdToString(item.equipmentId)
        };
      }
      
      if (item.borrowerId && typeof item.borrowerId === 'object') {
        plainItem.borrowerId = {
          ...item.borrowerId,
          _id: safeIdToString(item.borrowerId)
        };
      }
      
      // Format dates
      if (item.createdAt) {
        plainItem.createdAt = new Date(item.createdAt).toISOString();
      }
      if (item.updatedAt) {
        plainItem.updatedAt = new Date(item.updatedAt).toISOString();
      }
      if (item.requestedDate) {
        plainItem.requestedDate = formatDateForDisplay(item.requestedDate);
      }
      if (item.intendedBorrowDate) {
        plainItem.intendedBorrowDate = formatDateForDisplay(item.intendedBorrowDate);
      }
      if (item.intendedReturnDate) {
        plainItem.intendedReturnDate = formatDateForDisplay(item.intendedReturnDate);
      }
      if (item.actualReturnDate) {
        plainItem.actualReturnDate = formatDateForDisplay(item.actualReturnDate);
      }

      return plainItem;
    });

    // Apply column selection if specified
    let finalData = processedData;
    if (columns && columns.length > 0) {
      const visibleColumns = columns.filter((col: any) => col.visible);
      if (visibleColumns.length > 0) {
        finalData = processedData.map((item: any) => {
          const filteredItem: any = {};
          visibleColumns.forEach((col: any) => {
            filteredItem[col.field] = item[col.field];
          });
          return filteredItem;
        });
      }
    }

    // Generate summary statistics
    const summary = generateSummary(processedData, reportType);

    console.log(`✅ Generated report with ${finalData.length} records`);

    return NextResponse.json({
      data: finalData,
      summary,
      generatedAt: new Date().toISOString(),
      totalRecords: finalData.length
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error("❌ Error generating report:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate report",
        details: error.message 
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

function generateSummary(data: any[], reportType: string) {
  switch (reportType) {
    case 'inventory':
      return {
        totalItems: data.length,
        totalValue: data.reduce((sum, item) => sum + (item.cost * (item.quantity || 1)), 0),
        byCondition: data.reduce((acc: any, item) => {
          acc[item.condition] = (acc[item.condition] || 0) + 1;
          return acc;
        }, {}),
        byCategory: data.reduce((acc: any, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {})
      };

    case 'financial':
      return {
        totalValue: data.reduce((sum, item) => sum + (item.cost * (item.quantity || 1)), 0),
        averageCost: data.length > 0 ? data.reduce((sum, item) => sum + item.cost, 0) / data.length : 0,
        highestCostItem: data.reduce((max, item) => item.cost > max.cost ? item : max, { cost: 0, name: 'None' }),
        byYear: data.reduce((acc: any, item) => {
          const year = item.yearPurchased || 'Unknown';
          acc[year] = (acc[year] || 0) + (item.cost * (item.quantity || 1));
          return acc;
        }, {})
      };

    case 'maintenance':
      return {
        totalItems: data.length,
        urgentRepairs: data.filter(item => item.condition === 'Needs Repair').length,
        scheduledMaintenance: data.filter(item => item.maintenanceNeeds === 'Scheduled').length,
        byCategory: data.reduce((acc: any, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {})
      };

    case 'borrowing':
      return {
        totalRequests: data.length,
        byStatus: data.reduce((acc: any, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {}),
        pendingRequests: data.filter(item => item.status === 'pending').length,
        activeBorrowings: data.filter(item => item.status === 'approved' || item.status === 'released').length
      };

    default:
      return { totalRecords: data.length };
  }
}