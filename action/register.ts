"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import User from "@/models/User";
import OTP from "@/models/OTP";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

dotenv.config();

// Cloudflare Turnstile verification function
async function verifyTurnstile(token: string): Promise<boolean> {
  // In development with test keys, always return true
  if (process.env.NODE_ENV === 'development' && 
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === '0x4AAAAAACFwvpV0Oce3q7yJ') {
    console.log('⚠️ Development mode: Skipping Turnstile verification');
    return true;
  }

  try {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    
    if (!secretKey) {
      console.error('❌ Turnstile secret key not configured');
      return false;
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    
    // Check if Turnstile verification was successful
    if (data.success) {
      console.log('✅ Turnstile verification passed');
      return true;
    } else {
      console.error('❌ Turnstile verification failed:', data['error-codes'] || data);
      return false;
    }
  } catch (error) {
    console.error('❌ Turnstile verification error:', error);
    return false;
  }
}

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

// Send OTP email
export async function sendOTP(email: string, turnstileToken?: string) {
  try {
    console.log("📧 Sending OTP to:", email);

    // Verify Turnstile if token is provided (for production)
    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken);
      if (!isTurnstileValid) {
        throw new Error("Security verification failed. Please complete the security check.");
      }
    } else if (process.env.NODE_ENV === 'production') {
      // In production, require Turnstile
      throw new Error("Security verification required. Please complete the security check.");
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      throw new Error("Please enter a valid email address.");
    }

    // Check MongoDB connection
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri || typeof mongoUri !== "string") {
      throw new Error("MongoDB connection string is not configured.");
    }

    if (!mongoose.connection.readyState) {
      try {
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB successfully");
      } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw new Error("Failed to connect to the database.");
      }
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      throw new Error("Email already registered. Please sign in.");
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save OTP to database
    await OTP.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      {
        email: email.trim().toLowerCase(),
        otp: otpCode,
        expiresAt,
        attempts: 0,
      },
      { upsert: true, new: true }
    );

    // Get base URL for images
    let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
    
    if (!baseUrl) {
      // If no environment variable, use localhost for development
      baseUrl = 'http://localhost:3000';
    } else if (!baseUrl.startsWith('http')) {
      // Ensure protocol is included
      baseUrl = `https://${baseUrl}`;
    }

    console.log('Using base URL for images:', baseUrl);

    const logoWhiteUrl = `${baseUrl}/images/logo-white.png`;
    const chmsuLogoUrl = `${baseUrl}/images/chmsu.png`;

    // Send email with logos
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email.trim().toLowerCase(),
      subject: 'CHMSU Fisheries System - Email Verification',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CHMSU Fisheries System - Email Verification</title>
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
                .logo-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 25px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                .logo {
                    height: 60px;
                    width: auto;
                    object-fit: contain;
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
                    .logo-container {
                        gap: 15px;
                    }
                    .logo {
                        height: 50px;
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
                    <div class="subtitle">Email Verification Code</div>
                </div>
                <div class="content">
                    <p style="color: #334155; margin-bottom: 15px;">Hello,</p>
                    <p style="color: #475569;">You are registering for the <strong>CHMSU Fisheries System</strong>. Use the verification code below to complete your registration:</p>
                    
                    <div class="otp-code">${otpCode}</div>
                    
                    <div class="instructions">
                        Enter this 6-digit code in the verification form to complete your registration.
                    </div>
                    
                    <div class="warning">
                        <strong>Important:</strong> This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
                    </div>
                    
                    <p style="color: #475569; margin-top: 20px;">
                        If you didn't request this verification code, please ignore this email or contact support if you're concerned about your account's security.
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
    console.log("✅ OTP sent successfully to:", email);

    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("❌ OTP sending error:", error);
    
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("Failed to send verification email. Please try again.");
    }
  }
}

// Verify OTP
export async function verifyOTP(email: string, otp: string, turnstileToken?: string) {
  try {
    console.log("🔍 Verifying OTP for:", email);

    // Verify Turnstile if token is provided (for production)
    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken);
      if (!isTurnstileValid) {
        throw new Error("Security verification failed. Please complete the security check.");
      }
    } else if (process.env.NODE_ENV === 'production') {
      // In production, require Turnstile
      throw new Error("Security verification required. Please complete the security check.");
    }

    // Check MongoDB connection
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri || typeof mongoUri !== "string") {
      throw new Error("MongoDB connection string is not configured.");
    }

    if (!mongoose.connection.readyState) {
      try {
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB successfully");
      } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw new Error("Failed to connect to the database.");
      }
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ 
      email: email.trim().toLowerCase(),
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      throw new Error("OTP has expired or is invalid. Please request a new one.");
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      await OTP.findOneAndUpdate(
        { email: email.trim().toLowerCase() },
        { $inc: { attempts: 1 } }
      );
      
      throw new Error("Invalid OTP code. Please try again.");
    }

    // OTP verified successfully - delete the OTP record
    await OTP.findOneAndDelete({ email: email.trim().toLowerCase() });

    console.log("✅ OTP verified successfully for:", email);
    return { success: true, message: "OTP verified successfully" };
  } catch (error) {
    console.error("❌ OTP verification error:", error);
    
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("OTP verification failed. Please try again.");
    }
  }
}

