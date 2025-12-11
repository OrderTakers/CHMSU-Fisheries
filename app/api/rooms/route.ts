import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import  Room  from '@/models/Room';
import  Laboratory from '@/models/Laboratory';

// Connect to MongoDB
async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not configured');
  }
  
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

// DTO for Room
interface RoomDTO {
  id: string;
  name: string;
  laboratoryId: string;
  location?: string;
  metadata?: {
    roomNumber: string;
    building: string;
    floor: string;
    capacity?: number;
  };
}

// Helper: Transform to DTO
const transformToRoomDTO = (doc: any): RoomDTO => ({
  id: doc._id?.toString() || doc.id,
  name: doc.name,
  laboratoryId: doc.laboratoryId?.toString() || doc.laboratoryId,
  location: doc.location,
  metadata: doc.metadata,
});

export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/rooms called");
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const laboratoryId = searchParams.get('laboratoryId');
    
    const conditions: any = {};
    if (laboratoryId) {
      conditions.laboratoryId = laboratoryId;
    }
    
    console.log("Fetching rooms with conditions:", conditions);
    
    const rawRooms = await Room.find(conditions).sort({ name: 1 }).lean();
    console.log(`Found ${rawRooms.length} rooms`);
    
    const rooms: RoomDTO[] = rawRooms
      .map(transformToRoomDTO)
      .filter(room => room.id && room.name);
    
    return NextResponse.json(rooms);
    
  } catch (error: any) {
    console.error('Fetch rooms error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/rooms called");
    await connectToDatabase();
    
    const body = await request.json();
    
    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }
    
    if (!body.laboratoryId) {
      return NextResponse.json(
        { error: 'Laboratory ID is required' },
        { status: 400 }
      );
    }
    
    // Check if laboratory exists
    const laboratory = await Laboratory.findById(body.laboratoryId);
    if (!laboratory) {
      return NextResponse.json(
        { error: 'Laboratory not found' },
        { status: 404 }
      );
    }
    
    // Check if room already exists in this laboratory
    const existingRoom = await Room.findOne({ 
      name: body.name.trim(),
      laboratoryId: body.laboratoryId
    });
    
    if (existingRoom) {
      return NextResponse.json(
        { error: 'Room with this name already exists in this laboratory' },
        { status: 409 }
      );
    }
    
    const newRoom = new Room({
      name: body.name.trim(),
      laboratoryId: body.laboratoryId,
      location: body.location?.trim() || '',
      metadata: {
        roomNumber: body.metadata?.roomNumber?.trim() || '',
        building: body.metadata?.building?.trim() || '',
        floor: body.metadata?.floor?.trim() || '',
        capacity: body.metadata?.capacity || undefined
      }
    });
    
    await newRoom.save();
    const roomDTO = transformToRoomDTO(newRoom);
    
    console.log("Room created:", roomDTO);
    return NextResponse.json(roomDTO, { status: 201 });
    
  } catch (error: any) {
    console.error('Create room error:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create room', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Room ID required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    const updatedRoom = await Room.findByIdAndUpdate(
      id,
      body,
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!updatedRoom) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    const roomDTO = transformToRoomDTO(updatedRoom);
    return NextResponse.json(roomDTO);
    
  } catch (error: any) {
    console.error('Update room error:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Room ID required' },
        { status: 400 }
      );
    }
    
    const deletedRoom = await Room.findByIdAndDelete(id);
    
    if (!deletedRoom) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Room deleted successfully' 
    });
    
  } catch (error: any) {
    console.error('Delete room error:', error);
    return NextResponse.json(
      { error: 'Failed to delete room', details: error.message },
      { status: 500 }
    );
  }
}