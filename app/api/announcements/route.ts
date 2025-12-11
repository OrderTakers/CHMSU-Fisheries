// app/api/announcements/route.ts
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

// Helper function to validate announcement data
const validateAnnouncementData = (data: any) => {
  const errors: string[] = [];
  
  // Required fields validation
  const requiredFields = ['title', 'message', 'type', 'priority', 'targetAudience', 'createdBy'];
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
  
  // CreatedBy validation
  if (data.createdBy && !mongoose.Types.ObjectId.isValid(data.createdBy)) {
    errors.push('Invalid createdBy user ID');
  }
  
  return errors;
};

// GET /api/announcements - Get all announcements with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {};

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    // Status filtering
    if (status && status !== 'all') {
      if (status === 'active') {
        filter.isActive = true;
        filter.isPublished = true;
      } else if (status === 'inactive') {
        filter.isActive = false;
      } else if (status === 'draft') {
        filter.isPublished = false;
      } else if (status === 'scheduled') {
        filter.scheduledFor = { $gt: new Date() };
        filter.isPublished = true;
      } else if (status === 'expired') {
        filter.expiresAt = { $lt: new Date() };
      }
    }

    // Search across multiple fields
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { announcementId: { $regex: search, $options: 'i' } },
        { createdByName: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    console.log('Fetching announcements with filter:', {
      filter,
      sort,
      skip,
      limit
    });

    // Fetch announcements with population
    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'firstName lastName email role')
      .populate('specificUsers', 'firstName lastName email schoolID')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`Found ${announcements.length} announcements`);

    // Get total count for pagination
    const total = await Announcement.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch announcements',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/announcements - Create a new announcement
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    console.log('Received announcement creation request:', {
      title: body.title,
      type: body.type,
      priority: body.priority,
      targetAudience: body.targetAudience,
      createdBy: body.createdBy,
      attachmentsCount: body.attachments ? body.attachments.length : 0
    });

    // Validate required data
    const validationErrors = validateAnnouncementData(body);
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

    // Get user info for createdBy
    const user = await User.findById(body.createdBy);
    if (!user) {
      console.error('User not found with ID:', body.createdBy);
      return NextResponse.json(
        { 
          success: false,
          error: 'User not found. Please make sure you are logged in.' 
        },
        { status: 404 }
      );
    }

    console.log('Found user for announcement creation:', {
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role
    });

    // Process attachments if provided
    const processedAttachments = [];
    if (body.attachments && Array.isArray(body.attachments)) {
      for (const attachment of body.attachments) {
        try {
          // Validate attachment data
          if (!attachment.filename || !attachment.fileType || !attachment.base64Data) {
            console.warn('Skipping invalid attachment:', attachment);
            continue;
          }

          processedAttachments.push({
            filename: attachment.filename,
            fileUrl: attachment.fileUrl || '',
            fileType: attachment.fileType,
            fileSize: attachment.fileSize || 0,
            base64Data: attachment.base64Data,
            uploadedAt: new Date()
          });
        } catch (fileError) {
          console.error(`Error processing attachment:`, fileError);
          // Continue with other attachments if one fails
        }
      }
    }

    console.log('Processed attachments:', processedAttachments.length);

    // Calculate total recipients
    let totalRecipients = 0;
    if (body.targetAudience.includes('all')) {
      totalRecipients = await User.countDocuments({ status: 'active' });
    } else if (body.targetAudience.includes('specific') && body.specificUsers && body.specificUsers.length > 0) {
      totalRecipients = body.specificUsers.length;
    } else {
      const audienceQuery: any = { status: 'active' };
      audienceQuery.role = { $in: body.targetAudience };
      totalRecipients = await User.countDocuments(audienceQuery);
    }

    console.log('Total recipients calculated:', totalRecipients);

    // Generate unique announcement ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const announcementId = `ANN-${timestamp}-${random}`;

    // Create new announcement
    const announcementData = {
      announcementId,
      title: body.title,
      message: body.message,
      type: body.type,
      priority: body.priority,
      targetAudience: body.targetAudience,
      specificUsers: body.specificUsers || [],
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      isActive: body.isActive !== undefined ? body.isActive : true,
      isPublished: body.isPublished !== undefined ? body.isPublished : false,
      createdBy: body.createdBy,
      createdByName: `${user.firstName} ${user.lastName}`,
      statistics: {
        totalRecipients,
        readCount: 0,
        clickCount: 0
      },
      attachments: processedAttachments
    };

    console.log('Creating announcement with data:', {
      ...announcementData,
      messageLength: announcementData.message?.length,
      attachmentsCount: announcementData.attachments.length
    });

    const announcement = new Announcement(announcementData);
    await announcement.save();

    console.log('Announcement saved with ID:', announcement._id);

    // Populate the created announcement for response
    await announcement.populate('createdBy', 'firstName lastName email role');
    if (announcement.specificUsers && announcement.specificUsers.length > 0) {
      await announcement.populate('specificUsers', 'firstName lastName email schoolID');
    }

    console.log('Announcement created successfully:', {
      announcementId: announcement.announcementId,
      title: announcement.title,
      createdBy: announcement.createdByName,
      attachmentsCount: announcement.attachments.length,
      isPublished: announcement.isPublished,
      isActive: announcement.isActive
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'Announcement created successfully', 
        announcement: announcementToObject(announcement)
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    
    // Handle specific Mongoose validation errors
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
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Duplicate announcement ID detected'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create announcement',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// REMOVED: PUT handler since it's now handled by /api/announcements/[id]

// PATCH /api/announcements - Bulk update or specific actions
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { action, announcementId, userId } = body;

    if (!action) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Action is required' 
        },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'publish': {
        if (!announcementId) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Announcement ID is required for publish action' 
            },
            { status: 400 }
          );
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(announcementId)) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Invalid announcement ID format' 
            },
            { status: 400 }
          );
        }

        const announcement = await Announcement.findById(announcementId);
        if (!announcement) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Announcement not found' 
            },
            { status: 404 }
          );
        }

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

        await announcement.save();
        await announcement.populate('createdBy', 'firstName lastName email role');
        if (announcement.specificUsers && announcement.specificUsers.length > 0) {
          await announcement.populate('specificUsers', 'firstName lastName email schoolID');
        }

        console.log('Announcement published successfully:', {
          id: announcement._id,
          announcementId: announcement.announcementId,
          isPublished: announcement.isPublished,
          isActive: announcement.isActive,
          publishedAt: announcement.publishedAt
        });

        return NextResponse.json({
          success: true,
          message: 'Announcement published successfully',
          announcement: announcementToObject(announcement),
        });
      }

      case 'markAsRead': {
        if (!announcementId || !userId) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Announcement ID and User ID are required for markAsRead action' 
            },
            { status: 400 }
          );
        }

        // Validate ObjectId formats
        if (!mongoose.Types.ObjectId.isValid(announcementId) || !mongoose.Types.ObjectId.isValid(userId)) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Invalid announcement ID or user ID format' 
            },
            { status: 400 }
          );
        }

        const announcement = await Announcement.findById(announcementId);
        if (!announcement) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Announcement not found' 
            },
            { status: 404 }
          );
        }

        // Check if user already read this announcement
        const alreadyRead = announcement.readBy.some(
          (read: any) => read.user.toString() === userId
        );

        if (!alreadyRead) {
          // Add user to readBy array
          announcement.readBy.push({
            user: userId,
            readAt: new Date()
          });

          // Increment read count
          announcement.statistics.readCount += 1;

          await announcement.save();
        }

        await announcement.populate('createdBy', 'firstName lastName email role');
        if (announcement.specificUsers && announcement.specificUsers.length > 0) {
          await announcement.populate('specificUsers', 'firstName lastName email schoolID');
        }
        await announcement.populate('readBy.user', 'firstName lastName email');

        return NextResponse.json({
          success: true,
          message: 'Announcement marked as read',
          announcement: announcementToObject(announcement),
        });
      }

      case 'updateStatus': {
        if (!announcementId) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Announcement ID is required for updateStatus action' 
            },
            { status: 400 }
          );
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(announcementId)) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Invalid announcement ID format' 
            },
            { status: 400 }
          );
        }

        const { isActive, isPublished } = body;
        const announcement = await Announcement.findById(announcementId);
        
        if (!announcement) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Announcement not found' 
            },
            { status: 404 }
          );
        }

        console.log('Updating announcement status:', {
          id: announcement._id,
          currentStatus: { isActive: announcement.isActive, isPublished: announcement.isPublished },
          newStatus: { isActive, isPublished }
        });

        if (isActive !== undefined) announcement.isActive = isActive;
        if (isPublished !== undefined) {
          announcement.isPublished = isPublished;
          if (isPublished && !announcement.publishedAt) {
            announcement.publishedAt = new Date();
          }
        }

        await announcement.save();
        await announcement.populate('createdBy', 'firstName lastName email role');
        if (announcement.specificUsers && announcement.specificUsers.length > 0) {
          await announcement.populate('specificUsers', 'firstName lastName email schoolID');
        }

        return NextResponse.json({
          success: true,
          message: 'Announcement status updated successfully',
          announcement: announcementToObject(announcement),
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
  } catch (error: any) {
    console.error('Error in PATCH announcement:', error);
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

// DELETE /api/announcements - Delete announcement(s)
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const announcementId = searchParams.get('id');
    const bulkIds = searchParams.get('ids');

    if (!announcementId && !bulkIds) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Announcement ID or bulk IDs are required' 
        },
        { status: 400 }
      );
    }

    console.log('Deleting announcement(s):', { announcementId, bulkIds });

    let result;
    
    if (bulkIds) {
      // Bulk delete
      const idsArray = bulkIds.split(',');
      
      // Validate all IDs
      const invalidIds = idsArray.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid announcement ID(s)',
            details: `Invalid IDs: ${invalidIds.join(', ')}`
          },
          { status: 400 }
        );
      }
      
      result = await Announcement.deleteMany({ _id: { $in: idsArray } });
      
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} announcement(s) deleted successfully`,
        deletedCount: result.deletedCount,
      });
    } else {
      // Single delete
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(announcementId!)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid announcement ID format' 
          },
          { status: 400 }
        );
      }

      const announcement = await Announcement.findByIdAndDelete(announcementId);

      if (!announcement) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Announcement not found' 
          },
          { status: 404 }
        );
      }

      console.log('Announcement deleted:', {
        id: announcementId,
        title: announcement.title
      });

      return NextResponse.json({
        success: true,
        message: 'Announcement deleted successfully',
      });
    }
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