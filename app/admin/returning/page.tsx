"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores";
import { useEffect, useState } from "react";
import { Search, Filter, MoreVertical, Package, Calendar, Clock, User, Mail, RotateCcw, Eye, Check, X, Loader2, Image as ImageIcon, ZoomIn, ChevronLeft, ChevronRight, RefreshCw, TrendingUp, AlertCircle, Users, Activity } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Image from "next/image";

interface Returning {
  _id: string;
  borrowingId: string;
  equipmentId: string;
  borrowerType: 'student' | 'faculty' | 'guest';
  borrowerId: string;
  borrowerName: string;
  borrowerEmail: string;
  equipmentName: string;
  equipmentItemId: string;
  intendedReturnDate: string;
  actualReturnDate: string;
  conditionBefore: string;
  conditionAfter: string;
  damageDescription: string;
  damageImages: string[];
  damageSeverity: 'None' | 'Minor' | 'Moderate' | 'Severe';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  isLate: boolean;
  lateDays: number;
  penaltyFee: number;
  damageFee: number;
  totalFee: number;
  isFeePaid: boolean;
  remarks: string;
  roomReturned: string;
  imageMetadata: Record<string, any>;
  returnDate: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  returns: Returning[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  error?: string;
  details?: string;
}

interface ImageViewerProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

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

const SkeletonTableRow = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
          <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    </TableCell>
    <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-right"><div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto"></div></TableCell>
  </TableRow>
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
    const pages = [];
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

// Image Viewer Component
function ImageViewer({ images, isOpen, onClose, initialIndex = 0 }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen && images.length > 0) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, images, initialIndex]);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!isOpen) return null;

  const currentImage = images[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] max-w-[95vw] h-[90vh] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Damage Images</span>
            <span className="text-sm font-normal text-muted-foreground">
              {currentIndex + 1} of {images.length}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col items-center justify-center bg-black rounded-lg relative min-h-0">
          {currentImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={currentImage}
                alt={`Damage image ${currentIndex + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
              <ImageIcon className="h-8 w-8 mb-2" />
              <p>No image available</p>
            </div>
          )}

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                onClick={prevImage}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                onClick={nextImage}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto py-4">
            {images.map((image, index) => (
              <button
                key={index}
                className={`flex-shrink-0 w-16 h-16 border-2 rounded ${
                  index === currentIndex ? 'border-primary' : 'border-gray-300'
                }`}
                onClick={() => setCurrentIndex(index)}
              >
                <Image
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover rounded"
                />
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Utility function to safely parse number values
const safeParseNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Utility function to format currency
const formatCurrency = (amount: number): string => {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export default function EquipmentReturnPage() {
  const { user } = useAuthStore();
  const [returns, setReturns] = useState<Returning[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Returning | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Fetch returns from API
  const fetchReturns = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/returning?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch returns');
      }
      
      // Ensure numeric values are properly parsed
      const processedReturns = (data.returns || []).map(returnItem => ({
        ...returnItem,
        penaltyFee: safeParseNumber(returnItem.penaltyFee),
        damageFee: safeParseNumber(returnItem.damageFee),
        totalFee: safeParseNumber(returnItem.totalFee),
        lateDays: safeParseNumber(returnItem.lateDays),
      }));
      
      setReturns(processedReturns);
      
      // Update pagination state
      if (data.pagination) {
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setHasNext(data.pagination.hasNext);
        setHasPrev(data.pagination.hasPrev);
        setTotalItems(data.pagination.total);
      }
      
    } catch (error) {
      console.error("Error fetching returns:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load return records";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns(currentPage);
  }, [searchTerm]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchReturns(page);
  };

  // Test connection function
  const testConnection = async () => {
    try {
      const response = await fetch('/api/returning/test');
      const data = await response.json();
      console.log('Test connection result:', data);
      
      if (data.success) {
        toast.success('Connection test completed - check console');
      } else {
        toast.error(`Connection test failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast.error('Connection test failed');
    }
  };

  // Formatters
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Status Badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Rejected</Badge>;
      case "completed":
        return <Badge className="bg-gray-500 hover:bg-gray-600 text-white">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDamageSeverityBadge = (severity: string) => {
    switch (severity) {
      case "None":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">No Damage</Badge>;
      case "Minor":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Minor</Badge>;
      case "Moderate":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Moderate</Badge>;
      case "Severe":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Severe</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  // Check if return requires manual review
  const requiresManualReview = (returnRecord: Returning) => {
    return returnRecord.status === 'pending' && 
           (returnRecord.damageSeverity === 'Moderate' || returnRecord.damageSeverity === 'Severe');
  };

  // Check if return is auto-approved
  const isAutoApproved = (returnRecord: Returning) => {
    return (returnRecord.damageSeverity === 'None' || returnRecord.damageSeverity === 'Minor') && 
           (returnRecord.status === 'approved' || returnRecord.status === 'completed');
  };

  // Handle status update for manual review items
  const handleStatusUpdate = async (returnId: string, newStatus: 'approved' | 'rejected' | 'completed') => {
    if (!returnId) {
      toast.error('Invalid return ID');
      return;
    }

    if (!['approved', 'rejected', 'completed'].includes(newStatus)) {
      toast.error('Invalid status value');
      return;
    }

    setUpdatingId(returnId);
    try {
      console.log('Updating return status:', { returnId, newStatus });
      
      const response = await fetch(`/api/returning/${returnId}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: newStatus,
          updatedAt: new Date().toISOString()
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      console.log('Update successful:', data.return);
      
      // Refresh the data
      await fetchReturns(currentPage);
      setIsReturnDialogOpen(false);
      setSelectedReturn(null);
      
      toast.success(`Return ${newStatus} successfully`);
      
    } catch (error) {
      console.error("Error updating return status:", error);
      
      let errorMessage = "Failed to update return status";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle view details
  const handleViewDetails = (returnRecord: Returning) => {
    setSelectedReturn(returnRecord);
    setIsDetailsDialogOpen(true);
  };

  // Handle process return (only for manual review items)
  const handleProcessReturn = (returnRecord: Returning) => {
    setSelectedReturn(returnRecord);
    setIsReturnDialogOpen(true);
  };

  // Handle view images
  const handleViewImages = (returnRecord: Returning, index: number = 0) => {
    setSelectedReturn(returnRecord);
    setSelectedImageIndex(index);
    setIsImageViewerOpen(true);
  };

  // Image preview component for thumbnails
  const ImagePreview = ({ images, onImageClick }: { images: string[]; onImageClick: (index: number) => void }) => {
    return (
      <div className="flex gap-2 flex-wrap">
        {images.map((image, index) => (
          <div key={index} className="relative group">
            <div 
              className="w-16 h-16 border rounded-md overflow-hidden cursor-pointer bg-gray-100 flex items-center justify-center"
              onClick={() => onImageClick(index)}
            >
              <Image
                src={image}
                alt={`Damage image ${index + 1}`}
                width={64}
                height={64}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-md flex items-center justify-center">
              <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Calculate statistics safely
  const calculateStatistics = () => {
    let totalFees = 0;
    let pendingFees = 0;
    
    returns.forEach(r => {
      const totalFee = safeParseNumber(r.totalFee);
      totalFees += totalFee;
      
      if (!r.isFeePaid) {
        pendingFees += totalFee;
      }
    });

    return {
      totalFees,
      pendingFees,
      pendingCount: returns.filter(r => r.status === 'pending').length,
      approvedCount: returns.filter(r => r.status === 'approved').length,
      completedCount: returns.filter(r => r.status === 'completed').length,
      rejectedCount: returns.filter(r => r.status === 'rejected').length,
      autoApprovedReturns: returns.filter(r => 
        (r.damageSeverity === 'None' || r.damageSeverity === 'Minor') && 
        (r.status === 'approved' || r.status === 'completed')
      ).length,
      manualReviewReturns: returns.filter(r => requiresManualReview(r)).length,
    };
  };

  const stats = calculateStatistics();

  // Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex-1 space-y-6 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
              <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
              <div className="h-4 w-40 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {[...Array(7)].map((_, i) => (
                      <TableHead key={i}>
                        <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <SkeletonTableRow key={i} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error && returns.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive text-lg mb-2">Error Loading Data</div>
          <div className="text-muted-foreground mb-4">{error}</div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => fetchReturns(1)} className="bg-emerald-500 hover:bg-emerald-600">
              Try Again
            </Button>
            <Button onClick={testConnection} variant="outline">
              Test Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex-1 space-y-6 p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Equipment Returns Management</h1>
            <p className="text-muted-foreground mt-2">Manage and process equipment return records</p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => fetchReturns(currentPage)} 
              variant="outline" 
              className="flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Returns</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalItems}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <p className="text-xs text-muted-foreground">All records</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.pendingCount}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <p className="text-xs text-muted-foreground">Awaiting action</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Auto-Approved</CardTitle>
              <Check className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.autoApprovedReturns}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <p className="text-xs text-muted-foreground">No/Minor damage</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Manual Review</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.manualReviewReturns}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                <p className="text-xs text-muted-foreground">Moderate/Severe</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Fees</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalFees)}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-purple-500" />
                <p className="text-xs text-muted-foreground">All fees</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Pending Fees</CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.pendingFees)}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <p className="text-xs text-muted-foreground">Unpaid fees</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Return Records Management
            </CardTitle>
            <CardDescription>Manage and process equipment return records and assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by equipment, user, or room..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setCurrentPage(1);
                      fetchReturns(1);
                    }
                  }}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                  fetchReturns(1);
                }}
              >
                Clear Filters
              </Button>
            </div>

            {/* Returns Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Equipment Details</TableHead>
                    <TableHead className="font-semibold">Borrower</TableHead>
                    <TableHead className="font-semibold">Return Dates</TableHead>
                    <TableHead className="font-semibold">Condition & Damage</TableHead>
                    <TableHead className="font-semibold">Damage Images</TableHead>
                    <TableHead className="font-semibold">Fees</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">No return records found matching your criteria</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    returns.map((returnRecord) => (
                      <TableRow key={returnRecord._id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              {returnRecord.equipmentName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>ID: {returnRecord.equipmentItemId}</div>
                              <div>Room: {returnRecord.roomReturned}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {returnRecord.borrowerName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {returnRecord.borrowerEmail}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {returnRecord.borrowerType}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-foreground">Returned: {formatDate(returnRecord.actualReturnDate)}</span>
                            </div>
                            <div className="text-muted-foreground">
                              Due: {formatDate(returnRecord.intendedReturnDate)}
                            </div>
                            {returnRecord.isLate && (
                              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                Late by {returnRecord.lateDays} days
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getDamageSeverityBadge(returnRecord.damageSeverity)}
                            <div className="text-xs text-muted-foreground">
                              Condition: {returnRecord.conditionAfter}
                            </div>
                            {isAutoApproved(returnRecord) && (
                              <div className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                ✅ Auto-approved
                              </div>
                            )}
                            {requiresManualReview(returnRecord) && (
                              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                ⚠️ Requires review
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {returnRecord.damageImages && returnRecord.damageImages.length > 0 ? (
                            <div className="space-y-2">
                              <ImagePreview 
                                images={returnRecord.damageImages} 
                                onImageClick={(index) => handleViewImages(returnRecord, index)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => handleViewImages(returnRecord)}
                              >
                                <ZoomIn className="h-3 w-3 mr-1" />
                                View All ({returnRecord.damageImages.length})
                              </Button>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">
                              No images
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="font-medium text-foreground">
                              Total: {formatCurrency(returnRecord.totalFee)}
                            </div>
                            <div className={`text-xs ${returnRecord.isFeePaid ? 'text-emerald-600' : 'text-red-600'}`}>
                              {returnRecord.isFeePaid ? 'Paid' : 'Unpaid'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewDetails(returnRecord)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              
                              {returnRecord.damageImages && returnRecord.damageImages.length > 0 && (
                                <DropdownMenuItem onClick={() => handleViewImages(returnRecord)}>
                                  <ImageIcon className="h-4 w-4 mr-2" />
                                  View Damage Images
                                </DropdownMenuItem>
                              )}
                              
                              {/* Only show process actions for returns that require manual review */}
                              {requiresManualReview(returnRecord) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleProcessReturn(returnRecord)}
                                    className="text-blue-600"
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Review Return
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(returnRecord.equipmentName)}
                              >
                                Copy Equipment Name
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={totalItems}
                itemsPerPage={limit}
              />
            </div>
          </CardContent>
        </Card>

        {/* Return Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Return Record Details</DialogTitle>
              <DialogDescription>
                Complete information for this equipment return
              </DialogDescription>
            </DialogHeader>
            
            {selectedReturn && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Equipment</Label>
                    <p className="text-sm">{selectedReturn.equipmentName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Item ID</Label>
                    <p className="text-sm">{selectedReturn.equipmentItemId}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Borrower</Label>
                    <p className="text-sm">{selectedReturn.borrowerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <p className="text-sm capitalize">{selectedReturn.borrowerType}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Condition Assessment</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Before Return</p>
                      <p className="text-sm font-medium">{selectedReturn.conditionBefore}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">After Return</p>
                      <p className="text-sm font-medium">{selectedReturn.conditionAfter}</p>
                    </div>
                  </div>
                </div>

                {selectedReturn.damageImages && selectedReturn.damageImages.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Damage Images</Label>
                    <div className="mt-2">
                      <ImagePreview 
                        images={selectedReturn.damageImages} 
                        onImageClick={(index) => {
                          setIsDetailsDialogOpen(false);
                          handleViewImages(selectedReturn, index);
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedReturn.damageDescription && (
                  <div>
                    <Label className="text-sm font-medium">Damage Description</Label>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedReturn.damageDescription}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Damage Severity</Label>
                    <div className="mt-1">
                      {getDamageSeverityBadge(selectedReturn.damageSeverity)}
                    </div>
                    {isAutoApproved(selectedReturn) && (
                      <div className="text-xs text-emerald-600 mt-1">
                        ✅ Auto-approved (No/Minor damage)
                      </div>
                    )}
                    {requiresManualReview(selectedReturn) && (
                      <div className="text-xs text-orange-600 mt-1">
                        ⚠️ Requires manual review (Moderate/Severe damage)
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Late Return</Label>
                    <p className="text-sm mt-1">
                      {selectedReturn.isLate ? `Yes (${selectedReturn.lateDays} days)` : 'No'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Penalty Fee</Label>
                    <p className="text-sm">{formatCurrency(selectedReturn.penaltyFee)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Damage Fee</Label>
                    <p className="text-sm">{formatCurrency(selectedReturn.damageFee)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Total Fee</Label>
                  <p className="text-lg font-bold">{formatCurrency(selectedReturn.totalFee)}</p>
                  <p className={`text-sm ${selectedReturn.isFeePaid ? 'text-emerald-600' : 'text-red-600'}`}>
                    {selectedReturn.isFeePaid ? 'Payment Completed' : 'Payment Pending'}
                  </p>
                </div>

                {selectedReturn.remarks && (
                  <div>
                    <Label className="text-sm font-medium">Remarks</Label>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedReturn.remarks}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Process Return Dialog - Only for manual review items */}
        <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Review Return Request</DialogTitle>
              <DialogDescription>
                Manual review required for: {selectedReturn?.equipmentName}
              </DialogDescription>
            </DialogHeader>
            
            {selectedReturn && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-sm font-medium">Borrower</Label>
                    <p>{selectedReturn.borrowerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Item ID</Label>
                    <p>{selectedReturn.equipmentItemId}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Condition Before Return</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">
                    <Badge variant="outline">{selectedReturn.conditionBefore}</Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Condition After Return</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">
                    <Badge variant="outline">{selectedReturn.conditionAfter}</Badge>
                  </div>
                </div>

                {selectedReturn.damageImages && selectedReturn.damageImages.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Damage Images</Label>
                    <div className="mt-2">
                      <ImagePreview 
                        images={selectedReturn.damageImages} 
                        onImageClick={(index) => {
                          setIsReturnDialogOpen(false);
                          handleViewImages(selectedReturn, index);
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedReturn.damageDescription && (
                  <div>
                    <Label className="text-sm font-medium">Damage Description</Label>
                    <div className="p-3 bg-muted rounded-md text-sm mt-1">
                      {selectedReturn.damageDescription}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Damage Severity</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">
                    {getDamageSeverityBadge(selectedReturn.damageSeverity)}
                  </div>
                </div>

                {selectedReturn.totalFee > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Total Fee</Label>
                    <div className="p-3 bg-red-50 rounded-md text-lg font-bold text-red-600 mt-1">
                      {formatCurrency(selectedReturn.totalFee)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                onClick={() => selectedReturn && handleStatusUpdate(selectedReturn._id, 'rejected')}
                variant="outline"
                className="text-red-700 hover:bg-red-50"
                disabled={updatingId === selectedReturn?._id}
              >
                {updatingId === selectedReturn?._id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
              <Button 
                onClick={() => selectedReturn && handleStatusUpdate(selectedReturn._id, 'approved')}
                className="bg-emerald-500 hover:bg-emerald-600"
                disabled={updatingId === selectedReturn?._id}
              >
                {updatingId === selectedReturn?._id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Approve Return
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Viewer */}
        {selectedReturn && (
          <ImageViewer
            images={selectedReturn.damageImages}
            isOpen={isImageViewerOpen}
            onClose={() => setIsImageViewerOpen(false)}
            initialIndex={selectedImageIndex}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-background py-6 px-6 mt-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fisheries Lab Management System. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
            <span className="text-sm text-muted-foreground">Returns Dashboard v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

EquipmentReturnPage.pageTitle = "Equipment Returns Management";