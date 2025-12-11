import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Inventory from '@/models/Inventory';
import Room from '@/models/Room'; // Import Room model

// Define the category enum from your Inventory model
const CATEGORY_ENUM = [
  "Equipment",
  "Consumables", 
  "Materials",
  "Instruments",
  "Furniture",
  "Electronics",
  "Liquids",
  "Safety Gear",
  "Lab Supplies",
  "Tools"
] as const;

type Category = typeof CATEGORY_ENUM[number];

// Define equipment interface with room details
interface Equipment {
  _id: string;
  itemId: string;
  name: string;
  description?: string;
  specifications: Array<{
    name: string;
    value: string;
    unit?: string;
  }>;
  condition: string;
  category: Category;
  cost: number;
  yearPurchased: string;
  maintenanceNeeds: string;
  calibration: string;
  roomAssigned: string;
  roomDetails?: {
    name: string;
    location?: string;
    metadata?: {
      roomNumber?: string;
      building?: string;
      floor?: string;
      capacity?: number;
    };
  };
  calibrator: string;
  images: string[];
  maintenanceHistory: any[];
  calibrationHistory: any[];
  createdAt: string;
  updatedAt: string;
  canBeBorrowed: boolean;
  quantity: number;
  availableQuantity: number;
  status: string;
  maintenanceQuantity: number;
  calibrationQuantity: number;
  disposalQuantity: number;
  borrowedQuantity: number;
  borrowingAvailableQuantity: number;
}

// Helper function to get all categories with borrowable status
interface CategoryWithStatus {
  name: Category;
  hasBorrowableItems: boolean;
  itemCount: number;
  borrowableCount: number;
}

