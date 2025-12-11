"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster, toast } from "sonner";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowLeft,
  RefreshCw,
  FileText,
  AlertCircle,
  Filter
} from "lucide-react";
import { useRouter } from "next/navigation";

interface BorrowRequest {
  _id: string;
  equipmentId: {
    _id: string;
    name: string;
    itemId: string;
    description: string;
  };
  borrowerName: string;
  borrowerEmail: string;
  purpose: string;
  quantity: number;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'released' | 'returned' | 'overdue' | 'return_requested' | 'return_approved' | 'return_rejected';
  requestedDate: string;
  intendedBorrowDate: string;
  intendedReturnDate: string;
  approvedDate?: string;
  releasedDate?: string;
  actualReturnDate?: string;
  adminRemarks?: string;
  conditionOnBorrow?: string;
  conditionOnReturn?: string;
  roomAssigned?: string;
  penaltyFee: number;
}

export default function BorrowRequests() {
  const router = useRouter();
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBorrowRequests();
  }, []);

  const fetchBorrowRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Fetching borrow requests...");
      
      const response = await fetch('/api/student/borrow-requests');
      
      if (!response.ok) {
        console.error("❌ API response not OK:", response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📋 Borrow requests API Response:", data);
      
      if (data.success) {
        setBorrowRequests(data.borrowRequests);
        console.log("✅ Borrow requests loaded successfully:", data.borrowRequests.length);
        
        // Show toast if no requests found
        if (data.borrowRequests.length === 0) {
          toast.info('No borrow requests found. Start by borrowing equipment.', {
            className: "bg-blue-50 text-blue-700 border border-blue-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          });
        }
      } else {
        setError(data.error || 'Failed to fetch borrow requests');
        throw new Error(data.error || 'Failed to fetch borrow requests');
      }
    } catch (error) {
      console.error('❌ Error fetching borrow requests:', error);
      setError('Failed to load borrow requests. Please try again.');
      toast.error('Failed to load borrow requests. Please try again.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBorrowRequests();
  };

  const handleViewDetails = (requestId: string) => {
    router.push(`/user/borrow-requests/${requestId}`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      approved: { variant: 'default' as const, icon: CheckCircle2, label: 'Approved', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejected', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      released: { variant: 'default' as const, icon: CheckCircle2, label: 'Released', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      returned: { variant: 'outline' as const, icon: CheckCircle2, label: 'Returned', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
      overdue: { variant: 'destructive' as const, icon: AlertCircle, label: 'Overdue', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      return_requested: { variant: 'secondary' as const, icon: Clock, label: 'Return Requested', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
      return_approved: { variant: 'default' as const, icon: CheckCircle2, label: 'Return Approved', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      return_rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Return Rejected', className: 'bg-red-100 text-red-800 hover:bg-red-100' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatShortDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusCounts = () => {
    const counts = {
      all: borrowRequests.length,
      pending: borrowRequests.filter(req => req.status === 'pending').length,
      approved: borrowRequests.filter(req => req.status === 'approved').length,
      released: borrowRequests.filter(req => req.status === 'released').length,
      returned: borrowRequests.filter(req => req.status === 'returned').length,
      overdue: borrowRequests.filter(req => req.status === 'overdue').length,
      rejected: borrowRequests.filter(req => req.status === 'rejected').length,
      return_requested: borrowRequests.filter(req => req.status === 'return_requested').length,
    };
    return counts;
  };

  const filteredRequests = selectedStatus === "all" 
    ? borrowRequests 
    : borrowRequests.filter(req => req.status === selectedStatus);

  const statusCounts = getStatusCounts();

  const statusFilters = [
    { value: "all", label: "All", count: statusCounts.all },
    { value: "pending", label: "Pending", count: statusCounts.pending },
    { value: "approved", label: "Approved", count: statusCounts.approved },
    { value: "released", label: "Released", count: statusCounts.released },
    { value: "returned", label: "Returned", count: statusCounts.returned },
    { value: "overdue", label: "Overdue", count: statusCounts.overdue },
    { value: "rejected", label: "Rejected", count: statusCounts.rejected },
    { value: "return_requested", label: "Return Requested", count: statusCounts.return_requested },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16a34a] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your borrow requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />
      
      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-br from-green-50 to-blue-50">
        <motion.div
          className="container mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <h1 className="text-4xl font-bold text-[#16a34a] mb-4">
            My Borrow Requests
          </h1>
          <p className="text-lg text-black max-w-2xl mx-auto mb-8">
            Track and manage all your equipment borrowing requests
          </p>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 border-[#16a34a] hover:shadow-lg transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push('/user/dashboard')}
                      className="text-[#16a34a] hover:bg-green-100 hover:text-green-700"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                      <CardTitle className="text-[#16a34a]">Borrowing History</CardTitle>
                      <CardDescription className="text-black">
                        {borrowRequests.length} total request{borrowRequests.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button
                      onClick={() => router.push('/user/borrow-equipment')}
                      className="bg-[#16a34a] hover:bg-green-700 text-white"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Borrow New Equipment
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Status Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mr-2">
                    <Filter className="h-4 w-4" />
                    Filter by:
                  </div>
                  {statusFilters.map(filter => (
                    <Button
                      key={filter.value}
                      variant={selectedStatus === filter.value ? "default" : "outline"}
                      className={`flex items-center gap-2 ${
                        selectedStatus === filter.value 
                          ? 'bg-[#16a34a] text-white' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedStatus(filter.value)}
                    >
                      {filter.label}
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          selectedStatus === filter.value 
                            ? 'bg-white text-[#16a34a]' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {filter.count}
                      </Badge>
                    </Button>
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="h-5 w-5" />
                      <p className="font-medium">{error}</p>
                    </div>
                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      size="sm"
                      className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Try Again
                    </Button>
                  </div>
                )}

                {/* Requests List */}
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      {selectedStatus === "all" ? "No borrow requests yet" : `No ${selectedStatus} requests`}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {selectedStatus === "all" 
                        ? "Get started by borrowing your first equipment."
                        : `You don't have any ${selectedStatus} borrow requests at the moment.`
                      }
                    </p>
                    {selectedStatus === "all" && (
                      <Button
                        onClick={() => router.push('/user/borrow-equipment')}
                        className="bg-[#16a34a] hover:bg-green-700 text-white"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Borrow Equipment
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map((request) => (
                      <motion.div
                        key={request._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="border border-gray-200 hover:border-[#16a34a] hover:shadow-md transition-all duration-200">
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              {/* Request Info */}
                              <div className="flex-1 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                  <div>
                                    <h3 className="font-semibold text-lg text-black">
                                      {request.equipmentId.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {request.purpose}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs">
                                        ID: {request.equipmentId.itemId}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        Qty: {request.quantity}
                                      </Badge>
                                      {getStatusBadge(request.status)}
                                    </div>
                                  </div>
                                  
                                  <div className="text-sm text-gray-500 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4" />
                                      <span>Requested: {formatShortDate(request.requestedDate)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>Return: {formatShortDate(request.intendedReturnDate)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Additional Info */}
                                {request.description && (
                                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                    <strong>Notes:</strong> {request.description}
                                  </p>
                                )}

                                {request.adminRemarks && (
                                  <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <strong>Admin Remarks:</strong> {request.adminRemarks}
                                  </p>
                                )}

                                {/* Timeline */}
                                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                  <div>
                                    <strong>Requested:</strong> {formatDate(request.requestedDate)}
                                  </div>
                                  {request.approvedDate && (
                                    <div>
                                      <strong>Approved:</strong> {formatDate(request.approvedDate)}
                                    </div>
                                  )}
                                  {request.releasedDate && (
                                    <div>
                                      <strong>Released:</strong> {formatDate(request.releasedDate)}
                                    </div>
                                  )}
                                  {request.actualReturnDate && (
                                    <div>
                                      <strong>Returned:</strong> {formatDate(request.actualReturnDate)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:items-end">
                                <Button
                                  onClick={() => handleViewDetails(request._id)}
                                  variant="outline"
                                  className="flex items-center gap-2 border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Button>
                                
                                {/* Return Request Button for released items */}
                                {request.status === 'released' && (
                                  <Button
                                    onClick={() => router.push(`/user/return-request/${request._id}`)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
                                  >
                                    <Package className="h-4 w-4" />
                                    Request Return
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Statistics Card */}
          {borrowRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-blue-800">Request Statistics</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4">
                    {statusFilters.map(filter => (
                      <div key={filter.value} className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-800">{filter.count}</div>
                        <div className="text-sm text-gray-600 capitalize">{filter.label.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}