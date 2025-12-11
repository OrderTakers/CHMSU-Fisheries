// lib/auth-middleware.ts
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import connectDB from '@/lib/db';

export interface AuthUser {
  id: string;  // This will be set to _id.toString()
  _id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  schoolID: string;
  schoolYear?: string;
  section?: string;
  profileImage?: string;
  status?: string;
}

export async function authenticateRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Get token from cookie
    const cookie = request.cookies.get('auth_token');
    const token = cookie?.value;

    if (!token) {
      return null;
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured');
      return null;
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };
    
    // Connect to database
    await connectDB();
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return null;
    }

    // Check if user is active
    if (user.status !== 'active') {
      return null;
    }

    return {
      id: user._id.toString(),  // Set id to _id
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      schoolID: user.schoolID,
      schoolYear: user.schoolYear,
      section: user.section,
      profileImage: user.profileImage,
      status: user.status
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}