// GET endpoint to fetch equipment and categories
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const borrowable = searchParams.get('borrowable') === 'true';
    const getAll = searchParams.get('getAll') === 'true';
    const debug = searchParams.get('debug') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1000;
    
    console.log('📊 API Parameters:', {
      search,
      category,
      condition,
      borrowable,
      getAll,
      debug,
      limit
    });
    
    // If requesting ALL data (for debugging/Compass)
    if (getAll) {
      return await handleGetAllData();
    }
    
    // Build query - Start with basic query
    let query: any = {};
    
    // Filter by category if specified (and not "All")
    if (category && category !== 'All') {
      query.category = category;
    }
    
    // Filter by condition if specified (and not "All")
    if (condition && condition !== 'All') {
      query.condition = condition;
    } else if (!condition) {
      // Only exclude certain conditions by default
      query.condition = { $nin: ['Out of Stock'] };
    }
    
    // Search in name and description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { itemId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Don't include disposed items
    query.status = { $nin: ['Disposed'] };
    
    console.log('🔍 Query being used:', JSON.stringify(query, null, 2));
    
    // Get ALL equipment that matches the query
    const allEquipment = await Inventory.find(query)
      .select('-__v')
      .limit(limit)
      .lean();
    
    console.log(`📦 Found ${allEquipment.length} items matching initial query`);
    
    // Get all room names for roomAssigned values
    const roomNames = [...new Set(allEquipment.map(item => item.roomAssigned).filter(Boolean))];
    console.log(`🏢 Found ${roomNames.length} unique room assignments:`, roomNames);
    
    // Fetch room details for all assigned rooms
    let roomDetailsMap = new Map<string, any>();
    if (roomNames.length > 0) {
      try {
        const rooms = await Room.find({
          name: { $in: roomNames }
        }).lean();
        
        rooms.forEach(room => {
          roomDetailsMap.set(room.name, {
            name: room.name,
            location: room.location,
            metadata: room.metadata
          });
        });
        
        console.log(`✅ Found ${rooms.length} room records in database`);
      } catch (error) {
        console.warn('⚠️ Could not fetch room details:', error);
      }
    }
    
    if (debug) {
      console.log('🔍 First 10 items:', allEquipment.slice(0, 10).map(item => ({
        _id: item._id.toString().substring(0, 8),
        itemId: item.itemId,
        name: item.name,
        category: item.category,
        canBeBorrowed: item.canBeBorrowed,
        status: item.status,
        condition: item.condition,
        maintenanceNeeds: item.maintenanceNeeds,
        quantity: item.quantity,
        roomAssigned: item.roomAssigned,
        roomDetails: roomDetailsMap.get(item.roomAssigned)
      })));
    }
    
    // Transform the data and calculate borrowing availability
    const transformedEquipment: Equipment[] = allEquipment.map((item: any) => {
      // Calculate real available quantity considering all impacts
      const maintenanceImpact = item.maintenanceQuantity || 0;
      const calibrationImpact = item.calibrationQuantity || 0;
      const disposalImpact = item.disposalQuantity || 0;
      const borrowedImpact = item.borrowedQuantity || 0;
      
      const realAvailableQuantity = Math.max(0, item.quantity - maintenanceImpact - calibrationImpact - disposalImpact - borrowedImpact);
      
      // Calculate borrowing available quantity
      let borrowingAvailableQuantity = 0;
      
      // Check if item can be borrowed
      if (item.canBeBorrowed !== false) {
        // Check various conditions
        const isGoodCondition = ['Excellent', 'Good', 'Fair', 'Poor'].includes(item.condition);
        const isNotUnderMaintenance = item.condition !== 'Under Maintenance' && 
                                     item.maintenanceNeeds !== 'Yes' &&
                                     item.status !== 'Under Maintenance';
        const isActive = item.status === 'Active' || item.status === 'Available';
        
        if (isGoodCondition && isNotUnderMaintenance && isActive && realAvailableQuantity > 0) {
          borrowingAvailableQuantity = realAvailableQuantity;
        }
      }
      
      // Get room details
      const roomDetails = item.roomAssigned ? roomDetailsMap.get(item.roomAssigned) : undefined;
      
      return {
        _id: item._id.toString(),
        itemId: item.itemId,
        name: item.name,
        description: item.description || '',
        specifications: item.specifications || [],
        condition: item.condition,
        category: item.category as Category,
        cost: item.cost,
        yearPurchased: item.yearPurchased || new Date().getFullYear().toString(),
        maintenanceNeeds: item.maintenanceNeeds,
        calibration: item.calibration,
        roomAssigned: item.roomAssigned || '',
        roomDetails: roomDetails || undefined,
        calibrator: item.calibrator,
        images: item.images || [],
        maintenanceHistory: item.maintenanceHistory || [],
        calibrationHistory: item.calibrationHistory || [],
        createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
        canBeBorrowed: item.canBeBorrowed !== false, // Default to true if not set
        quantity: item.quantity || 1,
        availableQuantity: item.availableQuantity || 0,
        borrowingAvailableQuantity: borrowingAvailableQuantity,
        status: item.status || 'Active',
        maintenanceQuantity: item.maintenanceQuantity || 0,
        calibrationQuantity: item.calibrationQuantity || 0,
        disposalQuantity: item.disposalQuantity || 0,
        borrowedQuantity: item.borrowedQuantity || 0
      };
    });
    
    // Calculate statistics for debug
    const totalBorrowingAvailable = transformedEquipment.reduce((sum, item) => sum + item.borrowingAvailableQuantity, 0);
    const itemsWithZeroAvailability = transformedEquipment.filter(item => item.borrowingAvailableQuantity === 0).length;
    const itemsWithBorrowingTrue = transformedEquipment.filter(item => item.canBeBorrowed).length;
    
    console.log(`📊 Availability stats:`, {
      totalItems: transformedEquipment.length,
      itemsWithBorrowingTrue,
      itemsWithBorrowingFalse: transformedEquipment.length - itemsWithBorrowingTrue,
      totalBorrowingAvailable,
      itemsWithZeroAvailability,
      itemsWithPositiveAvailability: transformedEquipment.length - itemsWithZeroAvailability
    });
    
    // If borrowable filter is true, only return items with borrowingAvailableQuantity > 0
    const filteredEquipment = borrowable 
      ? transformedEquipment.filter(item => item.borrowingAvailableQuantity > 0)
      : transformedEquipment;
    
    // Get categories with status information
    const categoriesWithStatus = await getCategoriesWithStatus();
    
    console.log(`✅ Returning ${filteredEquipment.length} equipment items`);
    
    // Debug: Show items that are being filtered out if borrowable=true
    if (borrowable && debug) {
      const filteredOut = transformedEquipment.filter(item => item.borrowingAvailableQuantity === 0);
      console.log(`🚫 Filtered out ${filteredOut.length} items (no borrowing availability):`, 
        filteredOut.slice(0, 5).map(item => ({
          name: item.name,
          canBeBorrowed: item.canBeBorrowed,
          borrowingAvailableQuantity: item.borrowingAvailableQuantity,
          condition: item.condition,
          maintenanceNeeds: item.maintenanceNeeds,
          status: item.status
        }))
      );
    }
    
    return NextResponse.json({
      success: true,
      data: filteredEquipment,
      categories: categoriesWithStatus,
      count: filteredEquipment.length,
      totalInDatabase: allEquipment.length,
      debug: debug ? {
        totalItems: allEquipment.length,
        itemsWithBorrowingTrue,
        itemsWithBorrowingFalse: allEquipment.length - itemsWithBorrowingTrue,
        queryResultCount: allEquipment.length,
        transformedCount: transformedEquipment.length,
        filteredCount: filteredEquipment.length,
        borrowingAvailabilityStats: {
          totalBorrowingAvailable,
          itemsWithZeroAvailability,
          itemsWithPositiveAvailability: transformedEquipment.length - itemsWithZeroAvailability
        }
      } : undefined,
      message: `Found ${filteredEquipment.length} equipment items (${allEquipment.length} total matching query)`
    });
    
  } catch (error: any) {
    console.error('💥 Error fetching equipment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch equipment data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to get ALL data from inventory (for debugging)
async function handleGetAllData() {
  try {
    console.log('📊 Fetching ALL inventory data...');
    
    const allInventory = await Inventory.find({})
      .select('-__v')
      .lean();
    
    console.log(`📊 Found ${allInventory.length} total items in database`);
    
    // Calculate statistics
    const stats = {
      total: allInventory.length,
      byCategory: allInventory.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: allInventory.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byCondition: allInventory.reduce((acc, item) => {
        acc[item.condition] = (acc[item.condition] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byCanBeBorrowed: {
        true: allInventory.filter(item => item.canBeBorrowed !== false).length,
        false: allInventory.filter(item => item.canBeBorrowed === false).length,
        notSet: allInventory.filter(item => item.canBeBorrowed === undefined).length
      },
      byMaintenanceNeeds: allInventory.reduce((acc, item) => {
        acc[item.maintenanceNeeds] = (acc[item.maintenanceNeeds] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byRoomAssigned: allInventory.reduce((acc, item) => {
        const room = item.roomAssigned || 'Not Assigned';
        acc[room] = (acc[room] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    // Return raw data for debugging
    return NextResponse.json({
      success: true,
      data: allInventory,
      count: allInventory.length,
      stats: stats,
      message: `Found ${allInventory.length} total items in inventory database`
    });
  } catch (error: any) {
    console.error('💥 Error fetching all data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch all data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Helper function to get all categories with borrowable status
async function getCategoriesWithStatus(): Promise<CategoryWithStatus[]> {
  try {
    const categories: CategoryWithStatus[] = [];
    
    // Get all inventory to calculate categories
    const allInventory = await Inventory.find({}).lean();
    
    // Group by category
    const categoryMap = new Map<string, CategoryWithStatus>();
    
    for (const item of allInventory) {
      const cat = item.category as Category;
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, {
          name: cat,
          hasBorrowableItems: false,
          itemCount: 0,
          borrowableCount: 0
        });
      }
      
      const categoryData = categoryMap.get(cat)!;
      categoryData.itemCount++;
      
      // Check if item is borrowable
      let isBorrowable = false;
      if (item.canBeBorrowed !== false) {
        // Calculate real available quantity
        const maintenanceImpact = item.maintenanceQuantity || 0;
        const calibrationImpact = item.calibrationQuantity || 0;
        const disposalImpact = item.disposalQuantity || 0;
        const borrowedImpact = item.borrowedQuantity || 0;
        
        const realAvailableQuantity = Math.max(0, item.quantity - maintenanceImpact - calibrationImpact - disposalImpact - borrowedImpact);
        
        // Check conditions for borrowing
        const isGoodCondition = ['Excellent', 'Good', 'Fair', 'Poor'].includes(item.condition);
        const isNotUnderMaintenance = item.condition !== 'Under Maintenance' && 
                                     item.maintenanceNeeds !== 'Yes' &&
                                     item.status !== 'Under Maintenance';
        const isActive = item.status === 'Active' || item.status === 'Available';
        
        if (isGoodCondition && isNotUnderMaintenance && isActive && realAvailableQuantity > 0) {
          isBorrowable = true;
          categoryData.borrowableCount++;
        }
      }
      
      if (isBorrowable && !categoryData.hasBorrowableItems) {
        categoryData.hasBorrowableItems = true;
      }
    }
    
    // Add all enum categories, even if they don't exist in database yet
    for (const category of CATEGORY_ENUM) {
      const existingData = categoryMap.get(category);
      
      if (existingData) {
        categories.push(existingData);
      } else {
        categories.push({
          name: category as Category,
          hasBorrowableItems: false,
          itemCount: 0,
          borrowableCount: 0
        });
      }
    }
    
    return categories;
  } catch (error) {
    console.error('Error getting categories with status:', error);
    
    // Fallback: return all enum categories with default values
    return CATEGORY_ENUM.map(category => ({
      name: category as Category,
      hasBorrowableItems: false,
      itemCount: 0,
      borrowableCount: 0
    }));
  }
}

// POST endpoint for additional actions
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { equipmentId, action } = body;
    
    if (!equipmentId) {
      return NextResponse.json(
        { success: false, error: 'Equipment ID is required' },
        { status: 400 }
      );
    }
    
    // Find the equipment
    const equipment = await Inventory.findOne({ 
      $or: [
        { _id: equipmentId },
        { itemId: equipmentId }
      ]
    });
    
    if (!equipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }
    
    // Handle different actions
    switch (action) {
      case 'checkAvailability':
        // Calculate borrowing availability
        const maintenanceImpact = equipment.maintenanceQuantity || 0;
        const calibrationImpact = equipment.calibrationQuantity || 0;
        const disposalImpact = equipment.disposalQuantity || 0;
        const borrowedImpact = equipment.borrowedQuantity || 0;
        
        const realAvailableQuantity = Math.max(0, equipment.quantity - maintenanceImpact - calibrationImpact - disposalImpact - borrowedImpact);
        
        let borrowingAvailableQuantity = 0;
        if (equipment.canBeBorrowed !== false) {
          const isGoodCondition = ['Excellent', 'Good', 'Fair', 'Poor'].includes(equipment.condition);
          const isNotUnderMaintenance = equipment.condition !== 'Under Maintenance' && 
                                       equipment.maintenanceNeeds !== 'Yes' &&
                                       equipment.status !== 'Under Maintenance';
          const isActive = equipment.status === 'Active' || equipment.status === 'Available';
          
          if (isGoodCondition && isNotUnderMaintenance && isActive) {
            borrowingAvailableQuantity = realAvailableQuantity;
          }
        }
        
        return NextResponse.json({
          success: true,
          data: {
            canBeBorrowed: equipment.canBeBorrowed !== false,
            borrowingAvailableQuantity,
            realAvailableQuantity,
            condition: equipment.condition,
            maintenanceNeeds: equipment.maintenanceNeeds,
            status: equipment.status,
            quantity: equipment.quantity,
            availableQuantity: equipment.availableQuantity,
            category: equipment.category,
            itemId: equipment.itemId,
            name: equipment.name
          }
        });
        
      case 'updateBorrowingStatus':
        const { canBeBorrowed } = body;
        
        if (typeof canBeBorrowed !== 'boolean') {
          return NextResponse.json(
            { success: false, error: 'canBeBorrowed must be a boolean' },
            { status: 400 }
          );
        }
        
        equipment.canBeBorrowed = canBeBorrowed;
        await equipment.save();
        
        return NextResponse.json({
          success: true,
          data: equipment,
          message: `Equipment borrowing status updated to ${canBeBorrowed ? 'allowed' : 'not allowed'}`
        });
        
      case 'getAll':
        // Return all data
        const allData = await Inventory.find({}).lean();
        return NextResponse.json({
          success: true,
          data: allData,
          count: allData.length
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error: any) {
    console.error('💥 Error in equipment API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}