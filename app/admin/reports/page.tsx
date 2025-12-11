'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores";
import { 
  Download, 
  Trash2, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  ChevronLeft, 
  ChevronRight,
  Clock,
  CheckSquare,
  X,
  Calendar,
  User,
  Package,
  Activity,
  Wrench,
  DollarSign,
  TrendingUp as TrendingUpIcon,
  Users,
  BookOpen,
  ShieldAlert
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Define types based on our Report model
interface Report {
  _id: string;
  reportId: string;
  title: string;
  type: string;
  period: string;
  startDate: string;
  endDate: string;
  data: any;
  summary?: any;
  status: 'generating' | 'completed' | 'failed';
  generatedByName: string;
  createdAt: string;
  updatedAt: string;
  fileUrl?: string;
  isSaved: boolean;
}

interface ReportsResponse {
  reports: Report[];
  totalCount: number;
  page: number;
  totalPages: number;
}

interface SummaryResponse {
  totalReports: number;
  completedReports: number;
  generatingReports: number;
  failedReports: number;
  typeDistribution: { _id: string; count: number }[];
  recentReports: Report[];
}

// Report types and periods - UPDATED WITH ALL REPORTS
const REPORT_TYPES = [
  'inventory_status',
  'equipment_usage', 
  'maintenance_status',
  'maintenance_analytics',
  'maintenance_cost_analysis',
  'damage_reports',
  'category_distribution',
  'borrowing_trends',
  'borrowing_analytics',
  'user_activity'
];

const REPORT_PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
const REPORT_STATUS = ['generating', 'completed', 'failed'];

// Maintenance-specific filters
const MAINTENANCE_TYPES = ['Maintenance', 'Calibration', 'Repair'];
const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const MAINTENANCE_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];

// Borrowing-specific filters
const BORROWING_TYPES = ['student', 'faculty', 'guest'];
const BORROWING_STATUSES = ['pending', 'approved', 'rejected', 'released', 'returned', 'overdue'];

// Helper functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatReportType = (type: string) => {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Completed</Badge>;
    case "generating":
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Generating</Badge>;
    case "failed":
      return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Helper function to get report icon based on type
