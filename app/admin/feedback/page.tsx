"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores";
import { useEffect, useState, useMemo } from "react";
import { Search, MoreVertical, MessageSquare, Star, Calendar, User, ChevronLeft, ChevronRight, Trash2, Eye, ThumbsUp, GraduationCap, UserCog, BookOpen } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Feedback {
  _id: string;
  feedbackId: string;
  rating: number;
  comment: string;
  userRole: 'student' | 'faculty';
  userRoleDetails?: {
    year?: number;
    section?: string;
  };
  anonymousUserId: string;
  status: string;
  appVersion?: string;
  deviceInfo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackResponse {
  feedbacks: Feedback[];
  total: number;
  page?: number;
  totalPages?: number;
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

const SkeletonFeedbackRow = () => (
  <TableRow>
    <TableCell>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
        <div className="h-3 w-40 bg-muted rounded animate-pulse"></div>
      </div>
    </TableCell>
    <TableCell>
      <div className="space-y-1">
        <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
        <div className="h-3 w-32 bg-muted rounded animate-pulse"></div>
      </div>
    </TableCell>
    <TableCell><div className="h-4 w-40 bg-muted rounded animate-pulse"></div></TableCell>
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

export default function FeedbackManagementPage() {
  const { user, clearAuth, isLoading } = useAuthStore();
  const router = useRouter();

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Fetch feedback data
  useEffect(() => {
    let isMounted = true;

    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/feedback/admin");
        
        if (!response.ok) throw new Error("Failed to fetch feedback");
        
        const data: FeedbackResponse = await response.json();
        const feedbacksArray = Array.isArray(data.feedbacks) ? data.feedbacks : [];

        if (!isMounted) return;

        setFeedbacks(feedbacksArray);
        setError(null);
      } catch (error) {
        console.error("Error fetching feedback:", error);
        setError("Failed to fetch feedback data. Please try again.");
        if (isMounted) {
          setFeedbacks([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFeedbacks();

    return () => {
      isMounted = false;
    };
  }, []);

  // Memoized filtered data with pagination
  const filteredFeedbacks = useMemo(() => {
    let result = feedbacks.filter(f => f.isActive);

    // Search filter
    if (searchTerm) {
      result = result.filter(
        (feedback) =>
          feedback.feedbackId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feedback.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (feedback.userRoleDetails?.section && feedback.userRoleDetails.section.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      result = result.filter((feedback) => {
        const feedbackDate = new Date(feedback.createdAt);
        
        switch (dateFilter) {
          case "today":
            return feedbackDate >= today;
          case "week":
            return feedbackDate >= lastWeek;
          case "month":
            return feedbackDate >= lastMonth;
          default:
            return true;
        }
      });
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter(feedback => feedback.userRole === roleFilter);
    }

    // Rating filter
    if (ratingFilter !== "all") {
      result = result.filter(feedback => feedback.rating === parseInt(ratingFilter));
    }

    return result;
  }, [feedbacks, searchTerm, dateFilter, roleFilter, ratingFilter]);

  // Paginated data
  const paginatedFeedbacks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredFeedbacks.slice(startIndex, endIndex);
  }, [filteredFeedbacks, currentPage]);

  // Memoized analytics
  const analyticsData = useMemo(() => {
    const activeFeedbacks = feedbacks.filter(f => f.isActive);
    
    return {
      totalFeedbacks: activeFeedbacks.length || 0,
      studentFeedbacks: activeFeedbacks.filter(f => f.userRole === 'student').length || 0,
      facultyFeedbacks: activeFeedbacks.filter(f => f.userRole === 'faculty').length || 0,
      averageRating: activeFeedbacks.length > 0 
        ? (activeFeedbacks.reduce((sum, f) => sum + f.rating, 0) / activeFeedbacks.length).toFixed(1)
        : '0.0',
      todayFeedbacks: activeFeedbacks.filter(f => {
        const today = new Date();
        const feedbackDate = new Date(f.createdAt);
        return feedbackDate.toDateString() === today.toDateString();
      }).length || 0,
    };
  }, [feedbacks]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render stars for rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-xs font-medium">{rating}.0</span>
      </div>
    );
  };

  // Handle delete feedback (soft delete)
  const handleDeleteFeedback = async () => {
    if (!selectedFeedback) return;
    
    try {
      const response = await fetch(`/api/feedback/${selectedFeedback._id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to delete feedback");
      
      // Soft delete - mark as inactive
      setFeedbacks(prev => prev.filter(f => f._id !== selectedFeedback._id));
      setIsDeleteDialogOpen(false);
      setSelectedFeedback(null);
      setError("Feedback deleted successfully!");
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error("Error deleting feedback:", error);
      setError("Failed to delete feedback. Please try again.");
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, roleFilter, ratingFilter]);

  // Loading skeleton
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

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          {/* Table Skeleton */}
          <Card>
            <CardHeader className="pb-4">
              <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
              <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="h-10 w-full sm:w-64 bg-muted rounded animate-pulse"></div>
                <div className="h-10 w-40 bg-muted rounded animate-pulse"></div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      {[...Array(5)].map((_, i) => (
                        <TableHead key={i}>
                          <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <SkeletonFeedbackRow key={i} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
            <h1 className="text-3xl font-bold text-foreground">Feedback Management</h1>
            <p className="text-muted-foreground mt-2">View anonymous user feedback and ratings</p>
          </div>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            Refresh Data
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.totalFeedbacks}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">
                  {analyticsData.todayFeedbacks} new today
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.averageRating}</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < Math.floor(parseFloat(analyticsData.averageRating)) 
                          ? 'text-amber-500 fill-amber-500' 
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Student Feedback</CardTitle>
              <GraduationCap className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.studentFeedbacks}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">
                  From students
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Faculty Feedback</CardTitle>
              <UserCog className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.facultyFeedbacks}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">
                  From faculty members
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Table */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-500" />
              User Feedback
            </CardTitle>
            <CardDescription>View all anonymous user feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by ID, comment, or section..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="User Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="1">⭐ 1 Star</SelectItem>
                  <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className={`mb-4 p-3 rounded-lg ${
                error.includes("success") 
                  ? "bg-green-50 border border-green-200 text-green-600" 
                  : "bg-red-50 border border-red-200 text-red-600"
              }`}>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Feedback Details</TableHead>
                    <TableHead className="font-semibold">User Info</TableHead>
                    <TableHead className="font-semibold">Rating</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFeedbacks.map((feedback) => (
                    <TableRow key={feedback._id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {feedback.feedbackId}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">
                            {feedback.comment}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="secondary" className="capitalize">
                            {feedback.userRole}
                            {feedback.userRole === 'student' && feedback.userRoleDetails?.year && (
                              <span className="ml-1">• Year {feedback.userRoleDetails.year}</span>
                            )}
                          </Badge>
                          {feedback.userRole === 'student' && feedback.userRoleDetails?.section && (
                            <div className="text-xs text-muted-foreground">
                              Section {feedback.userRoleDetails.section}
                            </div>
                          )}
                          {feedback.userRole === 'faculty' && (
                            <div className="text-xs text-muted-foreground">
                              Faculty Member
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {renderStars(feedback.rating)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(feedback.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Feedback Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedFeedback(feedback);
                                setIsViewDialogOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedFeedbacks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">No feedback found matching your criteria</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredFeedbacks.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={filteredFeedbacks.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          </CardContent>
        </Card>

        {/* View Feedback Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                Feedback Details
              </DialogTitle>
              <DialogDescription>
                Complete details of the user feedback
              </DialogDescription>
            </DialogHeader>
            {selectedFeedback && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Feedback ID</Label>
                    <p className="text-sm font-mono text-foreground mt-1">{selectedFeedback.feedbackId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Rating</Label>
                    <div className="mt-1">
                      {renderStars(selectedFeedback.rating)}
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">User Role</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="capitalize">
                        {selectedFeedback.userRole}
                      </Badge>
                      {selectedFeedback.userRole === 'student' && (
                        <BookOpen className="h-4 w-4 text-emerald-500" />
                      )}
                      {selectedFeedback.userRole === 'faculty' && (
                        <UserCog className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  </div>
                  {selectedFeedback.userRole === 'student' && selectedFeedback.userRoleDetails && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Student Details</Label>
                      <p className="text-sm text-foreground mt-1">
                        Year {selectedFeedback.userRoleDetails.year}, Section {selectedFeedback.userRoleDetails.section}
                      </p>
                    </div>
                  )}
                </div>

                {/* Feedback Message */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Feedback Message</Label>
                  <div className="mt-2 p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedFeedback.comment}</p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Submitted Date</Label>
                    <p className="text-sm text-foreground mt-1">{formatDate(selectedFeedback.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-sm text-foreground mt-1">{formatDate(selectedFeedback.updatedAt)}</p>
                  </div>
                </div>

                {/* Technical Info */}
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium text-muted-foreground">Technical Information</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">App Version</p>
                      <p className="text-xs text-foreground">{selectedFeedback.appVersion || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Anonymous User ID</p>
                      <p className="text-xs font-mono text-foreground truncate">{selectedFeedback.anonymousUserId}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background py-6 px-6 mt-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fisheries Lab Management System. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
            <span className="text-sm text-muted-foreground">Feedback Management v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}