// Main registration function
export async function register(formData: FormData) {
  try {
    // Extract form data
    const email = formData.get("email") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const schoolYear = formData.get("year") as string;
    const section = formData.get("section") as string;
    const schoolID = formData.get("schoolId") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
    const profileImage = formData.get("profileImage") as File | null;
    const turnstileToken = formData.get("turnstileToken") as string | null;

    console.log("📝 Registration attempt:", { email, firstName, lastName, schoolID });

    // Verify Turnstile if token is provided (for production)
    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken);
      if (!isTurnstileValid) {
        throw new Error("Security verification failed. Please complete the security check.");
      }
    } else if (process.env.NODE_ENV === 'production') {
      // In production, require Turnstile
      throw new Error("Security verification required. Please complete the security check.");
    }

    // Validate inputs
    if (!email || !firstName || !lastName || !schoolYear || !section || !schoolID || !password || !role) {
      throw new Error("All fields are required.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      throw new Error("Please enter a valid email address.");
    }

    const yearNum = Number(schoolYear);
    if (isNaN(yearNum) || yearNum < 1 || yearNum > 5) {
      throw new Error("Please enter a valid year (1-5).");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    if (role.toLowerCase() !== "student") {
      throw new Error("Only student role is allowed.");
    }

    // Check MongoDB connection
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri || typeof mongoUri !== "string") {
      throw new Error("MongoDB connection string is not configured. Please set MONGODB_URI in .env.");
    }

    if (!mongoose.connection.readyState) {
      try {
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB successfully");
      } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw new Error("Failed to connect to the database.");
      }
    }

    // Check for existing email (double check)
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      throw new Error("Email already registered. Please sign in.");
    }

    // Check for existing school ID
    const existingSchoolID = await User.findOne({ schoolID: schoolID.trim() });
    if (existingSchoolID) {
      throw new Error("School ID already registered.");
    }

    // Handle profile image if provided - Convert to Base64
    let profileImageBase64 = "";
    if (profileImage && profileImage.size > 0) {
      try {
        // Validate file type
        if (!profileImage.type.startsWith('image/')) {
          throw new Error("Invalid file type. Please upload an image.");
        }

        // Validate file size (2MB limit)
        if (profileImage.size > 2 * 1024 * 1024) {
          throw new Error("Image size must be less than 2MB.");
        }

        // Convert file to Base64
        const bytes = await profileImage.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        
        // Create data URL
        profileImageBase64 = `data:${profileImage.type};base64,${base64}`;

        console.log("✅ Profile image converted to Base64 successfully");

      } catch (error) {
        console.error("❌ Profile image processing error:", error);
        // Don't throw error for image upload issues, just continue without image
        profileImageBase64 = "";
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      schoolID: schoolID.trim(),
      schoolYear: schoolYear.trim(),
      section: section.trim(),
      password: hashedPassword,
      role: "student",
      status: "active",
      lastLogin: new Date(),
      loginCount: 0,
      profileImage: profileImageBase64,
      emailVerified: true,
    });

    // Save user to database
    try {
      await newUser.save();
      console.log("✅ User created successfully:", newUser.email);
    } catch (error) {
      console.error("❌ User creation error:", error);
      throw new Error("Failed to create user. Please try again.");
    }

    // Generate JWT token for authentication
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      { 
        userId: newUser._id.toString(), 
        email: newUser.email,
        role: newUser.role 
      },
      jwtSecret,
      { expiresIn: "1d" }
    );

    // Set authentication cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    console.log("✅ Registration completed successfully, redirecting to dashboard");

    // Send welcome email
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: newUser.email,
        subject: 'Welcome to CHMSU Fisheries System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a; text-align: center;">Welcome to CHMSU Fisheries System!</h2>
            <p>Hello <strong>${newUser.firstName} ${newUser.lastName}</strong>,</p>
            <p>Your account has been successfully created and is now ready to use.</p>
            <p>You can now access all features of the CHMSU Fisheries System with your registered credentials.</p>
            <br />
            <p><strong>Account Details:</strong></p>
            <ul>
              <li><strong>Name:</strong> ${newUser.firstName} ${newUser.lastName}</li>
              <li><strong>Email:</strong> ${newUser.email}</li>
              <li><strong>School ID:</strong> ${newUser.schoolID}</li>
              <li><strong>Year & Section:</strong> ${newUser.schoolYear} - ${newUser.section}</li>
            </ul>
            <br />
            <p>Best regards,<br />CHMSU Fisheries System Team</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log("✅ Welcome email sent successfully");
    } catch (emailError) {
      console.error("❌ Welcome email error:", emailError);
      // Don't throw error for email issues, registration is still successful
    }

    // Redirect to user dashboard
    redirect("/user/download");

  } catch (error) {
    console.error("❌ Registration error:", error);
    
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("An unexpected error occurred during registration.");
    }
  }
}