const getReportTypeIcon = (type: string) => {
  switch (type) {
    case 'maintenance_status':
    case 'maintenance_analytics':
    case 'maintenance_cost_analysis':
      return <Wrench className="h-4 w-4 text-blue-500" />;
    case 'inventory_status':
      return <Package className="h-4 w-4 text-emerald-500" />;
    case 'equipment_usage':
      return <Activity className="h-4 w-4 text-purple-500" />;
    case 'damage_reports':
      return <ShieldAlert className="h-4 w-4 text-red-500" />;
    case 'category_distribution':
      return <TrendingUpIcon className="h-4 w-4 text-orange-500" />;
    case 'borrowing_trends':
    case 'borrowing_analytics':
      return <BookOpen className="h-4 w-4 text-indigo-500" />;
    case 'user_activity':
      return <Users className="h-4 w-4 text-cyan-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
};

// Skeleton Components
const SkeletonCard = () => (
  <Card className="border-border bg-card">
    <CardHeader className="pb-3">
      <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
      <div className="h-3 w-48 bg-muted rounded animate-pulse mt-2"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
      <div className="h-3 w-24 bg-muted rounded animate-pulse mt-2"></div>
    </CardContent>
  </Card>
);

// Skeleton Table with proper structure
const SkeletonTable = () => (
  <div className="rounded-lg border border-border overflow-hidden">
    <Table>
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead className="font-semibold">Report ID</TableHead>
          <TableHead className="font-semibold">Title</TableHead>
          <TableHead className="font-semibold">Type</TableHead>
          <TableHead className="font-semibold">Period</TableHead>
          <TableHead className="font-semibold">Status</TableHead>
          <TableHead className="font-semibold">Generated</TableHead>
          <TableHead className="text-right font-semibold">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, index) => (
          <TableRow key={index}>
            <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableCell>
            <TableCell><div className="h-4 w-32 bg-muted rounded animate-pulse"></div></TableCell>
            <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
            <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse"></div></TableCell>
            <TableCell><div className="h-6 w-20 bg-muted rounded animate-pulse"></div></TableCell>
            <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

// Pagination Component
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalItems,
  itemsPerPage 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('ellipsis-start');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('ellipsis-end');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-2 py-4 border-t">
      <div className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {renderPageNumbers().map((page, index) => {
          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
            return (
              <span key={index} className="px-2 text-sm text-muted-foreground">
                ...
              </span>
            );
          }
          
          return (
            <Button
              key={index}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className={`h-8 w-8 p-0 ${
                currentPage === page 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                  : ''
              }`}
            >
              {page}
            </Button>
          );
        })}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// PDF Generation Function - Updated with better spacing
const downloadReportAsPDF = (report: Report) => {
  // Extract real data from the report
  const reportData = report.data || {};
  const summary = report.summary || {};
  
  // Get report-specific content
  let reportContent = '';
  let reportSummary = '';
  
  switch (report.type) {
    case 'maintenance_analytics':
      reportContent = generateMaintenanceAnalyticsContent(reportData, summary);
      reportSummary = generateMaintenanceAnalyticsSummary(summary);
      break;
    case 'maintenance_cost_analysis':
      reportContent = generateMaintenanceCostAnalysisContent(reportData, summary);
      reportSummary = generateMaintenanceCostAnalysisSummary(summary);
      break;
    case 'maintenance_status':
      reportContent = generateMaintenanceStatusContent(reportData, summary);
      reportSummary = generateMaintenanceStatusSummary(summary);
      break;
    case 'borrowing_trends':
    case 'borrowing_analytics':
      reportContent = generateBorrowingTrendsContent(reportData, summary);
      reportSummary = generateBorrowingTrendsSummary(summary);
      break;
    case 'inventory_status':
      reportContent = generateInventoryStatusContent(reportData, summary);
      reportSummary = generateInventoryStatusSummary(summary);
      break;
    case 'equipment_usage':
      reportContent = generateEquipmentUsageContent(reportData, summary);
      reportSummary = generateEquipmentUsageSummary(summary);
      break;
    case 'category_distribution':
      reportContent = generateCategoryDistributionContent(reportData, summary);
      reportSummary = generateCategoryDistributionSummary(summary);
      break;
    case 'damage_reports':
      reportContent = generateDamageReportsContent(reportData, summary);
      reportSummary = generateDamageReportsSummary(summary);
      break;
    case 'user_activity':
      reportContent = generateUserActivityContent(reportData, summary);
      reportSummary = generateUserActivitySummary(summary);
      break;
    default:
      reportContent = generateDefaultContent(reportData, summary);
      reportSummary = generateDefaultSummary(summary);
  }

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${report.title}</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page {
            margin: 0.2in;
            size: letter;
          }
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Arial', sans-serif; 
          margin: 0;
          padding: 8px 12px;
          color: #333;
          line-height: 1.2;
          background: white;
          font-size: 11px;
        }
        
        .header { 
          text-align: center;
          border-bottom: 1px solid #15803d;
          padding-bottom: 12px; 
          margin-bottom: 15px; 
        }
        
        .logo-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 30px;
          margin-bottom: 12px;
        }
        
        .logo {
          height: 60px;
          width: auto;
        }
        
        .main-title { 
          font-size: 20px; 
          font-weight: bold; 
          color: #15803d !important;
          margin: 8px 0 3px 0;
        }
        
        .subtitle { 
          font-size: 14px; 
          color: #666; 
          margin-top: 3px;
          font-weight: normal;
        }
        
        .section { 
          margin-bottom: 15px; 
          page-break-inside: avoid;
        }
        
        .section-title { 
          font-size: 16px; 
          font-weight: bold; 
          color: #15803d !important; 
          margin-bottom: 8px; 
          border-bottom: 1px solid #15803d;
          padding-bottom: 4px;
        }
        
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 8px; 
          margin-bottom: 12px; 
        }
        
        .info-item { 
          margin-bottom: 6px; 
          padding: 4px 0;
          border-bottom: 1px solid #eee;
        }
        
        .info-label { 
          font-weight: bold; 
          color: #555; 
          display: inline-block;
          width: 120px;
        }
        
        .summary { 
          background: #f0f9ff; 
          padding: 12px; 
          border-radius: 4px; 
          border-left: 3px solid #15803d;
          margin-top: 12px; 
        }
        
        .summary-item { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 6px; 
          padding: 4px 0;
        }
        
        .summary-label {
          font-weight: 600;
          color: #555;
        }
        
        .summary-value {
          font-weight: bold;
          color: #15803d;
        }
        
        .footer { 
          margin-top: 20px; 
          text-align: center; 
          color: #666; 
          font-size: 10px; 
          border-top: 1px solid #ddd; 
          padding-top: 12px; 
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 12px;
          font-size: 10px;
        }
        
        th, td { 
          border: 1px solid #ddd; 
          padding: 6px; 
          text-align: left; 
        }
        
        th { 
          background-color: #15803d !important; 
          color: white !important;
          font-weight: bold;
          font-size: 11px;
        }
        
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .generated-info {
          background: #f0f9ff;
          padding: 8px;
          border-radius: 3px;
          margin: 8px 0;
          border-left: 3px solid #15803d;
          font-size: 10px;
        }
        
        .status-completed {
          color: #15803d;
          font-weight: bold;
        }
        
        .print-date {
          text-align: right;
          font-size: 9px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .no-data {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 12px;
        }
        
        .cost-highlight {
          color: #dc2626;
          font-weight: bold;
        }
        
        .metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
          margin: 12px 0;
        }
        
        .metric-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 8px;
          text-align: center;
        }
        
        .metric-value {
          font-size: 18px;
          font-weight: bold;
          color: #15803d;
          margin: 6px 0;
        }
        
        .metric-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .chart-container {
          margin: 12px 0;
          padding: 8px;
          background: #f8fafc;
          border-radius: 4px;
        }
        
        .chart-title {
          font-weight: bold;
          margin-bottom: 6px;
          color: #334155;
          font-size: 12px;
        }
        
        .warning-highlight {
          color: #dc2626;
          font-weight: bold;
          background-color: #fef2f2;
          padding: 1px 4px;
          border-radius: 2px;
        }
        
        .success-highlight {
          color: #15803d;
          font-weight: bold;
          background-color: #f0f9ff;
          padding: 1px 4px;
          border-radius: 2px;
        }
        
        .info-highlight {
          color: #0369a1;
          font-weight: bold;
          background-color: #f0f9ff;
          padding: 1px 4px;
          border-radius: 2px;
        }
        
        .trend-up {
          color: #16a34a;
          font-weight: bold;
        }
        
        .trend-down {
          color: #dc2626;
          font-weight: bold;
        }
        
        .compact-table {
          margin: 6px 0;
        }
        
        .compact-table th,
        .compact-table td {
          padding: 4px 6px;
        }
        
        .data-section {
          page-break-inside: avoid;
          margin-bottom: 12px;
        }
        
        .data-title {
          font-weight: bold;
          margin-bottom: 4px;
          color: #334155;
          font-size: 13px;
        }
        
        .data-content {
          background: #f8fafc;
          padding: 6px;
          border-radius: 3px;
          border: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="print-date">
        Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </div>
    
      <div class="header">
        <div class="logo-container">
          <img src="/images/chmsu.png" alt="CHMSU Logo" class="logo" onerror="this.style.display='none'" />
          <img src="/images/logo-white.png" alt="FLMS Logo" class="logo" onerror="this.style.display='none'" />
        </div>
        <h1 class="main-title">Fisheries Laboratory Management System</h1>
        <div class="subtitle">${report.title}</div>
      </div>
      
      <div class="generated-info">
        <strong>Report Generated:</strong> ${formatDateTime(report.createdAt)}
        <br>
        <strong>Generated By:</strong> ${report.generatedByName}
        <br>
        <strong>Period:</strong> ${formatDate(report.startDate)} to ${formatDate(report.endDate)}
      </div>
      
      <div class="section">
        <div class="section-title">Report Information</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Report ID:</span> ${report.reportId}
          </div>
          <div class="info-item">
            <span class="info-label">Type:</span> ${formatReportType(report.type)}
          </div>
          <div class="info-item">
            <span class="info-label">Period:</span> ${report.period.charAt(0).toUpperCase() + report.period.slice(1)}
          </div>
          <div class="info-item">
            <span class="info-label">Date Range:</span> ${formatDate(report.startDate)} - ${formatDate(report.endDate)}
          </div>
          <div class="info-item">
            <span class="info-label">Status:</span> <span class="status-completed">${report.status.charAt(0).toUpperCase() + report.status.slice(1)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Generated On:</span> ${formatDate(report.createdAt)}
          </div>
        </div>
      </div>
      
      ${reportSummary}
      
      ${reportContent}
      
      <div class="footer">
        <p><strong>Confidential Report</strong> - For authorized personnel only</p>
        <p>This report was automatically generated by the Fisheries Laboratory Management System</p>
        <p>© ${new Date().getFullYear()} Fisheries Laboratory - CHMSU. All rights reserved.</p>
      </div>
      
      <script>
        // Force images to load before printing
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
        
        // Fallback if images don't load
        setTimeout(function() {
          window.print();
        }, 1500);
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Could not open print window. Please allow popups for this site.');
    return;
  }
  
  printWindow.document.write(content);
  printWindow.document.close();
};

