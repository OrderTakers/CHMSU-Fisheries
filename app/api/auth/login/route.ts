import { NextResponse } from "next/server";
import User from "@/models/User"; // Adjust path to your User.ts
import { connectDB } from "@/lib/db"; // Adjust path to your DB connection

export async function GET() {
  try {
    await connectDB();

    const users = await User.find({}).select(
      "id email firstName lastName role year section status lastLogin loginCount"
    );

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
