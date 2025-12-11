import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import  Laboratory  from '@/models/Laboratory';

// Connect to MongoDB
async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not configured');
  }
  
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

// DTO: Plain interface for API responses
interface LaboratoryDTO {
  id: string;
  name: string;
  location?: string;
}

// Helper: Transform Mongoose doc/raw to DTO
const transformToLaboratoryDTO = (doc: any): LaboratoryDTO => ({
  id: doc._id?.toString() || doc.id,
  name: doc.name,
  location: doc.location,
});

export async function GET() {
  try {
    console.log("GET /api/laboratories called");
    await connectToDatabase();
    
    const rawLabs = await Laboratory.find({}).sort({ name: 1 }).lean();
    console.log(`Found ${rawLabs.length} laboratories`);
    
    const laboratories: LaboratoryDTO[] = rawLabs
      .map(transformToLaboratoryDTO)
      .filter(lab => lab.id && lab.name);
    
    return NextResponse.json(laboratories);
  } catch (error: any) {
    console.error('Fetch laboratories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch laboratories', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/laboratories called");
    await connectToDatabase();
    
    const body = await request.json();
    
    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Laboratory name is required' },
        { status: 400 }
      );
    }
    
    // Check if laboratory already exists
    const existingLab = await Laboratory.findOne({ 
      name: body.name.trim() 
    });
    
    if (existingLab) {
      return NextResponse.json(
        { error: 'Laboratory with this name already exists' },
        { status: 409 }
      );
    }
    
    const newLab = new Laboratory({
      name: body.name.trim(),
      location: body.location?.trim() || ''
    });
    
    await newLab.save();
    const labDTO = transformToLaboratoryDTO(newLab);
    
    console.log("Laboratory created:", labDTO);
    return NextResponse.json(labDTO, { status: 201 });
    
  } catch (error: any) {
    console.error('Create laboratory error:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create laboratory', details: error.message },
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
        { error: 'Laboratory ID required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    const updatedLab = await Laboratory.findByIdAndUpdate(
      id, 
      body, 
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!updatedLab) {
      return NextResponse.json(
        { error: 'Laboratory not found' },
        { status: 404 }
      );
    }
    
    const labDTO = transformToLaboratoryDTO(updatedLab);
    return NextResponse.json(labDTO);
    
  } catch (error: any) {
    console.error('Update laboratory error:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update laboratory' },
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
        { error: 'Laboratory ID required' },
        { status: 400 }
      );
    }
    
    const deletedLab = await Laboratory.findByIdAndDelete(id);
    
    if (!deletedLab) {
      return NextResponse.json(
        { error: 'Laboratory not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Laboratory deleted successfully' 
    });
    
  } catch (error: any) {
    console.error('Delete laboratory error:', error);
    return NextResponse.json(
      { error: 'Failed to delete laboratory', details: error.message },
      { status: 500 }
    );
  }
}