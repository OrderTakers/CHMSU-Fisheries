// app/api/reports/route.ts - COMPLETELY FIXED
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Report, { ReportType, ReportPeriod, ReportStatus } from '@/models/Report';
import { generateReportId } from '@/models/Report';
import Inventory from '@/models/Inventory';
import Maintenance from '@/models/Maintenance';
import Borrowing from '@/models/Borrowing';
import User from '@/models/User';

// Type for the request body
interface GenerateReportRequest {
  type: ReportType;
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  title?: string;
  generatedByName?: string;
  filters?: {
    category?: string;
    room?: string;
    status?: string;
    userType?: string;
    maintenanceType?: string;
    priority?: string;
    assignedTo?: string;
    borrowerType?: string;
    borrowingStatus?: string;
  };
}

// Helper functions for type validation
function isValidReportType(type: string): type is ReportType {
  return Object.values(ReportType).includes(type as ReportType);
}

function isValidReportPeriod(period: string): period is ReportPeriod {
  return Object.values(ReportPeriod).includes(period as ReportPeriod);
}

function isValidReportStatus(status: string): status is ReportStatus {
  return Object.values(ReportStatus).includes(status as ReportStatus);
}

// GET /api/reports - Get all reports with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const period = searchParams.get('period');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const summary = searchParams.get('summary');

    // Handle summary request
    if (summary === 'true') {
      return await getReportsSummary();
    }

    // Handle reports list with filtering
    const query: any = {};
    
    if (type && type !== 'all' && isValidReportType(type)) {
      query.type = type;
    }
    
    if (period && period !== 'all' && isValidReportPeriod(period)) {
      query.period = period;
    }
    
    if (status && status !== 'all' && isValidReportStatus(status)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await Report.countDocuments(query);

    return NextResponse.json({
      reports,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// POST /api/reports - Generate a new report
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body: GenerateReportRequest = await request.json();
    const { type, period, startDate, endDate, title, generatedByName, filters } = body;

    // Validate required fields
    if (!type || !period || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: type, period, startDate, endDate' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return NextResponse.json(
        { error: 'Start date cannot be after end date' },
        { status: 400 }
      );
    }

    // Validate enum values
    if (!isValidReportType(type)) {
      return NextResponse.json(
        { error: 'Invalid report type' },
        { status: 400 }
      );
    }

    if (!isValidReportPeriod(period)) {
      return NextResponse.json(
        { error: 'Invalid report period' },
        { status: 400 }
      );
    }

    // Generate report ID using the helper function
    const reportId = generateReportId();

    // Get the current user ID from session or token
    const mongoose = await import('mongoose');
    const generatedBy = new mongoose.Types.ObjectId('000000000000000000000000'); // Default system user
    
    // Create report with generating status
    const report = new Report({
      reportId: reportId,
      title: title || `${type.replace(/_/g, ' ')} Report - ${period}`,
      type,
      period,
      startDate: start,
      endDate: end,
      data: {},
      summary: {},
      generatedBy: generatedBy,
      generatedByName: generatedByName || 'System Admin',
      filters: filters || {},
      status: ReportStatus.GENERATING,
      isSaved: true
    });

    await report.save();

    // Generate report data in background (non-blocking)
    generateReportDataInBackground(report._id, type, startDate, endDate, filters)
      .catch(err => console.error('Background generation error:', err));

    return NextResponse.json({ 
      success: true,
      message: 'Report generation started',
      report: {
        reportId: report.reportId,
        title: report.title,
        status: report.status,
        createdAt: report.createdAt,
        estimatedCompletion: 'A few moments'
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate report',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/reports - Delete multiple reports
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const body: { reportIds: string[] } = await request.json();

    if (!body.reportIds || !Array.isArray(body.reportIds)) {
      return NextResponse.json(
        { error: 'reportIds array is required' },
        { status: 400 }
      );
    }

    const result = await Report.deleteMany({ 
      reportId: { $in: body.reportIds } 
    });

    return NextResponse.json({
      message: `${result.deletedCount} reports deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting reports:', error);
    return NextResponse.json(
      { error: 'Failed to delete reports' },
      { status: 500 }
    );
  }
}

// Helper function to get reports summary
async function getReportsSummary() {
  try {
    const totalReports = await Report.countDocuments();
    const completedReports = await Report.countDocuments({ status: ReportStatus.COMPLETED });
    const generatingReports = await Report.countDocuments({ status: ReportStatus.GENERATING });
    const failedReports = await Report.countDocuments({ status: ReportStatus.FAILED });

    // Report type distribution
    const typeDistribution = await Report.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent reports
    const recentReports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('reportId title type status createdAt')
      .lean();

    return NextResponse.json({
      totalReports,
      completedReports,
      generatingReports,
      failedReports,
      typeDistribution,
      recentReports
    });
  } catch (error) {
    console.error('Error getting reports summary:', error);
    return NextResponse.json({
      totalReports: 0,
      completedReports: 0,
      generatingReports: 0,
      failedReports: 0,
      typeDistribution: [],
      recentReports: []
    });
  }
}

// Background report generation - FIXED
async function generateReportDataInBackground(
  reportId: any, 
  type: ReportType, 
  startDate: string, 
  endDate: string, 
  filters?: any
) {
  try {
    console.log(`🚀 Starting background report generation for ${reportId}, type: ${type}`);
    
    await connectToDatabase();
    
    const reportData = await generateReportData(type, startDate, endDate, filters);
    
    console.log(`✅ Report data generated successfully for ${reportId}`);
    
    await Report.findByIdAndUpdate(reportId, {
      data: reportData.data,
      summary: reportData.summary,
      status: ReportStatus.COMPLETED,
      fileUrl: `/api/reports/${reportId}/download`,
      updatedAt: new Date()
    });

    console.log(`✅ Report ${reportId} saved successfully as COMPLETED`);
  } catch (error: any) {
    console.error(`❌ Error generating report ${reportId}:`, error);
    
    try {
      await Report.findByIdAndUpdate(reportId, {
        status: ReportStatus.FAILED,
        updatedAt: new Date(),
        data: { error: error.message }
      });
    } catch (updateError) {
      console.error(`❌ Failed to update report status:`, updateError);
    }
  }
}

// Report data generation functions
async function generateReportData(type: ReportType, startDate: string, endDate: string, filters?: any) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  console.log(`📊 Generating report type: ${type}, from ${startDate} to ${endDate}`);

  switch (type) {
    case ReportType.INVENTORY_STATUS:
      return await generateInventoryStatusReport(start, end, filters);
    
    case ReportType.EQUIPMENT_USAGE:
      return await generateEquipmentUsageReport(start, end, filters);
    
    case ReportType.MAINTENANCE_STATUS:
      return await generateMaintenanceStatusReport(start, end, filters);
    
    case ReportType.MAINTENANCE_ANALYTICS:
      return await generateMaintenanceAnalyticsReport(start, end, filters);
    
    case ReportType.MAINTENANCE_COST_ANALYSIS:
      return await generateMaintenanceCostAnalysisReport(start, end, filters);
    
    case ReportType.BORROWING_TRENDS:
      return await generateBorrowingTrendsReport(start, end, filters);
    
    case ReportType.BORROWING_ANALYTICS:
      return await generateBorrowingAnalyticsReport(start, end, filters);
    
    case ReportType.DAMAGE_REPORTS:
      return await generateDamageReports(start, end, filters);
    
    case ReportType.CATEGORY_DISTRIBUTION:
      return await generateCategoryDistribution(start, end, filters);
    
    case ReportType.USER_ACTIVITY:
      return await generateUserActivity(start, end, filters);
    
    default:
      return { data: {}, summary: {} };
  }
}

// Helper function for maintenance timeline
async function getMaintenanceTimeline(start: Date, end: Date) {
  try {
    const timeline = await Maintenance.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
          },
          totalCost: { $sum: "$totalCost" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    return timeline;
  } catch (error) {
    console.error('Error getting maintenance timeline:', error);
    return [];
  }
}

// Helper function for damage trends
async function getDamageTrends(start: Date, end: Date) {
  try {
    const trends = await Inventory.aggregate([
      {
        $match: {
          condition: 'Needs Repair',
          updatedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    return trends;
  } catch (error) {
    console.error('Error getting damage trends:', error);
    return [];
  }
}

// Inventory Status Report
async function generateInventoryStatusReport(start: Date, end: Date, filters?: any) {
  try {
    const query: any = {
      createdAt: { $gte: start, $lte: end }
    };

    if (filters?.category) query.category = filters.category;
    if (filters?.room) query.roomAssigned = filters.room;
    if (filters?.status) query.status = filters.status;

    const inventory = await Inventory.find(query).lean();

    const categoryStats: Record<string, { total: number; available: number; value: number; items: number }> = {};
    const conditionStats: Record<string, number> = {};

    for (const item of inventory) {
      const category = item.category;
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, available: 0, value: 0, items: 0 };
      }
      
      const quantity = Number(item.quantity) || 0;
      const available = Number(item.availableQuantity) || 0;
      const cost = Number(item.cost) || 0;
      
      categoryStats[category].total += quantity;
      categoryStats[category].available += available;
      categoryStats[category].value += cost * quantity;
      categoryStats[category].items += 1;

      const condition = item.condition;
      conditionStats[condition] = (conditionStats[condition] || 0) + 1;
    }

    const totalValue = inventory.reduce((sum: number, item: any) => {
      const quantity = Number(item.quantity) || 0;
      const cost = Number(item.cost) || 0;
      return sum + (cost * quantity);
    }, 0);
    
    const totalItems = inventory.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
    const availableItems = inventory.reduce((sum: number, item: any) => sum + (Number(item.availableQuantity) || 0), 0);

    const roomDistribution: Record<string, number> = {};
    for (const item of inventory) {
      const room = item.roomAssigned || 'Unassigned';
      roomDistribution[room] = (roomDistribution[room] || 0) + 1;
    }

    return {
      data: {
        inventory,
        categoryStats,
        conditionStats,
        roomDistribution,
        timestamp: new Date().toISOString()
      },
      summary: {
        totalItems,
        availableItems,
        totalValue: Math.round(totalValue * 100) / 100,
        utilizationRate: totalItems > 0 ? Math.round(((totalItems - availableItems) / totalItems) * 100) : 0,
        categoriesCount: Object.keys(categoryStats).length,
        itemsCount: inventory.length
      }
    };
  } catch (error) {
    console.error('Error generating inventory status report:', error);
    throw error;
  }
}

// Equipment Usage Report
async function generateEquipmentUsageReport(start: Date, end: Date, filters?: any) {
  try {
    const query: any = {
      category: 'Equipment',
      createdAt: { $gte: start, $lte: end }
    };

    if (filters?.room) query.roomAssigned = filters.room;

    const equipment = await Inventory.find(query).lean();

    const usageStats: Record<string, { total: number; inUse: number; available: number; usageRate: number; value: number }> = {};
    let totalUsageRateSum = 0;
    let itemsWithQuantity = 0;

    for (const item of equipment) {
      const totalQuantity = Number(item.quantity) || 0;
      const availableQuantity = Number(item.availableQuantity) || 0;
      
      if (totalQuantity > 0) {
        itemsWithQuantity++;
        const usageRate = ((totalQuantity - availableQuantity) / totalQuantity) * 100;
        totalUsageRateSum += usageRate;
      }

      usageStats[item.name] = {
        total: totalQuantity,
        inUse: totalQuantity - availableQuantity,
        available: availableQuantity,
        usageRate: totalQuantity > 0 ? Math.round(((totalQuantity - availableQuantity) / totalQuantity) * 100) : 0,
        value: (Number(item.cost) || 0) * totalQuantity
      };
    }

    const averageUsageRate = itemsWithQuantity > 0 ? totalUsageRateSum / itemsWithQuantity : 0;

    const topUsed = equipment
      .filter((item: any) => (Number(item.quantity) || 0) > 0)
      .sort((a: any, b: any) => {
        const aTotal = Number(a.quantity) || 0;
        const aAvailable = Number(a.availableQuantity) || 0;
        const bTotal = Number(b.quantity) || 0;
        const bAvailable = Number(b.availableQuantity) || 0;
        
        const aUsage = aTotal > 0 ? (aTotal - aAvailable) / aTotal : 0;
        const bUsage = bTotal > 0 ? (bTotal - bAvailable) / bTotal : 0;
        return bUsage - aUsage;
      })
      .slice(0, 10);

    const highUsageItems = equipment.filter((item: any) => {
      const total = Number(item.quantity) || 0;
      const available = Number(item.availableQuantity) || 0;
      const usageRate = total > 0 ? ((total - available) / total) * 100 : 0;
      return usageRate > 80;
    }).length;

    return {
      data: {
        equipment,
        usageStats,
        topUsed,
        period: { start, end }
      },
      summary: {
        totalEquipment: equipment.length,
        totalInUse: equipment.reduce((sum: number, item: any) => {
          const total = Number(item.quantity) || 0;
          const available = Number(item.availableQuantity) || 0;
          return sum + (total - available);
        }, 0),
        totalAvailable: equipment.reduce((sum: number, item: any) => sum + (Number(item.availableQuantity) || 0), 0),
        averageUsageRate: Math.round(averageUsageRate),
        highUsageItems,
        totalEquipmentValue: equipment.reduce((sum: number, item: any) => {
          const total = Number(item.quantity) || 0;
          const cost = Number(item.cost) || 0;
          return sum + (cost * total);
        }, 0)
      }
    };
  } catch (error) {
    console.error('Error generating equipment usage report:', error);
    throw error;
  }
}

// Maintenance Status Report
async function generateMaintenanceStatusReport(start: Date, end: Date, filters?: any) {
  try {
    const query: any = {
      $or: [
        { maintenanceNeeds: { $in: ['Yes', 'Scheduled'] } },
        { calibration: { $in: ['Yes', 'Due Soon'] } },
        { condition: { $in: ['Needs Repair', 'Under Maintenance'] } }
      ],
      updatedAt: { $gte: start, $lte: end }
    };

    if (filters?.category) query.category = filters.category;

    const maintenanceItems = await Inventory.find(query).lean();

    const maintenanceStats = {
      needsRepair: maintenanceItems.filter((item: any) => item.condition === 'Needs Repair').length,
      underMaintenance: maintenanceItems.filter((item: any) => item.condition === 'Under Maintenance').length,
      needsCalibration: maintenanceItems.filter((item: any) => item.calibration === 'Yes' || item.calibration === 'Due Soon').length,
      scheduledMaintenance: maintenanceItems.filter((item: any) => item.maintenanceNeeds === 'Scheduled').length
    };

    const upcomingMaintenance = maintenanceItems
      .filter((item: any) => item.nextMaintenance)
      .sort((a: any, b: any) => {
        const aDate = a.nextMaintenance ? new Date(a.nextMaintenance).getTime() : 0;
        const bDate = b.nextMaintenance ? new Date(b.nextMaintenance).getTime() : 0;
        return aDate - bDate;
      })
      .slice(0, 10);

    const maintenanceCost = maintenanceItems.reduce((sum: number, item: any) => {
      const cost = Number(item.cost) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + (cost * quantity * 0.1); // Assume 10% of cost for maintenance
    }, 0);

    const maintenanceByCategory: Record<string, number> = {};
    for (const item of maintenanceItems) {
      const category = item.category;
      maintenanceByCategory[category] = (maintenanceByCategory[category] || 0) + 1;
    }

    const totalInventoryCount = await Inventory.countDocuments();
    const maintenanceRate = maintenanceItems.length > 0 ? 
      Math.round((maintenanceItems.length / totalInventoryCount) * 100) : 0;

    return {
      data: {
        maintenanceItems,
        maintenanceStats,
        upcomingMaintenance,
        maintenanceByCategory,
        maintenanceHistory: maintenanceItems.flatMap((item: any) => 
          (item.maintenanceHistory || []).map((history: any) => ({
            itemId: item.itemId,
            itemName: item.name,
            ...history
          }))
        )
      },
      summary: {
        totalMaintenanceItems: maintenanceItems.length,
        urgentRepairs: maintenanceStats.needsRepair,
        upcomingCalibrations: maintenanceStats.needsCalibration,
        scheduledMaintenance: maintenanceStats.scheduledMaintenance,
        maintenanceCost: Math.round(maintenanceCost * 100) / 100,
        maintenanceRate
      }
    };
  } catch (error) {
    console.error('Error generating maintenance status report:', error);
    throw error;
  }
}

// Maintenance Analytics Report
async function generateMaintenanceAnalyticsReport(start: Date, end: Date, filters?: any) {
  try {
    const query: any = {
      createdAt: { $gte: start, $lte: end }
    };

    // Apply filters
    if (filters?.maintenanceType) query.type = filters.maintenanceType;
    if (filters?.category) query.category = filters.category;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.status) query.status = filters.status;

    const maintenanceRecords = await Maintenance.find(query)
      .populate('equipmentId', 'name itemId roomAssigned cost')
      .populate('assignedTo', 'firstName lastName email')
      .lean();

    // Calculate statistics
    const totalMaintenance = maintenanceRecords.length;
    const completedMaintenance = maintenanceRecords.filter(item => item.status === 'Completed').length;
    const overdueMaintenance = maintenanceRecords.filter(item => {
      return item.status !== 'Completed' && item.dueDate && new Date(item.dueDate) < new Date();
    }).length;
    
    const totalCost = maintenanceRecords.reduce((sum: number, item: any) => sum + (Number(item.totalCost) || 0), 0);
    const averageCost = totalMaintenance > 0 ? totalCost / totalMaintenance : 0;

    // Group by type
    const maintenanceByType: Record<string, number> = {};
    for (const item of maintenanceRecords) {
      const type = item.type;
      maintenanceByType[type] = (maintenanceByType[type] || 0) + 1;
    }

    // Group by priority
    const maintenanceByPriority: Record<string, number> = {};
    for (const item of maintenanceRecords) {
      const priority = item.priority;
      maintenanceByPriority[priority] = (maintenanceByPriority[priority] || 0) + 1;
    }

    // Group by equipment
    const maintenanceByEquipment: Record<string, { count: number; cost: number }> = {};
    for (const item of maintenanceRecords) {
      const equipmentName = item.equipmentName || 'Unknown';
      if (!maintenanceByEquipment[equipmentName]) {
        maintenanceByEquipment[equipmentName] = { count: 0, cost: 0 };
      }
      maintenanceByEquipment[equipmentName].count += 1;
      maintenanceByEquipment[equipmentName].cost += Number(item.totalCost) || 0;
    }

    // Get top equipment by maintenance count
    const topEquipment = Object.entries(maintenanceByEquipment)
      .map(([name, stats]) => ({ name, count: stats.count, cost: stats.cost }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate efficiency (completion rate vs overdue)
    const efficiencyRate = totalMaintenance > 0 
      ? Math.round((completedMaintenance / totalMaintenance) * 100) 
      : 0;

    // Calculate average completion time for completed tasks
    const completedTasks = maintenanceRecords.filter(item => 
      item.status === 'Completed' && 
      item.scheduledDate && 
      item.completedDate
    );
    
    let averageCompletionTime = 0;
    if (completedTasks.length > 0) {
      const totalDays = completedTasks.reduce((sum: number, item: any) => {
        const start = new Date(item.scheduledDate);
        const end = new Date(item.completedDate!);
        const diffTime = end.getTime() - start.getTime();
        return sum + Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }, 0);
      averageCompletionTime = Math.round(totalDays / completedTasks.length);
    }

    // Get upcoming next maintenance dates
    const nextMaintenanceSchedule = maintenanceRecords
      .filter(item => item.nextMaintenance && item.status === 'Completed')
      .map(item => ({
        equipmentName: item.equipmentName || 'Unknown',
        nextMaintenance: item.nextMaintenance!
      }))
      .sort((a, b) => new Date(a.nextMaintenance).getTime() - new Date(b.nextMaintenance).getTime())
      .slice(0, 10);

    return {
      data: {
        maintenanceRecords,
        maintenanceByType,
        maintenanceByPriority,
        maintenanceByEquipment,
        topEquipment,
        nextMaintenanceSchedule,
        timeline: await getMaintenanceTimeline(start, end)
      },
      summary: {
        totalMaintenanceTasks: totalMaintenance,
        completedMaintenance,
        overdueMaintenance,
        averageMaintenanceCost: Math.round(averageCost * 100) / 100,
        totalMaintenanceCost: Math.round(totalCost * 100) / 100,
        maintenanceByType,
        maintenanceByPriority,
        topEquipment,
        maintenanceEfficiency: efficiencyRate,
        averageCompletionTime,
        nextMaintenanceSchedule
      }
    };
  } catch (error) {
    console.error('Error generating maintenance analytics report:', error);
    throw error;
  }
}

// Maintenance Cost Analysis Report
async function generateMaintenanceCostAnalysisReport(start: Date, end: Date, filters?: any) {
  try {
    const query: any = {
      createdAt: { $gte: start, $lte: end },
      status: 'Completed'
    };

    // Apply filters
    if (filters?.maintenanceType) query.type = filters.maintenanceType;
    if (filters?.category) query.category = filters.category;

    const maintenanceRecords = await Maintenance.find(query)
      .populate('equipmentId', 'name itemId category cost')
      .lean();

    // Calculate cost statistics
    const totalCost = maintenanceRecords.reduce((sum: number, item: any) => 
      sum + (Number(item.totalCost) || 0), 0);
    
    // Cost by maintenance type
    const costByType: Record<string, { count: number; totalCost: number; averageCost: number }> = {};
    for (const item of maintenanceRecords) {
      const type = item.type;
      if (!costByType[type]) {
        costByType[type] = { count: 0, totalCost: 0, averageCost: 0 };
      }
      const itemCost = Number(item.totalCost) || 0;
      costByType[type].count += 1;
      costByType[type].totalCost += itemCost;
      costByType[type].averageCost = costByType[type].count > 0 ? 
        costByType[type].totalCost / costByType[type].count : 0;
    }

    // Cost by equipment category
    const costByCategory: Record<string, { count: number; totalCost: number; averageCost: number }> = {};
    for (const item of maintenanceRecords) {
      const category = item.category;
      if (!costByCategory[category]) {
        costByCategory[category] = { count: 0, totalCost: 0, averageCost: 0 };
      }
      const itemCost = Number(item.totalCost) || 0;
      costByCategory[category].count += 1;
      costByCategory[category].totalCost += itemCost;
      costByCategory[category].averageCost = costByCategory[category].count > 0 ? 
        costByCategory[category].totalCost / costByCategory[category].count : 0;
    }

    // Most expensive maintenance tasks
    const mostExpensiveTasks = maintenanceRecords
      .filter(item => (Number(item.totalCost) || 0) > 0)
      .sort((a: any, b: any) => 
        (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0))
      .slice(0, 10)
      .map(item => ({
        equipmentName: item.equipmentName || 'Unknown',
        type: item.type,
        totalCost: Number(item.totalCost) || 0,
        completedDate: item.completedDate
      }));

    const averageCostPerTask = maintenanceRecords.length > 0 ? 
      Math.round((totalCost / maintenanceRecords.length) * 100) / 100 : 0;

    const highestCostTask = mostExpensiveTasks.length > 0 ? mostExpensiveTasks[0].totalCost : 0;

    return {
      data: {
        maintenanceRecords,
        costByType,
        costByCategory,
        mostExpensiveTasks,
        summaryStats: {
          totalMaintenanceTasks: maintenanceRecords.length,
          totalMaintenanceCost: Math.round(totalCost * 100) / 100,
          averageCostPerTask,
          highestCostTask
        }
      },
      summary: {
        totalMaintenanceTasks: maintenanceRecords.length,
        totalMaintenanceCost: Math.round(totalCost * 100) / 100,
        averageCostPerTask,
        costByType,
        costByCategory,
        mostExpensiveEquipment: mostExpensiveTasks.slice(0, 5),
        highestMaintenanceCost: highestCostTask
      }
    };
  } catch (error) {
    console.error('Error generating maintenance cost analysis report:', error);
    throw error;
  }
}

// Borrowing Trends Report
async function generateBorrowingTrendsReport(start: Date, end: Date, filters?: any) {
  try {
    const query: any = {
      requestedDate: { $gte: start, $lte: end }
    };

    // Apply filters
    if (filters?.borrowerType) query.borrowerType = filters.borrowerType;
    if (filters?.borrowingStatus) query.status = filters.borrowingStatus;

    const borrowings = await Borrowing.find(query)
      .populate('equipmentId', 'name itemId category cost')
      .sort({ requestedDate: -1 })
      .lean();

    // Calculate statistics
    const totalBorrowings = borrowings.length;
    const activeBorrowings = borrowings.filter(b => ['approved', 'released'].includes(b.status)).length;
    const pendingBorrowings = borrowings.filter(b => b.status === 'pending').length;
    const completedBorrowings = borrowings.filter(b => b.status === 'returned').length;
    const overdueBorrowings = borrowings.filter(b => b.status === 'overdue').length;

    // Group by borrower type
    const borrowingByUserType: Record<string, number> = {};
    for (const borrowing of borrowings) {
      const userType = borrowing.borrowerType;
      borrowingByUserType[userType] = (borrowingByUserType[userType] || 0) + 1;
    }

    // Group by month
    const borrowingTrends: Record<string, number> = {};
    for (const borrowing of borrowings) {
      const month = new Date(borrowing.requestedDate).toLocaleString('default', { month: 'short', year: 'numeric' });
      borrowingTrends[month] = (borrowingTrends[month] || 0) + 1;
    }

    // Most borrowed items
    const itemCounts: Record<string, number> = {};
    for (const borrowing of borrowings) {
      if (borrowing.equipmentId && typeof borrowing.equipmentId === 'object') {
        const equipmentName = (borrowing.equipmentId as any).name || 'Unknown';
        itemCounts[equipmentName] = (itemCounts[equipmentName] || 0) + 1;
      }
    }

    const mostBorrowedItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average borrowing duration for completed borrowings
    const completedWithDates = borrowings.filter(b => 
      b.status === 'returned' && 
      b.requestedDate && 
      b.actualReturnDate
    );
    
    let averageBorrowingDuration = 0;
    if (completedWithDates.length > 0) {
      const totalDays = completedWithDates.reduce((sum: number, borrowing: any) => {
        const start = new Date(borrowing.requestedDate);
        const end = new Date(borrowing.actualReturnDate);
        const diffTime = end.getTime() - start.getTime();
        return sum + Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }, 0);
      averageBorrowingDuration = Math.round(totalDays / completedWithDates.length);
    }

    const borrowingCompletionRate = totalBorrowings > 0 ? 
      Math.round((completedBorrowings / totalBorrowings) * 100) : 0;

    // Calculate total value of borrowed equipment
    const totalBorrowingValue = borrowings.reduce((sum: number, borrowing: any) => {
      if (borrowing.equipmentId && typeof borrowing.equipmentId === 'object') {
        const equipment = borrowing.equipmentId as any;
        const cost = equipment.cost || 0;
        const quantity = borrowing.quantity || 1;
        return sum + (cost * quantity);
      }
      return sum;
    }, 0);

    return {
      data: {
        borrowings,
        borrowingByUserType,
        borrowingTrends,
        mostBorrowedItems,
        statistics: {
          totalBorrowings,
          activeBorrowings,
          pendingBorrowings,
          completedBorrowings,
          overdueBorrowings,
          borrowingCompletionRate,
          averageBorrowingDuration
        }
      },
      summary: {
        totalBorrowings,
        activeBorrowings,
        pendingBorrowings,
        completedBorrowings,
        overdueBorrowings,
        borrowingCompletionRate,
        averageBorrowingDuration,
        mostBorrowedItems,
        borrowingByUserType,
        borrowingTrends: Object.entries(borrowingTrends).map(([period, count]) => ({ period, count })),
        totalBorrowingValue: Math.round(totalBorrowingValue * 100) / 100
      }
    };
  } catch (error) {
    console.error('Error generating borrowing trends report:', error);
    throw error;
  }
}

// Borrowing Analytics Report
async function generateBorrowingAnalyticsReport(start: Date, end: Date, filters?: any) {
  try {
    // Get all borrowings in the date range
    const borrowings = await Borrowing.find({
      requestedDate: { $gte: start, $lte: end }
    })
      .populate('equipmentId', 'name itemId category cost')
      .lean();

    // Calculate various analytics
    const analytics = {
      // Status distribution
      statusDistribution: borrowings.reduce((acc: Record<string, number>, borrowing) => {
        acc[borrowing.status] = (acc[borrowing.status] || 0) + 1;
        return acc;
      }, {}),

      // Borrower type distribution
      borrowerTypeDistribution: borrowings.reduce((acc: Record<string, number>, borrowing) => {
        acc[borrowing.borrowerType] = (acc[borrowing.borrowerType] || 0) + 1;
        return acc;
      }, {}),

      // Monthly trends
      monthlyTrends: borrowings.reduce((acc: Record<string, number>, borrowing) => {
        const month = new Date(borrowing.requestedDate).toLocaleString('default', { month: 'short', year: '2-digit' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {}),

      // Most popular equipment
      topEquipment: Object.entries(
        borrowings.reduce((acc: Record<string, number>, borrowing) => {
          if (borrowing.equipmentId && typeof borrowing.equipmentId === 'object') {
            const equipmentName = (borrowing.equipmentId as any).name || 'Unknown';
            acc[equipmentName] = (acc[equipmentName] || 0) + 1;
          }
          return acc;
        }, {})
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),

      // Average borrowing duration
      averageDuration: (() => {
        const completed = borrowings.filter(b => 
          b.status === 'returned' && 
          b.requestedDate && 
          b.actualReturnDate
        );
        
        if (completed.length === 0) return 0;
        
        const totalDays = completed.reduce((sum, borrowing) => {
          const start = new Date(borrowing.requestedDate);
          const end = new Date(borrowing.actualReturnDate!);
          return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        
        return Math.round(totalDays / completed.length);
      })(),

      // Completion rate
      completionRate: borrowings.length > 0 
        ? Math.round((borrowings.filter(b => b.status === 'returned').length / borrowings.length) * 100)
        : 0,

      // Overdue rate
      overdueRate: borrowings.length > 0
        ? Math.round((borrowings.filter(b => b.status === 'overdue').length / borrowings.length) * 100)
        : 0,

      // Peak borrowing hours
      peakHours: Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour}:00`,
        count: borrowings.filter(b => {
          const borrowingHour = new Date(b.requestedDate).getHours();
          return borrowingHour === hour;
        }).length
      }))
    };

    return {
      data: {
        borrowings,
        analytics
      },
      summary: {
        totalBorrowings: borrowings.length,
        activeBorrowings: borrowings.filter(b => ['approved', 'released'].includes(b.status)).length,
        pendingBorrowings: borrowings.filter(b => b.status === 'pending').length,
        completedBorrowings: borrowings.filter(b => b.status === 'returned').length,
        overdueBorrowings: borrowings.filter(b => b.status === 'overdue').length,
        borrowingCompletionRate: analytics.completionRate,
        averageBorrowingDuration: analytics.averageDuration,
        borrowingByUserType: analytics.borrowerTypeDistribution,
        borrowingTrends: Object.entries(analytics.monthlyTrends).map(([period, count]) => ({ period, count })),
        mostBorrowedItems: analytics.topEquipment.slice(0, 5)
      }
    };
  } catch (error) {
    console.error('Error generating borrowing analytics report:', error);
    throw error;
  }
}

// Damage Reports
async function generateDamageReports(start: Date, end: Date, filters?: any) {
  try {
    const query: any = {
      condition: 'Needs Repair',
      updatedAt: { $gte: start, $lte: end }
    };

    if (filters?.category) query.category = filters.category;

    const damagedItems = await Inventory.find(query).lean();

    const damageStats: Record<string, number> = {};
    for (const item of damagedItems) {
      const category = item.category;
      damageStats[category] = (damageStats[category] || 0) + 1;
    }

    const repairCost = damagedItems.reduce((sum: number, item: any) => {
      const cost = Number(item.cost) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + (cost * quantity * 0.15); // Assume 15% of cost for repair
    }, 0);

    const replacementValue = damagedItems.reduce((sum: number, item: any) => {
      const cost = Number(item.cost) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + (cost * quantity);
    }, 0);

    // Find most affected category
    let mostAffectedCategory = 'None';
    let maxCount = 0;
    for (const [category, count] of Object.entries(damageStats)) {
      if (count > maxCount) {
        maxCount = count;
        mostAffectedCategory = category;
      }
    }

    const totalInventoryCount = await Inventory.countDocuments();
    const damageRate = damagedItems.length > 0 ? 
      Math.round((damagedItems.length / totalInventoryCount) * 100) : 0;

    return {
      data: {
        damagedItems,
        damageStats,
        damageTrends: await getDamageTrends(start, end)
      },
      summary: {
        totalDamaged: damagedItems.length,
        repairCost: Math.round(repairCost * 100) / 100,
        replacementValue: Math.round(replacementValue * 100) / 100,
        mostAffectedCategory,
        damageRate
      }
    };
  } catch (error) {
    console.error('Error generating damage reports:', error);
    throw error;
  }
}

// Category Distribution Report
async function generateCategoryDistribution(start: Date, end: Date, filters?: any) {
  try {
    const query: any = {
      createdAt: { $gte: start, $lte: end }
    };

    const inventory = await Inventory.find(query).lean();

    const categoryDistribution: Record<string, { count: number; quantity: number; value: number; available: number }> = {};
    
    for (const item of inventory) {
      const category = item.category;
      if (!categoryDistribution[category]) {
        categoryDistribution[category] = {
          count: 0,
          quantity: 0,
          value: 0,
          available: 0
        };
      }
      
      const quantity = Number(item.quantity) || 0;
      const available = Number(item.availableQuantity) || 0;
      const cost = Number(item.cost) || 0;
      
      categoryDistribution[category].count += 1;
      categoryDistribution[category].quantity += quantity;
      categoryDistribution[category].value += cost * quantity;
      categoryDistribution[category].available += available;
    }

    const totalValue = Object.values(categoryDistribution).reduce(
      (sum: number, category) => sum + category.value, 0
    );
    
    const totalItems = inventory.reduce(
      (sum: number, item) => sum + (Number(item.quantity) || 0), 0
    );

    // Find largest and most available categories
    let largestCategory = 'None';
    let largestValue = 0;
    let mostAvailableCategory = 'None';
    let maxAvailable = 0;
    
    for (const [category, stats] of Object.entries(categoryDistribution)) {
      if (stats.value > largestValue) {
        largestValue = stats.value;
        largestCategory = category;
      }
      if (stats.available > maxAvailable) {
        maxAvailable = stats.available;
        mostAvailableCategory = category;
      }
    }

    const averageItemsPerCategory = Object.keys(categoryDistribution).length > 0 ? 
      Math.round(totalItems / Object.keys(categoryDistribution).length) : 0;

    return {
      data: {
        categoryDistribution,
        inventoryCount: inventory.length,
        valueByCategory: Object.fromEntries(
          Object.entries(categoryDistribution).map(([category, stats]) => [category, stats.value])
        )
      },
      summary: {
        totalCategories: Object.keys(categoryDistribution).length,
        totalItems,
        totalValue: Math.round(totalValue * 100) / 100,
        largestCategory,
        mostAvailableCategory,
        averageItemsPerCategory
      }
    };
  } catch (error) {
    console.error('Error generating category distribution report:', error);
    throw error;
  }
}

// User Activity Report
async function generateUserActivity(start: Date, end: Date, filters?: any) {
  try {
    // Get users who logged in during the period
    const users = await User.find({
      lastLogin: { $gte: start, $lte: end }
    }).lean();

    // Get borrowings during the period
    const borrowings = await Borrowing.find({
      requestedDate: { $gte: start, $lte: end }
    }).lean();

    // Group borrowings by user
    const userActivity: Record<string, { borrowings: number; lastActivity: Date }> = {};
    
    for (const borrowing of borrowings) {
      const userId = borrowing.borrowerId;
      if (!userActivity[userId]) {
        userActivity[userId] = {
          borrowings: 0,
          lastActivity: borrowing.requestedDate
        };
      }
      userActivity[userId].borrowings += 1;
      if (borrowing.requestedDate > userActivity[userId].lastActivity) {
        userActivity[userId].lastActivity = borrowing.requestedDate;
      }
    }

    // Get top active users
    const topActiveUsers = Object.entries(userActivity)
      .map(([userId, activity]) => ({
        userId,
        borrowings: activity.borrowings,
        lastActivity: activity.lastActivity
      }))
      .sort((a, b) => b.borrowings - a.borrowings)
      .slice(0, 10);

    return {
      data: {
        activeUsers: users,
        userActivity,
        topActiveUsers,
        period: { start, end }
      },
      summary: {
        activeUsers: users.length,
        totalActions: borrowings.length,
        averageActions: users.length > 0 ? Math.round(borrowings.length / users.length) : 0,
        topActiveUsers: topActiveUsers.slice(0, 5)
      }
    };
  } catch (error) {
    console.error('Error generating user activity report:', error);
    throw error;
  }
}