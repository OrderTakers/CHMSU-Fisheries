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

export async function GET() {
  console.log("🔍 GET /api/student/borrow-requests - Starting request");
  
  let authResult: any = null;
  
  try {
    // Validate authentication
    authResult = await validateAuth();
    
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

    console.log("✅ User authenticated:", authResult.user.email, "User ID:", authResult.user._id);

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
            error: "Database connection failed",
            details: dbError instanceof Error ? dbError.message : "Unknown error"
          },
          { status: 500 }
        );
      }
    }

    // Get models
    const { Borrowing, Inventory } = await getModels();
    
    console.log("🔍 Checking all borrowings in database...");
    const allBorrowings = await Borrowing.find({}).limit(10).lean();
    console.log("📋 Total borrowings in database:", allBorrowings.length);
    
    // Debug: Check what borrowerId values exist
    allBorrowings.forEach((borrowing: any, index: number) => {
      console.log(`  ${index + 1}. ID: ${borrowing._id}, BorrowerID: ${borrowing.borrowerId}, Type: ${typeof borrowing.borrowerId}, Status: ${borrowing.status}`);
    });

    // Try multiple ways to find user's borrow requests
    let borrowRequests = [] as any[];
    const userId = authResult.user._id;
    const userEmail = authResult.user.email;
    
    console.log(`🔍 Searching for user's borrow requests...`);
    console.log(`   User ID: ${userId}`);
    console.log(`   User Email: ${userEmail}`);

    // Try multiple query approaches
    const queryPromises = [
      // Try with string match
      Borrowing.find({ borrowerId: userId.toString() }).lean(),
      // Try with ObjectId
      Borrowing.find({ borrowerId: new mongoose.Types.ObjectId(userId) }).lean(),
      // Try with email
      Borrowing.find({ borrowerEmail: userEmail }).lean(),
      // Try partial string match (in case ID is stored differently)
      Borrowing.find({ 
        $or: [
          { borrowerId: { $regex: userId.toString().slice(-8), $options: 'i' } },
          { borrowerId: userId.toString().slice(-8) }
        ]
      }).lean(),
      // Last resort: get all and filter manually
      Borrowing.find({}).lean()
    ];

    try {
      const results = await Promise.allSettled(queryPromises);
      
      // Collect all unique requests
      const seenIds = new Set();
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          for (const request of result.value) {
            // Check if this request belongs to the user
            const matchesUser = 
              request.borrowerId?.toString() === userId.toString() ||
              request.borrowerId?.toString() === new mongoose.Types.ObjectId(userId).toString() ||
              request.borrowerEmail === userEmail;
            
            if (matchesUser && !seenIds.has(request._id.toString())) {
              seenIds.add(request._id.toString());
              borrowRequests.push(request);
            }
          }
        }
      }
      
      console.log(`✅ Found ${borrowRequests.length} borrow requests for user`);
      
    } catch (queryError) {
      console.error("❌ Error in queries:", queryError);
      // Fallback: get all and filter manually
      const allRequests = await Borrowing.find({}).lean();
      borrowRequests = allRequests.filter((req: any) => 
        req.borrowerEmail === userEmail || 
        req.borrowerId?.toString() === userId.toString()
      );
      console.log(`✅ Found ${borrowRequests.length} borrow requests (fallback method)`);
    }

    // Manually fetch equipment data for each request
    if (borrowRequests.length > 0) {
      console.log("🔍 Fetching equipment data for requests...");
      
      const equipmentIds = borrowRequests
        .map((req: any) => req.equipmentId)
        .filter((id: any) => id)
        .map((id: any) => {
          try {
            return new mongoose.Types.ObjectId(id.toString());
          } catch (error) {
            console.error("❌ Error converting to ObjectId:", id);
            return null;
          }
        })
        .filter((id: any) => id !== null) as mongoose.Types.ObjectId[];
      
      if (equipmentIds.length > 0) {
        try {
          const allEquipment = await Inventory.find({
            _id: { $in: equipmentIds }
          })
          .select('name itemId description images roomAssigned condition')
          .lean();
          
          console.log("✅ Found equipment items:", allEquipment.length);
          
          const equipmentMap = new Map();
          allEquipment.forEach((eq: any) => {
            equipmentMap.set(eq._id.toString(), eq);
          });
          
          borrowRequests = borrowRequests.map((request: any) => {
            const equipmentId = request.equipmentId?.toString();
            const equipment = equipmentId ? equipmentMap.get(equipmentId) : null;
            
            return {
              ...request,
              equipmentId: equipment || {
                _id: equipmentId || 'unknown',
                name: 'Equipment',
                itemId: 'N/A',
                description: '',
                images: [],
                roomAssigned: 'Not specified',
                condition: 'Good'
              }
            };
          });
        } catch (equipmentError) {
          console.error("❌ Error fetching equipment:", equipmentError);
        }
      }
    }

    // Format the response
    const formattedRequests = borrowRequests.map((request: any) => {
      const equipment = request.equipmentId as any;
      
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
      
      return {
        _id: request._id?.toString() || 'unknown',
        equipmentId: equipment ? {
          _id: equipment._id?.toString() || 'unknown',
          name: equipment.name || 'Unknown Equipment',
          itemId: equipment.itemId || 'N/A',
          description: equipment.description || '',
          images: equipment.images || [],
          roomAssigned: equipment.roomAssigned || 'Not specified',
          condition: equipment.condition || 'Good'
        } : {
          _id: 'unknown',
          name: 'Equipment Not Found',
          itemId: 'N/A',
          description: '',
          images: [],
          roomAssigned: 'Not specified',
          condition: 'Good'
        },
        borrowerName: request.borrowerName || authResult.user?.firstName + ' ' + authResult.user?.lastName,
        borrowerEmail: request.borrowerEmail || authResult.user?.email,
        purpose: request.purpose || 'Not specified',
        quantity: request.quantity || 1,
        description: request.description || '',
        status: request.status || 'pending',
        requestedDate: formatDate(request.requestedDate) || new Date().toISOString(),
        intendedBorrowDate: formatDate(request.intendedBorrowDate) || new Date().toISOString(),
        intendedReturnDate: formatDate(request.intendedReturnDate) || new Date().toISOString(),
        approvedDate: formatDate(request.approvedDate),
        releasedDate: formatDate(request.releasedDate),
        actualReturnDate: formatDate(request.actualReturnDate),
        conditionOnBorrow: request.conditionOnBorrow || 'Good',
        conditionOnReturn: request.conditionOnReturn || '',
        roomAssigned: request.roomAssigned || 'Default Laboratory Room',
        returnRequestDate: formatDate(request.returnRequestDate),
        returnStatus: request.returnStatus || 'pending',
        penaltyFee: request.penaltyFee || 0,
        adminRemarks: request.adminRemarks || '',
        approvedBy: request.approvedBy || '',
        releasedBy: request.releasedBy || '',
        createdAt: formatDate(request.createdAt) || new Date().toISOString(),
        updatedAt: formatDate(request.updatedAt) || new Date().toISOString()
      };
    });

    console.log("✅ Successfully formatted", formattedRequests.length, "borrow requests");
    
    // Log status counts
    const statusCounts: any = {};
    formattedRequests.forEach((req: any) => {
      statusCounts[req.status] = (statusCounts[req.status] || 0) + 1;
    });
    console.log("📊 Status counts:", statusCounts);

    return NextResponse.json({
      success: true,
      borrowRequests: formattedRequests,
      totalCount: formattedRequests.length,
      message: `Found ${formattedRequests.length} borrow requests`,
      debug: {
        userId: authResult.user._id,
        userEmail: authResult.user.email,
        totalInDatabase: allBorrowings?.length || 0
      }
    });

  } catch (error) {
    console.error("❌ Error in GET /api/student/borrow-requests:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        debug: {
          user: authResult?.user ? {
            id: authResult.user._id,
            email: authResult.user.email
          } : 'No user in authResult'
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log("📝 POST /api/student/borrow-requests - Starting request");
  
  let authResult: any = null;
  
  try {
    // Validate authentication
    authResult = await validateAuth();
    
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

    console.log("✅ User authenticated:", authResult.user.email);

    // Parse request body
    const body = await request.json();
    console.log("📦 Request body:", body);

    // Validate required fields
    const { equipmentId, purpose, quantity, description, intendedBorrowDate, intendedReturnDate } = body;

    if (!equipmentId || !purpose || !intendedBorrowDate || !intendedReturnDate) {
      console.log("❌ Missing required fields:", { equipmentId, purpose, intendedBorrowDate, intendedReturnDate });
      return NextResponse.json(
        { 
          success: false,
          error: "Missing required fields" 
        },
        { status: 400 }
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

    // Check if equipment exists and is available
    let equipment;
    try {
      equipment = await Inventory.findById(equipmentId);
      
      if (!equipment) {
        console.log("❌ Equipment not found:", equipmentId);
        return NextResponse.json(
          { 
            success: false,
            error: "Equipment not found" 
          },
          { status: 404 }
        );
      }

      console.log("🔍 Equipment found:", {
        name: equipment.name,
        available: equipment.borrowingAvailableQuantity,
        canBeBorrowed: equipment.canBeBorrowed
      });

      // Check if equipment can be borrowed
      const borrowCheck = equipment.canBeBorrowedCheck(quantity);
      if (!borrowCheck.canBorrow) {
        console.log("❌ Equipment cannot be borrowed:", borrowCheck.reason);
        return NextResponse.json(
          { 
            success: false,
            error: `Equipment cannot be borrowed: ${borrowCheck.reason}` 
          },
          { status: 400 }
        );
      }

      // Check real-time availability for the requested dates
      const startDate = new Date(intendedBorrowDate);
      const endDate = new Date(intendedReturnDate);
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { 
            success: false,
            error: "Return date must be after borrow date" 
          },
          { status: 400 }
        );
      }

      if (startDate < new Date()) {
        return NextResponse.json(
          { 
            success: false,
            error: "Borrow date cannot be in the past" 
          },
          { status: 400 }
        );
      }

      const availability = await equipment.getRealTimeAvailability(startDate, endDate, quantity);
      console.log("📊 Real-time availability:", availability);

      if (!availability.canBorrow) {
        return NextResponse.json(
          { 
            success: false,
            error: `Not enough equipment available: ${availability.reason}` 
          },
          { status: 400 }
        );
      }

    } catch (equipmentError) {
      console.error("❌ Error checking equipment:", equipmentError);
      return NextResponse.json(
        { 
          success: false,
          error: "Error checking equipment availability" 
        },
        { status: 500 }
      );
    }

    // Create new borrowing request
    try {
      const newBorrowing = new Borrowing({
        equipmentId: equipmentId,
        borrowerType: 'student',
        borrowerId: authResult.user._id.toString(), // Store as string
        borrowerName: `${authResult.user.firstName} ${authResult.user.lastName}`,
        borrowerEmail: authResult.user.email,
        purpose: purpose,
        quantity: quantity || 1,
        description: description || '',
        status: 'pending',
        requestedDate: new Date(),
        intendedBorrowDate: new Date(intendedBorrowDate),
        intendedReturnDate: new Date(intendedReturnDate),
        conditionOnBorrow: equipment.condition,
        roomAssigned: equipment.roomAssigned || 'Default Laboratory Room'
      });

      await newBorrowing.save();
      console.log("✅ Borrowing request created:", newBorrowing._id);

      return NextResponse.json({
        success: true,
        message: "Borrow request submitted successfully",
        borrowRequest: {
          _id: (newBorrowing._id as mongoose.Types.ObjectId).toString(),
          equipmentId: {
            _id: equipment._id.toString(),
            name: equipment.name,
            itemId: equipment.itemId
          },
          borrowerName: newBorrowing.borrowerName,
          purpose: newBorrowing.purpose,
          quantity: newBorrowing.quantity,
          status: newBorrowing.status,
          requestedDate: newBorrowing.requestedDate,
          intendedBorrowDate: newBorrowing.intendedBorrowDate,
          intendedReturnDate: newBorrowing.intendedReturnDate
        }
      }, { status: 201 });

    } catch (borrowingError) {
      console.error("❌ Error creating borrowing request:", borrowingError);
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to create borrow request" 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("❌ Error in POST /api/student/borrow-requests:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        debug: {
          user: authResult?.user ? {
            id: authResult.user._id,
            email: authResult.user.email
          } : 'No user in authResult'
        }
      },
      { status: 500 }
    );
  }
}