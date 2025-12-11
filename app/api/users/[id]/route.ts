// api/users/[id]/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import * as dotenv from "dotenv";

dotenv.config();

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

// Helper function to extract ID from params
function getIdFromParams(params: { id: string }): string {
  return params.id;
}

// PATCH /api/users/[id] - update user status or specific fields
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const id = getIdFromParams(params);
    
    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    const body = await request.json();

    console.log("PATCH request for user ID:", id, "with body:", body);

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
    }

    // Get the user document
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent password updates here for security (handle separately if needed)
    delete body.password;

    // Update user fields
    Object.keys(body).forEach(key => {
      if (body[key] !== undefined) {
        user[key] = body[key];
      }
    });

    // Handle student fields based on role
    if (user.role !== "student") {
      // For non-student roles, clear student fields
      user.schoolYear = "";
      user.section = "";
    }

    // Check if schoolID is being updated and if it already exists
    if (body.schoolID && body.schoolID !== user.schoolID) {
      const existingUser = await User.findOne({ schoolID: body.schoolID });
      if (existingUser && existingUser._id.toString() !== id) {
        return NextResponse.json({ error: "School ID already exists" }, { status: 400 });
      }
    }

    // Check if email is being updated and if it already exists
    if (body.email && body.email !== user.email) {
      const existingUser = await User.findOne({ email: body.email });
      if (existingUser && existingUser._id.toString() !== id) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }
    }

    console.log("PATCH saving user:", {
      id: user._id,
      role: user.role,
      status: user.status,
      schoolYear: user.schoolYear,
      section: user.section
    });

    // Save the user
    await user.save();

    // Return complete user data
    const responseData = {
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
    };

    console.log("PATCH updated user:", {
      id: responseData._id,
      status: responseData.status,
      role: responseData.role
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
    
    return NextResponse.json({ error: "Failed to update user: " + error.message }, { status: 500 });
  }
}

// DELETE /api/users/[id] - delete a user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const id = getIdFromParams(params);

    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    console.log("DELETE request for user ID:", id);

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("DELETE successful for user ID:", id);

    return NextResponse.json({ 
      message: "User deleted successfully",
      deletedUserId: id 
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user: " + error.message }, { status: 500 });
  }
}

// GET /api/users/[id] - get specific user
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const id = getIdFromParams(params);

    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return complete user data
    const responseData = {
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
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user: " + error.message }, { status: 500 });
  }
}