// Helper functions for generating report content - Updated for better spacing
const generateMaintenanceAnalyticsContent = (data: any, summary: any) => {
  let content = `
    <div class="section">
      <div class="section-title">Maintenance Analytics</div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">${summary.totalMaintenanceTasks || 0}</div>
          <div class="metric-label">Total Tasks</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.completedMaintenance || 0}</div>
          <div class="metric-label">Completed</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.overdueMaintenance || 0}</div>
          <div class="metric-label">Overdue</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.maintenanceEfficiency || 0}%</div>
          <div class="metric-label">Efficiency Rate</div>
        </div>
      </div>
    </div>
  `;

  // Add maintenance by type chart
  if (summary.maintenanceByType) {
    content += `
      <div class="data-section">
        <div class="data-title">Maintenance by Type</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    const total = Object.values(summary.maintenanceByType).reduce((a: number, b: any) => a + (b as number), 0);
    Object.entries(summary.maintenanceByType).forEach(([type, count]: [string, any]) => {
      const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
      content += `
        <tr>
          <td>${type}</td>
          <td>${count}</td>
          <td>${percentage}%</td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Add upcoming maintenance schedule
  if (summary.nextMaintenanceSchedule && summary.nextMaintenanceSchedule.length > 0) {
    content += `
      <div class="data-section">
        <div class="data-title">Upcoming Maintenance Schedule</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Next Maintenance Date</th>
                <th>Days Until Due</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    summary.nextMaintenanceSchedule.forEach((item: any) => {
      const nextDate = new Date(item.nextMaintenance);
      const today = new Date();
      const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      content += `
        <tr>
          <td>${item.equipmentName}</td>
          <td>${formatDate(item.nextMaintenance)}</td>
          <td>${daysUntil} days</td>
        </tr>
      `;
    });
    
    content += `
          </tbody>
        </table>
      </div>
    `;
  }

  return content;
};

const generateMaintenanceAnalyticsSummary = (summary: any) => {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total Maintenance Tasks:</span>
          <span class="summary-value">${summary.totalMaintenanceTasks || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Completed Tasks:</span>
          <span class="summary-value">${summary.completedMaintenance || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Overdue Tasks:</span>
          <span class="summary-value">${summary.overdueMaintenance || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Average Completion Time:</span>
          <span class="summary-value">${summary.averageCompletionTime || 0} days</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Maintenance Efficiency:</span>
          <span class="summary-value">${summary.maintenanceEfficiency || 0}%</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Most Common Type:</span>
          <span class="summary-value">${summary.maintenanceByType ? Object.keys(summary.maintenanceByType)[0] || 'N/A' : 'N/A'}</span>
        </div>
      </div>
    </div>
  `;
};

const generateMaintenanceCostAnalysisContent = (data: any, summary: any) => {
  let content = `
    <div class="section">
      <div class="section-title">Maintenance Cost Analysis</div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">₱${(summary.totalMaintenanceCost || 0).toLocaleString()}</div>
          <div class="metric-label">Total Cost</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">₱${(summary.averageCostPerTask || 0).toLocaleString()}</div>
          <div class="metric-label">Average Cost/Task</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.totalMaintenanceTasks || 0}</div>
          <div class="metric-label">Total Tasks</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">₱${(summary.highestMaintenanceCost || 0).toLocaleString()}</div>
          <div class="metric-label">Highest Cost</div>
        </div>
      </div>
    </div>
  `;

  // Add cost by type
  if (summary.costByType) {
    content += `
      <div class="data-section">
        <div class="data-title">Cost Breakdown by Maintenance Type</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Count</th>
                <th>Total Cost</th>
                <th>Average Cost</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    Object.entries(summary.costByType).forEach(([type, stats]: [string, any]) => {
      content += `
        <tr>
          <td>${type}</td>
          <td>${stats.count || 0}</td>
          <td class="cost-highlight">₱${(stats.totalCost || 0).toLocaleString()}</td>
          <td>₱${Math.round(stats.averageCost || 0).toLocaleString()}</td>
        </tr>
      `;
    });
    
    content += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Add most expensive tasks
  if (summary.mostExpensiveEquipment && summary.mostExpensiveEquipment.length > 0) {
    content += `
      <div class="data-section">
        <div class="data-title">Most Expensive Maintenance Tasks</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Type</th>
                <th>Total Cost</th>
                <th>Completed Date</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    summary.mostExpensiveEquipment.forEach((task: any) => {
      content += `
        <tr>
          <td>${task.equipmentName || 'Unknown'}</td>
          <td>${task.type || 'N/A'}</td>
          <td class="cost-highlight">₱${(task.totalCost || 0).toLocaleString()}</td>
          <td>${task.completedDate ? formatDate(task.completedDate) : 'N/A'}</td>
        </tr>
      `;
    });
    
    content += `
          </tbody>
        </table>
      </div>
    `;
  }

  return content;
};

const generateMaintenanceCostAnalysisSummary = (summary: any) => {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total Maintenance Cost:</span>
          <span class="summary-value cost-highlight">₱${(summary.totalMaintenanceCost || 0).toLocaleString()}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Tasks Analyzed:</span>
          <span class="summary-value">${summary.totalMaintenanceTasks || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Average Cost per Task:</span>
          <span class="summary-value">₱${Math.round(summary.averageCostPerTask || 0).toLocaleString()}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Highest Single Cost:</span>
          <span class="summary-value cost-highlight">₱${(summary.highestMaintenanceCost || 0).toLocaleString()}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Most Expensive Category:</span>
          <span class="summary-value">${summary.mostExpensiveEquipment?.[0]?.equipmentName || 'N/A'}</span>
        </div>
      </div>
    </div>
  `;
};

const generateMaintenanceStatusContent = (data: any, summary: any) => {
  let content = `
    <div class="section">
      <div class="section-title">Maintenance Status Overview</div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">${summary.totalMaintenanceItems || 0}</div>
          <div class="metric-label">Items Needing Maintenance</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.urgentRepairs || 0}</div>
          <div class="metric-label">Urgent Repairs</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.upcomingCalibrations || 0}</div>
          <div class="metric-label">Upcoming Calibrations</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.scheduledMaintenance || 0}</div>
          <div class="metric-label">Scheduled</div>
        </div>
      </div>
    </div>
  `;

  // Add maintenance by category
  if (data.maintenanceByCategory) {
    content += `
      <div class="data-section">
        <div class="data-title">Maintenance by Category</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    const total = Object.values(data.maintenanceByCategory).reduce((a: number, b: any) => a + (b as number), 0);
    Object.entries(data.maintenanceByCategory).forEach(([category, count]: [string, any]) => {
      const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
      content += `
        <tr>
          <td>${category}</td>
          <td>${count}</td>
          <td>${percentage}%</td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return content;
};

const generateMaintenanceStatusSummary = (summary: any) => {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total Items Needing Maintenance:</span>
          <span class="summary-value">${summary.totalMaintenanceItems || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Urgent Repairs Required:</span>
          <span class="summary-value">${summary.urgentRepairs || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Upcoming Calibrations:</span>
          <span class="summary-value">${summary.upcomingCalibrations || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Scheduled Maintenance:</span>
          <span class="summary-value">${summary.scheduledMaintenance || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Estimated Maintenance Cost:</span>
          <span class="summary-value">₱${Math.round(summary.maintenanceCost || 0).toLocaleString()}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Maintenance Rate:</span>
          <span class="summary-value">${summary.maintenanceRate || 0}%</span>
        </div>
      </div>
    </div>
  `;
};

const generateBorrowingTrendsContent = (data: any, summary: any) => {
  let content = `
    <div class="section">
      <div class="section-title">Borrowing Trends Analysis</div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">${summary.totalBorrowings || 0}</div>
          <div class="metric-label">Total Borrowings</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.activeBorrowings || 0}</div>
          <div class="metric-label">Active</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.completedBorrowings || 0}</div>
          <div class="metric-label">Completed</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.borrowingCompletionRate || 0}%</div>
          <div class="metric-label">Completion Rate</div>
        </div>
      </div>
    </div>
  `;

  // Add borrowing by user type
  if (summary.borrowingByUserType) {
    content += `
      <div class="data-section">
        <div class="data-title">Borrowing by User Type</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>User Type</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    const total = Object.values(summary.borrowingByUserType).reduce((a: number, b: any) => a + (b as number), 0);
    Object.entries(summary.borrowingByUserType).forEach(([type, count]: [string, any]) => {
      const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
      content += `
        <tr>
          <td>${type.charAt(0).toUpperCase() + type.slice(1)}</td>
          <td>${count}</td>
          <td>${percentage}%</td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Add most borrowed items
  if (summary.mostBorrowedItems && summary.mostBorrowedItems.length > 0) {
    content += `
      <div class="data-section">
        <div class="data-title">Most Borrowed Items</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Borrow Count</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    summary.mostBorrowedItems.forEach((item: any) => {
      content += `
        <tr>
          <td>${item.name}</td>
          <td>${item.count}</td>
        </tr>
      `;
    });
    
    content += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Add borrowing trends
  if (summary.borrowingTrends && summary.borrowingTrends.length > 0) {
    content += `
      <div class="data-section">
        <div class="data-title">Borrowing Trends Over Time</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Borrowing Count</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    summary.borrowingTrends.forEach((trend: any, index: number) => {
      const prevCount = index > 0 ? summary.borrowingTrends[index - 1].count : trend.count;
      const trendDirection = trend.count > prevCount ? 'trend-up' : 'trend-down';
      const trendSymbol = trend.count > prevCount ? '↗' : '↘';
      
      content += `
        <tr>
          <td>${trend.period}</td>
          <td>${trend.count}</td>
          <td class="${trendDirection}">${trendSymbol} ${Math.abs(trend.count - prevCount)}</td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return content;
};

const generateBorrowingTrendsSummary = (summary: any) => {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total Borrowings:</span>
          <span class="summary-value">${summary.totalBorrowings || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Active Borrowings:</span>
          <span class="summary-value">${summary.activeBorrowings || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Completed Borrowings:</span>
          <span class="summary-value">${summary.completedBorrowings || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Pending Borrowings:</span>
          <span class="summary-value">${summary.pendingBorrowings || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Overdue Borrowings:</span>
          <span class="summary-value">${summary.overdueBorrowings || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Borrowing Completion Rate:</span>
          <span class="summary-value">${summary.borrowingCompletionRate || 0}%</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Average Borrowing Duration:</span>
          <span class="summary-value">${summary.averageBorrowingDuration || 0} days</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Borrowing Value:</span>
          <span class="summary-value">₱${(summary.totalBorrowingValue || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  `;
};

const generateInventoryStatusContent = (data: any, summary: any) => {
  let content = `
    <div class="section">
      <div class="section-title">Inventory Status Overview</div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">${summary.totalItems || 0}</div>
          <div class="metric-label">Total Items</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.availableItems || 0}</div>
          <div class="metric-label">Available Items</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">₱${(summary.totalValue || 0).toLocaleString()}</div>
          <div class="metric-label">Total Value</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.utilizationRate || 0}%</div>
          <div class="metric-label">Utilization Rate</div>
        </div>
      </div>
    </div>
  `;

  // Add category distribution
  if (data.categoryStats) {
    content += `
      <div class="data-section">
        <div class="data-title">Inventory by Category</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Items</th>
                <th>Quantity</th>
                <th>Available</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    Object.entries(data.categoryStats).forEach(([category, stats]: [string, any]) => {
      content += `
        <tr>
          <td>${category}</td>
          <td>${stats.items || 0}</td>
          <td>${stats.total || 0}</td>
          <td>${stats.available || 0}</td>
          <td class="cost-highlight">₱${(stats.value || 0).toLocaleString()}</td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return content;
};

const generateInventoryStatusSummary = (summary: any) => {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total Items:</span>
          <span class="summary-value">${summary.totalItems || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Available Items:</span>
          <span class="summary-value">${summary.availableItems || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Value:</span>
          <span class="summary-value">₱${(summary.totalValue || 0).toLocaleString()}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Utilization Rate:</span>
          <span class="summary-value">${summary.utilizationRate || 0}%</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Categories:</span>
          <span class="summary-value">${summary.categoriesCount || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Average Items per Category:</span>
          <span class="summary-value">${summary.itemsCount || 0}</span>
        </div>
      </div>
    </div>
  `;
};

const generateEquipmentUsageContent = (data: any, summary: any) => {
  let content = `
    <div class="section">
      <div class="section-title">Equipment Usage Analysis</div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">${summary.totalEquipment || 0}</div>
          <div class="metric-label">Total Equipment</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.totalInUse || 0}</div>
          <div class="metric-label">Currently In Use</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.totalAvailable || 0}</div>
          <div class="metric-label">Available</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.averageUsageRate || 0}%</div>
          <div class="metric-label">Average Usage Rate</div>
        </div>
      </div>
    </div>
  `;

  // Add top used equipment
  if (data.topUsed && data.topUsed.length > 0) {
    content += `
      <div class="data-section">
        <div class="data-title">Most Frequently Used Equipment</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Total Quantity</th>
                <th>In Use</th>
                <th>Available</th>
                <th>Usage Rate</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    data.topUsed.forEach((item: any) => {
      const total = item.quantity || 0;
      const available = item.availableQuantity || 0;
      const inUse = total - available;
      const usageRate = total > 0 ? Math.round(((total - available) / total) * 100) : 0;
      
      content += `
        <tr>
          <td>${item.name}</td>
          <td>${total}</td>
          <td>${inUse}</td>
          <td>${available}</td>
          <td class="${usageRate > 80 ? 'warning-highlight' : usageRate > 50 ? 'info-highlight' : ''}">${usageRate}%</td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return content;
};

const generateEquipmentUsageSummary = (summary: any) => {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total Equipment:</span>
          <span class="summary-value">${summary.totalEquipment || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Equipment In Use:</span>
          <span class="summary-value">${summary.totalInUse || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Available Equipment:</span>
          <span class="summary-value">${summary.totalAvailable || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Average Usage Rate:</span>
          <span class="summary-value">${summary.averageUsageRate || 0}%</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">High Usage Items:</span>
          <span class="summary-value">${summary.highUsageItems || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Equipment Value:</span>
          <span class="summary-value">₱${(summary.totalEquipmentValue || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  `;
};

const generateCategoryDistributionContent = (data: any, summary: any) => {
  let content = `
    <div class="section">
      <div class="section-title">Category Distribution Analysis</div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">${summary.totalCategories || 0}</div>
          <div class="metric-label">Total Categories</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.totalItems || 0}</div>
          <div class="metric-label">Total Items</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.largestCategory || 'N/A'}</div>
          <div class="metric-label">Largest Category</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.averageItemsPerCategory || 0}</div>
          <div class="metric-label">Avg Items/Category</div>
        </div>
      </div>
    </div>
  `;

  // Add category distribution table
  if (data.categoryDistribution) {
    content += `
      <div class="data-section">
        <div class="data-title">Detailed Category Distribution</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Items</th>
                <th>Quantity</th>
                <th>Available</th>
                <th>Total Value</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    const totalValue = Object.values(data.categoryDistribution).reduce((sum: number, cat: any) => sum + (cat.value || 0), 0);
    
    Object.entries(data.categoryDistribution).forEach(([category, stats]: [string, any]) => {
      const percentage = totalValue > 0 ? Math.round(((stats.value || 0) / totalValue) * 100) : 0;
      
      content += `
        <tr>
          <td>${category}</td>
          <td>${stats.count || 0}</td>
          <td>${stats.quantity || 0}</td>
          <td>${stats.available || 0}</td>
          <td class="cost-highlight">₱${(stats.value || 0).toLocaleString()}</td>
          <td>${percentage}%</td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return content;
};

const generateCategoryDistributionSummary = (summary: any) => {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total Categories:</span>
          <span class="summary-value">${summary.totalCategories || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Items:</span>
          <span class="summary-value">${summary.totalItems || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Largest Category (by value):</span>
          <span class="summary-value">${summary.largestCategory || 'N/A'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Most Available Category:</span>
          <span class="summary-value">${summary.mostAvailableCategory || 'N/A'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Average Items per Category:</span>
          <span class="summary-value">${summary.averageItemsPerCategory || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Inventory Value:</span>
          <span class="summary-value">₱${(summary.totalValue || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  `;
};

const generateDamageReportsContent = (data: any, summary: any) => {
  let content = `
    <div class="section">
      <div class="section-title">Damage Reports Analysis</div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">${summary.totalDamaged || 0}</div>
          <div class="metric-label">Damaged Items</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.damageRate || 0}%</div>
          <div class="metric-label">Damage Rate</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">₱${(summary.repairCost || 0).toLocaleString()}</div>
          <div class="metric-label">Estimated Repair Cost</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">₱${(summary.replacementValue || 0).toLocaleString()}</div>
          <div class="metric-label">Replacement Value</div>
        </div>
      </div>
    </div>
  `;

  // Add damage by category
  if (data.damageStats) {
    content += `
      <div class="data-section">
        <div class="data-title">Damage by Category</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Damaged Items</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    const total = Object.values(data.damageStats).reduce((a: number, b: any) => a + (b as number), 0);
    Object.entries(data.damageStats).forEach(([category, count]: [string, any]) => {
      const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
      const isMostAffected = category === summary.mostAffectedCategory;
      
      content += `
        <tr>
          <td>${category} ${isMostAffected ? '<span class="warning-highlight">(Most Affected)</span>' : ''}</td>
          <td>${count}</td>
          <td>${percentage}%</td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return content;
};

const generateDamageReportsSummary = (summary: any) => {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total Damaged Items:</span>
          <span class="summary-value">${summary.totalDamaged || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Damage Rate:</span>
          <span class="summary-value">${summary.damageRate || 0}%</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Estimated Repair Cost:</span>
          <span class="summary-value">₱${(summary.repairCost || 0).toLocaleString()}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Replacement Value:</span>
          <span class="summary-value">₱${(summary.replacementValue || 0).toLocaleString()}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Most Affected Category:</span>
          <span class="summary-value">${summary.mostAffectedCategory || 'N/A'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Cost Ratio (Repair/Replace):</span>
          <span class="summary-value">${summary.repairCost && summary.replacementValue ? Math.round((summary.repairCost / summary.replacementValue) * 100) : 0}%</span>
        </div>
      </div>
    </div>
  `;
};

const generateUserActivityContent = (data: any, summary: any) => {
  let content = `
    <div class="section">
      <div class="section-title">User Activity Analysis</div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">${summary.activeUsers || 0}</div>
          <div class="metric-label">Active Users</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.totalActions || 0}</div>
          <div class="metric-label">Total Actions</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.averageActions || 0}</div>
          <div class="metric-label">Avg Actions/User</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.topActiveUsers?.[0]?.userId || 'N/A'}</div>
          <div class="metric-label">Top User ID</div>
        </div>
      </div>
    </div>
  `;

  // Add top active users
  if (summary.topActiveUsers && summary.topActiveUsers.length > 0) {
    content += `
      <div class="data-section">
        <div class="data-title">Top Active Users</div>
        <div class="data-content">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>User ID</th>
                <th>Borrowings</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    summary.topActiveUsers.forEach((user: any, index: number) => {
      content += `
        <tr>
          <td>${index + 1}</td>
          <td>${user.userId || 'Unknown'}</td>
          <td>${user.borrowings || 0}</td>
          <td>${user.lastActivity ? formatDate(user.lastActivity) : 'N/A'}</td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return content;
};

const generateUserActivitySummary = (summary: any) => {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Active Users:</span>
          <span class="summary-value">${summary.activeUsers || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Actions:</span>
          <span class="summary-value">${summary.totalActions || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Average Actions per User:</span>
          <span class="summary-value">${summary.averageActions || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Top Active User:</span>
          <span class="summary-value">${summary.topActiveUsers?.[0]?.userId || 'N/A'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Top User Activity:</span>
          <span class="summary-value">${summary.topActiveUsers?.[0]?.borrowings || 0} borrowings</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">User Engagement Rate:</span>
          <span class="summary-value">${summary.activeUsers > 0 ? Math.round((summary.totalActions / summary.activeUsers) * 100) / 100 : 0}</span>
        </div>
      </div>
    </div>
  `;
};

const generateDefaultContent = (data: any, summary: any) => {
  // Default content for other report types
  return `
    <div class="section">
      <div class="section-title">Detailed Analysis</div>
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total Records Analyzed:</span>
          <span class="summary-value">${data.inventoryCount || data.totalRecords || 0}</span>
        </div>
        ${summary.totalValue ? `
          <div class="summary-item">
            <span class="summary-label">Total Value:</span>
            <span class="summary-value">₱${summary.totalValue.toLocaleString()}</span>
          </div>
        ` : ''}
        ${summary.utilizationRate ? `
          <div class="summary-item">
            <span class="summary-label">Utilization Rate:</span>
            <span class="summary-value">${summary.utilizationRate}%</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
};

const generateDefaultSummary = (summary: any) => {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">
        ${summary.totalItems ? `
          <div class="summary-item">
            <span class="summary-label">Total Items:</span>
            <span class="summary-value">${summary.totalItems}</span>
          </div>
        ` : ''}
        ${summary.availableItems ? `
          <div class="summary-item">
            <span class="summary-label">Available Items:</span>
            <span class="summary-value">${summary.availableItems}</span>
          </div>
        ` : ''}
        ${summary.totalValue ? `
          <div class="summary-item">
            <span class="summary-label">Total Value:</span>
            <span class="summary-value">₱${summary.totalValue.toLocaleString()}</span>
          </div>
        ` : ''}
        ${summary.utilizationRate !== undefined ? `
          <div class="summary-item">
            <span class="summary-label">Utilization Rate:</span>
            <span class="summary-value">${summary.utilizationRate}%</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
};

export default function ReportsPage() {
  const { user, clearAuth, isLoading } = useAuthStore();
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<SummaryResponse>({
    totalReports: 0,
    completedReports: 0,
    generatingReports: 0,
    failedReports: 0,
    typeDistribution: [],
    recentReports: []
  });
  
  const [filters, setFilters] = useState({
    type: 'all',
    period: 'all',
    status: 'all',
    page: 1,
    limit: 10
  });

  const [newReport, setNewReport] = useState({
    type: 'inventory_status',
    period: 'monthly',
    title: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Maintenance-specific filters
  const [maintenanceFilters, setMaintenanceFilters] = useState({
    maintenanceType: 'all',
    priority: 'all',
    status: 'all'
  });

  // Borrowing-specific filters
  const [borrowingFilters, setBorrowingFilters] = useState({
    borrowerType: 'all',
    status: 'all'
  });

  // Auth check
  useEffect(() => {
    if (isLoading) return;
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check", {
          credentials: "include",
        });
        if (!response.ok) {
          clearAuth();
          router.replace("/");
          return;
        }
        const data = await response.json();
        if (!data.user || data.user.role !== "admin") {
          clearAuth();
          router.replace(data.user ? "/user/userdashboard" : "/");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        clearAuth();
        router.replace("/");
      }
    };
    if (!user || user.role !== "admin") {
      checkAuth();
    }
  }, [user, isLoading, router, clearAuth]);

  useEffect(() => {
    fetchReports();
    fetchSummary();
  }, [filters.type, filters.period, filters.status, filters.page]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      // Only add filters that are not 'all'
      if (filters.type !== 'all') queryParams.append('type', filters.type);
      if (filters.period !== 'all') queryParams.append('period', filters.period);
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`/api/reports?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status}`);
      }
      
      const data: ReportsResponse = await response.json();
      setReports(data.reports);
      setError(null);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to fetch reports. Please try again.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/reports?summary=true');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch summary: ${response.status}`);
      }
      
      const data: SummaryResponse = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
      setSummary({
        totalReports: 0,
        completedReports: 0,
        generatingReports: 0,
        failedReports: 0,
        typeDistribution: [],
        recentReports: []
      });
    }
  };

  const generateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate dates
      const startDate = new Date(newReport.startDate);
      const endDate = new Date(newReport.endDate);
      
      if (startDate > endDate) {
        throw new Error('Start date cannot be after end date');
      }

      // Get current user info
      const userFullName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}`
        : 'Admin User';

      // Prepare filters based on report type
      const filters: any = {};
      
      // Add maintenance-specific filters if applicable
      if (newReport.type.includes('maintenance')) {
        if (maintenanceFilters.maintenanceType && maintenanceFilters.maintenanceType !== 'all') 
          filters.maintenanceType = maintenanceFilters.maintenanceType;
        if (maintenanceFilters.priority && maintenanceFilters.priority !== 'all') 
          filters.priority = maintenanceFilters.priority;
        if (maintenanceFilters.status && maintenanceFilters.status !== 'all') 
          filters.status = maintenanceFilters.status;
      }

      // Add borrowing-specific filters if applicable
      if (newReport.type.includes('borrowing')) {
        if (borrowingFilters.borrowerType && borrowingFilters.borrowerType !== 'all') 
          filters.borrowerType = borrowingFilters.borrowerType;
        if (borrowingFilters.status && borrowingFilters.status !== 'all') 
          filters.borrowingStatus = borrowingFilters.status;
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: newReport.type,
          period: newReport.period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          title: newReport.title || `${formatReportType(newReport.type)} Report - ${newReport.period}`,
          generatedByName: userFullName,
          filters: Object.keys(filters).length > 0 ? filters : undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate report: ${response.status}`);
      }

      const data = await response.json();
      setSuccess('Report generation started! It will be available shortly.');
      
      // Refresh the reports list after a short delay
      setTimeout(() => {
        fetchReports();
        fetchSummary();
      }, 1000);

      // Reset form
      setNewReport({
        type: 'inventory_status',
        period: 'monthly',
        title: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });

      // Reset maintenance filters
      setMaintenanceFilters({
        maintenanceType: 'all',
        priority: 'all',
        status: 'all'
      });

      // Reset borrowing filters
      setBorrowingFilters({
        borrowerType: 'all',
        status: 'all'
      });

    } catch (error) {
      console.error('Error generating report:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      const report = reports.find(r => r.reportId === reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      if (report.status !== 'completed') {
        throw new Error('Report is not ready for download. Please wait until it completes.');
      }

      // Check if report has actual data
      if (!report.data || Object.keys(report.data).length === 0) {
        // Try to fetch fresh data for this report
        try {
          const response = await fetch(`/api/reports/${report._id}`);
          if (response.ok) {
            const freshReport = await response.json();
            if (freshReport.data && Object.keys(freshReport.data).length > 0) {
              // Update the report with fresh data
              report.data = freshReport.data;
              report.summary = freshReport.summary;
            }
          }
        } catch (fetchError) {
          console.error('Error fetching fresh report data:', fetchError);
        }
      }

      downloadReportAsPDF(report);
      setSuccess(`Report ${report.reportId} is ready for printing/saving as PDF!`);
      
    } catch (error) {
      console.error('Error downloading report:', error);
      setError(error instanceof Error ? error.message : 'Failed to download report');
    }
  };

  const deleteReport = async () => {
    if (!reportToDelete) return;

    try {
      const report = reports.find(r => r.reportId === reportToDelete);
      if (!report) {
        throw new Error('Report not found');
      }

      const response = await fetch(`/api/reports/${report._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete report: ${response.status}`);
      }

      setReports(prev => prev.filter(r => r.reportId !== reportToDelete));
      setSuccess('Report deleted successfully!');
      setIsDeleteDialogOpen(false);
      setReportToDelete(null);
      setError(null);
      
      // Refresh summary
      fetchSummary();
      
    } catch (error) {
      console.error('Error deleting report:', error);
      setError('Failed to delete report. Please try again.');
    }
  };

  // Simple pagination
  const getPaginatedReports = () => {
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    return reports.slice(startIndex, endIndex);
  };

  // Check if current report type is maintenance-related
  const isMaintenanceReport = newReport.type.includes('maintenance');
  
  // Check if current report type is borrowing-related
  const isBorrowingReport = newReport.type.includes('borrowing');

  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex-1 space-y-6 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
              <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
              <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <SkeletonTable />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const paginatedReports = getPaginatedReports();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex-1 space-y-6 p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-2">
              Generate and manage automated reports for laboratory usage, borrowing history, maintenance logs, and other relevant data
            </p>
          </div>
        </div>

        {/* Success Display */}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{summary.totalReports}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <p className="text-xs text-muted-foreground">
                  All generated reports
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{summary.completedReports}</div>
              <div className="flex items-center gap-1 mt-1">
                <CheckSquare className="h-3 w-3 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Ready to download</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Generating</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{summary.generatingReports}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <p className="text-xs text-muted-foreground">In progress</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{summary.failedReports}</div>
              <div className="flex items-center gap-1 mt-1">
                <X className="h-3 w-3 text-red-500" />
                <p className="text-xs text-muted-foreground">Need attention</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate Report Form */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Generate New Report
            </CardTitle>
            <CardDescription>Create custom automated reports based on your criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generateReport} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select
                    value={newReport.type}
                    onValueChange={(value) => setNewReport({...newReport, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {getReportTypeIcon(type)}
                            {formatReportType(type)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-period">Period</Label>
                  <Select
                    value={newReport.period}
                    onValueChange={(value) => setNewReport({...newReport, period: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_PERIODS.map(period => (
                        <SelectItem key={period} value={period}>
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    type="date"
                    value={newReport.startDate}
                    onChange={(e) => setNewReport({...newReport, startDate: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    type="date"
                    value={newReport.endDate}
                    onChange={(e) => setNewReport({...newReport, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Maintenance-specific filters */}
              {isMaintenanceReport && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-type" className="text-blue-700">Maintenance Type</Label>
                    <Select
                      value={maintenanceFilters.maintenanceType}
                      onValueChange={(value) => setMaintenanceFilters({...maintenanceFilters, maintenanceType: value})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {MAINTENANCE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-blue-700">Priority</Label>
                    <Select
                      value={maintenanceFilters.priority}
                      onValueChange={(value) => setMaintenanceFilters({...maintenanceFilters, priority: value})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="All Priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        {PRIORITY_LEVELS.map(priority => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-blue-700">Status</Label>
                    <Select
                      value={maintenanceFilters.status}
                      onValueChange={(value) => setMaintenanceFilters({...maintenanceFilters, status: value})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {MAINTENANCE_STATUSES.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Borrowing-specific filters */}
              {isBorrowingReport && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="borrower-type" className="text-indigo-700">Borrower Type</Label>
                    <Select
                      value={borrowingFilters.borrowerType}
                      onValueChange={(value) => setBorrowingFilters({...borrowingFilters, borrowerType: value})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {BORROWING_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borrowing-status" className="text-indigo-700">Borrowing Status</Label>
                    <Select
                      value={borrowingFilters.status}
                      onValueChange={(value) => setBorrowingFilters({...borrowingFilters, status: value})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {BORROWING_STATUSES.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-title">Report Title (Optional)</Label>
                  <Input
                    type="text"
                    value={newReport.title}
                    onChange={(e) => setNewReport({...newReport, title: e.target.value})}
                    placeholder="Custom report title..."
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use auto-generated title
                  </p>
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={generating}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {generating ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  <span>Report generation may take a few moments. You'll be notified when it's ready.</span>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" />
                  Generated Reports
                </CardTitle>
                <CardDescription>Manage and download your generated reports</CardDescription>
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters({ ...filters, type: value, page: 1 })}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {REPORT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {getReportTypeIcon(type)}
                          {formatReportType(type)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.period}
                  onValueChange={(value) => setFilters({ ...filters, period: value, page: 1 })}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Periods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Periods</SelectItem>
                    {REPORT_PERIODS.map(period => (
                      <SelectItem key={period} value={period}>
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {REPORT_STATUS.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Report ID</TableHead>
                    <TableHead className="font-semibold">Title</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Period</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Generated</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReports.length > 0 ? (
                    paginatedReports.map((report) => (
                      <TableRow key={report.reportId} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm font-medium text-foreground">
                          {report.reportId}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {getReportTypeIcon(report.type)}
                            <div className="truncate max-w-[200px]" title={report.title}>
                              {report.title}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatReportType(report.type)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {report.period.charAt(0).toUpperCase() + report.period.slice(1)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(report.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(report.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => downloadReport(report.reportId)}
                              disabled={report.status !== 'completed'}
                              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                              title={report.status !== 'completed' ? 'Report not ready for download' : 'Download as PDF'}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">No reports found matching your criteria</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Generate your first report using the form above
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {reports.length > 0 && (
                <Pagination
                  currentPage={filters.page}
                  totalPages={Math.ceil(reports.length / filters.limit)}
                  onPageChange={(page) => setFilters({ ...filters, page })}
                  totalItems={reports.length}
                  itemsPerPage={filters.limit}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Report
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 sm:flex-none">Cancel</Button>
            </DialogClose>
            <Button
              onClick={deleteReport}
              className="bg-red-500 hover:bg-red-600 flex-1 sm:flex-none"
            >
              Delete Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-background py-6 px-6 mt-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fisheries Lab Management System. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
            <span className="text-sm text-muted-foreground">Automated Reports Module v2.0</span>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
              Total Reports: {summary.totalReports}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Add missing Info icon component
const Info = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);