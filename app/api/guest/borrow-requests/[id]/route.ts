import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import GuestBorrowing from '@/models/GuestBorrowing';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const { id } = params;
    const body = await request.json();
    const { status, adminNotes } = body;

    const validStatuses = ["pending", "approved", "declined", "returned"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const updatedRequest = await GuestBorrowing.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedRequest) {
      return NextResponse.json({ error: "Borrowing request not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Borrowing request ${status} successfully`
    });

  } catch (error) {
    console.error("Error updating guest borrowing:", error);
    return NextResponse.json(
      { error: "Failed to update borrowing request" },
      { status: 500 }
    );
  }
}