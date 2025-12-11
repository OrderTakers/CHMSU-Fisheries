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
  ArrowLeft,
  User,
  Mail,
  FileText,
  AlertCircle,
  DollarSign
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";

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
  status: string;
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

export default function BorrowRequestDetails() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;
  
  const [borrowRequest, setBorrowRequest] = useState<BorrowRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (requestId) {
      fetchBorrowRequest();
    }
  }, [requestId]);

  const fetchBorrowRequest = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching borrow request details...");
      
      const response = await fetch(`/api/student/borrow-requests/${requestId}`);
      
      if (!response.ok) {
        console.error("❌ API response not OK:", response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📋 Borrow request API Response:", data);
      
      if (data.success) {
        setBorrowRequest(data.borrowRequest);
        console.log("✅ Borrow request loaded successfully");
      } else {
        throw new Error(data.error || 'Failed to fetch borrow request');
      }
    } catch (error) {
      console.error('❌ Error fetching borrow request:', error);
      toast.error('Failed to load borrow request details. Please try again.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      approved: { variant: 'default' as const, icon: CheckCircle2, label: 'Approved', className: 'bg-blue-100 text-blue-800' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejected', className: 'bg-red-100 text-red-800' },
      released: { variant: 'default' as const, icon: CheckCircle2, label: 'Released', className: 'bg-green-100 text-green-800' },
      returned: { variant: 'outline' as const, icon: CheckCircle2, label: 'Returned', className: 'bg-gray-100 text-gray-800' },
      overdue: { variant: 'destructive' as const, icon: AlertCircle, label: 'Overdue', className: 'bg-red-100 text-red-800' },
      return_requested: { variant: 'secondary' as const, icon: Clock, label: 'Return Requested', className: 'bg-purple-100 text-purple-800' },
      return_approved: { variant: 'default' as const, icon: CheckCircle2, label: 'Return Approved', className: 'bg-green-100 text-green-800' },
      return_rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Return Rejected', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge className={`flex items-center gap-1 text-base py-2 px-3 ${config.className}`}>
        <IconComponent className="h-4 w-4" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimelineItems = () => {
    if (!borrowRequest) return [];
    
    const items = [
      {
        status: 'Requested',
        date: borrowRequest.requestedDate,
        description: 'Borrow request submitted',
        active: true
      }
    ];

    if (borrowRequest.approvedDate) {
      items.push({
        status: 'Approved',
        date: borrowRequest.approvedDate,
        description: 'Request approved by admin',
        active: true
      });
    }

    if (borrowRequest.releasedDate) {
      items.push({
        status: 'Released',
        date: borrowRequest.releasedDate,
        description: 'Equipment released for use',
        active: true
      });
    }

    if (borrowRequest.actualReturnDate) {
      items.push({
        status: 'Returned',
        date: borrowRequest.actualReturnDate,
        description: 'Equipment returned',
        active: true
      });
    }

    return items;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16a34a] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!borrowRequest) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Request Not Found</h2>
          <p className="text-gray-600 mb-4">The borrow request you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/user/borrow-requests')}>
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  const timelineItems = getTimelineItems();

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />
      
      {/* Hero Section */}
      <section className="py-8 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="flex items-center space-x-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/user/borrow-requests')}
                className="text-[#16a34a] hover:bg-green-100 hover:text-green-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-[#16a34a]">
                  Request Details
                </h1>
                <p className="text-lg text-black">
                  Equipment: {borrowRequest.equipmentId.name}
                </p>
              </div>
              <div className="ml-auto">
                {getStatusBadge(borrowRequest.status)}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Equipment and Request Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Equipment Information */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-2 border-[#16a34a]">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                    <CardTitle className="text-[#16a34a] flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Equipment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Equipment Name</Label>
                        <p className="font-semibold text-black">{borrowRequest.equipmentId.name}</p>
                      </div>
                      <div>
                        <Label>Equipment ID</Label>
                        <p className="font-semibold text-black">{borrowRequest.equipmentId.itemId}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <p className="text-gray-700">{borrowRequest.equipmentId.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Request Details */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2 border-blue-200">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="text-blue-800 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Request Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Purpose</Label>
                        <p className="font-semibold text-black">{borrowRequest.purpose}</p>
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <p className="font-semibold text-black">{borrowRequest.quantity}</p>
                      </div>
                      {borrowRequest.description && (
                        <div className="md:col-span-2">
                          <Label>Additional Notes</Label>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{borrowRequest.description}</p>
                        </div>
                      )}
                      <div>
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Intended Borrow Date
                        </Label>
                        <p className="font-semibold text-black">{formatDate(borrowRequest.intendedBorrowDate)}</p>
                      </div>
                      <div>
                        <Label className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Intended Return Date
                        </Label>
                        <p className="font-semibold text-black">{formatDate(borrowRequest.intendedReturnDate)}</p>
                      </div>
                      {borrowRequest.roomAssigned && (
                        <div className="md:col-span-2">
                          <Label>Room Assigned</Label>
                          <p className="font-semibold text-black">{borrowRequest.roomAssigned}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Admin Remarks */}
              {borrowRequest.adminRemarks && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="border-2 border-yellow-200">
                    <CardHeader className="bg-yellow-50">
                      <CardTitle className="text-yellow-800 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Admin Remarks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-gray-700">{borrowRequest.adminRemarks}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Penalty Information */}
              {borrowRequest.penaltyFee > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="border-2 border-red-200">
                    <CardHeader className="bg-red-50">
                      <CardTitle className="text-red-800 flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Penalty Fee
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">Amount Due:</span>
                        <span className="text-2xl font-bold text-red-600">
                          ₱{borrowRequest.penaltyFee.toFixed(2)}
                        </span>
                      </div>
                      {borrowRequest.status === 'overdue' && (
                        <p className="text-sm text-red-600 mt-2">
                          This penalty is due to overdue equipment return.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Right Column - Timeline and Borrower Info */}
            <div className="space-y-6">
              {/* Borrower Information */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-2 border-purple-200">
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="text-purple-800 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Borrower Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <div>
                      <Label className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Name
                      </Label>
                      <p className="font-semibold text-black">{borrowRequest.borrowerName}</p>
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <p className="font-semibold text-black">{borrowRequest.borrowerEmail}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Request Timeline */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2 border-gray-200">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-gray-800">Request Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {timelineItems.map((item, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${
                              item.active ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            {index < timelineItems.length - 1 && (
                              <div className="w-0.5 h-8 bg-gray-300 mt-1" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-black">{item.status}</p>
                            <p className="text-sm text-gray-600">{formatDate(item.date)}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Condition Information */}
              {(borrowRequest.conditionOnBorrow || borrowRequest.conditionOnReturn) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="border-2 border-green-200">
                    <CardHeader className="bg-green-50">
                      <CardTitle className="text-green-800">Equipment Condition</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                      {borrowRequest.conditionOnBorrow && (
                        <div>
                          <Label>Condition on Borrow</Label>
                          <p className="text-sm text-gray-700">{borrowRequest.conditionOnBorrow}</p>
                        </div>
                      )}
                      {borrowRequest.conditionOnReturn && (
                        <div>
                          <Label>Condition on Return</Label>
                          <p className="text-sm text-gray-700">{borrowRequest.conditionOnReturn}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                {borrowRequest.status === 'released' && (
                  <Button
                    onClick={() => router.push(`/user/return-request/${borrowRequest._id}`)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Request Equipment Return
                  </Button>
                )}
                <Button
                  onClick={() => router.push('/user/borrow-requests')}
                  variant="outline"
                  className="w-full"
                >
                  Back to All Requests
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Label component for consistent styling
const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm font-medium text-gray-700 mb-1 ${className}`}>
    {children}
  </p>
);