// app/api/reports/[id]/route.ts - FIXED TYPE ISSUES
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Report, { ReportStatus } from '@/models/Report';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/reports/[id] - Get single report by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    
    // Check if it's a download request
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download');
    
    // Use findOne instead of findById to get proper typing
    const report = await Report.findOne({ _id: id }).lean();
    
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Type assertion for the report document
    const typedReport = report as any;
    
    // If download requested, return PDF download
    if (download === 'true' && typedReport.status === ReportStatus.COMPLETED) {
      return NextResponse.json({
        message: 'Download available',
        data: typedReport.data,
        summary: typedReport.summary,
        readyForDownload: true
      });
    }
    
    return NextResponse.json({
      success: true,
      report: typedReport
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

// PUT /api/reports/[id] - Update report (e.g., retry failed report)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    const body = await request.json();
    
    const report = await Report.findById(id);
    
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Type assertion for the report document
    const typedReport = report as any;
    
    // Only allow certain updates
    const allowedUpdates = ['title', 'filters', 'status'];
    const updates: any = {};
    
    for (const key in body) {
      if (allowedUpdates.includes(key)) {
        updates[key] = body[key];
      }
    }
    
    Object.assign(typedReport, updates);
    await typedReport.save();
    
    return NextResponse.json({
      success: true,
      message: 'Report updated successfully',
      report: typedReport
    });
  } catch (error: any) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Failed to update report', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id] - Delete single report
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    
    const report = await Report.findByIdAndDelete(id);
    
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: 'Failed to delete report', message: error.message },
      { status: 500 }
    );
  }
}