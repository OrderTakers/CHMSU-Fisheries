import { NextResponse } from "next/server";
import { validateAuth } from "@/action/auth";
import Inventory, { IInventory } from "@/models/Inventory";
import Borrowing from "@/models/Borrowing";
import mongoose from "mongoose";

export async function GET() {
  try {
    console.log("🔍 GET /api/student/available-equipment - Starting request");
    
    const authResult = await validateAuth();
    
    if (!authResult.isValid || !authResult.user) {
      console.log("❌ Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error("❌ MongoDB URI not configured");
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      );
    }

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB successfully");
      } catch (dbError) {
        console.error("❌ MongoDB connection error:", dbError);
        return NextResponse.json(
          { error: "Database connection failed" },
          { status: 500 }
        );
      }
    }

    console.log("🔍 Fetching ALL equipment from database...");
    
    // Get ALL equipment that is active, not disposed, and in Equipment category
    const allEquipment = await Inventory.find({
      category: "Equipment",
      status: "Active",
      isDisposed: false
    })
    .select(
      'itemId name description specifications condition category ' +
      'images quantity availableQuantity status ' +
      'createdAt updatedAt'
    )
    .lean()
    .exec();

    console.log(`✅ Found ${allEquipment.length} equipment items in database`);

    if (allEquipment.length === 0) {
      console.log("ℹ️ No equipment found in database");
      return NextResponse.json({
        success: true,
        equipment: [],
        message: "No equipment found in database"
      });
    }

    // Log all equipment names for debugging
    console.log("📋 All equipment found:", allEquipment.map(eq => ({
      name: eq.name,
      itemId: eq.itemId,
      category: eq.category,
      condition: eq.condition,
      quantity: eq.quantity,
      availableQuantity: eq.availableQuantity
    })));

    // Get currently borrowed equipment to calculate availability
    console.log("🔍 Fetching active borrowings...");
    const activeBorrowings = await Borrowing.find({
      status: { 
        $in: [
          'approved', 
          'released', 
          'return_requested', 
          'return_approved'
        ] 
      }
    })
    .select('equipmentId quantity')
    .lean()
    .exec();

    console.log(`✅ Found ${activeBorrowings.length} active borrowings`);

    // Calculate total borrowed quantity per equipment
    const borrowedQuantities: { [key: string]: number } = {};
    
    activeBorrowings.forEach(borrowing => {
      const equipmentId = borrowing.equipmentId.toString();
      borrowedQuantities[equipmentId] = (borrowedQuantities[equipmentId] || 0) + (borrowing.quantity || 1);
    });

    console.log("📊 Borrowed quantities:", borrowedQuantities);

    // Process equipment with availability information
    const equipmentWithAvailability = allEquipment.map(equipment => {
      const equipmentId = equipment._id.toString();
      const borrowedQty = borrowedQuantities[equipmentId] || 0;
      const availableQty = equipment.availableQuantity || equipment.quantity || 0;
      const actuallyAvailable = Math.max(0, availableQty - borrowedQty);
      
      console.log(`📦 Equipment ${equipment.itemId}: Total=${equipment.quantity}, Available=${availableQty}, Borrowed=${borrowedQty}, ActuallyAvailable=${actuallyAvailable}`);

      return {
        _id: equipmentId,
        itemId: equipment.itemId,
        name: equipment.name,
        description: equipment.description || "No description available",
        specifications: equipment.specifications || [],
        condition: equipment.condition,
        category: equipment.category,
        images: equipment.images || [],
        quantity: equipment.quantity,
        availableQuantity: equipment.availableQuantity,
        actuallyAvailable: actuallyAvailable,
        available: actuallyAvailable > 0 && equipment.condition === "Good",
        status: equipment.status,
        createdAt: equipment.createdAt,
        updatedAt: equipment.updatedAt
      };
    });

    // Filter to only show available equipment (actually available and in good condition)
    const availableEquipment = equipmentWithAvailability.filter(
      eq => eq.available && eq.condition === "Good"
    );

    console.log(`✅ Successfully processed ${availableEquipment.length} available equipment items out of ${allEquipment.length} total`);
    console.log("📋 Available equipment:", availableEquipment.map(eq => ({
      name: eq.name,
      itemId: eq.itemId,
      actuallyAvailable: eq.actuallyAvailable,
      condition: eq.condition
    })));

    return NextResponse.json({
      success: true,
      equipment: availableEquipment,
      totalCount: availableEquipment.length,
      message: `Found ${availableEquipment.length} available equipment items`
    });

  } catch (error) {
    console.error("❌ Error in GET /api/student/available-equipment:", error);
    
    // Provide more specific error messages
    if (error instanceof mongoose.Error) {
      return NextResponse.json(
        { error: "Database error occurred" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}