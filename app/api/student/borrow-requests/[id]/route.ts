import { NextResponse } from "next/server";
import { validateAuth } from "@/action/auth";
import mongoose from "mongoose";

// Dynamically import models
async function getModels() {
  try {
    const { default: Borrowing } = await import('@/models/Borrowing');
    const { default: Inventory } = await import('@/models/Inventory');
    return { Borrowing, Inventory };
  } catch (error) {
    console.error("❌ Error importing models:", error);
    throw error;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log("🔍 GET /api/student/borrow-requests/[id] - Starting request");
    
    const authResult = await validateAuth();
    
    if (!authResult.isValid || !authResult.user) {
      console.log("❌ Unauthorized access attempt");
      return NextResponse.json(
        { 
          success: false,
          error: "Unauthorized - Please log in" 
        },
        { status: 401 }
      );
    }

    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error("❌ MongoDB URI not configured");
      return NextResponse.json(
        { 
          success: false,
          error: "Database configuration error" 
        },
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
          { 
            success: false,
            error: "Database connection failed" 
          },
          { status: 500 }
        );
      }
    }

    // Get models
    const { Borrowing, Inventory } = await getModels();

    const borrowingId = params.id;
    
    console.log("🔍 Fetching borrow request:", borrowingId);
    console.log("🔍 User ID:", authResult.user._id);
    console.log("🔍 User Email:", authResult.user.email);
    
    // Find the borrow request with multiple conditions
    let borrowRequest = null;
    
    // Try different queries
    const queries = [
      // Match by ID and borrowerId (string)
      { _id: borrowingId, borrowerId: authResult.user._id.toString() },
      // Match by ID and borrowerId (ObjectId)
      { _id: borrowingId, borrowerId: new mongoose.Types.ObjectId(authResult.user._id) },
      // Match by ID and email
      { _id: borrowingId, borrowerEmail: authResult.user.email }
    ];
    
    for (const query of queries) {
      try {
        borrowRequest = await Borrowing.findOne(query).lean();
        if (borrowRequest) {
          console.log(`✅ Found borrow request with query:`, query);
          break;
        }
      } catch (error) {
        console.log(`❌ Query failed:`, query, error);
      }
    }

    if (!borrowRequest) {
      console.log("❌ Borrow request not found or unauthorized");
      return NextResponse.json(
        { 
          success: false,
          error: "Borrow request not found" 
        },
        { status: 404 }
      );
    }

    console.log("✅ Found borrow request:", borrowRequest._id);

    // Manually fetch equipment data
    let equipmentData;
    if (borrowRequest.equipmentId) {
      try {
        const equipment = await Inventory.findById(borrowRequest.equipmentId)
          .select('name itemId description images roomAssigned condition')
          .lean();
        
        equipmentData = equipment || {
          _id: borrowRequest.equipmentId.toString(),
          name: 'Equipment',
          itemId: 'N/A',
          description: '',
          images: [],
          roomAssigned: 'Not specified',
          condition: 'Good'
        };
      } catch (equipmentError) {
        console.error("❌ Error fetching equipment:", equipmentError);
        equipmentData = {
          _id: borrowRequest.equipmentId.toString(),
          name: 'Equipment',
          itemId: 'N/A',
          description: '',
          images: [],
          roomAssigned: 'Not specified',
          condition: 'Good'
        };
      }
    } else {
      equipmentData = {
        _id: 'unknown',
        name: 'Equipment Not Found',
        itemId: 'N/A',
        description: '',
        images: [],
        roomAssigned: 'Not specified',
        condition: 'Good'
      };
    }
    
    // Format dates properly
    const formatDate = (date: any) => {
      if (!date) return null;
      try {
        if (typeof date === 'string') {
          return new Date(date).toISOString();
        }
        if (date instanceof Date) {
          return date.toISOString();
        }
        if (date.toISOString) {
          return date.toISOString();
        }
        return null;
      } catch (error) {
        console.error("❌ Error formatting date:", date, error);
        return null;
      }
    };
    
    // Format the response
    const formattedRequest = {
      _id: borrowRequest._id.toString(),
      equipmentId: equipmentData,
      borrowerName: borrowRequest.borrowerName || authResult.user?.firstName + ' ' + authResult.user?.lastName,
      borrowerEmail: borrowRequest.borrowerEmail || authResult.user?.email,
      purpose: borrowRequest.purpose || 'Not specified',
      quantity: borrowRequest.quantity || 1,
      description: borrowRequest.description || '',
      status: borrowRequest.status || 'pending',
      requestedDate: formatDate(borrowRequest.requestedDate) || new Date().toISOString(),
      intendedBorrowDate: formatDate(borrowRequest.intendedBorrowDate) || new Date().toISOString(),
      intendedReturnDate: formatDate(borrowRequest.intendedReturnDate) || new Date().toISOString(),
      approvedDate: formatDate(borrowRequest.approvedDate),
      releasedDate: formatDate(borrowRequest.releasedDate),
      actualReturnDate: formatDate(borrowRequest.actualReturnDate),
      conditionOnBorrow: borrowRequest.conditionOnBorrow || 'Good',
      conditionOnReturn: borrowRequest.conditionOnReturn || '',
      roomAssigned: borrowRequest.roomAssigned || 'Default Laboratory Room',
      returnRequestDate: formatDate(borrowRequest.returnRequestDate),
      returnStatus: borrowRequest.returnStatus || 'pending',
      penaltyFee: borrowRequest.penaltyFee || 0,
      adminRemarks: borrowRequest.adminRemarks || '',
      approvedBy: borrowRequest.approvedBy || '',
      releasedBy: borrowRequest.releasedBy || '',
      createdAt: formatDate(borrowRequest.createdAt) || new Date().toISOString(),
      updatedAt: formatDate(borrowRequest.updatedAt) || new Date().toISOString()
    };

    console.log("✅ Successfully formatted borrow request");

    return NextResponse.json({
      success: true,
      borrowRequest: formattedRequest,
      message: "Borrow request found"
    });

  } catch (error) {
    console.error("❌ Error in GET /api/student/borrow-requests/[id]:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}