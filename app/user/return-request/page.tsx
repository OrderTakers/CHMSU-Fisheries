"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
  Eye,
  AlertTriangle,
  Filter,
  ArrowRightLeft,
  Home,
  User,
  BookOpen,
  MapPin,
  Building,
  DoorOpen,
  Hash,
  Layers,
  Mail,
  Phone,
  DollarSign,
  CalendarDays,
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Image from 'next/image';

interface RoomDetails {
  _id: string;
  name: string;
  location?: string;
  metadata?: {
    roomNumber: string;
    building: string;
    floor: string;
    capacity?: number;
  };
}

interface Equipment {
  _id: string;
  name: string;
  itemId: string;
  condition: string;
  category: string;
  images: string[];
  roomAssigned?: string;
}

interface ReturnRequest {
  _id: string;
  type: 'return_record' | 'borrowing';
  equipmentId: Equipment | null;
  equipmentName: string;
  equipmentItemId: string;
  quantity: number;
  status: string;
  intendedReturnDate: string;
  releasedDate?: string;
  actualReturnDate?: string;
  conditionOnBorrow?: string;
  conditionOnReturn?: string;
  roomAssigned?: string;
  roomDetails?: RoomDetails;
  damageReport?: string;
  damageSeverity?: string;
  penaltyFee: number;
  damageFee?: number;
  totalFee?: number;
  isLate?: boolean;
  lateDays?: number;
  isFeePaid?: boolean;
  remarks?: string;
  isOverdue: boolean;
}

