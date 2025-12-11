"use server";

import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// Register
export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolID: string;
  schoolYear: string;
  section: string;
}) {
  try {
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: data.email },
        { schoolID: data.schoolID }
      ]
    });
    
    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new Error("Email already registered.");
      }
      if (existingUser.schoolID === data.schoolID) {
        throw new Error("School ID already registered.");
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      schoolID: data.schoolID,
      schoolYear: data.schoolYear,
      section: data.section,
      password: hashedPassword,
      role: "student",
    });

    // Generate JWT token for auto-login after registration
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured.");
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

    // Set authentication cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 1 day in seconds
      path: "/",
    });

    // Prepare user data without password
    const userData = {
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

    return { success: true, user: userData };
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

// Login function in action/auth.ts - update the return part
export async function login(email: string, password: string) {
  try {
    await connectDB();

    // Find user with password included for verification
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      throw new Error("Invalid email or password.");
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error("Invalid email or password.");
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured.");
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

    // Set authentication cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 1 day in seconds
      path: "/",
    });

    // Update user login info
    const updatedUser = await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      $inc: { loginCount: 1 },
      status: "active"
    }, { new: true });

    // Prepare complete user data with all required fields
    const userData = {
      _id: updatedUser._id.toString(),
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      schoolID: updatedUser.schoolID,
      schoolYear: updatedUser.schoolYear,
      section: updatedUser.section,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage || "",
      status: updatedUser.status,
      lastLogin: updatedUser.lastLogin,
      loginCount: updatedUser.loginCount,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    return { success: true, user: userData };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// Get current user (for client-side auth state)
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return null;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return null;
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };
    
    await connectDB();
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return null;
    }

    return {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      schoolID: user.schoolID,
      schoolYear: user.schoolYear,
      section: user.section,
      role: user.role,
      profileImage: user.profileImage,
      status: user.status,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Validate token and get user
export async function validateAuth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return { isValid: false, user: null };
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return { isValid: false, user: null };
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };
    
    await connectDB();
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return { isValid: false, user: null };
    }

    return { 
      isValid: true, 
      user: {
        _id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolID: user.schoolID,
        schoolYear: user.schoolYear,
        section: user.section,
        role: user.role,
        profileImage: user.profileImage,
      }
    };
  } catch (error) {
    return { isValid: false, user: null };
  }
}

// Logout
export async function logout() {
  try {
    const cookieStore = await cookies();
    
    // Delete auth token cookie
    if (cookieStore.has("auth_token")) {
      cookieStore.delete("auth_token");
    }

    console.log("✅ Logout completed successfully");
  } catch (error) {
    console.error("❌ Error during logout:", error);
  }

  redirect("/");
}