import { NextResponse } from "next/server";
import { validateAuth } from "@/action/auth";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET() {
  try {
    console.log("📥 Fetching student profile...");
    
    // Get user from auth validation
    const authResult = await validateAuth();
    
    if (!authResult.isValid || !authResult.user) {
      console.log("❌ No valid authentication found");
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    console.log("🔍 Looking for user with ID:", authResult.user._id);

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("❌ MONGODB_URI not configured");
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      );
    }

    if (!mongoose.connection.readyState) {
      try {
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");
      } catch (dbError) {
        console.error("❌ MongoDB connection error:", dbError);
        return NextResponse.json(
          { error: "Database connection failed" },
          { status: 500 }
        );
      }
    }

    const user = await User.findById(authResult.user._id);
    
    if (!user) {
      console.log("❌ User not found in database");
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log("✅ User profile found:", user.email);
    
    return NextResponse.json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        schoolID: user.schoolID,
        schoolYear: user.schoolYear,
        section: user.section,
        role: user.role,
        profileImage: user.profileImage,
        status: user.status,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });

  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}