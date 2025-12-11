// api/users/bulk-status/route.ts
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
      await mongoose.connect(mongoUri, { 
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log("✅ Connected to MongoDB");
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }
}

// PATCH /api/users/bulk-status - update all student users status
export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { status } = body;

    if (!status || !["active", "inactive"].includes(status)) {
      return NextResponse.json({ error: "Valid status (active/inactive) is required" }, { status: 400 });
    }

    console.log(`🔄 Bulk updating student users status to: ${status}`);

    // Use transaction for better reliability
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();

      // Update all students
      const result = await User.updateMany(
        { role: "student" },
        { 
          $set: { 
            status: status,
          } 
        },
        { session }
      );

      await session.commitTransaction();
      
      console.log(`✅ Bulk status update completed: ${result.modifiedCount} students updated to ${status}`);

      return NextResponse.json({ 
        success: true,
        message: `Successfully updated ${result.modifiedCount} students to ${status}`,
        modifiedCount: result.modifiedCount
      }, { status: 200 });

    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (error: any) {
    console.error("❌ Error in bulk status update:", error);
    
    // Provide more specific error messages
    if (error.name === 'MongoNetworkError') {
      return NextResponse.json({ error: "Database connection failed. Please try again." }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: "Failed to update student statuses: " + (error.message || "Unknown error")
    }, { status: 500 });
  }
}