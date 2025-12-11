"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Calendar, MoreVertical, User, Check, X, Mail, Loader2, RefreshCw, Clock, Package, FileText, RotateCcw, Users, Activity, TrendingUp, AlertCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Interfaces
interface Equipment {
  _id: string;
  itemId: string;
  name: string;
  category: string;
  condition: string;
  status?: 'available' | 'borrowed' | 'maintenance' | 'reserved';
  cost?: number;
  yearPurchased?: string;
  roomAssigned?: string;
  image?: string;
  availableQuantity?: number;
  borrowedQuantity?: number;
  quantity?: number;
}

interface RegularBorrowing {
  _id: string;
  equipmentId: Equipment | string;
  borrowerType: 'student' | 'faculty' | 'guest';
  borrowerId: string;
  borrowerName: string;
  borrowerEmail: string;
  purpose: string;
  quantity: number;
  description?: string;
  remarks?: string;
  status: "pending" | "approved" | "rejected" | "released" | "returned" | "overdue" | "return_requested" | "return_approved" | "return_rejected";
  requestedDate: string;
  intendedBorrowDate: string;
  intendedReturnDate: string;
  approvedDate?: string;
  releasedDate?: string;
  actualReturnDate?: string;
  approvedBy?: string;
  releasedBy?: string;
  receivedBy?: string;
  adminRemarks?: string;
  conditionOnBorrow?: string;
  conditionOnReturn?: string;
  damageReport?: string;
  roomAssigned?: string;
  laboratoryId?: string;
  penaltyFee?: number;
  isOverdue?: boolean;
  returnRequestDate?: string;
  returnApprovedDate?: string;
  returnStatus?: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  updatedAt: string;
}

interface GuestBorrowing {
  _id: string;
  requestId: string;
  schoolId: string;
  lastName: string;
  firstName: string;
  email: string;
  course: string;
  year: string;
  section: string;
  purpose: string;
  equipmentId: string;
  equipmentName: string;
  borrowDuration: string;
  requestedDate: string;
  status: "pending" | "approved" | "declined" | "returned";
  adminNotes?: string;
  conditionOnReturn?: string;
  damageReport?: string;
  penaltyFee?: number;
  createdAt: string;
  updatedAt: string;
}

interface ProcessedBorrowing {
  _id: string;
  requestId?: string;
  itemId: string;
  name: string;
  category: string;
  condition: string;
  borrower: string;
  borrowerType: "regular" | "guest";
  borrowerDetails: string;
  contactInfo: string;
  dateBorrowed: string;
  expectedReturn: string;
  status: "pending" | "approved" | "rejected" | "released" | "returned" | "overdue" | "return_requested" | "return_approved" | "return_rejected" | "declined";
  purpose?: string;
  borrowDuration?: string;
  adminNotes?: string;
  remarks?: string;
  conditionOnBorrow?: string;
  conditionOnReturn?: string;
  penaltyFee?: number;
  damageReport?: string;
  createdAt: string;
  updatedAt?: string;
  approvedDate?: string;
  releasedDate?: string;
  actualReturnDate?: string;
  returnRequestDate?: string;
  returnApprovedDate?: string;
  isEquipmentAvailable?: boolean;
  roomAssigned?: string;
  originalBorrowing?: RegularBorrowing | GuestBorrowing;
  quantity?: number;
  availableQuantity?: number;
}

interface ApiResponse {
  success: boolean;
  borrowings?: RegularBorrowing[];
  guestBorrowings?: GuestBorrowing[];
  borrowing?: RegularBorrowing;
  error?: string;
  message?: string;
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
          <span className="sr-only">Previous</span>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
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
          <span className="sr-only">Next</span>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
};

