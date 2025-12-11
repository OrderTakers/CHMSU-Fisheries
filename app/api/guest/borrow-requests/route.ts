import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import GuestBorrowing from '@/models/GuestBorrowing';
import Inventory from '@/models/Inventory';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

// In-memory store for OTPs
const otpStore = new Map<string, { otp: string; expiresAt: number; verified: boolean; firstName?: string; lastName?: string }>();

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Generate random 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create OTP verification email
const createOtpEmail = (name: string, otp: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - CHMSU Fisheries System</title>
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
            .otp-box {
                background: #1e293b;
                color: #f1f5f9;
                padding: 20px;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 32px;
                text-align: center;
                margin: 20px 0;
                letter-spacing: 8px;
                font-weight: bold;
            }
            .instructions {
                color: #475569;
                font-size: 14px;
                margin: 20px 0;
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
            .timer {
                color: #dc2626;
                font-weight: bold;
            }
            @media (max-width: 600px) {
                .container {
                    padding: 20px;
                }
                .otp-box {
                    font-size: 24px;
                    letter-spacing: 4px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="system-name">CHMSU Fisheries System</div>
                <div class="subtitle">Email Verification Code</div>
            </div>
            
            <div class="content">
                <p style="color: #334155; margin-bottom: 15px;">Hello ${name},</p>
                <p style="color: #475569;">You are verifying your email address for the CHMSU Fisheries Equipment Borrowing System.</p>
                
                <p style="color: #475569;">Please use the following One-Time Password (OTP) to verify your email address:</p>
                
                <div class="otp-box">${otp}</div>
                
                <div class="instructions">
                    <p><strong>Instructions:</strong></p>
                    <ol>
                        <li>Copy the 6-digit code above</li>
                        <li>Enter it in the verification form</li>
                        <li>Click "Verify" to complete the process</li>
                    </ol>
                </div>
                
                <div class="warning">
                    <strong>Important Security Notice:</strong><br>
                    • This OTP is valid for <span class="timer">5 minutes</span> only<br>
                    • Do not share this code with anyone<br>
                    • If you didn't request this verification, please ignore this email
                </div>
                
                <p style="color: #475569; margin-top: 20px;">
                    If you have any questions or need assistance, please contact the Fisheries Department.
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
  `;
};

// Create borrowing request confirmation email
const createBorrowRequestEmail = (data: {
  firstName: string;
  lastName: string;
  email: string; // Added email parameter
  course: string;
  year: string;
  section: string;
  schoolId: string;
  purpose: string;
  equipmentName: string;
  equipmentId: string;
  borrowDuration: string;
  requestId: string;
  requestedDate: Date;
}) => {
  const formattedDate = new Date(data.requestedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Borrowing Request Confirmation - CHMSU Fisheries System</title>
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
            .status-badge {
                display: inline-block;
                padding: 8px 16px;
                background-color: #fef3c7;
                color: #92400e;
                border-radius: 20px;
                font-weight: bold;
                margin: 10px 0;
            }
            .content {
                background: #f8fafc;
                padding: 25px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .request-details {
                background: #e8f5e8;
                border: 1px solid #16a34a;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .detail-item {
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e2e8f0;
            }
            .detail-label {
                font-weight: bold;
                color: #334155;
                display: block;
                margin-bottom: 4px;
            }
            .detail-value {
                color: #475569;
                margin-left: 10px;
            }
            .equipment-highlight {
                background: #f0f9ff;
                border: 1px solid #0ea5e9;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .instructions {
                color: #475569;
                font-size: 14px;
                text-align: center;
                margin: 20px 0;
                padding: 15px;
                background: #fefce8;
                border-radius: 8px;
                border: 1px solid #fde047;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                color: #64748b;
                font-size: 12px;
            }
            .contact-info {
                margin-top: 10px;
                font-size: 11px;
            }
            @media (max-width: 600px) {
                .container {
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="system-name">CHMSU Fisheries System</div>
                <div class="subtitle">Borrowing Request Confirmation</div>
                <div class="status-badge">REQUEST SUBMITTED</div>
            </div>
            
            <div class="content">
                <p style="color: #334155; margin-bottom: 15px;">Dear ${data.firstName} ${data.lastName},</p>
                <p style="color: #475569;">Your borrowing request has been successfully submitted to the CHMSU Fisheries System. Our team will review your request and contact you at <strong>${data.email}</strong> within 24 hours.</p>
                
                <div class="request-details">
                    <p style="color: #334155; margin-bottom: 10px; font-weight: bold; font-size: 18px;">Request Details:</p>
                    
                    <div class="detail-item">
                        <span class="detail-label">Request ID:</span>
                        <span class="detail-value">${data.requestId}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Submitted Date:</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Student Information:</span>
                        <span class="detail-value">
                            ${data.schoolId} - ${data.course} ${data.year}${data.section}<br>
                            ${data.firstName} ${data.lastName}<br>
                            Email: ${data.email}
                        </span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Purpose of Use:</span>
                        <span class="detail-value">${data.purpose}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Requested Duration:</span>
                        <span class="detail-value">${data.borrowDuration}</span>
                    </div>
                </div>
                
                <div class="equipment-highlight">
                    <p style="color: #334155; margin-bottom: 10px; font-weight: bold; font-size: 18px;">Requested Equipment:</p>
                    <div class="detail-item">
                        <span class="detail-label">Equipment Name:</span>
                        <span class="detail-value">${data.equipmentName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Equipment ID:</span>
                        <span class="detail-value">${data.equipmentId}</span>
                    </div>
                </div>
                
                <div class="instructions">
                    <strong>What happens next?</strong><br>
                    1. Our team will review your request within 24 hours<br>
                    2. You will receive an email notification at <strong>${data.email}</strong> once your request is approved or declined<br>
                    3. If approved, you will receive further instructions for equipment pickup
                </div>
                
                <p style="color: #475569; margin-top: 20px;">
                    <strong>Need to make changes?</strong><br>
                    If you need to modify or cancel your request, please contact the Fisheries Department directly at your registered email.
                </p>
                
                <p style="color: #475569;">
                    Access your requests at: 
                    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/guest/borrowing" 
                       style="color: #16a34a; text-decoration: none;">
                       ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/guest/borrowing
                    </a>
                </p>
                
                <p style="color: #475569;">
                    If you have any questions, please contact:<br>
                    <strong>Fisheries Department</strong><br>
                    Carlos Hilado Memorial State University
                </p>
            </div>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} CHMSU Fisheries System. All rights reserved.</p>
                <div class="contact-info">
                    This is an automated message. Please do not reply to this email.
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Create admin notification email
const createAdminNotificationEmail = (data: {
  studentName: string;
  studentId: string;
  course: string;
  equipmentName: string;
  equipmentId: string;
  purpose: string;
  borrowDuration: string;
  requestId: string;
  email: string;
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Borrowing Request - Admin Notification</title>
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
                color: #dc2626;
                font-size: 24px;
                font-weight: bold;
                margin: 15px 0 5px 0;
            }
            .subtitle {
                color: #64748b;
                font-size: 16px;
                margin-bottom: 10px;
            }
            .alert-badge {
                display: inline-block;
                padding: 8px 16px;
                background-color: #fee2e2;
                color: #dc2626;
                border-radius: 20px;
                font-weight: bold;
                margin: 10px 0;
                font-size: 14px;
            }
            .content {
                background: #f8fafc;
                padding: 25px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .request-details {
                background: #fee2e2;
                border: 1px solid #dc2626;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .detail-item {
                margin-bottom: 10px;
                padding-bottom: 10px;
                border-bottom: 1px solid #fca5a5;
            }
            .detail-label {
                font-weight: bold;
                color: #334155;
                display: inline-block;
                width: 140px;
            }
            .detail-value {
                color: #475569;
            }
            .action-button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #dc2626;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 20px 0;
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
                .detail-label {
                    width: 120px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="system-name">CHMSU Fisheries System</div>
                <div class="subtitle">New Borrowing Request - Requires Action</div>
                <div class="alert-badge">ACTION REQUIRED</div>
            </div>
            
            <div class="content">
                <p style="color: #334155; margin-bottom: 15px; font-size: 16px;">
                    <strong>A new borrowing request has been submitted and requires your review.</strong>
                </p>
                
                <div class="request-details">
                    <p style="color: #334155; margin-bottom: 15px; font-weight: bold; font-size: 18px;">Request Information:</p>
                    
                    <div class="detail-item">
                        <span class="detail-label">Request ID:</span>
                        <span class="detail-value">${data.requestId}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Student:</span>
                        <span class="detail-value">${data.studentName} (${data.studentId})</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${data.email}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Course:</span>
                        <span class="detail-value">${data.course}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Equipment:</span>
                        <span class="detail-value">${data.equipmentName} (ID: ${data.equipmentId})</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Duration:</span>
                        <span class="detail-value">${data.borrowDuration}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Purpose:</span>
                        <span class="detail-value">${data.purpose}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Submitted:</span>
                        <span class="detail-value">${new Date().toLocaleString()}</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 25px 0;">
                    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/borrow-requests" 
                       class="action-button">
                       Review Request in Admin Panel
                    </a>
                </div>
                
                <p style="color: #475569; font-size: 14px;">
                    <strong>Note:</strong> Please review this request within 24 hours. The student has been notified that their request is pending review.
                </p>
            </div>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} CHMSU Fisheries System - Admin Notification</p>
                <p style="font-size: 11px; margin-top: 5px;">
                    This is an automated notification from the Fisheries System.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Send email function
const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"CHMSU Fisheries System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
};

// Cleanup function for expired OTPs
function cleanupExpiredOtps() {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  }
}

// GET - Fetch borrowing requests for a student with email included
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'School ID is required to view your borrowing requests.' 
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Explicitly select all fields including email
    const requests = await GuestBorrowing.find({ 
      schoolId: schoolId.trim() 
    })
    .select('requestId schoolId firstName lastName email course year section purpose equipmentId equipmentName borrowDuration requestedDate status adminNotes createdAt updatedAt isVerified')
    .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: requests,
      count: requests.length
    });

  } catch (error: any) {
    console.error('Error in GET request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request' 
      },
      { status: 500 }
    );
  }
}

// POST - Handle OTP sending OR borrowing request submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📨 Received POST request with body:', body);

    // Check if this is an OTP request
    const isOtpRequest = body.email && !body.equipmentId;
    
    if (isOtpRequest) {
      // Handle OTP sending
      const { email, firstName, lastName } = body;

      if (!email) {
        return NextResponse.json(
          { success: false, error: 'Email is required' },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Generate OTP
      const otp = generateOTP();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now

      // Store OTP with user data
      otpStore.set(email, {
        otp,
        expiresAt,
        verified: false,
        firstName: firstName || '',
        lastName: lastName || ''
      });

      console.log('📧 Generated OTP for:', email, 'OTP:', otp, 'Expires:', new Date(expiresAt).toLocaleString());

      // Send OTP email
      const name = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
      const emailHtml = createOtpEmail(name, otp);
      
      const emailSent = await sendEmail(
        email,
        'CHMSU Fisheries System - Email Verification Code',
        emailHtml
      );

      if (!emailSent) {
        console.error('❌ Failed to send email to:', email);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to send verification email. Please check if email service is configured properly.' 
          },
          { status: 500 }
        );
      }

      console.log('✅ OTP email sent successfully to:', email);

      // Clean up old OTPs
      cleanupExpiredOtps();

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email. Please check your inbox.',
        expiresIn: '5 minutes'
      });
    } else {
      // Handle borrowing request submission
      return await handleBorrowRequestSubmission(body);
    }

  } catch (error: any) {
    console.error('💥 Error in POST request:', error);
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

// Handle borrowing request submission
async function handleBorrowRequestSubmission(body: any) {
  try {
    await connectDB();

    const {
      schoolId,
      firstName,
      lastName,
      email,
      course,
      year,
      section,
      purpose,
      equipmentId,
      borrowDuration = "1 week"
    } = body;

    console.log('🔄 Processing borrow request:', { schoolId, email, equipmentId });

    // Validate required fields
    if (!schoolId || !firstName || !lastName || !email || !course || !year || !section || !purpose || !equipmentId) {
      console.error('❌ Missing required fields:', { schoolId, firstName, lastName, email, course, year, section, purpose, equipmentId });
      return NextResponse.json(
        { 
          success: false, 
          error: 'All fields are required. Please fill in all the required fields.' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email is verified in OTP store
    const storedData = otpStore.get(email);
    if (!storedData || !storedData.verified) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email is not verified. Please verify your email before submitting the request.',
          requiresVerification: true
        },
        { status: 400 }
      );
    }

    // Check if OTP verification is still valid (not expired)
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email verification has expired. Please verify your email again.',
          requiresVerification: true
        },
        { status: 400 }
      );
    }

    console.log('🔍 Looking for equipment with ID:', equipmentId);
    
    // Check if equipmentId is a valid MongoDB ObjectId
    let equipment;
    
    if (mongoose.Types.ObjectId.isValid(equipmentId)) {
      equipment = await Inventory.findOne({
        $or: [
          { _id: equipmentId },
          { itemId: equipmentId }
        ]
      });
    } else {
      equipment = await Inventory.findOne({ 
        itemId: equipmentId 
      });
    }

    if (!equipment) {
      console.error('❌ Equipment not found:', equipmentId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Equipment not found. Please check the equipment ID and try again.' 
        },
        { status: 404 }
      );
    }

    console.log('📦 Found equipment:', {
      id: equipment._id,
      itemId: equipment.itemId,
      name: equipment.name,
      condition: equipment.condition,
      canBeBorrowed: equipment.canBeBorrowed,
      quantity: equipment.quantity,
      availableQuantity: equipment.availableQuantity
    });

    // Check if equipment can be borrowed
    if (!equipment.canBeBorrowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This equipment is not available for borrowing.' 
        },
        { status: 400 }
      );
    }

    // Check equipment status and condition
    if (equipment.status !== 'Active') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Equipment is not active. Current status: ${equipment.status}` 
        },
        { status: 400 }
      );
    }

    if (equipment.condition === 'Under Maintenance' || equipment.condition === 'Out of Stock') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Equipment is not available. Current condition: ${equipment.condition}` 
        },
        { status: 400 }
      );
    }

    if (equipment.maintenanceNeeds !== 'No') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Equipment requires maintenance. Status: ${equipment.maintenanceNeeds}` 
        },
        { status: 400 }
      );
    }

    // Calculate borrowing availability
    const maintenanceImpact = equipment.maintenanceQuantity || 0;
    const calibrationImpact = equipment.calibrationQuantity || 0;
    const disposalImpact = equipment.disposalQuantity || 0;
    const borrowedImpact = equipment.borrowedQuantity || 0;
    
    const realAvailableQuantity = Math.max(0, equipment.quantity - maintenanceImpact - calibrationImpact - disposalImpact - borrowedImpact);
    
    const canBeBorrowed = equipment.canBeBorrowed && 
                         realAvailableQuantity > 0 &&
                         equipment.condition !== 'Under Maintenance' &&
                         equipment.condition !== 'Out of Stock' &&
                         equipment.maintenanceNeeds === 'No' &&
                         equipment.status === 'Active';

    const borrowingAvailableQuantity = canBeBorrowed ? realAvailableQuantity : 0;

    if (!canBeBorrowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Equipment is not available for borrowing. Current status: ${equipment.condition}, Maintenance: ${equipment.maintenanceNeeds}` 
        },
        { status: 400 }
      );
    }

    if (borrowingAvailableQuantity < 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Equipment is currently unavailable for borrowing.` 
        },
        { status: 400 }
      );
    }

    // Check if user already has a pending request for this equipment
    const existingRequest = await GuestBorrowing.findOne({
      schoolId: schoolId.trim(),
      equipmentId: equipment.itemId,
      status: 'pending'
    });

    if (existingRequest) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You already have a pending request for this equipment.' 
        },
        { status: 400 }
      );
    }

    // Create borrowing request WITH EMAIL
    const borrowingRequest = new GuestBorrowing({
      requestId: `GBR-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      schoolId: schoolId.trim(),
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      email: email.trim(), // Save email
      course: course.trim(),
      year: year.toString().trim(),
      section: section.trim(),
      purpose: purpose.trim(),
      equipmentId: equipment.itemId,
      equipmentName: equipment.name,
      borrowDuration,
      status: 'pending',
      requestedDate: new Date(),
      isVerified: true // Mark as verified since OTP was verified
    });

    await borrowingRequest.save();
    
    const requestId = borrowingRequest._id ? borrowingRequest._id.toString() : 'N/A';
    
    console.log('✅ Borrowing request created successfully:', {
      requestId: requestId,
      equipment: equipment.name,
      student: `${firstName} ${lastName}`,
      email: email
    });

    // Send email notifications (async - don't wait for it to complete)
    try {
      // Student confirmation email
      const studentEmailHtml = createBorrowRequestEmail({
        firstName,
        lastName,
        email, // Pass email to the email template
        course,
        year,
        section,
        schoolId,
        purpose,
        equipmentName: equipment.name,
        equipmentId: equipment.itemId,
        borrowDuration,
        requestId: requestId,
        requestedDate: borrowingRequest.requestedDate
      });

      // Send to student
      await sendEmail(
        email,
        `Borrowing Request Confirmation - ${requestId.substring(0, 8).toUpperCase()}`,
        studentEmailHtml
      );

      console.log('✅ Confirmation email sent to student:', email);

      // Admin notification email (if admin email is configured)
      if (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_USER) {
        const adminEmailHtml = createAdminNotificationEmail({
          studentName: `${firstName} ${lastName}`,
          studentId: schoolId,
          course: course,
          equipmentName: equipment.name,
          equipmentId: equipment.itemId,
          purpose: purpose,
          borrowDuration: borrowDuration,
          requestId: requestId,
          email: email
        });

        await sendEmail(
          process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_USER!,
          `New Borrowing Request - ${requestId.substring(0, 8).toUpperCase()} - Requires Review`,
          adminEmailHtml
        );
        
        console.log('✅ Admin notification email sent');
      }

    } catch (emailError) {
      console.error('⚠️ Email sending failed (continuing anyway):', emailError);
    }

    // Remove OTP after successful submission
    otpStore.delete(email);

    return NextResponse.json({
      success: true,
      data: borrowingRequest,
      message: 'Borrowing request submitted successfully! Our team will review your request and contact you within 24 hours.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('💥 Error creating borrowing request:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Duplicate request detected. Please try again.' 
        },
        { status: 409 }
      );
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((e: any) => e.message).join(', ');
      console.error('❌ Validation error:', validationErrors);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation error: ' + validationErrors 
        },
        { status: 400 }
      );
    }

    if (error.name === 'CastError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid equipment ID format. Please try again or contact support.' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit borrowing request. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PATCH - Verify OTP
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔐 Received PATCH request for OTP verification:', { email: body.email });

    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: 'OTP must be 6 digits' },
        { status: 400 }
      );
    }

    // Get stored OTP
    const storedData = otpStore.get(email);
    
    if (!storedData) {
      console.error('❌ No OTP found for email:', email);
      return NextResponse.json(
        { success: false, error: 'No OTP found for this email. Please request a new one.' },
        { status: 404 }
      );
    }

    // Check if OTP is expired
    if (Date.now() > storedData.expiresAt) {
      console.error('❌ OTP expired for email:', email);
      otpStore.delete(email);
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      console.error('❌ Invalid OTP for email:', email, 'Expected:', storedData.otp, 'Received:', otp);
      return NextResponse.json(
        { success: false, error: 'Invalid OTP. Please try again.' },
        { status: 400 }
      );
    }

    // Mark as verified
    storedData.verified = true;
    otpStore.set(email, storedData);

    console.log('✅ OTP verified successfully for email:', email);

    // Clean up old OTPs
    cleanupExpiredOtps();

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
      verified: true
    });

  } catch (error: any) {
    console.error('💥 Error in PATCH request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify OTP',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}