export default function UserReturnRequestsPage() {
  const router = useRouter();
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    conditionOnReturn: '',
    damageDescription: '',
    damageSeverity: 'None',
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    overdue: 0,
  });

  useEffect(() => {
    fetchReturnRequests();
  }, []);

  useEffect(() => {
    updateStats();
  }, [returnRequests]);

  const fetchReturnRequests = async () => {
    try {
      setLoading(true);
      console.log('Fetching return requests...');
      
      const response = await fetch('/api/user/return-requests');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch return requests (${response.status})`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        setReturnRequests(data.returnRequests || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch return requests');
      }
    } catch (error: any) {
      console.error('Error fetching return requests:', error);
      toast.error(error.message);
      setReturnRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = () => {
    const total = returnRequests.length;
    const pending = returnRequests.filter(req => 
      req.status === 'pending' || req.status === 'return_requested').length;
    const approved = returnRequests.filter(req => 
      req.status === 'approved' || req.status === 'return_approved').length;
    const rejected = returnRequests.filter(req => 
      req.status === 'rejected' || req.status === 'return_rejected').length;
    const completed = returnRequests.filter(req => 
      req.status === 'completed' || req.status === 'returned').length;
    const overdue = returnRequests.filter(req => req.isOverdue).length;

    setStats({ total, pending, approved, rejected, completed, overdue });
  };

  const filteredRequests = returnRequests.filter(request => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      request.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.equipmentItemId.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (request: ReturnRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  const handleInitiateReturn = (request: ReturnRequest) => {
    setSelectedRequest(request);
    setReturnForm({
      conditionOnReturn: request.conditionOnReturn || '',
      damageDescription: request.damageReport || '',
      damageSeverity: request.damageSeverity || 'None',
    });
    setIsReturnDialogOpen(true);
  };

  const handleSubmitReturn = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch('/api/user/return-requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          borrowingId: selectedRequest._id,
          conditionOnReturn: returnForm.conditionOnReturn,
          damageDescription: returnForm.damageDescription,
          damageSeverity: returnForm.damageSeverity,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Return request submitted successfully');
        setIsReturnDialogOpen(false);
        fetchReturnRequests();
      } else {
        throw new Error(data.error || 'Failed to submit return request');
      }
    } catch (error: any) {
      console.error('Error submitting return request:', error);
      toast.error(error.message);
    }
  };

  const handleUpdateReturn = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(`/api/user/return-requests/${selectedRequest._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conditionOnReturn: returnForm.conditionOnReturn,
          damageDescription: returnForm.damageDescription,
          damageSeverity: returnForm.damageSeverity,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Return request updated successfully');
        setIsReturnDialogOpen(false);
        fetchReturnRequests();
      } else {
        throw new Error(data.error || 'Failed to update return request');
      }
    } catch (error: any) {
      console.error('Error updating return request:', error);
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status: string, isOverdue: boolean = false) => {
    if (isOverdue) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    }

    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
      released: { variant: "default", icon: Package, label: 'Borrowed' },
      return_requested: { variant: "secondary", icon: Clock, label: 'Return Requested' },
      return_approved: { variant: "default", icon: CheckCircle, label: 'Return Approved' },
      return_rejected: { variant: "destructive", icon: XCircle, label: 'Return Rejected' },
      returned: { variant: "outline", icon: CheckCircle, label: 'Returned' },
      pending: { variant: "secondary", icon: Clock, label: 'Pending' },
      approved: { variant: "default", icon: CheckCircle, label: 'Approved' },
      rejected: { variant: "destructive", icon: XCircle, label: 'Rejected' },
      completed: { variant: "outline", icon: CheckCircle, label: 'Completed' },
    };

    const config = statusConfig[status] || { variant: "outline", icon: Package, label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getConditionColor = (condition?: string) => {
    switch (condition?.toLowerCase()) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-orange-100 text-orange-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getRoomDisplay = (request: ReturnRequest) => {
    if (request.roomDetails) {
      const room = request.roomDetails;
      return (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{room.name}</span>
          {room.metadata?.building && (
            <Badge variant="outline" className="text-xs">
              <Building className="h-3 w-3 mr-1" />
              {room.metadata.building}
            </Badge>
          )}
          {room.metadata?.floor && (
            <Badge variant="outline" className="text-xs">
              <Layers className="h-3 w-3 mr-1" />
              Floor {room.metadata.floor}
            </Badge>
          )}
        </div>
      );
    } else if (request.roomAssigned) {
      return (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span>{request.roomAssigned}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <MapPin className="h-4 w-4" />
        <span>No room assigned</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16a34a] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading return requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/user/dashboard')}
                className="text-[#16a34a] hover:bg-green-100 hover:text-green-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-[#16a34a]">Return Requests</h1>
                <p className="text-black mt-1">
                  Manage and track your equipment return requests
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={fetchReturnRequests}
                variant="outline"
                className="border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => router.push('/user/borrow-equipment')}
                className="bg-[#16a34a] hover:bg-green-700 text-white"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Borrow Equipment
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-black">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.overdue}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Filters and Search */}
        <Card className="mb-8 border border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by equipment name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="released">Borrowed</SelectItem>
                    <SelectItem value="return_requested">Return Requested</SelectItem>
                    <SelectItem value="return_approved">Return Approved</SelectItem>
                    <SelectItem value="return_rejected">Return Rejected</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => router.push('/user/borrow-requests')}
                  className="border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Borrow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Requests Table */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Return Requests</CardTitle>
            <CardDescription>
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No return requests found
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'You have no equipment to return at the moment.'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => router.push('/user/borrow-equipment')}
                      className="bg-[#16a34a] hover:bg-green-700"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Borrow Equipment
                    </Button>
                    <Button
                      onClick={() => router.push('/user/borrow-requests')}
                      variant="outline"
                    >
                      View Borrow Requests
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Room Location</TableHead>
                      <TableHead>Borrowed Date</TableHead>
                      <TableHead>Return By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center">
                              {request.equipmentId?.images?.[0] ? (
                                <div className="relative w-10 h-10">
                                  <Image
                                    src={request.equipmentId.images[0]}
                                    alt={request.equipmentName}
                                    fill
                                    className="rounded-md object-cover"
                                    sizes="40px"
                                  />
                                </div>
                              ) : (
                                <Package className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-black">{request.equipmentName}</p>
                              <p className="text-sm text-gray-500">{request.equipmentItemId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.quantity}</Badge>
                        </TableCell>
                        <TableCell>
                          {getRoomDisplay(request)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>{formatDate(request.releasedDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-gray-500" />
                            <span className={request.isOverdue ? 'text-red-600 font-medium' : ''}>
                              {formatDate(request.intendedReturnDate)}
                              {request.isOverdue && ' (Overdue)'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status, request.isOverdue)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(request)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(request.status === 'released' || request.status === 'return_rejected') && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleInitiateReturn(request)}
                                className="bg-[#16a34a] hover:bg-green-700"
                              >
                                <ArrowRightLeft className="h-4 w-4 mr-1" />
                                Return
                              </Button>
                            )}
                            {(request.status === 'return_requested' || request.status === 'pending') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInitiateReturn(request)}
                                className="border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Update
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {filteredRequests.length > 0 && (
            <CardFooter className="flex items-center justify-between border-t px-6 py-4">
              <div className="text-sm text-gray-500">
                Showing {filteredRequests.length} of {returnRequests.length} requests
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/user/dashboard')}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/user/profile')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Quick Actions Card */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card className="border border-[#16a34a]">
            <CardHeader>
              <CardTitle className="text-[#16a34a]">Need Help?</CardTitle>
              <CardDescription>Contact laboratory support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-gray-600">lab-support@fisheries.edu</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-gray-600">(123) 456-7890</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-gray-600">Main Laboratory Building, Room 101</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white"
                onClick={() => router.push('/user/help')}
              >
                Get Help
              </Button>
            </CardFooter>
          </Card>

          <Card className="border border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">Return Instructions</CardTitle>
              <CardDescription>How to properly return equipment</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 list-decimal pl-4">
                <li className="text-sm text-gray-600">
                  Clean equipment before returning
                </li>
                <li className="text-sm text-gray-600">
                  Check for any damage and report it
                </li>
                <li className="text-sm text-gray-600">
                  Return to the correct room/location
                </li>
                <li className="text-sm text-gray-600">
                  Wait for staff inspection and approval
                </li>
                <li className="text-sm text-gray-600">
                  Keep your return receipt for reference
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card className="border border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-800">Late Return Policy</CardTitle>
              <CardDescription>Important information about penalties</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="font-medium text-red-800">Late Return Penalty</p>
                  </div>
                  <p className="text-sm text-red-700">
                    $5 per day for each day overdue
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className="h-4 w-4 text-yellow-600" />
                    <p className="font-medium text-yellow-800">Damage Fees</p>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Additional fees apply for damaged equipment
                  </p>
                </div>
                <p className="text-sm text-gray-600 pt-2 border-t">
                  Please return equipment on time to avoid penalties and ensure availability for other students.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return Request Details</DialogTitle>
            <DialogDescription>
              Detailed information about the equipment return request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column - Equipment Info */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Equipment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center">
                        {selectedRequest.equipmentId?.images?.[0] ? (
                          <div className="relative w-20 h-20">
                            <Image
                              src={selectedRequest.equipmentId.images[0]}
                              alt={selectedRequest.equipmentName}
                              fill
                              className="rounded-lg object-cover"
                              sizes="80px"
                            />
                          </div>
                        ) : (
                          <Package className="h-8 w-8 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-black">{selectedRequest.equipmentName}</h3>
                        <p className="text-gray-600">{selectedRequest.equipmentItemId}</p>
                        <Badge variant="outline" className="mt-1">
                          {selectedRequest.equipmentId?.category || 'Equipment'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500">Quantity</Label>
                        <p className="font-medium">{selectedRequest.quantity}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Equipment Condition</Label>
                        <Badge className={getConditionColor(selectedRequest.equipmentId?.condition)}>
                          {selectedRequest.equipmentId?.condition || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Room Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedRequest.roomDetails ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DoorOpen className="h-5 w-5 text-blue-600" />
                            <span className="font-medium">{selectedRequest.roomDetails.name}</span>
                          </div>
                          {selectedRequest.roomDetails.metadata?.roomNumber && (
                            <Badge variant="outline">
                              <Hash className="h-3 w-3 mr-1" />
                              {selectedRequest.roomDetails.metadata.roomNumber}
                            </Badge>
                          )}
                        </div>
                        
                        {selectedRequest.roomDetails.metadata && (
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                            {selectedRequest.roomDetails.metadata.building && (
                              <div>
                                <Label className="text-sm text-gray-500">Building</Label>
                                <p className="flex items-center gap-1">
                                  <Building className="h-4 w-4 text-gray-400" />
                                  {selectedRequest.roomDetails.metadata.building}
                                </p>
                              </div>
                            )}
                            {selectedRequest.roomDetails.metadata.floor && (
                              <div>
                                <Label className="text-sm text-gray-500">Floor</Label>
                                <p className="flex items-center gap-1">
                                  <Layers className="h-4 w-4 text-gray-400" />
                                  {selectedRequest.roomDetails.metadata.floor}
                                </p>
                              </div>
                            )}
                            {selectedRequest.roomDetails.metadata.capacity && (
                              <div className="col-span-2">
                                <Label className="text-sm text-gray-500">Capacity</Label>
                                <p>{selectedRequest.roomDetails.metadata.capacity} people</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : selectedRequest.roomAssigned ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <span>{selectedRequest.roomAssigned}</span>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-4">
                        <MapPin className="h-8 w-8 mx-auto mb-2" />
                        <p>No room information available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Return Details */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Return Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-gray-500">Borrowed On</Label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {formatDateTime(selectedRequest.releasedDate)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-gray-500">Expected Return</Label>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-gray-500" />
                          <span className={`font-medium ${selectedRequest.isOverdue ? 'text-red-600' : ''}`}>
                            {formatDateTime(selectedRequest.intendedReturnDate)}
                            {selectedRequest.isOverdue && ' (Overdue)'}
                          </span>
                        </div>
                      </div>

                      {selectedRequest.actualReturnDate && (
                        <div className="flex justify-between items-center">
                          <Label className="text-sm text-gray-500">Actual Return</Label>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-600">
                              {formatDateTime(selectedRequest.actualReturnDate)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm text-gray-500">Condition on Borrow</Label>
                        <Badge className={getConditionColor(selectedRequest.conditionOnBorrow)}>
                          {selectedRequest.conditionOnBorrow || 'Not recorded'}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-gray-500">Condition on Return</Label>
                        <Badge className={getConditionColor(selectedRequest.conditionOnReturn)}>
                          {selectedRequest.conditionOnReturn || 'Not yet returned'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Damage & Penalty</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedRequest.damageReport ? (
                      <div>
                        <Label className="text-sm text-gray-500">Damage Report</Label>
                        <p className="mt-1 p-3 bg-red-50 rounded-md border border-red-200 text-red-800">
                          {selectedRequest.damageReport}
                        </p>
                        {selectedRequest.damageSeverity && (
                          <div className="mt-2">
                            <Label className="text-sm text-gray-500">Damage Severity</Label>
                            <Badge className={`ml-2 ${
                              selectedRequest.damageSeverity === 'Severe' ? 'bg-red-100 text-red-800' :
                              selectedRequest.damageSeverity === 'Moderate' ? 'bg-orange-100 text-orange-800' :
                              selectedRequest.damageSeverity === 'Minor' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {selectedRequest.damageSeverity}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-3 bg-green-50 rounded-md border border-green-200">
                        <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                        <p className="text-green-700">No damage reported</p>
                      </div>
                    )}

                    {(selectedRequest.penaltyFee > 0 || (selectedRequest.totalFee && selectedRequest.totalFee > 0)) && (
                      <div className="pt-3 border-t">
                        <Label className="text-sm text-gray-500">Fees</Label>
                        {selectedRequest.penaltyFee > 0 && (
                          <div className="flex items-center justify-between mt-1">
                            <span>Penalty Fee:</span>
                            <span className="font-medium text-red-600">
                              ${selectedRequest.penaltyFee.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {selectedRequest.damageFee && selectedRequest.damageFee > 0 && (
                          <div className="flex items-center justify-between mt-1">
                            <span>Damage Fee:</span>
                            <span className="font-medium text-red-600">
                              ${selectedRequest.damageFee.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {selectedRequest.totalFee && selectedRequest.totalFee > 0 && (
                          <div className="flex items-center justify-between mt-1 pt-1 border-t">
                            <span className="font-bold">Total:</span>
                            <span className="font-bold text-red-600">
                              ${selectedRequest.totalFee.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {selectedRequest.isLate && (
                          <p className="text-sm text-red-600 mt-1">
                            Late return penalty applied ({selectedRequest.lateDays || 0} day{selectedRequest.lateDays !== 1 ? 's' : ''} late)
                          </p>
                        )}
                        {selectedRequest.isFeePaid && (
                          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                            <p className="text-sm text-green-700 font-medium">✓ Fee has been paid</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-4">
                  {(selectedRequest.status === 'released' || selectedRequest.status === 'return_rejected') ? (
                    <Button
                      className="flex-1 bg-[#16a34a] hover:bg-green-700"
                      onClick={() => {
                        setIsDialogOpen(false);
                        handleInitiateReturn(selectedRequest);
                      }}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Initiate Return
                    </Button>
                  ) : (selectedRequest.status === 'return_requested' || selectedRequest.status === 'pending') ? (
                    <Button
                      variant="outline"
                      className="flex-1 border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white"
                      onClick={() => {
                        setIsDialogOpen(false);
                        handleInitiateReturn(selectedRequest);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update Return Request
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Return/Update Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.status === 'return_requested' || selectedRequest?.status === 'pending' 
                ? 'Update Return Request' 
                : 'Initiate Return Request'}
            </DialogTitle>
            <DialogDescription>
              Provide details about the equipment condition upon return
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Equipment Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center">
                      {selectedRequest.equipmentId?.images?.[0] ? (
                        <div className="relative w-12 h-12">
                          <Image
                            src={selectedRequest.equipmentId.images[0]}
                            alt={selectedRequest.equipmentName}
                            fill
                            className="rounded-md object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <Package className="h-6 w-6 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-black">{selectedRequest.equipmentName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{selectedRequest.equipmentItemId}</Badge>
                        <Badge variant="outline">Qty: {selectedRequest.quantity}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Return Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="conditionOnReturn">
                    Equipment Condition on Return *
                  </Label>
                  <Select
                    value={returnForm.conditionOnReturn}
                    onValueChange={(value) => setReturnForm({ ...returnForm, conditionOnReturn: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Poor">Poor</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Please assess the equipment condition accurately
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="damageSeverity">
                    Damage Severity (if any)
                  </Label>
                  <Select
                    value={returnForm.damageSeverity}
                    onValueChange={(value) => setReturnForm({ ...returnForm, damageSeverity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">No Damage</SelectItem>
                      <SelectItem value="Minor">Minor Damage</SelectItem>
                      <SelectItem value="Moderate">Moderate Damage</SelectItem>
                      <SelectItem value="Severe">Severe Damage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="damageDescription">
                    Damage Description (if any)
                  </Label>
                  <Textarea
                    id="damageDescription"
                    placeholder="Describe any damage, wear and tear, or issues with the equipment..."
                    value={returnForm.damageDescription}
                    onChange={(e) => setReturnForm({ ...returnForm, damageDescription: e.target.value })}
                    rows={4}
                  />
                  <p className="text-sm text-gray-500">
                    Be specific about any damage for proper assessment
                  </p>
                </div>

                {/* Return Room Info */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm text-gray-500">Return to Room</Label>
                        <p className="font-medium">
                          {selectedRequest.roomDetails?.name || selectedRequest.roomAssigned || 'Main Laboratory'}
                        </p>
                        {selectedRequest.roomDetails?.metadata && (
                          <p className="text-sm text-gray-500 mt-1">
                            {selectedRequest.roomDetails.metadata.building}
                            {selectedRequest.roomDetails.metadata.floor && `, Floor ${selectedRequest.roomDetails.metadata.floor}`}
                          </p>
                        )}
                      </div>
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className="gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsReturnDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={(selectedRequest.status === 'return_requested' || selectedRequest.status === 'pending') 
                    ? handleUpdateReturn 
                    : handleSubmitReturn}
                  className="bg-[#16a34a] hover:bg-green-700"
                  disabled={!returnForm.conditionOnReturn}
                >
                  {(selectedRequest.status === 'return_requested' || selectedRequest.status === 'pending') ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update Return Request
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Submit Return Request
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}