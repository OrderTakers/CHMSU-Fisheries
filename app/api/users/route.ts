// api/users/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import OTP from "@/models/OTP";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
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

// Generate secure 8-character password (letters and numbers only)
const generateSecurePassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  
  // Ensure at least one character from each category
  let password = '';
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // Fill remaining 5 characters with any combination of letters and numbers
  const allChars = uppercase + lowercase + numbers;
  for (let i = 0; i < 5; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Send welcome email with auto-generated password
async function sendWelcomeEmail(email: string, userData: any, password: string) {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email.trim().toLowerCase(),
      subject: 'Welcome to CHMSU Fisheries System - Your Account Details',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to CHMSU Fisheries System</title>
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
                .credentials {
                    background: #e8f5e8;
                    border: 1px solid #16a34a;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .password-box {
                    background: #1e293b;
                    color: #f1f5f9;
                    padding: 15px;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 18px;
                    text-align: center;
                    margin: 15px 0;
                    letter-spacing: 1px;
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
                .instructions {
                    color: #475569;
                    font-size: 14px;
                    text-align: center;
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
                .contact-info {
                    margin-top: 10px;
                    font-size: 11px;
                }
                @media (max-width: 600px) {
                    .container {
                        padding: 20px;
                    }
                    .password-box {
                        font-size: 16px;
                        padding: 12px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="system-name">CHMSU Fisheries System</div>
                    <div class="subtitle">Your Account Has Been Created</div>
                </div>
                
                <div class="content">
                    <p style="color: #334155; margin-bottom: 15px;">Hello ${userData.firstName} ${userData.lastName},</p>
                    <p style="color: #475569;">An administrator has created an account for you in the <strong>CHMSU Fisheries System</strong>. Below are your login credentials:</p>
                    
                    <div class="credentials">
                        <p style="color: #334155; margin-bottom: 10px;"><strong>Account Details:</strong></p>
                        <p style="color: #475569; margin: 5px 0;"><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</p>
                        <p style="color: #475569; margin: 5px 0;"><strong>Email:</strong> ${userData.email}</p>
                        <p style="color: #475569; margin: 5px 0;"><strong>School ID:</strong> ${userData.schoolID}</p>
                        <p style="color: #475569; margin: 5px 0;"><strong>Role:</strong> ${userData.role}</p>
                        ${userData.role === 'student' ? `<p style="color: #475569; margin: 5px 0;"><strong>Year & Section:</strong> ${userData.schoolYear} - ${userData.section}</p>` : ''}
                        
                        <div style="margin: 20px 0;">
                            <p style="color: #334155; margin-bottom: 10px;"><strong>Your Auto-Generated Password:</strong></p>
                            <div class="password-box">${password}</div>
                        </div>
                    </div>
                    
                    <div class="instructions">
                        Please log in to the system using your School ID and the password above.
                    </div>
                    
                    <div class="warning">
                        <strong>Important Security Notice:</strong><br>
                        • This is an auto-generated password<br>
                        • Change your password after first login<br>
                        • Do not share your credentials with anyone<br>
                        • Keep your password secure and confidential
                    </div>
                    
                    <p style="color: #475569; margin-top: 20px;">
                        You can access the system at: <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="color: #16a34a;">${process.env.NEXTAUTH_URL || 'http://localhost:3000'}</a>
                    </p>
                    
                    <p style="color: #475569;">
                        If you have any questions or need assistance, please contact the system administrator.
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
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Welcome email sent successfully to:", email);
    return true;
  } catch (error) {
    console.error("❌ Welcome email sending error:", error);
    throw new Error("Failed to send welcome email");
  }
}

// Send OTP email for admin user creation
async function sendAdminOTP(email: string, otpCode: string, userData: any) {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email.trim().toLowerCase(),
      subject: 'CHMSU Fisheries System - Account Verification',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CHMSU Fisheries System - Account Verification</title>
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
                .otp-code {
                    background: linear-gradient(135deg, #16a34a, #22c55e);
                    color: white;
                    padding: 20px 40px;
                    font-size: 36px;
                    font-weight: bold;
                    text-align: center;
                    border-radius: 12px;
                    letter-spacing: 8px;
                    margin: 30px 0;
                    box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3);
                    font-family: 'Courier New', monospace;
                }
                .instructions {
                    color: #475569;
                    font-size: 14px;
                    text-align: center;
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
                .user-details {
                    background: #e8f5e8;
                    border: 1px solid #16a34a;
                    border-radius: 8px;
                    padding: 15px;
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
                .contact-info {
                    margin-top: 10px;
                    font-size: 11px;
                }
                @media (max-width: 600px) {
                    .container {
                        padding: 20px;
                    }
                    .otp-code {
                        font-size: 28px;
                        padding: 15px 20px;
                        letter-spacing: 6px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="system-name">CHMSU Fisheries System</div>
                    <div class="subtitle">Account Verification Code</div>
                </div>
                
                <div class="content">
                    <p style="color: #334155; margin-bottom: 15px;">Hello,</p>
                    <p style="color: #475569;">An administrator has created an account for you in the <strong>CHMSU Fisheries System</strong>. Use the verification code below to activate your account:</p>
                    
                    <div class="otp-code">${otpCode}</div>
                    
                    <div class="user-details">
                        <p style="color: #334155; margin-bottom: 10px;"><strong>Account Details:</strong></p>
                        <p style="color: #475569; margin: 5px 0;"><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</p>
                        <p style="color: #475569; margin: 5px 0;"><strong>Email:</strong> ${userData.email}</p>
                        <p style="color: #475569; margin: 5px 0;"><strong>School ID:</strong> ${userData.schoolID}</p>
                        <p style="color: #475569; margin: 5px 0;"><strong>Role:</strong> ${userData.role}</p>
                        ${userData.role === 'student' ? `<p style="color: #475569; margin: 5px 0;"><strong>Year & Section:</strong> ${userData.schoolYear} - ${userData.section}</p>` : ''}
                    </div>
                    
                    <div class="instructions">
                        Enter this 6-digit code in the verification form to activate your account. A password will be auto-generated and sent to you.
                    </div>
                    
                    <div class="warning">
                        <strong>Important:</strong> This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
                    </div>
                    
                    <p style="color: #475569; margin-top: 20px;">
                        If you didn't expect this account creation, please contact the system administrator immediately.
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
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Admin OTP sent successfully to:", email);
    return true;
  } catch (error) {
    console.error("❌ Admin OTP sending error:", error);
    throw new Error("Failed to send verification email");
  }
}

// MongoDB connection utility
async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || typeof mongoUri !== "string") {
    throw new Error("MongoDB connection string not configured");
  }

  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(mongoUri, { bufferCommands: false });
      console.log("✅ Connected to MongoDB");
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }
}

// GET /api/users - fetch all users
export async function GET() {
  try {
    await connectToDatabase();
    const users = await User.find().select("-password").lean();
    
    // Transform the data to ensure consistent structure
    const transformedUsers = users.map((user: any) => ({
      _id: user._id.toString(),
      schoolID: user.schoolID || "",
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      schoolYear: user.schoolYear || "",
      section: user.section || "",
      profileImage: user.profileImage || "",
      role: user.role || "student",
      status: user.status || "inactive",
      lastLogin: user.lastLogin || null,
      createdAt: user.createdAt || new Date().toISOString(),
      loginCount: user.loginCount || 0,
      emailVerified: user.emailVerified || false,
    }));
    
    return NextResponse.json(transformedUsers, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users - create a new user with OTP verification
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { schoolID, firstName, lastName, email, role, schoolYear, section, profileImage, skipVerification } = body;

    console.log("📨 POST request body:", { schoolID, firstName, lastName, email, role, schoolYear, section, skipVerification });

    if (!schoolID || !firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required fields: schoolID, firstName, lastName, and email are required" }, { status: 400 });
    }

    // Check if schoolID already exists
    const existingUserBySchoolID = await User.findOne({ schoolID });
    if (existingUserBySchoolID) {
      return NextResponse.json({ error: "School ID already registered" }, { status: 400 });
    }

    // Check if email already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // If skipVerification is true, create user directly without OTP
    if (skipVerification) {
      console.log("🚀 Creating user directly (skip verification)");
      
      // Auto-generate 8-character password (letters and numbers only)
      const tempPassword = generateSecurePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      console.log("🔑 Generated 8-character password:", tempPassword);

      // Prepare user data based on role
      const userData: any = {
        schoolID: schoolID.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        role: role || "student",
        password: hashedPassword,
        status: "active",
        profileImage: profileImage || "",
        emailVerified: true,
      };

      // Only add schoolYear and section for students
      if (role === "student") {
        if (!schoolYear || !section) {
          return NextResponse.json({ error: "School Year and section are required for students" }, { status: 400 });
        }
        userData.schoolYear = schoolYear.trim();
        userData.section = section.trim();
      }

      // Validate profile image if provided
      if (profileImage && profileImage.trim() !== "") {
        if (!profileImage.startsWith('data:image/')) {
          return NextResponse.json({ error: "Invalid image format. Please upload a valid image." }, { status: 400 });
        }
      }

      const newUser = new User(userData);
      await newUser.save();

      // Send welcome email with auto-generated password
      try {
        await sendWelcomeEmail(email, userData, tempPassword);
      } catch (emailError) {
        console.error("❌ Failed to send welcome email:", emailError);
        // Continue with user creation even if email fails
      }

      // Return user without password
      const userObject = newUser.toObject();
      const { password: _, ...userWithoutPassword } = userObject;
      
      console.log("✅ User created successfully (no verification):", { 
        id: userWithoutPassword._id,
        name: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
        role: userWithoutPassword.role,
        hasProfileImage: !!userWithoutPassword.profileImage,
      });

      return NextResponse.json(userWithoutPassword, { status: 201 });
    }

    // Normal flow with OTP verification
    console.log("📧 Starting OTP verification flow");
    
    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Prepare user data for OTP email
    const userDataForEmail = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      role: role || "student",
      schoolYear: role === "student" ? schoolYear : "",
      section: role === "student" ? section : ""
    };

    // Generate secure 8-character password for the user (letters and numbers only)
    const userPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(userPassword, 10);
    console.log("🔑 Generated 8-character password for OTP flow:", userPassword);

    // Prepare user data for storage in OTP record
    const userDataForStorage: any = {
      schoolID: schoolID.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      role: role || "student",
      password: hashedPassword,
      profileImage: profileImage || "",
      status: "active",
      emailVerified: true,
      loginCount: 0,
      lastLogin: null,
    };

    // Handle student-specific fields - CRITICAL: Only store for students
    if (role === "student") {
      if (!schoolYear || !section) {
        return NextResponse.json({ error: "School Year and section are required for students" }, { status: 400 });
      }
      userDataForStorage.schoolYear = schoolYear.trim();
      userDataForStorage.section = section.trim();
    } else {
      // For admin/faculty roles, store empty strings
      userDataForStorage.schoolYear = "";
      userDataForStorage.section = "";
    }

    console.log("📦 Storing user data in OTP:", {
      schoolID: userDataForStorage.schoolID,
      role: userDataForStorage.role,
      schoolYear: userDataForStorage.schoolYear,
      section: userDataForStorage.section,
      hasPassword: !!userDataForStorage.password
    });

    // Save OTP to database with user data
    await OTP.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      {
        email: email.trim().toLowerCase(),
        otp: otpCode,
        expiresAt,
        attempts: 0,
        userData: userDataForStorage
      },
      { upsert: true, new: true }
    );

    // Send OTP email
    await sendAdminOTP(email, otpCode, userDataForEmail);

    console.log("✅ OTP sent for user creation:", email);
    return NextResponse.json({ 
      success: true, 
      message: "Verification code sent to user's email",
      requiresVerification: true 
    }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Error creating user:", error);
    
    if (error.name === 'ValidationError') {
      const validationErrors: string[] = [];
      if (error.errors) {
        for (const field in error.errors) {
          validationErrors.push(error.errors[field].message);
        }
      }
      return NextResponse.json({ 
        error: "User validation failed", 
        details: validationErrors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Failed to create user: " + error.message }, { status: 500 });
  }
}

// PATCH /api/users - verify OTP and create user
export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    console.log("🔍 Verifying OTP for email:", email);

    // Find OTP record
    const otpRecord = await OTP.findOne({ 
      email: email.trim().toLowerCase(),
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return NextResponse.json({ error: "OTP has expired or is invalid. Please request a new one." }, { status: 400 });
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      return NextResponse.json({ error: "Too many failed attempts. Please request a new OTP." }, { status: 400 });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      await OTP.findOneAndUpdate(
        { email: email.trim().toLowerCase() },
        { $inc: { attempts: 1 } }
      );
      
      return NextResponse.json({ error: "Invalid OTP code. Please try again." }, { status: 400 });
    }

    // OTP verified successfully - create the user
    const userData = otpRecord.userData;

    if (!userData) {
      console.error("❌ No userData found in OTP record for email:", email);
      return NextResponse.json({ error: "Invalid OTP data. Please request a new verification code." }, { status: 400 });
    }

    console.log("📦 Retrieved user data from OTP:", {
      schoolID: userData.schoolID,
      role: userData.role,
      schoolYear: userData.schoolYear,
      section: userData.section,
      hasPassword: !!userData.password,
      hasFirstName: !!userData.firstName,
      hasLastName: !!userData.lastName,
      hasEmail: !!userData.email
    });

    // Check if user already exists (double check)
    const existingUser = await User.findOne({ 
      $or: [
        { email: userData.email },
        { schoolID: userData.schoolID }
      ]
    });

    if (existingUser) {
      await OTP.findOneAndDelete({ email: email.trim().toLowerCase() });
      return NextResponse.json({ error: "User already exists. Please use a different email or school ID." }, { status: 400 });
    }

    // Create new user with all required fields
    const newUserData: any = {
      schoolID: userData.schoolID,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      role: userData.role,
      password: userData.password,
      profileImage: userData.profileImage || "",
      status: "active",
      emailVerified: true,
      loginCount: 0,
      lastLogin: null,
    };

    // CRITICAL FIX: Only add student fields if role is student
    // For admin/faculty roles, DO NOT include schoolYear and section at all
    if (userData.role === "student") {
      // For students, ensure schoolYear and section are provided
      if (!userData.schoolYear || !userData.section) {
        console.error("❌ Missing student fields for student user:", {
          schoolYear: userData.schoolYear,
          section: userData.section
        });
        return NextResponse.json({ 
          error: "School Year and Section are required for student accounts" 
        }, { status: 400 });
      }
      newUserData.schoolYear = userData.schoolYear;
      newUserData.section = userData.section;
    } else {
      // For admin/faculty roles, explicitly set to empty strings
      // This ensures they pass validation but don't have required values
      newUserData.schoolYear = "";
      newUserData.section = "";
    }

    console.log("👤 Creating user with data:", {
      schoolID: newUserData.schoolID,
      firstName: newUserData.firstName,
      lastName: newUserData.lastName,
      email: newUserData.email,
      role: newUserData.role,
      schoolYear: newUserData.schoolYear,
      section: newUserData.section,
      hasPassword: !!newUserData.password
    });

    // Create and save user
    const newUser = new User(newUserData);
    
    // Validate the user data before saving
    const validationError = newUser.validateSync();
    if (validationError) {
      console.error("❌ User validation failed before save:", validationError.errors);
      throw validationError;
    }
    
    await newUser.save();

    // Delete OTP record
    await OTP.findOneAndDelete({ email: email.trim().toLowerCase() });

    // Send welcome email with auto-generated password
    // Since we stored the hashed password, we can't retrieve the original
    // For security, we'll generate a new 8-character temporary password
    const tempPassword = generateSecurePassword();
    
    try {
      await sendWelcomeEmail(userData.email, {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        schoolID: userData.schoolID,
        role: userData.role,
        schoolYear: userData.schoolYear,
        section: userData.section
      }, tempPassword);
    } catch (emailError) {
      console.error("❌ Failed to send welcome email:", emailError);
      // Continue with user creation even if email fails
    }

    // Return user without password
    const userObject = newUser.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    console.log("✅ User created successfully after OTP verification:", { 
      id: userWithoutPassword._id,
      name: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
      role: userWithoutPassword.role,
      schoolYear: userWithoutPassword.schoolYear,
      section: userWithoutPassword.section
    });

    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error: any) {
    console.error("❌ Error verifying OTP and creating user:", error);
    
    if (error.name === 'ValidationError') {
      const validationErrors: string[] = [];
      if (error.errors) {
        for (const field in error.errors) {
          validationErrors.push(`${field}: ${error.errors[field].message}`);
        }
      }
      console.error("📋 Validation errors:", validationErrors);
      return NextResponse.json({ 
        error: "User validation failed", 
        details: validationErrors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Failed to verify and create user: " + error.message }, { status: 500 });
  }
}

// PUT /api/users - update a user
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    // Get the user document
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("PUT request for user ID:", userId, "Current role:", user.role, "Updates:", updates);

    // Validate profile image if provided
    if (updates.profileImage && updates.profileImage.trim() !== "") {
      if (!updates.profileImage.startsWith('data:image/')) {
        return NextResponse.json({ error: "Invalid image format. Please upload a valid image." }, { status: 400 });
      }
    }

    // Remove password from updates if present
    if (updates.password) {
      delete updates.password;
    }

    // Determine the target role
    const targetRole = updates.role || user.role;

    // Update user fields
    Object.keys(updates).forEach(key => {
      if (key !== 'password' && updates[key] !== undefined) {
        (user as any)[key] = updates[key];
      }
    });

    // Handle student fields based on role
    if (targetRole !== "student") {
      // For non-student roles, clear student fields
      user.schoolYear = "";
      user.section = "";
    } else {
      // For student role, ensure required fields
      if (!user.schoolYear) {
        return NextResponse.json({ error: "School Year is required for students" }, { status: 400 });
      }
      if (!user.section) {
        return NextResponse.json({ error: "Section is required for students" }, { status: 400 });
      }
    }

    // Check uniqueness for schoolID
    if (updates.schoolID && updates.schoolID !== user.schoolID) {
      const existingUser = await User.findOne({ schoolID: updates.schoolID });
      if (existingUser && existingUser._id.toString() !== userId) {
        return NextResponse.json({ error: "School ID already exists" }, { status: 400 });
      }
    }

    // Check uniqueness for email
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser && existingUser._id.toString() !== userId) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }
    }

    console.log("Saving user with data:", {
      role: user.role,
      schoolYear: user.schoolYear,
      section: user.section,
      schoolID: user.schoolID,
      email: user.email
    });

    // Save the user - this will run validators
    await user.save();

    // Remove password from response
    const userObject = user.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    // Ensure consistent response format
    const responseData = {
      _id: userWithoutPassword._id.toString(),
      schoolID: userWithoutPassword.schoolID || "",
      email: userWithoutPassword.email || "",
      firstName: userWithoutPassword.firstName || "",
      lastName: userWithoutPassword.lastName || "",
      schoolYear: userWithoutPassword.schoolYear || "",
      section: userWithoutPassword.section || "",
      profileImage: userWithoutPassword.profileImage || "",
      role: userWithoutPassword.role || "student",
      status: userWithoutPassword.status || "inactive",
      lastLogin: userWithoutPassword.lastLogin || null,
      createdAt: userWithoutPassword.createdAt || new Date().toISOString(),
      loginCount: userWithoutPassword.loginCount || 0,
      emailVerified: userWithoutPassword.emailVerified || false,
    };

    console.log("✅ User updated successfully:", {
      id: responseData._id,
      name: `${responseData.firstName} ${responseData.lastName}`,
      role: responseData.role,
      schoolYear: responseData.schoolYear,
      section: responseData.section
    });

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error("Error updating user:", error);
    
    if (error.name === 'ValidationError') {
      const validationErrors: string[] = [];
      if (error.errors) {
        for (const field in error.errors) {
          validationErrors.push(`${field}: ${error.errors[field].message}`);
        }
      }
      return NextResponse.json({ 
        error: "Validation failed", 
        details: validationErrors 
      }, { status: 400 });
    }
    
    if (error.name === 'CastError') {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }
    
    if (error.code === 11000) {
      // MongoDB duplicate key error
      if (error.keyPattern?.schoolID) {
        return NextResponse.json({ error: "School ID already exists" }, { status: 400 });
      }
      if (error.keyPattern?.email) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: "Failed to update user: " + error.message }, { status: 500 });
  }
}

// DELETE /api/users/[id] - delete a user
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ User deleted successfully:", id);
    return NextResponse.json({ success: true, message: "User deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user: " + error.message }, { status: 500 });
  }
}