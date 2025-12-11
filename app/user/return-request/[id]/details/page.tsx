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
  AlertTriangle,
  DollarSign,
  Home,
  ArrowLeft,
  Printer,
  Download,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

interface ReturnRequest {
  _id: string;
  equipmentId?: {
    _id: string;
    name: string;
    itemId: string;
    description: string;
    images?: string[];
    roomAssigned?: string;
  };
  equipmentName: string;
  equipmentItemId: string;
  actualReturnDate: string;
  intendedReturnDate: string;
  conditionAfter: string;
  damageSeverity: string;
  damageDescription: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  isLate: boolean;
  lateDays: number;
  totalFee: number;
  isFeePaid: boolean;
  penaltyFee: number;
  damageFee: number;
  remarks: string;
  roomReturned: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReturnRequestDetails() {
  const router = useRouter();
  const params = useParams();
  const returnId = params.id as string;
  
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (returnId) {
      fetchReturnRequest();
    }
  }, [returnId]);

  const fetchReturnRequest = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching return request details...");
      
      const response = await fetch(`/api/student/return-requests/${returnId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📋 Return request details API Response:", data);
      
      if (data.success) {
        setReturnRequest(data.returnRequest);
        console.log("✅ Return request details loaded successfully");
      } else {
        throw new Error(data.error || 'Failed to fetch return request details');
      }
    } catch (error) {
      console.error('❌ Error fetching return request details:', error);
      toast.error('Failed to load return request details. Please try again.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isLate: boolean) => {
    const statusConfig = {
      pending: { 
        icon: Clock, 
        label: 'Pending Review', 
        className: 'bg-yellow-100 text-yellow-800' 
      },
      approved: { 
        icon: CheckCircle2, 
        label: isLate ? 'Approved (Late)' : 'Approved', 
        className: isLate ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800' 
      },
      rejected: { 
        icon: XCircle, 
        label: 'Rejected', 
        className: 'bg-red-100 text-red-800' 
      },
      completed: { 
        icon: CheckCircle2, 
        label: 'Completed', 
        className: 'bg-blue-100 text-blue-800' 
      }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge className={`flex items-center gap-2 text-sm py-1.5 px-3 ${config.className}`}>
        <IconComponent className="h-4 w-4" />
        {config.label}
      </Badge>
    );
  };

  const getDamageSeverityBadge = (severity: string) => {
    const severityConfig = {
      None: { label: 'No Damage', className: 'bg-green-100 text-green-800' },
      Minor: { label: 'Minor Damage', className: 'bg-yellow-100 text-yellow-800' },
      Moderate: { label: 'Moderate Damage', className: 'bg-orange-100 text-orange-800' },
      Severe: { label: 'Severe Damage', className: 'bg-red-100 text-red-800' }
    };
    
    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.None;
    
    return (
      <Badge className={`text-sm py-1.5 px-3 ${config.className}`}>
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

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateReceipt = () => {
    toast.info('Generating receipt...');
    // In a real application, this would generate a PDF receipt
    setTimeout(() => {
      toast.success('Receipt generated successfully');
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16a34a] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading return request details...</p>
        </div>
      </div>
    );
  }

  if (!returnRequest) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Return Request Not Found</h2>
          <p className="text-gray-600 mb-4">The return request doesn't exist or you don't have access.</p>
          <Button onClick={() => router.push('/student/return-requests')}>
            Back to Return Requests
          </Button>
        </div>
      </div>
    );
  }

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/student/return-requests')}
                  className="text-[#16a34a] hover:bg-green-100 hover:text-green-700"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-[#16a34a]">
                    Return Request Details
                  </h1>
                  <p className="text-lg text-black">
                    {returnRequest.equipmentName}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerateReceipt}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Receipt
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Equipment and Return Details */}
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
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {returnRequest.equipmentId?.images?.[0] ? (
                        <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                          <Image
                            src={returnRequest.equipmentId.images[0]}
                            alt={returnRequest.equipmentName}
                            width={96}
                            height={96}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-black">{returnRequest.equipmentName}</h3>
                        <p className="text-gray-600">{returnRequest.equipmentItemId}</p>
                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Equipment ID</p>
                            <p className="text-black">{returnRequest.equipmentItemId}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Assigned Room</p>
                            <div className="flex items-center gap-1 text-blue-600">
                              <Home className="h-4 w-4" />
                              <span>{returnRequest.equipmentId?.roomAssigned || returnRequest.roomReturned}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Return Details */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2 border-blue-200">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="text-blue-800">Return Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Status and Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Status</p>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(returnRequest.status, returnRequest.isLate)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Damage Severity</p>
                        {getDamageSeverityBadge(returnRequest.damageSeverity)}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Intended Return Date
                        </p>
                        <p className="text-black">{formatDate(returnRequest.intendedReturnDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Actual Return Date
                        </p>
                        <p className="text-black">{formatDate(returnRequest.actualReturnDate)}</p>
                      </div>
                    </div>

                    {/* Room Information */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Room Returned To
                      </p>
                      <p className="text-black text-lg font-medium">{returnRequest.roomReturned}</p>
                    </div>

                    {/* Condition After Use */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Condition After Use</p>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-black">{returnRequest.conditionAfter}</p>
                      </div>
                    </div>

                    {/* Damage Description */}
                    {returnRequest.damageSeverity !== 'None' && returnRequest.damageDescription && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Damage Description</p>
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <p className="text-black">{returnRequest.damageDescription}</p>
                        </div>
                      </div>
                    )}

                    {/* Remarks */}
                    {returnRequest.remarks && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Additional Remarks</p>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-black">{returnRequest.remarks}</p>
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Submitted</p>
                          <p className="text-black">{formatDate(returnRequest.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Last Updated</p>
                          <p className="text-black">{formatDate(returnRequest.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Fees and Actions */}
            <div className="space-y-6">
              {/* Fees Summary */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-2 border-purple-200">
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="text-purple-800">Fees Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Late Fees */}
                    {returnRequest.penaltyFee > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Late Return Fee</span>
                          <span className="font-semibold">₱{returnRequest.penaltyFee.toFixed(2)}</span>
                        </div>
                        {returnRequest.isLate && (
                          <div className="flex items-center gap-2 text-sm text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{returnRequest.lateDays} day{returnRequest.lateDays !== 1 ? 's' : ''} late</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Damage Fees */}
                    {returnRequest.damageFee > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Damage Fee</span>
                          <span className="font-semibold">₱{returnRequest.damageFee.toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {returnRequest.damageSeverity} damage assessment
                        </div>
                      </div>
                    )}

                    {/* Total Fees */}
                    {returnRequest.totalFee > 0 && (
                      <>
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-lg text-gray-800">Total Fees</span>
                            <span className="font-bold text-lg text-[#16a34a]">
                              ₱{returnRequest.totalFee.toFixed(2)}
                            </span>
                          </div>
                          
                          {/* Payment Status */}
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-600">Payment Status</span>
                              <Badge className={
                                returnRequest.isFeePaid 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }>
                                {returnRequest.isFeePaid ? 'Paid' : 'Pending'}
                              </Badge>
                            </div>
                            
                            {!returnRequest.isFeePaid && returnRequest.status === 'approved' && (
                              <Button 
                                className="w-full mt-2 bg-[#16a34a] hover:bg-green-700 text-white"
                                onClick={() => {
                                  toast.info('Payment feature coming soon');
                                }}
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* No Fees */}
                    {returnRequest.totalFee === 0 && (
                      <div className="text-center py-4">
                        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                        <p className="text-green-600 font-medium">No Fees Applicable</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Equipment returned on time with no damage
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2 border-gray-200">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-gray-800">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={() => router.push('/student/return-requests')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Returns
                    </Button>
                    
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={handlePrint}
                    >
                      <Printer className="h-4 w-4" />
                      Print Details
                    </Button>
                    
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={handleGenerateReceipt}
                    >
                      <Download className="h-4 w-4" />
                      Download Receipt
                    </Button>
                    
                    {/* Contact Support Button */}
                    <Button
                      className="w-full justify-start gap-2 mt-4"
                      variant="outline"
                      onClick={() => {
                        toast.info('Contact support feature coming soon');
                      }}
                    >
                      <FileText className="h-4 w-4" />
                      Contact Support
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Important Information */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-2 border-yellow-200">
                  <CardHeader className="bg-yellow-50">
                    <CardTitle className="text-yellow-800 text-sm">Important Information</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2 text-xs text-yellow-700">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>Fees must be paid within 7 days of approval</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>Unpaid fees may affect future borrowing privileges</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>Keep your return receipt for records</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>Contact lab staff if you have questions</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}