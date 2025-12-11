// app/api/auth/register/route.ts (or wherever you handle user registration)
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    
    // Create user
    const user = await User.create(userData);
    
    // If user is student or faculty, create notification for admin
    if (user.role === "student" || user.role === "faculty") {
      // Find all admin users
      const adminUsers = await User.find({ role: "admin" });
      
      // Create notifications for each admin
      const notificationPromises = adminUsers.map(admin => 
        Notification.create({
          type: "NEW_USER_REGISTRATION",
          title: "New User Registration",
          message: `${user.firstName} ${user.lastName} (${user.role}) has registered and is pending activation.`,
          recipient: admin._id,
          relatedEntity: user._id,
          relatedEntityModel: "User",
          priority: "MEDIUM",
          actionUrl: `/admin/users?tab=pending`
        })
      );
      
      await Promise.all(notificationPromises);
    }
    
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}