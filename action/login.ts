"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import User from "@/models/User";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";

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

export async function login(formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const turnstileToken = formData.get("turnstileToken")?.toString();

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

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || typeof mongoUri !== "string") {
    throw new Error("MongoDB connection string is not configured. Please set MONGODB_URI in .env.");
  }

  if (!mongoose.connection.readyState) {
    try {
      await mongoose.connect(mongoUri);
      console.log("Connected to MongoDB successfully");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw new Error("Failed to connect to the database.");
    }
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password.");
  }

  // Generate a JWT token
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured. Please set it in .env.");
  }

  const token = jwt.sign(
    { 
      userId: user._id.toString(), 
      email: user.email,
      role: user.role 
    },
    jwtSecret,
    { expiresIn: "1d" }
  );

  // Set authentication cookie - FIXED
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 1 day in seconds
    path: "/",
  });

  // Update user login info
  await User.findByIdAndUpdate(user._id, {
    lastLogin: new Date(),
    $inc: { loginCount: 1 },
    status: "active"
  });

  // Prepare plain user object
  const plainUser = {
    _id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    schoolID: user.schoolID,
    schoolYear: user.schoolYear,
    section: user.section,
    role: user.role,
    profileImage: user.profileImage,
  };

  console.log("User logged in:", plainUser.email);

  // Return user data for client-side store
  return plainUser;
}