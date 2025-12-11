import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import GuestBorrowing from '@/models/GuestBorrowing';
import Inventory from '@/models/Inventory';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

// GET /api/borrowings - Get all borrowings (regular + guest)
export async function GET(request: NextRequest) {
  try {
    console.log('=== API: Starting to fetch all borrowings ===');
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const status = searchParams.get('status');
    const borrowerType = searchParams.get('borrowerType');
    const search = searchParams.get('search');

    console.log('API: Search params:', { page, limit, status, borrowerType, search });

    // Initialize arrays
    let regularBorrowings: any[] = [];
    let guestBorrowings: any[] = [];

    try {
      // Fetch regular borrowings
      const regularFilter: any = {};
      
      if (status && status !== 'all') {
        regularFilter.status = status;
      }
      
      if (search) {
        regularFilter.$or = [
          { borrowerName: { $regex: search, $options: 'i' } },
          { borrowerEmail: { $regex: search, $options: 'i' } },
          { purpose: { $regex: search, $options: 'i' } },
        ];
      }
      
      regularBorrowings = await Borrowing.find(regularFilter)
        .populate('equipmentId', 'itemId name category condition cost yearPurchased roomAssigned image availableQuantity quantity borrowedQuantity status')
        .sort({ requestedDate: -1 })
        .lean();
      
      console.log(`API: Found ${regularBorrowings.length} regular borrowings`);
    } catch (regularError) {
      console.error('API: Error fetching regular borrowings:', regularError);
    }

    try {
      // Fetch guest borrowings
      const guestFilter: any = {};
      
      if (status && status !== 'all') {
        // Map status for guest borrowings
        const guestStatusMap: Record<string, string> = {
          'pending': 'pending',
          'approved': 'approved',
          'rejected': 'declined',
          'declined': 'declined',
          'released': 'approved',
          'returned': 'returned'
        };
        guestFilter.status = guestStatusMap[status] || status;
      }
      
      if (search) {
        guestFilter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { schoolId: { $regex: search, $options: 'i' } },
          { equipmentName: { $regex: search, $options: 'i' } },
          { requestId: { $regex: search, $options: 'i' } },
        ];
      }
      
      guestBorrowings = await GuestBorrowing.find(guestFilter)
        .sort({ requestedDate: -1 })
        .lean();
      
      console.log(`API: Found ${guestBorrowings.length} guest borrowings`);
      
      // Debug: Log sample data
      if (guestBorrowings.length > 0) {
        console.log('API: Sample guest borrowing:', {
          id: guestBorrowings[0]._id,
          name: guestBorrowings[0].firstName + ' ' + guestBorrowings[0].lastName,
          equipment: guestBorrowings[0].equipmentName,
          equipmentId: guestBorrowings[0].equipmentId,
          status: guestBorrowings[0].status
        });
      }
    } catch (guestError) {
      console.error('API: Error fetching guest borrowings:', guestError);
      
      // Try to see what collections exist
      try {
        const collections = await mongoose.connection.db?.listCollections().toArray();
        console.log('API: Available collections:', collections?.map(c => c.name));
      } catch (collectionError) {
        console.error('API: Could not list collections:', collectionError);
      }
    }

    // Combine and sort results
    const allBorrowings = [...regularBorrowings, ...guestBorrowings];
    
    allBorrowings.sort((a, b) => {
      const dateA = new Date(a.requestedDate || a.createdAt).getTime();
      const dateB = new Date(b.requestedDate || b.createdAt).getTime();
      return dateB - dateA;
    });

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = allBorrowings.slice(startIndex, endIndex);

    console.log(`API: Total results: ${allBorrowings.length}, Regular: ${regularBorrowings.length}, Guest: ${guestBorrowings.length}`);

    return NextResponse.json({
      success: true,
      borrowings: regularBorrowings,
      guestBorrowings: guestBorrowings,
      allResults: paginatedResults,
      total: allBorrowings.length,
      counts: {
        regular: regularBorrowings.length,
        guest: guestBorrowings.length,
        total: allBorrowings.length
      },
      pagination: {
        page,
        limit,
        total: allBorrowings.length,
        totalPages: Math.ceil(allBorrowings.length / limit),
      },
    });
  } catch (error) {
    console.error('API: Critical error fetching borrowings:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch borrowing records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/borrowings - Create a new borrowing request
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    console.log('API: Creating borrowing request:', { 
      borrowerType: body.borrowerType, 
      hasFirstName: !!body.firstName,
      equipmentId: body.equipmentId 
    });

    // Check if it's a guest borrowing (either by borrowerType or by having firstName field)
    if (body.borrowerType === 'guest' || body.firstName) {
      console.log('API: Processing as guest borrowing');
      
      // Validate guest borrowing fields
      const guestFields = ['schoolId', 'lastName', 'firstName', 'email', 'course', 'year', 'section', 'purpose', 'equipmentId', 'equipmentName'];
      const missingFields = guestFields.filter(field => !body[field]);
      
      if (missingFields.length > 0) {
        console.log('API: Missing guest fields:', missingFields);
        return NextResponse.json(
          { 
            success: false,
            error: `Missing required fields for guest: ${missingFields.join(', ')}` 
          },
          { status: 400 }
        );
      }

      // Check if equipment exists - find by itemId (since equipmentId is the itemId string)
      let equipment;
      try {
        // Guest borrowings store equipmentId as itemId string, not ObjectId
        equipment = await Inventory.findOne({ itemId: body.equipmentId });
        
        if (!equipment) {
          console.log('API: Equipment not found with itemId:', body.equipmentId);
          return NextResponse.json(
            { 
              success: false,
              error: `Equipment not found with ID: ${body.equipmentId}` 
            },
            { status: 404 }
          );
        }
      } catch (equipmentError) {
        console.error('API: Error finding equipment:', equipmentError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Error finding equipment',
            details: equipmentError instanceof Error ? equipmentError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }

      // Check if equipment has enough available quantity
      if (equipment.availableQuantity < 1) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Equipment is not available for borrowing' 
          },
          { status: 400 }
        );
      }

      // Check if equipment can be borrowed
      if (equipment.canBeBorrowed === false) {
        return NextResponse.json(
          { 
            success: false,
            error: 'This equipment is not available for borrowing' 
          },
          { status: 400 }
        );
      }

      // Create guest borrowing - store itemId as equipmentId
      const guestBorrowing = new GuestBorrowing({
        schoolId: body.schoolId,
        lastName: body.lastName,
        firstName: body.firstName,
        email: body.email,
        course: body.course,
        year: body.year,
        section: body.section,
        purpose: body.purpose,
        equipmentId: body.equipmentId, // Store the itemId string
        equipmentName: body.equipmentName,
        borrowDuration: body.borrowDuration || '1 week',
        status: 'pending'
      });

      await guestBorrowing.save();
      console.log('API: Guest borrowing created:', { 
        id: guestBorrowing._id, 
        requestId: guestBorrowing.requestId,
        email: guestBorrowing.email,
        equipmentId: guestBorrowing.equipmentId
      });

      // Send confirmation email
      try {
        await sendEmail({
          to: body.email,
          subject: 'Equipment Borrowing Request Received',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Equipment Borrowing Request Received</h2>
              <p>Dear ${body.firstName} ${body.lastName},</p>
              <p>Your request to borrow <strong>${body.equipmentName}</strong> has been received.</p>
              <p><strong>Request Details:</strong></p>
              <ul>
                <li>Request ID: ${guestBorrowing.requestId}</li>
                <li>Equipment: ${body.equipmentName}</li>
                <li>Borrow Duration: ${body.borrowDuration || '1 week'}</li>
                <li>Purpose: ${body.purpose}</li>
                <li>Status: Pending Approval</li>
              </ul>
              <p>You will receive another email once your request has been reviewed by our administrators.</p>
              <p>Thank you for using our equipment borrowing system.</p>
            </div>
          `
        });
        console.log('API: Confirmation email sent to:', body.email);
      } catch (emailError) {
        console.error('API: Failed to send confirmation email:', emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json(
        { 
          success: true,
          message: 'Guest borrowing request created successfully',
          guestBorrowing 
        },
        { status: 201 }
      );
    } else {
      // Regular borrowing
      console.log('API: Processing as regular borrowing');
      
      const requiredFields = ['equipmentId', 'borrowerType', 'borrowerId', 'borrowerName', 'borrowerEmail', 'purpose', 'intendedBorrowDate', 'intendedReturnDate'];
      const missingFields = requiredFields.filter(field => !body[field]);
      
      if (missingFields.length > 0) {
        return NextResponse.json(
          { 
            success: false,
            error: `Missing required fields: ${missingFields.join(', ')}` 
          },
          { status: 400 }
        );
      }

      // Check if equipment exists and is available - handle both ObjectId and itemId
      let equipment;
      try {
        // First try to find by _id (if it's an ObjectId)
        if (mongoose.Types.ObjectId.isValid(body.equipmentId)) {
          equipment = await Inventory.findById(body.equipmentId);
        }
        
        // If not found by _id, try to find by itemId
        if (!equipment) {
          equipment = await Inventory.findOne({ itemId: body.equipmentId });
        }
        
        if (!equipment) {
          console.log('API: Equipment not found with ID:', body.equipmentId);
          return NextResponse.json(
            { 
              success: false,
              error: `Equipment not found with ID: ${body.equipmentId}` 
            },
            { status: 404 }
          );
        }
      } catch (equipmentError) {
        console.error('API: Error finding equipment:', equipmentError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Error finding equipment',
            details: equipmentError instanceof Error ? equipmentError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }

      // Check if equipment has enough available quantity
      const requestedQuantity = body.quantity || 1;
      if (equipment.availableQuantity < requestedQuantity) {
        return NextResponse.json(
          { 
            success: false,
            error: `Not enough items available. Requested: ${requestedQuantity}, Available: ${equipment.availableQuantity}` 
          },
          { status: 400 }
        );
      }

      // Check if equipment can be borrowed
      if (equipment.canBeBorrowed === false) {
        return NextResponse.json(
          { 
            success: false,
            error: 'This equipment is not available for borrowing' 
          },
          { status: 400 }
        );
      }

      // Create new borrowing - store the actual MongoDB _id
      const borrowing = new Borrowing({
        ...body,
        equipmentId: equipment._id, // Store the MongoDB ObjectId
        requestedDate: new Date(),
        status: 'pending',
        quantity: requestedQuantity,
      });

      await borrowing.save();
      
      // Populate equipment data for response
      await borrowing.populate('equipmentId', 'itemId name category condition cost yearPurchased roomAssigned image availableQuantity quantity status');

      console.log('API: Regular borrowing created:', borrowing._id);

      return NextResponse.json(
        { 
          success: true,
          message: 'Borrowing request created successfully', 
          borrowing 
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('API: Error creating borrowing:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create borrowing request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}