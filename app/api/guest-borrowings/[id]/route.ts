// api/guest-borrowings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import GuestBorrowing from '@/models/GuestBorrowing';
import Inventory from '@/models/Inventory';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

// PATCH /api/guest-borrowings/[id] - Update guest borrowing status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const { status, adminNotes } = body;

    console.log(`GUEST API: Updating guest borrowing ${id} to status: ${status}`);

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Find the guest borrowing record
    const guestBorrowing = await GuestBorrowing.findById(id);
    if (!guestBorrowing) {
      return NextResponse.json(
        { success: false, error: 'Guest borrowing request not found' },
        { status: 404 }
      );
    }

    console.log(`GUEST API: Current guest borrowing status: ${guestBorrowing.status}`);
    console.log(`GUEST API: Guest borrowing equipmentId: ${guestBorrowing.equipmentId}`);

    // Handle approval
    if (status === 'approved' && guestBorrowing.status === 'pending') {
      let equipment;
      try {
        // Find equipment by itemId (since equipmentId is stored as itemId string)
        equipment = await Inventory.findOne({ itemId: guestBorrowing.equipmentId });
        
        if (!equipment) {
          console.log(`GUEST API: Equipment not found with itemId: ${guestBorrowing.equipmentId}`);
          return NextResponse.json(
            { 
              success: false, 
              error: `Equipment not found. Tried searching with: ${guestBorrowing.equipmentId}` 
            },
            { status: 404 }
          );
        }
      } catch (equipmentError) {
        console.error('GUEST API: Error finding equipment:', equipmentError);
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
            error: `Equipment is no longer available. Available: ${equipment.availableQuantity}` 
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

      // Update equipment quantity
      const newAvailableQuantity = Math.max(0, equipment.availableQuantity - 1);
      const newBorrowedQuantity = Math.max(0, (equipment.borrowedQuantity || 0) + 1);

      console.log(`GUEST API: Updating equipment quantities. Old available: ${equipment.availableQuantity}, New available: ${newAvailableQuantity}`);

      await Inventory.updateOne(
        { _id: equipment._id },
        { 
          $set: {
            availableQuantity: newAvailableQuantity,
            borrowedQuantity: newBorrowedQuantity,
            status: newAvailableQuantity === 0 ? 'borrowed' : equipment.status
          }
        }
      );

      // Update guest borrowing
      guestBorrowing.status = 'approved';
      if (adminNotes) {
        guestBorrowing.adminNotes = adminNotes;
      }
      await guestBorrowing.save();

      console.log(`GUEST API: Guest borrowing ${id} approved successfully`);

      // Send approval email with the new design
      try {
        await sendEmail({
          to: guestBorrowing.email,
          subject: 'Equipment Borrowing Request Approved - CHMSU Fisheries System',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Request Approved - CHMSU Fisheries System</title>
                <style>
                    body { 
                        font-family: 'Arial', sans-serif; 
                        background-color: #f8fafc;
                        margin: 0;
                        padding: 20px;
                        line-height: 1.6;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e2e8f0;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #16a34a;
                    }
                    .system-name {
                        color: #16a34a;
                        font-size: 24px;
                        font-weight: bold;
                        margin: 15px 0 5px 0;
                    }
                    .subtitle {
                        color: #64748b;
                        font-size: 16px;
                        margin-bottom: 10px;
                    }
                    .content {
                        background: #f8fafc;
                        padding: 25px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .status-box {
                        background: #16a34a;
                        color: white;
                        padding: 20px;
                        border-radius: 8px;
                        font-size: 24px;
                        text-align: center;
                        margin: 20px 0;
                        letter-spacing: 2px;
                        font-weight: bold;
                    }
                    .details-box {
                        background: #1e293b;
                        color: #f1f5f9;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .detail-item {
                        margin-bottom: 10px;
                    }
                    .detail-label {
                        color: #94a3b8;
                        font-weight: bold;
                    }
                    .warning {
                        background: #fef3c7;
                        border: 1px solid #f59e0b;
                        color: #92400e;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                        font-size: 14px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #e2e8f0;
                        color: #64748b;
                        font-size: 12px;
                    }
                    .notes-box {
                        background: #e0f2fe;
                        border: 1px solid #0ea5e9;
                        color: #0369a1;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                        font-size: 14px;
                    }
                    @media (max-width: 600px) {
                        .container {
                            padding: 20px;
                        }
                        .status-box {
                            font-size: 20px;
                            padding: 15px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="system-name">CHMSU Fisheries System</div>
                        <div class="subtitle">Equipment Borrowing Request Approved</div>
                    </div>
                    
                    <div class="content">
                        <p style="color: #334155; margin-bottom: 15px;">Dear ${guestBorrowing.firstName} ${guestBorrowing.lastName},</p>
                        <p style="color: #475569;">Your request to borrow equipment from the CHMSU Fisheries Equipment Borrowing System has been <strong>APPROVED</strong>.</p>
                        
                        <div class="status-box">REQUEST APPROVED</div>
                        
                        <div class="details-box">
                            <p style="font-size: 18px; text-align: center; margin-bottom: 15px; color: #f1f5f9;">📋 Request Details</p>
                            <div class="detail-item">
                                <span class="detail-label">Request ID:</span> ${guestBorrowing.requestId}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Equipment:</span> ${guestBorrowing.equipmentName}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Borrow Duration:</span> ${guestBorrowing.borrowDuration}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Purpose:</span> ${guestBorrowing.purpose}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status:</span> <span style="color: #4ade80; font-weight: bold;">APPROVED</span>
                            </div>
                        </div>
                        
                        ${adminNotes ? `
                        <div class="notes-box">
                            <strong>📝 Admin Notes:</strong><br>
                            ${adminNotes}
                        </div>
                        ` : ''}
                        
                        <div class="warning">
                            <strong>⚠️ Important Information:</strong><br>
                            • Please visit the laboratory during working hours to collect your equipment<br>
                            • Bring a valid ID for verification<br>
                            • Equipment must be returned on time as specified in your request
                        </div>
                        
                        <p style="color: #475569; margin-top: 20px;">
                            Thank you for using the CHMSU Fisheries Equipment Borrowing System.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} CHMSU Fisheries System. All rights reserved.</p>
                        <p style="font-size: 11px; margin-top: 5px;">
                            This is an automated message. Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </body>
            </html>
          `
        });
        console.log(`GUEST API: Approval email sent to ${guestBorrowing.email}`);
      } catch (emailError) {
        console.error('GUEST API: Failed to send approval email:', emailError);
        // Continue even if email fails
      }

    } else if (status === 'declined') {
      // Handle rejection
      guestBorrowing.status = 'declined';
      if (adminNotes) {
        guestBorrowing.adminNotes = adminNotes;
      }
      await guestBorrowing.save();

      console.log(`GUEST API: Guest borrowing ${id} declined`);

      // Send rejection email with the new design
      try {
        await sendEmail({
          to: guestBorrowing.email,
          subject: 'Equipment Borrowing Request Declined - CHMSU Fisheries System',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Request Declined - CHMSU Fisheries System</title>
                <style>
                    body { 
                        font-family: 'Arial', sans-serif; 
                        background-color: #f8fafc;
                        margin: 0;
                        padding: 20px;
                        line-height: 1.6;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e2e8f0;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #dc2626;
                    }
                    .system-name {
                        color: #16a34a;
                        font-size: 24px;
                        font-weight: bold;
                        margin: 15px 0 5px 0;
                    }
                    .subtitle {
                        color: #64748b;
                        font-size: 16px;
                        margin-bottom: 10px;
                    }
                    .content {
                        background: #f8fafc;
                        padding: 25px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .status-box {
                        background: #dc2626;
                        color: white;
                        padding: 20px;
                        border-radius: 8px;
                        font-size: 24px;
                        text-align: center;
                        margin: 20px 0;
                        letter-spacing: 2px;
                        font-weight: bold;
                    }
                    .details-box {
                        background: #1e293b;
                        color: #f1f5f9;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .detail-item {
                        margin-bottom: 10px;
                    }
                    .detail-label {
                        color: #94a3b8;
                        font-weight: bold;
                    }
                    .info-box {
                        background: #f0f9ff;
                        border: 1px solid #0ea5e9;
                        color: #0369a1;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                        font-size: 14px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #e2e8f0;
                        color: #64748b;
                        font-size: 12px;
                    }
                    .notes-box {
                        background: #fee2e2;
                        border: 1px solid #ef4444;
                        color: #b91c1c;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                        font-size: 14px;
                    }
                    @media (max-width: 600px) {
                        .container {
                            padding: 20px;
                        }
                        .status-box {
                            font-size: 20px;
                            padding: 15px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="system-name">CHMSU Fisheries System</div>
                        <div class="subtitle">Equipment Borrowing Request Declined</div>
                    </div>
                    
                    <div class="content">
                        <p style="color: #334155; margin-bottom: 15px;">Dear ${guestBorrowing.firstName} ${guestBorrowing.lastName},</p>
                        <p style="color: #475569;">Your request to borrow equipment from the CHMSU Fisheries Equipment Borrowing System has been <strong>DECLINED</strong>.</p>
                        
                        <div class="status-box">REQUEST DECLINED</div>
                        
                        <div class="details-box">
                            <p style="font-size: 18px; text-align: center; margin-bottom: 15px; color: #f1f5f9;">📋 Request Details</p>
                            <div class="detail-item">
                                <span class="detail-label">Request ID:</span> ${guestBorrowing.requestId}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Equipment:</span> ${guestBorrowing.equipmentName}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Borrow Duration:</span> ${guestBorrowing.borrowDuration}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Purpose:</span> ${guestBorrowing.purpose}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status:</span> <span style="color: #f87171; font-weight: bold;">DECLINED</span>
                            </div>
                        </div>
                        
                        ${adminNotes ? `
                        <div class="notes-box">
                            <strong>📝 Reason for Decline:</strong><br>
                            ${adminNotes}
                        </div>
                        ` : ''}
                        
                        <div class="info-box">
                            <strong>ℹ️ For Assistance:</strong><br>
                            • If you have any questions about this decision, please contact the laboratory administrator<br>
                            • You may submit a new request with different equipment or dates<br>
                            • Make sure all required information is complete in your future requests
                        </div>
                        
                        <p style="color: #475569; margin-top: 20px;">
                            Thank you for using the CHMSU Fisheries Equipment Borrowing System.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} CHMSU Fisheries System. All rights reserved.</p>
                        <p style="font-size: 11px; margin-top: 5px;">
                            This is an automated message. Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </body>
            </html>
          `
        });
        console.log(`GUEST API: Rejection email sent to ${guestBorrowing.email}`);
      } catch (emailError) {
        console.error('GUEST API: Failed to send rejection email:', emailError);
      }

    } else if (status === 'returned') {
      // Handle return
      let equipment;
      try {
        // Find equipment by itemId
        equipment = await Inventory.findOne({ itemId: guestBorrowing.equipmentId });
        
        if (equipment) {
          const newAvailableQuantity = Math.max(0, equipment.availableQuantity + 1);
          const newBorrowedQuantity = Math.max(0, (equipment.borrowedQuantity || 0) - 1);

          await Inventory.updateOne(
            { _id: equipment._id },
            { 
              $set: {
                availableQuantity: newAvailableQuantity,
                borrowedQuantity: newBorrowedQuantity,
                status: newAvailableQuantity > 0 ? 'available' : equipment.status
              }
            }
          );
        }
      } catch (equipmentError) {
        console.error('GUEST API: Error finding equipment for return:', equipmentError);
        // Continue even if equipment not found
      }

      guestBorrowing.status = 'returned';
      await guestBorrowing.save();
      console.log(`GUEST API: Guest borrowing ${id} marked as returned`);
      
      // Send return confirmation email
      try {
        await sendEmail({
          to: guestBorrowing.email,
          subject: 'Equipment Return Confirmation - CHMSU Fisheries System',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Return Confirmation - CHMSU Fisheries System</title>
                <style>
                    body { 
                        font-family: 'Arial', sans-serif; 
                        background-color: #f8fafc;
                        margin: 0;
                        padding: 20px;
                        line-height: 1.6;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e2e8f0;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #0ea5e9;
                    }
                    .system-name {
                        color: #16a34a;
                        font-size: 24px;
                        font-weight: bold;
                        margin: 15px 0 5px 0;
                    }
                    .subtitle {
                        color: #64748b;
                        font-size: 16px;
                        margin-bottom: 10px;
                    }
                    .content {
                        background: #f8fafc;
                        padding: 25px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .status-box {
                        background: #0ea5e9;
                        color: white;
                        padding: 20px;
                        border-radius: 8px;
                        font-size: 24px;
                        text-align: center;
                        margin: 20px 0;
                        letter-spacing: 2px;
                        font-weight: bold;
                    }
                    .details-box {
                        background: #1e293b;
                        color: #f1f5f9;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .detail-item {
                        margin-bottom: 10px;
                    }
                    .detail-label {
                        color: #94a3b8;
                        font-weight: bold;
                    }
                    .success-box {
                        background: #d1fae5;
                        border: 1px solid #10b981;
                        color: #065f46;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                        font-size: 14px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #e2e8f0;
                        color: #64748b;
                        font-size: 12px;
                    }
                    @media (max-width: 600px) {
                        .container {
                            padding: 20px;
                        }
                        .status-box {
                            font-size: 20px;
                            padding: 15px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="system-name">CHMSU Fisheries System</div>
                        <div class="subtitle">Equipment Return Confirmation</div>
                    </div>
                    
                    <div class="content">
                        <p style="color: #334155; margin-bottom: 15px;">Dear ${guestBorrowing.firstName} ${guestBorrowing.lastName},</p>
                        <p style="color: #475569;">Your equipment return has been <strong>CONFIRMED</strong> by the CHMSU Fisheries Equipment Borrowing System.</p>
                        
                        <div class="status-box">RETURN CONFIRMED</div>
                        
                        <div class="details-box">
                            <p style="font-size: 18px; text-align: center; margin-bottom: 15px; color: #f1f5f9;">📋 Return Details</p>
                            <div class="detail-item">
                                <span class="detail-label">Request ID:</span> ${guestBorrowing.requestId}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Equipment:</span> ${guestBorrowing.equipmentName}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Borrow Duration:</span> ${guestBorrowing.borrowDuration}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status:</span> <span style="color: #60a5fa; font-weight: bold;">RETURNED</span>
                            </div>
                        </div>
                        
                        <div class="success-box">
                            <strong>✅ Thank You!</strong><br>
                            • Your equipment has been successfully returned<br>
                            • Thank you for following proper return procedures<br>
                            • We appreciate you taking care of our laboratory equipment
                        </div>
                        
                        <p style="color: #475569; margin-top: 20px;">
                            We hope you found the equipment useful for your needs. You are welcome to submit new borrowing requests in the future.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} CHMSU Fisheries System. All rights reserved.</p>
                        <p style="font-size: 11px; margin-top: 5px;">
                            This is an automated message. Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </body>
            </html>
          `
        });
        console.log(`GUEST API: Return confirmation email sent to ${guestBorrowing.email}`);
      } catch (emailError) {
        console.error('GUEST API: Failed to send return confirmation email:', emailError);
      }

    } else {
      // Other status updates
      guestBorrowing.status = status;
      if (adminNotes) {
        guestBorrowing.adminNotes = adminNotes;
      }
      await guestBorrowing.save();
      console.log(`GUEST API: Guest borrowing ${id} status updated to ${status}`);
    }

    return NextResponse.json({
      success: true,
      message: `Guest borrowing request ${status} successfully`,
      guestBorrowing
    });

  } catch (error: any) {
    console.error('GUEST API: Error updating guest borrowing:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update guest borrowing request',
        details: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET /api/guest-borrowings/[id] - Get single guest borrowing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const guestBorrowing = await GuestBorrowing.findById(id);

    if (!guestBorrowing) {
      return NextResponse.json(
        { success: false, error: 'Guest borrowing request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      guestBorrowing
    });

  } catch (error) {
    console.error('GUEST API: Error fetching guest borrowing:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch guest borrowing request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/guest-borrowings/[id] - Delete guest borrowing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const guestBorrowing = await GuestBorrowing.findById(id);

    if (!guestBorrowing) {
      return NextResponse.json(
        { success: false, error: 'Guest borrowing request not found' },
        { status: 404 }
      );
    }

    // If it's an approved borrowing, return the quantity to inventory
    if (guestBorrowing.status === 'approved') {
      let equipment;
      try {
        // Find equipment by itemId
        equipment = await Inventory.findOne({ itemId: guestBorrowing.equipmentId });
        
        if (equipment) {
          const newAvailableQuantity = Math.max(0, equipment.availableQuantity + 1);
          const newBorrowedQuantity = Math.max(0, (equipment.borrowedQuantity || 0) - 1);

          await Inventory.updateOne(
            { _id: equipment._id },
            { 
              $set: {
                availableQuantity: newAvailableQuantity,
                borrowedQuantity: newBorrowedQuantity,
                status: newAvailableQuantity > 0 ? 'available' : equipment.status
              }
            }
          );
        }
      } catch (equipmentError) {
        console.error('GUEST API: Error finding equipment for delete:', equipmentError);
        // Continue even if equipment not found
      }
    }

    await GuestBorrowing.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Guest borrowing request deleted successfully'
    });

  } catch (error) {
    console.error('GUEST API: Error deleting guest borrowing:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete guest borrowing request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}