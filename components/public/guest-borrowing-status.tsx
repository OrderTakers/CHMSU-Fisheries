"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Package, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  Undo2,
  Calendar,
  User,
  BookOpen,
  School,
  Mail,
  Camera,
  FileText,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// Update the BorrowingRequest interface to include email
interface BorrowingRequest {
  _id: string;
  requestId: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  course: string;
  year: string;
  section: string;
  purpose: string;
  equipmentId: string;
  equipmentName: string;
  borrowDuration: string;
  requestedDate: string;
  status: 'pending' | 'approved' | 'declined' | 'returned';
  adminNotes?: string;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Return Form Interface
interface ReturnFormData {
  equipmentId: string;
  equipmentName: string;
  requestId: string; // This should be the borrowing request ID from GuestBorrowing
  borrowerName: string;
  borrowerEmail: string;
  borrowerSchoolId: string;
  conditionAfter: string;
  damageDescription: string;
  damageImages: string[];
  damageSeverity: 'None' | 'Minor' | 'Moderate' | 'Severe';
  roomReturned: string;
  remarks: string;
  actualReturnDate: string;
}

// Format date utility function
const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

// Calculate expected return date based on borrow duration
const calculateExpectedReturnDate = (borrowDuration: string, requestedDate: string): string => {
  const requestDate = new Date(requestedDate);
  let daysToAdd = 0;
  
  switch (borrowDuration) {
    case '1 day':
      daysToAdd = 1;
      break;
    case '3 days':
      daysToAdd = 3;
      break;
    case '1 week':
      daysToAdd = 7;
      break;
    case '2 weeks':
      daysToAdd = 14;
      break;
    case '1 month':
      daysToAdd = 30;
      break;
    default:
      daysToAdd = 7; // Default to 1 week
  }
  
  const returnDate = new Date(requestDate);
  returnDate.setDate(requestDate.getDate() + daysToAdd);
  return returnDate.toISOString();
};

// Check if item is overdue
const isOverdue = (borrowDuration: string, requestedDate: string): boolean => {
  const expectedReturn = new Date(calculateExpectedReturnDate(borrowDuration, requestedDate));
  const now = new Date();
  return now > expectedReturn;
};

// Calculate overdue days
const calculateOverdueDays = (borrowDuration: string, requestedDate: string): number => {
  const expectedReturn = new Date(calculateExpectedReturnDate(borrowDuration, requestedDate));
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - expectedReturn.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export function GuestBorrowingStatus() {
  const [schoolId, setSchoolId] = useState("");
  const [requests, setRequests] = useState<BorrowingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [lastSearchedId, setLastSearchedId] = useState("");
  const [returningRequests, setReturningRequests] = useState<Set<string>>(new Set());
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BorrowingRequest | null>(null);
  const [returnFormData, setReturnFormData] = useState<ReturnFormData>({
    equipmentId: "",
    equipmentName: "",
    requestId: "", // This will be set from the selected request
    borrowerName: "",
    borrowerEmail: "",
    borrowerSchoolId: "",
    conditionAfter: "Good",
    damageDescription: "",
    damageImages: [],
    damageSeverity: "None",
    roomReturned: "Fisheries Laboratory",
    remarks: "",
    actualReturnDate: new Date().toISOString()
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchBorrowingRequests = async (id: string) => {
    if (!id.trim()) {
      toast.error("Please enter your School ID", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    setLoading(true);
    setSearching(true);
    setLastSearchedId(id);

    try {
      const response = await fetch(`/api/guest/borrow-requests?schoolId=${encodeURIComponent(id)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setRequests(result.data || []);
        
        if (result.data.length === 0) {
          toast.info("No borrowing requests found for this School ID", {
            className: "bg-blue-50 text-blue-700 border border-blue-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          });
        } else {
          toast.success(`Found ${result.data.length} request(s)`, {
            className: "bg-green-50 text-green-700 border border-green-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          });
        }
      } else {
        toast.error(result.error || "Failed to fetch requests", {
          className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        });
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching borrowing requests:", error);
      toast.error("Network error. Please try again.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBorrowingRequests(schoolId);
  };

  const handleRefresh = () => {
    if (lastSearchedId) {
      fetchBorrowingRequests(lastSearchedId);
    }
  };

  const handleReturnToBorrowing = () => {
    window.location.href = "/guest/borrowing";
  };

  const handleLogout = () => {
    // Clear any guest-related data from localStorage
    localStorage.removeItem('guestToken');
    localStorage.removeItem('guestSession');
    
    toast.success("Successfully logged out", {
      className: "bg-green-50 text-green-700 border border-green-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
    });
    
    // Redirect to home page
    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  };

  const handleOpenReturnModal = (request: BorrowingRequest) => {
    console.log("Opening return modal for request:", request);
    
    setSelectedRequest(request);
    setReturnFormData({
      equipmentId: request.equipmentId,
      equipmentName: request.equipmentName,
      requestId: request.requestId, // This is the borrowing request ID
      borrowerName: `${request.firstName} ${request.lastName}`,
      borrowerEmail: request.email,
      borrowerSchoolId: request.schoolId,
      conditionAfter: "Good",
      damageDescription: "",
      damageImages: [],
      damageSeverity: "None",
      roomReturned: "Fisheries Laboratory",
      remarks: "",
      actualReturnDate: new Date().toISOString()
    });
    setShowReturnModal(true);
  };

  const handleCloseReturnModal = () => {
    setShowReturnModal(false);
    setSelectedRequest(null);
    setReturnFormData({
      equipmentId: "",
      equipmentName: "",
      requestId: "",
      borrowerName: "",
      borrowerEmail: "",
      borrowerSchoolId: "",
      conditionAfter: "Good",
      damageDescription: "",
      damageImages: [],
      damageSeverity: "None",
      roomReturned: "Fisheries Laboratory",
      remarks: "",
      actualReturnDate: new Date().toISOString()
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const file = files[0];
      
      // Convert image to base64 for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setReturnFormData(prev => ({
          ...prev,
          damageImages: [...prev.damageImages, base64String]
        }));
      };
      reader.readAsDataURL(file);
      
      toast.success("Image added successfully", {
        className: "bg-green-50 text-green-700 border border-green-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setReturnFormData(prev => ({
      ...prev,
      damageImages: prev.damageImages.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitReturn = async () => {
    if (!selectedRequest) {
      toast.error("No equipment selected for return", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    // Validate required fields
    if (!returnFormData.conditionAfter) {
      toast.error("Please select the equipment condition after use", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    if (!returnFormData.roomReturned) {
      toast.error("Please specify where you're returning the equipment", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    // If damage is reported, require description
    if (returnFormData.damageSeverity !== "None" && !returnFormData.damageDescription.trim()) {
      toast.error("Please describe the damage when reporting equipment issues", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    // Show confirmation for damage reporting
    if (returnFormData.damageSeverity !== "None") {
      const confirmDamage = window.confirm(
        `You're reporting ${returnFormData.damageSeverity.toLowerCase()} damage.\n\n` +
        `This will be reviewed by the lab staff and may affect future borrowing privileges.\n` +
        `Do you want to continue?`
      );
      if (!confirmDamage) return;
    }

    setReturningRequests(prev => new Set(prev).add(selectedRequest.requestId));
    
    try {
      toast.info("Submitting return request...", {
        className: "bg-blue-50 text-blue-700 border border-blue-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });

      // Calculate overdue status
      const overdueDays = selectedRequest ? calculateOverdueDays(selectedRequest.borrowDuration, selectedRequest.requestedDate) : 0;
      const isOverdueItem = selectedRequest ? isOverdue(selectedRequest.borrowDuration, selectedRequest.requestedDate) : false;
      
      // Prepare return data - FIXED: Ensure all required fields are included
      const returnData = {
        equipmentId: selectedRequest.equipmentId,
        equipmentName: selectedRequest.equipmentName,
        requestId: selectedRequest.requestId, // This is the borrowing request ID
        borrowerName: returnFormData.borrowerName,
        borrowerEmail: returnFormData.borrowerEmail,
        borrowerSchoolId: returnFormData.borrowerSchoolId,
        conditionAfter: returnFormData.conditionAfter,
        roomReturned: returnFormData.roomReturned,
        
        // Optional fields
        damageDescription: returnFormData.damageDescription,
        damageImages: returnFormData.damageImages,
        damageSeverity: returnFormData.damageSeverity,
        remarks: returnFormData.remarks,
        actualReturnDate: returnFormData.actualReturnDate,
        
        // Calculated fields for debugging
        overdueDays: overdueDays,
        isOverdue: isOverdueItem,
        borrowDuration: selectedRequest.borrowDuration,
        requestedDate: selectedRequest.requestedDate
      };

      console.log('Submitting return data:', returnData);

      // Submit return request
      const response = await fetch('/api/guest/return-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(returnData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Return request submitted successfully!", {
          className: "bg-green-50 text-green-700 border border-green-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 5000,
        });
        
        // Close modal and refresh data
        handleCloseReturnModal();
        fetchBorrowingRequests(lastSearchedId);
      } else {
        toast.error(result.error || "Failed to submit return request", {
          className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error("Error submitting return request:", error);
      toast.error(error.message || "Network error. Please try again.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
    } finally {
      setReturningRequests(prev => {
        const newSet = new Set(prev);
        if (selectedRequest) {
          newSet.delete(selectedRequest.requestId);
        }
        return newSet;
      });
    }
  };

  // Get counts for tabs
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const declinedCount = requests.filter(r => r.status === 'declined').length;
  const returnedCount = requests.filter(r => r.status === 'returned').length;

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header with Return Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#16a34a] flex items-center gap-2">
            <Package className="h-6 w-6" />
            Guest Borrowing Portal
          </h1>
          <p className="text-gray-600 mt-1">
            Check your borrowing status and manage your requests
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#16a34a]">
            Check Your Borrowing Status
          </CardTitle>
          <CardDescription className="text-black">
            Enter your School ID to view the status of your equipment borrowing requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex flex-col gap-4">
              <div className="flex-1">
                <Label htmlFor="schoolId" className="text-black mb-2 block">
                  School ID
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="schoolId"
                    type="text"
                    placeholder="Enter your School ID"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="border-gray-300 focus:border-[#16a34a] flex-1"
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    className="bg-[#16a34a] hover:bg-green-700 whitespace-nowrap"
                    disabled={loading}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? "Searching..." : "Search"}
                  </Button>
                  {lastSearchedId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={loading}
                      className="flex items-center gap-2 whitespace-nowrap"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Enter the same School ID you used when submitting borrowing requests
                </p>
              </div>
            </div>
          </form>

          {/* Results Section */}
          {searching && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16a34a] mx-auto mb-4"></div>
                  <p className="text-black">Loading your borrowing requests...</p>
                </div>
              ) : requests.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-black">
                      Your Borrowing Requests ({requests.length})
                    </h3>
                    <div className="text-sm text-gray-600">
                      Last updated: {formatDate(new Date().toISOString())}
                    </div>
                  </div>

                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid grid-cols-5 mb-6">
                      <TabsTrigger value="all">
                        All ({requests.length})
                      </TabsTrigger>
                      <TabsTrigger value="pending">
                        Pending ({pendingCount})
                      </TabsTrigger>
                      <TabsTrigger value="approved">
                        Approved ({approvedCount})
                      </TabsTrigger>
                      <TabsTrigger value="declined">
                        Declined ({declinedCount})
                      </TabsTrigger>
                      <TabsTrigger value="returned">
                        Returned ({returnedCount})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                      {requests.map((request) => (
                        <RequestCard 
                          key={request._id} 
                          request={request} 
                          onReturn={handleOpenReturnModal}
                          isReturning={returningRequests.has(request.requestId)}
                        />
                      ))}
                    </TabsContent>

                    <TabsContent value="pending" className="space-y-4">
                      {pendingCount > 0 ? (
                        requests.filter(r => r.status === 'pending').map((request) => (
                          <RequestCard 
                            key={request._id} 
                            request={request} 
                            onReturn={handleOpenReturnModal}
                            isReturning={returningRequests.has(request.requestId)}
                          />
                        ))
                      ) : (
                        <EmptyState message="No pending requests" />
                      )}
                    </TabsContent>

                    <TabsContent value="approved" className="space-y-4">
                      {approvedCount > 0 ? (
                        requests.filter(r => r.status === 'approved').map((request) => (
                          <RequestCard 
                            key={request._id} 
                            request={request} 
                            onReturn={handleOpenReturnModal}
                            isReturning={returningRequests.has(request.requestId)}
                          />
                        ))
                      ) : (
                        <EmptyState message="No approved requests" />
                      )}
                    </TabsContent>

                    <TabsContent value="declined" className="space-y-4">
                      {declinedCount > 0 ? (
                        requests.filter(r => r.status === 'declined').map((request) => (
                          <RequestCard 
                            key={request._id} 
                            request={request} 
                            onReturn={handleOpenReturnModal}
                            isReturning={returningRequests.has(request.requestId)}
                          />
                        ))
                      ) : (
                        <EmptyState message="No declined requests" />
                      )}
                    </TabsContent>

                    <TabsContent value="returned" className="space-y-4">
                      {returnedCount > 0 ? (
                        requests.filter(r => r.status === 'returned').map((request) => (
                          <RequestCard 
                            key={request._id} 
                            request={request} 
                            onReturn={handleOpenReturnModal}
                            isReturning={returningRequests.has(request.requestId)}
                          />
                        ))
                      ) : (
                        <EmptyState message="No returned requests" />
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <Card className="text-center p-8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No Requests Found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      No borrowing requests found for School ID: <span className="font-semibold">{lastSearchedId}</span>
                    </p>
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setSearching(false)}
                      >
                        Clear Search
                      </Button>
                      <Button
                        onClick={handleReturnToBorrowing}
                        className="bg-[#16a34a] hover:bg-green-700"
                      >
                        Submit New Request
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Return Equipment Modal */}
      <AnimatePresence>
        {showReturnModal && selectedRequest && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseReturnModal}
          >
            <motion.div
              className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-[#16a34a]">
                    Return Equipment
                  </h3>
                  <Button
                    variant="ghost"
                    onClick={handleCloseReturnModal}
                    className="text-gray-500 hover:text-gray-700"
                    disabled={returningRequests.has(selectedRequest.requestId)}
                  >
                    ✕
                  </Button>
                </div>

                {/* Equipment Information */}
                <Card className="mb-6 border-[#16a34a]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-black">{selectedRequest.equipmentName}</h4>
                        <p className="text-sm text-gray-600">Equipment ID: {selectedRequest.equipmentId}</p>
                        <p className="text-xs text-gray-500">Request ID: {selectedRequest.requestId}</p>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            Borrowed by: {selectedRequest.firstName} {selectedRequest.lastName}
                          </p>
                          <p className="text-sm text-gray-600">
                            Borrow Duration: {selectedRequest.borrowDuration}
                          </p>
                          <p className="text-sm text-gray-600">
                            Expected Return: {formatDate(calculateExpectedReturnDate(selectedRequest.borrowDuration, selectedRequest.requestedDate))}
                          </p>
                          {isOverdue(selectedRequest.borrowDuration, selectedRequest.requestedDate) && (
                            <p className="text-sm text-red-600 font-medium mt-1">
                              Overdue by {calculateOverdueDays(selectedRequest.borrowDuration, selectedRequest.requestedDate)} day(s)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Return Form */}
                <div className="space-y-4">
                  {/* Equipment Condition */}
                  <div>
                    <Label htmlFor="conditionAfter" className="text-black mb-2 block">
                      Equipment Condition After Use *
                    </Label>
                    <select
                      id="conditionAfter"
                      value={returnFormData.conditionAfter}
                      onChange={(e) => setReturnFormData(prev => ({ ...prev, conditionAfter: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-[#16a34a] focus:ring-[#16a34a]"
                      disabled={returningRequests.has(selectedRequest.requestId)}
                    >
                      <option value="Excellent">Excellent (Like new)</option>
                      <option value="Good">Good (Minor wear)</option>
                      <option value="Fair">Fair (Visible wear but functional)</option>
                      <option value="Poor">Poor (Functional but needs attention)</option>
                      <option value="Damaged">Damaged (Needs repair)</option>
                    </select>
                  </div>

                  {/* Damage Severity */}
                  <div>
                    <Label htmlFor="damageSeverity" className="text-black mb-2 block">
                      Damage Severity
                    </Label>
                    <select
                      id="damageSeverity"
                      value={returnFormData.damageSeverity}
                      onChange={(e) => setReturnFormData(prev => ({ 
                        ...prev, 
                        damageSeverity: e.target.value as 'None' | 'Minor' | 'Moderate' | 'Severe' 
                      }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-[#16a34a] focus:ring-[#16a34a]"
                      disabled={returningRequests.has(selectedRequest.requestId)}
                    >
                      <option value="None">No Damage</option>
                      <option value="Minor">Minor Damage (Scratches, minor wear)</option>
                      <option value="Moderate">Moderate Damage (Functional but needs repair)</option>
                      <option value="Severe">Severe Damage (Not functional, major repair needed)</option>
                    </select>
                  </div>

                  {/* Damage Description */}
                  {returnFormData.damageSeverity !== "None" && (
                    <div>
                      <Label htmlFor="damageDescription" className="text-black mb-2 block">
                        Damage Description *
                      </Label>
                      <textarea
                        id="damageDescription"
                        value={returnFormData.damageDescription}
                        onChange={(e) => setReturnFormData(prev => ({ ...prev, damageDescription: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[100px] resize-none focus:border-[#16a34a] focus:ring-[#16a34a]"
                        placeholder="Please describe any damage or issues with the equipment..."
                        disabled={returningRequests.has(selectedRequest.requestId)}
                      />
                    </div>
                  )}

                  {/* Damage Images */}
                  <div>
                    <Label className="text-black mb-2 block">
                      Damage Photos (Optional)
                    </Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                          disabled={uploadingImage || returningRequests.has(selectedRequest.requestId)}
                          id="damage-photo-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('damage-photo-upload')?.click()}
                          disabled={uploadingImage || returningRequests.has(selectedRequest.requestId)}
                          className="flex items-center gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          {uploadingImage ? "Uploading..." : "Add Photo"}
                        </Button>
                      </div>
                      
                      {/* Image Preview */}
                      {returnFormData.damageImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {returnFormData.damageImages.map((image, index) => (
                            <div key={index} className="relative">
                              <div className="w-full h-24 bg-gray-100 rounded overflow-hidden">
                                <Image
                                  src={image}
                                  alt={`Damage photo ${index + 1}`}
                                  width={100}
                                  height={100}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 text-white hover:bg-red-600"
                                disabled={returningRequests.has(selectedRequest.requestId)}
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <Label htmlFor="remarks" className="text-black mb-2 block">
                      Additional Remarks
                    </Label>
                    <textarea
                      id="remarks"
                      value={returnFormData.remarks}
                      onChange={(e) => setReturnFormData(prev => ({ ...prev, remarks: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[80px] resize-none focus:border-[#16a34a] focus:ring-[#16a34a]"
                      placeholder="Any additional notes about the return..."
                      disabled={returningRequests.has(selectedRequest.requestId)}
                    />
                  </div>

                  {/* Terms and Conditions */}
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800 mb-1">Return Policy</h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          <li>• Equipment must be returned in the same condition as borrowed</li>
                          <li>• Late returns may incur penalty fees (₱50/day)</li>
                          <li>• Damage fees apply based on severity</li>
                          <li>• All returns require staff inspection and approval</li>
                          <li>• False damage reporting may affect future borrowing privileges</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handleCloseReturnModal}
                      disabled={returningRequests.has(selectedRequest.requestId)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmitReturn}
                      className="flex-1 bg-[#16a34a] hover:bg-green-700"
                      disabled={returningRequests.has(selectedRequest.requestId)}
                    >
                      {returningRequests.has(selectedRequest.requestId) ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Submitting...
                        </div>
                      ) : (
                        "Submit Return Request"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Request Card Component
function RequestCard({ 
  request, 
  onReturn,
  isReturning 
}: { 
  request: BorrowingRequest;
  onReturn: (request: BorrowingRequest) => void;
  isReturning: boolean;
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'returned':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'returned':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved - Ready for Pickup';
      case 'declined':
        return 'Declined';
      case 'returned':
        return 'Returned';
      case 'pending':
        return 'Pending Review';
      default:
        return 'Unknown';
    }
  };

  const expectedReturnDate = calculateExpectedReturnDate(request.borrowDuration, request.requestedDate);
  const isOverdueItem = isOverdue(request.borrowDuration, request.requestedDate);
  const overdueDays = calculateOverdueDays(request.borrowDuration, request.requestedDate);

  return (
    <Card className="overflow-hidden border-l-4 border-l-[#16a34a] hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-lg text-black">{request.equipmentName}</h4>
                <p className="text-sm text-gray-600">Equipment ID: {request.equipmentId}</p>
                <p className="text-xs text-gray-500">Request ID: {request.requestId}</p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(request.status)}`}>
                {getStatusIcon(request.status)}
                <span className="text-sm font-medium">{getStatusText(request.status)}</span>
              </div>
            </div>
            
            {/* Overdue Warning */}
            {request.status === 'approved' && isOverdueItem && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">OVERDUE: {overdueDays} day(s) late</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Expected return was {formatDate(expectedReturnDate)}. Please return immediately.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Borrow Duration
                </p>
                <p className="font-medium text-black">{request.borrowDuration}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Requested Date
                </p>
                <p className="font-medium text-black">{formatDate(request.requestedDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expected Return
                </p>
                <p className={`font-medium ${isOverdueItem ? 'text-red-600' : 'text-black'}`}>
                  {formatDate(expectedReturnDate)}
                  {isOverdueItem && <span className="text-xs ml-2">({overdueDays} days ago)</span>}
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Purpose</p>
              <p className="text-sm text-black">{request.purpose}</p>
            </div>
            
            {request.adminNotes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
                <p className="text-sm text-gray-700">{request.adminNotes}</p>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {request.firstName} {request.lastName}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {request.email}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {request.course}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded flex items-center gap-1">
                  <School className="h-3 w-3" />
                  Year {request.year}, Section {request.section}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded flex items-center gap-1">
                  <School className="h-3 w-3" />
                  ID: {request.schoolId}
                </span>
              </div>
              
              {/* Return Button - Only show for approved requests */}
              {request.status === 'approved' && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => onReturn(request)}
                    disabled={isReturning}
                    variant="outline"
                    className={`flex items-center gap-2 ${
                      isOverdueItem 
                        ? 'border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700' 
                        : 'border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white'
                    }`}
                  >
                    <Undo2 className={`h-4 w-4 ${isReturning ? 'animate-spin' : ''}`} />
                    {isReturning ? 'Processing...' : isOverdueItem ? 'Return Overdue Equipment' : 'Return Equipment'}
                  </Button>
                </div>
              )}
              
              {/* Already Returned Message */}
              {request.status === 'returned' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Equipment Returned</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    This equipment has been successfully returned. Thank you!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Empty State Component
function EmptyState({ message }: { message: string }) {
  return (
    <Card className="text-center p-8">
      <div className="flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          {message}
        </h3>
        <p className="text-gray-600">
          No borrowing requests in this category
        </p>
      </div>
    </Card>
  );
}