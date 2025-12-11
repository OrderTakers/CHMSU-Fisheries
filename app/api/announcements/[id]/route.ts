// app/api/announcements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Announcement, { IAnnouncement } from '@/models/Announcement';
import User from '@/models/User';
import mongoose from 'mongoose';

// Helper function to convert announcement to plain object with id
const announcementToObject = (announcement: IAnnouncement) => {
  const obj = announcement.toObject ? announcement.toObject() : announcement;
  return {
    ...obj,
    id: (announcement._id as mongoose.Types.ObjectId).toString(),
    _id: (announcement._id as mongoose.Types.ObjectId).toString()
  };
};

// Helper function to validate announcement data for updates
const validateAnnouncementUpdateData = (data: any) => {
  const errors: string[] = [];
  
  // Required fields validation
  const requiredFields = ['title', 'message', 'type', 'priority', 'targetAudience'];
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Type validation
  const validTypes = ['general', 'maintenance', 'urgent', 'update', 'reminder'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }
  
  // Priority validation
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (data.priority && !validPriorities.includes(data.priority)) {
    errors.push(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
  }
  
  // Target audience validation
  if (data.targetAudience && (!Array.isArray(data.targetAudience) || data.targetAudience.length === 0)) {
    errors.push('Target audience must be a non-empty array');
  }
  
  // Specific users validation if target audience is 'specific'
  if (data.targetAudience?.includes('specific') && (!data.specificUsers || !Array.isArray(data.specificUsers))) {
    errors.push('Specific users array is required when target audience includes "specific"');
  }
  
  return errors;
};

// GET /api/announcements/[id] - Get a specific announcement by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Announcement ID is required' 
        },
        { status: 400 }
      );
    }
    
    console.log('Fetching announcement with ID:', id);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid announcement ID format' 
        },
        { status: 400 }
      );
    }
    
    // Find announcement and populate related data
    const announcement = await Announcement.findById(id)
      .populate('createdBy', 'firstName lastName email role')
      .populate('specificUsers', 'firstName lastName email schoolID')
      .populate('readBy.user', 'firstName lastName email schoolID');
    
    if (!announcement) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Announcement not found' 
        },
        { status: 404 }
      );
    }
    
    console.log('Found announcement:', {
      id: announcement._id,
      title: announcement.title,
      status: announcement.isPublished ? 'published' : 'draft'
    });
    
    return NextResponse.json({
      success: true,
      announcement: announcementToObject(announcement)
    });
    
  } catch (error: any) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch announcement',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/announcements/[id] - Update an entire announcement
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Announcement ID is required' 
        },
        { status: 400 }
      );
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid announcement ID format' 
        },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    console.log('Updating announcement with ID:', id, 'Data:', {
      title: body.title,
      type: body.type,
      priority: body.priority,
      targetAudience: body.targetAudience,
      specificUsers: body.specificUsers,
      scheduledFor: body.scheduledFor,
      expiresAt: body.expiresAt,
      isActive: body.isActive
    });
    
    // Validate required data
    const validationErrors = validateAnnouncementUpdateData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }
    
    // Find announcement
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Announcement not found' 
        },
        { status: 404 }
      );
    }
    
    // Update fields
    announcement.title = body.title;
    announcement.message = body.message;
    announcement.type = body.type;
    announcement.priority = body.priority;
    announcement.targetAudience = body.targetAudience;
    
    // Handle specificUsers - ensure it's an array
    announcement.specificUsers = Array.isArray(body.specificUsers) ? body.specificUsers : [];
    
    // Handle isActive - ensure it's a boolean
    announcement.isActive = typeof body.isActive === 'boolean' ? body.isActive : announcement.isActive;
    
    // Handle date fields - convert to Date objects or set to undefined
    if (body.scheduledFor !== undefined && body.scheduledFor !== null && body.scheduledFor !== '') {
      announcement.scheduledFor = new Date(body.scheduledFor);
    } else {
      announcement.scheduledFor = undefined;
    }
    
    if (body.expiresAt !== undefined && body.expiresAt !== null && body.expiresAt !== '') {
      announcement.expiresAt = new Date(body.expiresAt);
    } else {
      announcement.expiresAt = undefined;
    }
    
    // Recalculate statistics if target audience changes
    if (body.targetAudience) {
      let totalRecipients = 0;
      if (body.targetAudience.includes('all')) {
        totalRecipients = await User.countDocuments({ status: 'active' });
      } else if (body.targetAudience.includes('specific') && announcement.specificUsers.length > 0) {
        totalRecipients = announcement.specificUsers.length;
      } else {
        const audienceQuery: any = { status: 'active' };
        audienceQuery.role = { $in: body.targetAudience };
        totalRecipients = await User.countDocuments(audienceQuery);
      }
      announcement.statistics.totalRecipients = totalRecipients;
    }
    
    // Add updated timestamp
    announcement.updatedAt = new Date();
    
    // Validate before saving
    await announcement.validate();
    
    await announcement.save();
    
    // Populate the updated announcement
    await announcement.populate('createdBy', 'firstName lastName email role');
    if (announcement.specificUsers && announcement.specificUsers.length > 0) {
      await announcement.populate('specificUsers', 'firstName lastName email schoolID');
    }
    
    console.log('Announcement updated successfully:', {
      id: announcement._id,
      title: announcement.title,
      isActive: announcement.isActive,
      isPublished: announcement.isPublished,
      scheduledFor: announcement.scheduledFor,
      expiresAt: announcement.expiresAt
    });
    
    return NextResponse.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: announcementToObject(announcement)
    });
    
  } catch (error: any) {
    console.error('Error updating announcement:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation error',
          details: errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update announcement',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/announcements/[id] - Partial update for specific actions
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Announcement ID is required' 
        },
        { status: 400 }
      );
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid announcement ID format' 
        },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { action, userId } = body;
    
    if (!action) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Action is required' 
        },
        { status: 400 }
      );
    }
    
    console.log('PATCH action for announcement:', { id, action, userId });
    
    // Find announcement
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Announcement not found' 
        },
        { status: 404 }
      );
    }
    
    let responseMessage = '';
    
    switch (action) {
      case 'publish': {
        if (announcement.isPublished) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Announcement is already published' 
            },
            { status: 400 }
          );
        }
        
        console.log('Publishing announcement:', {
          id: announcement._id,
          title: announcement.title,
          currentStatus: announcement.isPublished,
          scheduledFor: announcement.scheduledFor
        });
        
        // Update announcement to published
        announcement.isPublished = true;
        announcement.publishedAt = new Date();
        
        // If scheduled for future, don't activate immediately
        if (announcement.scheduledFor && new Date(announcement.scheduledFor) > new Date()) {
          announcement.isActive = false;
          console.log('Announcement scheduled for future, setting inactive');
        } else {
          announcement.isActive = true;
          console.log('Announcement published immediately, setting active');
        }
        
        responseMessage = 'Announcement published successfully';
        break;
      }
      
      case 'unpublish': {
        if (!announcement.isPublished) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Announcement is not published' 
            },
            { status: 400 }
          );
        }
        
        announcement.isPublished = false;
        announcement.isActive = false;
        responseMessage = 'Announcement unpublished successfully';
        break;
      }
      
      case 'activate': {
        if (!announcement.isPublished) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Cannot activate an unpublished announcement' 
            },
            { status: 400 }
          );
        }
        
        announcement.isActive = true;
        responseMessage = 'Announcement activated successfully';
        break;
      }
      
      case 'deactivate': {
        announcement.isActive = false;
        responseMessage = 'Announcement deactivated successfully';
        break;
      }
      
      case 'markAsRead': {
        if (!userId) {
          return NextResponse.json(
            { 
              success: false,
              error: 'User ID is required for markAsRead action' 
            },
            { status: 400 }
          );
        }
        
        // Validate user ID
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Invalid user ID format' 
            },
            { status: 400 }
          );
        }
        
        // Check if user already read this announcement
        const alreadyRead = announcement.readBy.some(
          (read: any) => read.user.toString() === userId
        );
        
        if (!alreadyRead) {
          // Add user to readBy array
          announcement.readBy.push({
            user: new mongoose.Types.ObjectId(userId),
            readAt: new Date()
          });
          
          // Increment read count
          announcement.statistics.readCount += 1;
        }
        
        responseMessage = 'Announcement marked as read';
        break;
      }
      
      case 'duplicate': {
        // Create a duplicate announcement
        const duplicateData = {
          ...announcement.toObject(),
          _id: undefined,
          announcementId: `DUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: `Copy of ${announcement.title}`,
          isPublished: false,
          isActive: false,
          publishedAt: undefined,
          readBy: [],
          statistics: {
            totalRecipients: announcement.statistics.totalRecipients,
            readCount: 0,
            clickCount: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const duplicateAnnouncement = new Announcement(duplicateData);
        await duplicateAnnouncement.save();
        
        // Populate the duplicate announcement
        await duplicateAnnouncement.populate('createdBy', 'firstName lastName email role');
        if (duplicateAnnouncement.specificUsers && duplicateAnnouncement.specificUsers.length > 0) {
          await duplicateAnnouncement.populate('specificUsers', 'firstName lastName email schoolID');
        }
        
        console.log('Announcement duplicated:', {
          originalId: announcement._id,
          duplicateId: duplicateAnnouncement._id
        });
        
        return NextResponse.json({
          success: true,
          message: 'Announcement duplicated successfully',
          announcement: announcementToObject(duplicateAnnouncement)
        });
      }
      
      default:
        return NextResponse.json(
          { 
            success: false,
            error: `Unknown action: ${action}` 
          },
          { status: 400 }
        );
    }
    
    // Add updated timestamp
    announcement.updatedAt = new Date();
    
    // Validate before saving
    await announcement.validate();
    
    await announcement.save();
    
    // Populate the announcement
    await announcement.populate('createdBy', 'firstName lastName email role');
    if (announcement.specificUsers && announcement.specificUsers.length > 0) {
      await announcement.populate('specificUsers', 'firstName lastName email schoolID');
    }
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
      announcement: announcementToObject(announcement)
    });
    
  } catch (error: any) {
    console.error('Error in PATCH announcement:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation error',
          details: errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process request',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/announcements/[id] - Delete an announcement
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Announcement ID is required' 
        },
        { status: 400 }
      );
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid announcement ID format' 
        },
        { status: 400 }
      );
    }
    
    console.log('Deleting announcement with ID:', id);
    
    const announcement = await Announcement.findByIdAndDelete(id);
    
    if (!announcement) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Announcement not found' 
        },
        { status: 404 }
      );
    }
    
    console.log('Announcement deleted successfully:', {
      id: announcement._id,
      title: announcement.title
    });
    
    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete announcement',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}