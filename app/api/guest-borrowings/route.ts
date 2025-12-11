import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import GuestBorrowing from '@/models/GuestBorrowing';
import Inventory from '@/models/Inventory';
import { sendEmail } from '@/lib/email';

// GET /api/guest-borrowings - Get all guest borrowings
export async function GET(request: NextRequest) {
  try {
    console.log('=== GUEST API: Starting to fetch guest borrowings ===');
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    console.log('GUEST API: Search params:', { page, limit, status, search });

    // Build filter object
    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { schoolId: { $regex: search, $options: 'i' } },
        { equipmentName: { $regex: search, $options: 'i' } },
        { requestId: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch guest borrowings
    const guestBorrowings = await GuestBorrowing.find(filter)
      .sort({ requestedDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await GuestBorrowing.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    console.log(`GUEST API: Found ${guestBorrowings.length} guest borrowings (total: ${total})`);

    // Log first few records for debugging
    if (guestBorrowings.length > 0) {
      console.log('GUEST API: Sample records:', guestBorrowings.slice(0, 3).map(g => ({
        id: g._id,
        name: `${g.firstName} ${g.lastName}`,
        equipment: g.equipmentName,
        status: g.status
      })));
    }

    return NextResponse.json({
      success: true,
      guestBorrowings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('GUEST API: Error fetching guest borrowings:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch guest borrowing records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/guest-borrowings - Create a new guest borrowing request
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    console.log('GUEST API: Creating guest borrowing request:', body);

    // Validate required fields
    const requiredFields = ['schoolId', 'lastName', 'firstName', 'email', 'course', 'year', 'section', 'purpose', 'equipmentId', 'equipmentName'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      console.log('GUEST API: Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Check if equipment exists - find by itemId
    const equipment = await Inventory.findOne({ itemId: body.equipmentId });
    if (!equipment) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Equipment not found' 
        },
        { status: 404 }
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

    // Create guest borrowing
    const guestBorrowing = new GuestBorrowing({
      schoolId: body.schoolId,
      lastName: body.lastName,
      firstName: body.firstName,
      email: body.email,
      course: body.course,
      year: body.year,
      section: body.section,
      purpose: body.purpose,
      equipmentId: body.equipmentId,
      equipmentName: body.equipmentName,
      borrowDuration: body.borrowDuration || '1 week',
      status: 'pending'
    });

    await guestBorrowing.save();
    console.log('GUEST API: Guest borrowing created successfully:', {
      id: guestBorrowing._id,
      requestId: guestBorrowing.requestId,
      email: guestBorrowing.email
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
      console.log('GUEST API: Confirmation email sent to:', body.email);
    } catch (emailError) {
      console.error('GUEST API: Failed to send confirmation email:', emailError);
      // Continue even if email fails
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Guest borrowing request created successfully',
        guestBorrowing 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('GUEST API: Error creating guest borrowing:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create guest borrowing request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}