export default function BorrowingPage({ pageTitle = "Borrowing Management" }: { pageTitle?: string }) {
  const [borrowings, setBorrowings] = useState<ProcessedBorrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ 
    type: "approve" | "reject"; 
    id: string; 
    isGuest: boolean;
    borrowing: ProcessedBorrowing;
  } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<ProcessedBorrowing | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch all borrowings data
  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      setError(null);

      let regularBorrowings: RegularBorrowing[] = [];
      let guestBorrowings: GuestBorrowing[] = [];

      // Fetch regular borrowings
      try {
        console.log('Fetching regular borrowings from /api/borrowings...');
        const regularRes = await fetch("/api/borrowings", {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Regular borrowings response status:', regularRes.status);
        
        if (regularRes.ok) {
          const regularData: ApiResponse = await regularRes.json();
          console.log('Regular borrowings data:', regularData);
          
          if (regularData.success && regularData.borrowings) {
            regularBorrowings = regularData.borrowings;
            console.log(`Found ${regularBorrowings.length} regular borrowings`);
          } else {
            console.warn('Regular borrowings response format unexpected:', regularData);
            if (regularData.error) {
              toast.warning(regularData.error);
            }
          }
        } else {
          const errorText = await regularRes.text();
          if (errorText.includes('<!DOCTYPE')) {
            console.error('API endpoint returned HTML instead of JSON. Check if /api/borrowings exists.');
            toast.error("API endpoint not configured properly");
          } else {
            console.error('Failed to fetch regular borrowings:', regularRes.status, errorText);
            toast.error(`Failed to load regular borrowings: ${regularRes.status}`);
          }
        }
      } catch (regularError) {
        console.error('Network error fetching regular borrowings:', regularError);
        toast.error("Network error loading regular borrowings");
      }

      // Fetch guest borrowings
      try {
        console.log('Fetching guest borrowings from /api/guest-borrowings...');
        const guestRes = await fetch("/api/guest-borrowings", {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (guestRes.ok) {
          const guestData = await guestRes.json();
          console.log('Guest borrowings data:', guestData);
          
          if (guestData.success && guestData.guestBorrowings) {
            guestBorrowings = guestData.guestBorrowings;
            console.log(`Found ${guestBorrowings.length} guest borrowings`);
          } else {
            console.warn('Guest borrowings response format unexpected:', guestData);
            if (guestData.error) {
              toast.warning(guestData.error);
            }
          }
        } else {
          console.log('Guest borrowings endpoint returned error:', guestRes.status);
          // Don't show error if endpoint doesn't exist yet
        }
      } catch (guestError) {
        console.log('Guest borrowings endpoint not implemented yet');
      }

      // Process regular borrowings
      const processedRegular: ProcessedBorrowing[] = regularBorrowings.map((b: RegularBorrowing) => {
        const equipment = b.equipmentId;
        const isEquipmentPopulated = equipment && typeof equipment === 'object';
        
        return {
          _id: b._id,
          itemId: isEquipmentPopulated ? (equipment.itemId || equipment._id) : 'Unknown',
          name: isEquipmentPopulated ? (equipment.name || 'Unknown Item') : 'Unknown Item',
          category: isEquipmentPopulated ? (equipment.category || 'Unknown') : 'Unknown',
          condition: isEquipmentPopulated ? (equipment.condition || 'Unknown') : 'Unknown',
          borrower: b.borrowerName || 'Unknown User',
          borrowerType: "regular",
          borrowerDetails: `${b.borrowerType} - ${b.purpose || 'No purpose specified'}`,
          contactInfo: b.borrowerEmail || 'No email',
          dateBorrowed: b.requestedDate,
          expectedReturn: b.intendedReturnDate,
          status: b.status,
          remarks: b.remarks || b.adminRemarks,
          purpose: b.purpose,
          conditionOnBorrow: b.conditionOnBorrow,
          conditionOnReturn: b.conditionOnReturn,
          penaltyFee: b.penaltyFee || 0,
          damageReport: b.damageReport,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          approvedDate: b.approvedDate,
          releasedDate: b.releasedDate,
          actualReturnDate: b.actualReturnDate,
          returnRequestDate: b.returnRequestDate,
          returnApprovedDate: b.returnApprovedDate,
          isEquipmentAvailable: true,
          roomAssigned: b.roomAssigned || (isEquipmentPopulated ? equipment.roomAssigned : '') || 'Default Laboratory Room',
          originalBorrowing: b,
          quantity: b.quantity || 1,
          availableQuantity: isEquipmentPopulated ? (equipment.availableQuantity || equipment.quantity || 1) : 1
        };
      });

      // Process guest borrowings
      const processedGuest: ProcessedBorrowing[] = guestBorrowings.map((b: GuestBorrowing) => {
        return {
          _id: b._id,
          requestId: b.requestId,
          itemId: b.equipmentId,
          name: b.equipmentName,
          category: 'Guest Equipment',
          condition: 'Unknown',
          borrower: `${b.firstName} ${b.lastName}`,
          borrowerType: "guest",
          borrowerDetails: `${b.course} - Year ${b.year}, Section ${b.section}`,
          contactInfo: `Email: ${b.email} | School ID: ${b.schoolId}`,
          dateBorrowed: b.requestedDate,
          expectedReturn: new Date(new Date(b.requestedDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: b.status === 'declined' ? 'rejected' : 
                  b.status === 'returned' ? 'returned' : b.status,
          purpose: b.purpose,
          borrowDuration: b.borrowDuration,
          adminNotes: b.adminNotes,
          conditionOnReturn: b.conditionOnReturn,
          damageReport: b.damageReport,
          penaltyFee: b.penaltyFee || 0,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          isEquipmentAvailable: true,
          roomAssigned: 'Guest Equipment Room',
          originalBorrowing: b,
          quantity: 1,
          availableQuantity: 1
        };
      });

      // Combine both and sort by date (newest first)
      const allBorrowings = [...processedRegular, ...processedGuest].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log('Total processed borrowings:', allBorrowings.length);
      setBorrowings(allBorrowings);
      
      if (allBorrowings.length === 0) {
        toast.warning("No borrowing data found");
      } else {
        toast.success(`Loaded ${allBorrowings.length} borrowing requests`);
      }
      
    } catch (err) {
      console.error('Error in fetchBorrowings:', err);
      setError(err instanceof Error ? err.message : "Failed to fetch borrowing data");
      toast.error("Failed to load borrowing requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowings();
  }, []);

  // Active borrowings - only pending requests
  const activeBorrowings = borrowings.filter(b => 
    b.status === "pending"
  );

  // History borrowings - all other statuses
  const historyBorrowings = borrowings.filter(b => 
    b.status !== "pending"
  );

  const currentBorrowingsList = activeTab === "active" ? activeBorrowings : historyBorrowings;

  const filteredBorrowings = currentBorrowingsList.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.borrower.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.requestId && b.requestId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          b.borrowerDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.contactInfo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredBorrowings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBorrowings = filteredBorrowings.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, activeTab]);

  // Statistics
  const pendingCount = borrowings.filter((b) => b.status === "pending").length;
  const approvedCount = borrowings.filter((b) => b.status === "approved").length;
  const borrowedCount = borrowings.filter((b) => b.status === "released").length;
  const returnRequestedCount = borrowings.filter((b) => b.status === "return_requested").length;
  const rejectedCount = borrowings.filter((b) => b.status === "rejected" || b.status === "declined").length;
  const returnedCount = borrowings.filter((b) => b.status === "returned" || b.status === "return_approved").length;
  const regularCount = borrowings.filter((b) => b.borrowerType === "regular").length;
  const guestCount = borrowings.filter((b) => b.borrowerType === "guest").length;

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { className: "bg-amber-500 hover:bg-amber-600 text-white", label: "Pending Review" },
      approved: { className: "bg-emerald-500 hover:bg-emerald-600 text-white", label: "Approved" },
      rejected: { className: "bg-red-500 hover:bg-red-600 text-white", label: "Rejected" },
      declined: { className: "bg-red-500 hover:bg-red-600 text-white", label: "Declined" },
      released: { className: "bg-blue-500 hover:bg-blue-600 text-white", label: "Borrowed" },
      overdue: { className: "bg-orange-500 hover:bg-orange-600 text-white", label: "Overdue" },
      return_requested: { className: "bg-purple-500 hover:bg-purple-600 text-white", label: "Return Requested" },
      return_approved: { className: "bg-emerald-500 hover:bg-emerald-600 text-white", label: "Return Approved" },
      return_rejected: { className: "bg-red-500 hover:bg-red-600 text-white", label: "Return Rejected" },
      returned: { className: "bg-gray-500 hover:bg-gray-600 text-white", label: "Returned" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { className: "bg-gray-100 text-gray-800", label: status };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      approved: <Check className="h-4 w-4" />,
      rejected: <X className="h-4 w-4" />,
      declined: <X className="h-4 w-4" />,
      released: <Package className="h-4 w-4" />,
      overdue: <Package className="h-4 w-4" />,
      return_requested: <RotateCcw className="h-4 w-4" />,
      return_approved: <Check className="h-4 w-4" />,
      returned: <Check className="h-4 w-4" />,
      return_rejected: <X className="h-4 w-4" />
    };
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
  };

  const handleApprove = (borrowing: ProcessedBorrowing) => {
    // Check if equipment has enough available quantity
    if (borrowing.borrowerType === 'regular' && 
        borrowing.availableQuantity !== undefined && 
        borrowing.quantity !== undefined) {
      if (borrowing.availableQuantity < borrowing.quantity) {
        toast.error(`Cannot approve: Only ${borrowing.availableQuantity} items available, but ${borrowing.quantity} requested`);
        return;
      }
    }

    setSelectedAction({ 
      type: "approve", 
      id: borrowing._id, 
      isGuest: borrowing.borrowerType === 'guest',
      borrowing 
    });
    setApprovalRemarks("");
    setIsActionDialogOpen(true);
  };

  const handleDecline = (borrowingId: string, isGuest: boolean) => {
    const borrowing = borrowings.find(b => b._id === borrowingId);
    if (!borrowing) return;
    
    setSelectedAction({ 
      type: "reject", 
      id: borrowingId, 
      isGuest,
      borrowing
    });
    setApprovalRemarks("");
    setIsActionDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;
    
    setUpdatingId(selectedAction.id);
    
    try {
      if (selectedAction.type === 'approve') {
        if (selectedAction.isGuest) {
          // Handle guest borrowing approval
          console.log('Approving guest borrowing request:', selectedAction.borrowing._id);

          const endpoint = `/api/guest-borrowings/${selectedAction.id}`;
          
          const requestBody = { 
            status: 'approved',
            adminNotes: approvalRemarks || 'Request approved by administrator'
          };

          console.log('Approving guest borrowing:', endpoint, requestBody);

          const response = await fetch(endpoint, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          const responseText = await response.text();
          let data;
          
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse API response as JSON:', responseText);
            throw new Error('API returned invalid JSON response');
          }

          if (!response.ok) {
            // Handle specific error messages
            if (data.details) {
              throw new Error(`${data.error}: ${data.details}`);
            }
            throw new Error(data.error || `Failed to approve request: ${response.status}`);
          }

          if (!data.success) {
            throw new Error(data.error || 'Request failed');
          }

          console.log('Guest borrowing approved successfully');
          toast.success("Guest request approved successfully - Email sent to borrower");
          
          // Immediately update the local state to remove the item from active requests
          setBorrowings(prev => prev.map(b => 
            b._id === selectedAction.id 
              ? { ...b, status: 'approved' as const }
              : b
          ));
          
        } else {
          // Handle regular borrowing approval
          console.log('Approving regular borrowing request:', selectedAction.borrowing._id);

          const endpoint = `/api/borrowings/${selectedAction.id}`;
          
          const requestBody = { 
            status: 'approved',
            remarks: approvalRemarks || 'Request approved',
            adminRemarks: `Approved by administrator - ${new Date().toLocaleString()}`
          };

          console.log('Approving borrowing:', endpoint, requestBody);

          const response = await fetch(endpoint, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          const responseText = await response.text();
          let data;
          
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse API response as JSON:', responseText);
            throw new Error('API returned invalid JSON response');
          }

          if (!response.ok) {
            // Handle specific error messages
            if (data.details) {
              throw new Error(`${data.error}: ${data.details}`);
            }
            throw new Error(data.error || `Failed to approve request: ${response.status}`);
          }

          if (!data.success) {
            throw new Error(data.error || 'Request failed');
          }

          console.log('Borrowing approved successfully');
          toast.success("Request approved successfully - Inventory quantity updated");
          
          // Immediately update the local state to remove the item from active requests
          setBorrowings(prev => prev.map(b => 
            b._id === selectedAction.id 
              ? { ...b, status: 'approved' as const }
              : b
          ));
        }
      } else if (selectedAction.type === 'reject') {
        if (selectedAction.isGuest) {
          // Handle guest borrowing rejection
          const endpoint = `/api/guest-borrowings/${selectedAction.id}`;
          
          const requestBody = { 
            status: 'declined',
            adminNotes: approvalRemarks || 'Request rejected by administrator'
          };

          const response = await fetch(endpoint, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          const responseText = await response.text();
          let data;
          
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse API response as JSON:', responseText);
            throw new Error('API returned invalid JSON response');
          }

          if (!response.ok) {
            if (data.details) {
              throw new Error(`${data.error}: ${data.details}`);
            }
            throw new Error(data.error || `Failed to reject request: ${response.status}`);
          }

          if (!data.success) {
            throw new Error(data.error || 'Request failed');
          }

          toast.success("Guest request rejected successfully - Email sent to borrower");
          
          // Immediately update the local state to remove the item from active requests
          setBorrowings(prev => prev.map(b => 
            b._id === selectedAction.id 
              ? { ...b, status: 'declined' as const }
              : b
          ));
        } else {
          // Handle regular borrowing rejection
          const endpoint = `/api/borrowings/${selectedAction.id}`;
          
          const requestBody = { 
            status: 'rejected',
            adminRemarks: approvalRemarks || 'Request rejected by administrator'
          };

          const response = await fetch(endpoint, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          const responseText = await response.text();
          let data;
          
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse API response as JSON:', responseText);
            throw new Error('API returned invalid JSON response');
          }

          if (!response.ok) {
            if (data.details) {
              throw new Error(`${data.error}: ${data.details}`);
            }
            throw new Error(data.error || `Failed to reject request: ${response.status}`);
          }

          if (!data.success) {
            throw new Error(data.error || 'Request failed');
          }

          toast.success("Request rejected successfully");
          
          // Immediately update the local state to remove the item from active requests
          setBorrowings(prev => prev.map(b => 
            b._id === selectedAction.id 
              ? { ...b, status: 'rejected' as const }
              : b
          ));
        }
      }

      // Refresh the data after a short delay to ensure consistency
      setTimeout(() => {
        fetchBorrowings();
      }, 1000);
      
      setIsActionDialogOpen(false);
      setSelectedAction(null);
      setApprovalRemarks("");
      
    } catch (err) {
      console.error('Error processing request:', err);
      toast.error(err instanceof Error ? err.message : "Failed to process request. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const handleViewDetails = (borrowing: ProcessedBorrowing) => {
    setSelectedBorrowing(borrowing);
    setIsDetailsModalOpen(true);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // Details Modal Component
  const DetailsModal = () => {
    if (!selectedBorrowing) return null;

    return (
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Request Details
            </DialogTitle>
            <DialogDescription>
              Complete information for this borrowing request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status Overview */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedBorrowing.name}</h3>
                    <p className="text-sm text-muted-foreground">Item ID: {selectedBorrowing.itemId}</p>
                    {selectedBorrowing.requestId && (
                      <p className="text-sm text-muted-foreground">Request ID: {selectedBorrowing.requestId}</p>
                    )}
                    {selectedBorrowing.quantity && (
                      <p className="text-sm text-muted-foreground">
                        Quantity: {selectedBorrowing.quantity} | 
                        Available: {selectedBorrowing.availableQuantity || 'N/A'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedBorrowing.status)}
                    {getStatusBadge(selectedBorrowing.status)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grid Layout for Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Item Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedBorrowing.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item ID:</span>
                    <span className="font-medium">{selectedBorrowing.itemId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium">{selectedBorrowing.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condition:</span>
                    <span className="font-medium">{selectedBorrowing.condition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room Assigned:</span>
                    <span className="font-medium">{selectedBorrowing.roomAssigned}</span>
                  </div>
                  {selectedBorrowing.requestId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Request ID:</span>
                      <span className="font-medium">{selectedBorrowing.requestId}</span>
                    </div>
                  )}
                  {selectedBorrowing.quantity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-medium">{selectedBorrowing.quantity}</span>
                    </div>
                  )}
                  {selectedBorrowing.borrowDuration && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Borrow Duration:</span>
                      <span className="font-medium">{selectedBorrowing.borrowDuration}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Borrower Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Borrower Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedBorrowing.borrower}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline" className={selectedBorrowing.borrowerType === 'guest' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}>
                      {selectedBorrowing.borrowerType === 'guest' ? 'Guest User' : 'Regular User'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact:</span>
                    <span className="font-medium">{selectedBorrowing.contactInfo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Details:</span>
                    <span className="font-medium">{selectedBorrowing.borrowerDetails}</span>
                  </div>
                  {selectedBorrowing.purpose && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Purpose:</span>
                      <span className="font-medium">{selectedBorrowing.purpose}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Request Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Request Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested:</span>
                    <span className="font-medium">{formatDate(selectedBorrowing.dateBorrowed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Return:</span>
                    <span className="font-medium">{formatDate(selectedBorrowing.expectedReturn)}</span>
                  </div>
                  {selectedBorrowing.approvedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approved:</span>
                      <span className="font-medium">{formatDateTime(selectedBorrowing.approvedDate)}</span>
                    </div>
                  )}
                  {selectedBorrowing.releasedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Borrowed:</span>
                      <span className="font-medium">{formatDateTime(selectedBorrowing.releasedDate)}</span>
                    </div>
                  )}
                  {selectedBorrowing.actualReturnDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Returned:</span>
                      <span className="font-medium">{formatDateTime(selectedBorrowing.actualReturnDate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status History */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Status History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{formatDateTime(selectedBorrowing.createdAt)}</span>
                  </div>
                  {selectedBorrowing.updatedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span className="font-medium">{formatDateTime(selectedBorrowing.updatedAt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Status:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedBorrowing.status)}
                      <span className="font-medium">{selectedBorrowing.status.charAt(0).toUpperCase() + selectedBorrowing.status.slice(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Notes */}
            {(selectedBorrowing.adminNotes || selectedBorrowing.remarks) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {selectedBorrowing.adminNotes && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Admin Notes:</span>
                      <p className="bg-muted p-3 rounded-md">{selectedBorrowing.adminNotes}</p>
                    </div>
                  )}
                  {selectedBorrowing.remarks && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Remarks:</span>
                      <p className="bg-muted p-3 rounded-md">{selectedBorrowing.remarks}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
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
                    {[...Array(6)].map((_, i) => (
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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive text-lg mb-2">Error Loading Data</div>
          <div className="text-muted-foreground mb-4">{error}</div>
          <div className="flex gap-2 justify-center">
            <Button onClick={fetchBorrowings} className="bg-emerald-500 hover:bg-emerald-600">
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              Reload Page
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
            <h1 className="text-3xl font-bold text-foreground">{pageTitle}</h1>
            <p className="text-muted-foreground mt-2">Complete equipment borrowing management system</p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              onClick={fetchBorrowings}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              disabled={loading}
            > 
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">Regular: {regularCount}</Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">Guest: {guestCount}</Badge>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Approved</CardTitle>
              <Check className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{approvedCount}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Approved requests</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Borrowed</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{borrowedCount}</div>
              <div className="flex items-center gap-1 mt-1">
                <Activity className="h-3 w-3 text-blue-500" />
                <p className="text-xs text-muted-foreground">Currently borrowed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Return Requests</CardTitle>
              <RotateCcw className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{returnRequestedCount}</div>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-purple-500" />
                <p className="text-xs text-muted-foreground">Pending return</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Rejected</CardTitle>
              <X className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{rejectedCount}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <p className="text-xs text-muted-foreground">Rejected requests</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Returned</CardTitle>
              <Check className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{returnedCount}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-gray-500" />
                <p className="text-xs text-muted-foreground">Completed returns</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "active" | "history")} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:max-w-md bg-muted/50 p-1 rounded-lg">
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Active Requests
              <Badge variant="secondary" className="ml-2">
                {activeBorrowings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              History & Records
              <Badge variant="secondary" className="ml-2">
                {historyBorrowings.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Active Requests Tab */}
          <TabsContent value="active" className="space-y-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Active Borrowing Requests
                </CardTitle>
                <CardDescription>Manage pending borrowing requests requiring approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search pending requests by item, borrower, email, or ID..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </div>

                {currentBorrowings.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No active borrowing requests found</p>
                    <p className="text-sm text-muted-foreground mt-1">All requests have been processed or are in history</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-semibold">Item Details</TableHead>
                          <TableHead className="font-semibold">Borrower</TableHead>
                          <TableHead className="font-semibold">Dates</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentBorrowings.map((borrowing) => (
                          <TableRow key={borrowing._id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-foreground">{borrowing.name}</span>
                                  {borrowing.borrowerType === 'guest' && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">Guest</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <div>ID: {borrowing.itemId}</div>
                                  <div>Category: {borrowing.category}</div>
                                  <div>Room: {borrowing.roomAssigned}</div>
                                  {borrowing.requestId && <div>Request ID: {borrowing.requestId}</div>}
                                  {borrowing.quantity && (
                                    <div className="flex items-center gap-1">
                                      <span>Qty: {borrowing.quantity}</span>
                                      {borrowing.availableQuantity !== undefined && (
                                        <span className="text-xs">(Available: {borrowing.availableQuantity})</span>
                                      )}
                                    </div>
                                  )}
                                  {borrowing.borrowDuration && (
                                    <div>Duration: {borrowing.borrowDuration}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 font-medium text-foreground">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  {borrowing.borrower}
                                </div>
                                <div className="text-xs text-muted-foreground max-w-[200px]">
                                  {borrowing.borrowerDetails}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {borrowing.contactInfo}
                                </div>
                                {borrowing.purpose && (
                                  <div className="text-xs text-muted-foreground">
                                    Purpose: {borrowing.purpose}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium text-foreground">Requested: {formatDate(borrowing.dateBorrowed)}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  Expected Return: {formatDate(borrowing.expectedReturn)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(borrowing.status)}
                                {getStatusBadge(borrowing.status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Manage Request</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => handleViewDetails(borrowing)}
                                    className="flex items-center gap-2"
                                  >
                                    <FileText className="h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  {borrowing.status === 'pending' && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleApprove(borrowing)}
                                        className="flex items-center gap-2 text-emerald-600"
                                        disabled={updatingId === borrowing._id}
                                      >
                                        {updatingId === borrowing._id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                        {updatingId === borrowing._id ? "Processing..." : "Approve Request"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDecline(borrowing._id, borrowing.borrowerType === 'guest')}
                                        className="flex items-center gap-2 text-red-600"
                                        disabled={updatingId === borrowing._id}
                                      >
                                        {updatingId === borrowing._id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <X className="h-4 w-4" />
                                        )}
                                        {updatingId === borrowing._id ? "Processing..." : "Reject Request"}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                      totalItems={filteredBorrowings.length}
                      itemsPerPage={itemsPerPage}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Borrowing History & Records
                </CardTitle>
                <CardDescription>Review historical borrowing records and completed transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search historical records by item, borrower, email, or ID..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="released">Borrowed</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="return_approved">Return Approved</SelectItem>
                      <SelectItem value="return_rejected">Return Rejected</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </div>

                {currentBorrowings.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No historical records found</p>
                    <p className="text-sm text-muted-foreground mt-1">Returned and rejected requests will appear here</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-semibold">Item Details</TableHead>
                          <TableHead className="font-semibold">Borrower</TableHead>
                          <TableHead className="font-semibold">Request Dates</TableHead>
                          <TableHead className="font-semibold">Completion Date</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentBorrowings.map((borrowing) => (
                          <TableRow key={borrowing._id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-foreground">{borrowing.name}</span>
                                  {borrowing.borrowerType === 'guest' && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">Guest</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <div>ID: {borrowing.itemId}</div>
                                  <div>Category: {borrowing.category}</div>
                                  <div>Room: {borrowing.roomAssigned}</div>
                                  {borrowing.requestId && <div>Request ID: {borrowing.requestId}</div>}
                                  {borrowing.quantity && (
                                    <div>Quantity: {borrowing.quantity}</div>
                                  )}
                                  {borrowing.borrowDuration && (
                                    <div>Duration: {borrowing.borrowDuration}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 font-medium text-foreground">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  {borrowing.borrower}
                                </div>
                                <div className="text-xs text-muted-foreground max-w-[200px]">
                                  {borrowing.borrowerDetails}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {borrowing.contactInfo}
                                </div>
                                {borrowing.purpose && (
                                  <div className="text-xs text-muted-foreground">
                                    Purpose: {borrowing.purpose}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium text-foreground">Requested: {formatDate(borrowing.dateBorrowed)}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  Expected Return: {formatDate(borrowing.expectedReturn)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div className="font-medium text-foreground">
                                  {borrowing.updatedAt ? formatDateTime(borrowing.updatedAt) : 'N/A'}
                                </div>
                                {borrowing.actualReturnDate && (
                                  <div className="text-xs text-muted-foreground">
                                    Returned: {formatDate(borrowing.actualReturnDate)}
                                  </div>
                                )}
                                {borrowing.returnApprovedDate && (
                                  <div className="text-xs text-muted-foreground">
                                    Return Processed: {formatDate(borrowing.returnApprovedDate)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(borrowing.status)}
                                {getStatusBadge(borrowing.status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Record Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => handleViewDetails(borrowing)}
                                    className="flex items-center gap-2"
                                  >
                                    <FileText className="h-4 w-4" />
                                    View Full Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleViewDetails(borrowing)}
                                    className="flex items-center gap-2"
                                  >
                                    <Clock className="h-4 w-4" />
                                    View Complete History
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                      totalItems={filteredBorrowings.length}
                      itemsPerPage={itemsPerPage}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Confirmation Dialog */}
        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedAction?.type === "approve" ? (
                  <Check className="h-5 w-5 text-emerald-500" />
                ) : (
                  <X className="h-5 w-5 text-red-500" />
                )}
                Confirm {selectedAction?.type === "approve" ? "Approval" : "Rejection"}
              </DialogTitle>
              <div className="space-y-3">
                <DialogDescription>
                  {selectedAction?.type === "approve" 
                    ? `This ${selectedAction?.isGuest ? 'guest' : 'regular'} request will be approved. ${
                        !selectedAction?.isGuest && selectedAction?.borrowing.quantity ? 
                        `The item quantity will be deducted from inventory.` : 
                        ''
                      } Add any remarks if needed.`
                    : "Are you sure you want to reject this request?"
                  }
                </DialogDescription>
                {selectedAction?.type === "approve" && !selectedAction?.isGuest && selectedAction?.borrowing.quantity && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                    <strong>Quantity Impact:</strong> {selectedAction.borrowing.quantity} item(s) will be deducted from available inventory.
                  </div>
                )}
                {selectedAction?.type === "approve" && selectedAction?.isGuest && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-sm">
                    <strong>Email Notification:</strong> An approval email will be sent to the guest's email address.
                  </div>
                )}
                {selectedAction?.type === "reject" && selectedAction?.isGuest && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                    <strong>Email Notification:</strong> A rejection email will be sent to the guest's email address.
                  </div>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="remarks">
                {selectedAction?.type === "approve" ? "Approval Remarks (Optional)" : "Rejection Reason (Optional)"}
              </Label>
              <Textarea
                id="remarks"
                placeholder={
                  selectedAction?.type === "approve" 
                    ? "Add any additional remarks for the approval..."
                    : "Add reason for rejection..."
                }
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={updatingId !== null}>
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                onClick={handleConfirmAction} 
                disabled={updatingId !== null}
                className={
                  selectedAction?.type === "approve"
                    ? "bg-emerald-500 hover:bg-emerald-600" 
                    : "bg-red-500 hover:bg-red-600"
                }
              >
                {updatingId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Confirm ${selectedAction?.type === "approve" ? "Approve" : "Reject"}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Modal */}
        <DetailsModal />
      </div>

      {/* Footer */}
      <footer className="border-t bg-background py-6 px-6 mt-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fisheries Lab Management System. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
            <span className="text-sm text-muted-foreground">Borrowing Dashboard v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

BorrowingPage.pageTitle = "Borrowing Management";