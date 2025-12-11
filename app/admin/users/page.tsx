"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAuthStore } from "@/lib/stores";
import { useEffect, useState } from "react";
import { Search, Filter, MoreVertical, UserPlus, UserCheck, UserX, Calendar, Clock, Eye, Edit, Trash2, Upload, User, X, Mail, Key, Users, Activity, TrendingUp, CheckCircle, FileText, Download, ChevronRight } from "lucide-react";
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  _id: string;
  schoolID: string;
  email: string;
  firstName: string;
  lastName: string;
  schoolYear: string;
  section: string;
  profileImage?: string;
  role: "admin" | "student" | "faculty";
  status: "active" | "inactive" | "suspended";
  lastLogin: string | null;
  createdAt: string;
  loginCount: number;
}

// Skeleton Components
const SkeletonCard = () => (
  <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="pb-2">
      <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
      <div className="h-3 w-32 bg-muted rounded animate-pulse mt-1"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
    </CardContent>
  </Card>
);

const SkeletonTableRow = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
          <div className="h-3 w-40 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    </TableCell>
    <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell>
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 bg-muted rounded animate-pulse"></div>
        <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
      </div>
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 bg-muted rounded animate-pulse"></div>
        <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
      </div>
    </TableCell>
    <TableCell><div className="h-4 w-8 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-right">
      <div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto"></div>
    </TableCell>
  </TableRow>
);

const FullScreenImageViewer = ({ 
  imageUrl, 
  isOpen, 
  onClose 
}: { 
  imageUrl: string; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Full screen profile"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

const CSVUploadDropzone = ({ onFileUpload }: { onFileUpload: (file: File) => void }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            onFileUpload(files[0]);
          }
        };
        input.click();
      }}
    >
      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p className="text-lg font-medium text-gray-700 mb-2">
        Drop your CSV file here, or click to browse
      </p>
      <p className="text-sm text-gray-500">
        Supported format: CSV with columns: schoolID, firstName, lastName, email, role, schoolYear (for students), section (for students)
      </p>
    </div>
  );
};

export default function AdminUsersPage() {
  const { user, clearAuth, isLoading } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    schoolID: "",
    firstName: "",
    lastName: "",
    email: "",
    role: "student" as "admin" | "student" | "faculty",
    schoolYear: "",
    section: "",
    profileImage: "",
  });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<{ isOpen: boolean; imageUrl: string }>({
    isOpen: false,
    imageUrl: ""
  });
  
  // OTP States
  const [showOTPField, setShowOTPField] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpSentEmail, setOtpSentEmail] = useState<string>("");
  const [isOTPVerified, setIsOTPVerified] = useState(false);
  const [verifiedUserData, setVerifiedUserData] = useState<any>(null);

  // CSV Upload States (now in Add User modal)
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResults, setCsvResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Bulk Actions States
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Tab state for Add User modal
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  const limit = 10;
  const totalPages = Math.ceil(filteredUsers.length / limit);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * limit, currentPage * limit);

  // Get student users only for bulk actions
  const studentUsers = users.filter(user => user.role === "student");
  const activeStudentUsers = studentUsers.filter(user => user.status === "active");
  const inactiveStudentUsers = studentUsers.filter(user => user.status === "inactive");

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

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users", { 
        cache: "no-store",
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseErr) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || "Failed to fetch users");
      }
      const data = await response.json();
      
      const validatedData: User[] = data.map((u: any) => ({
        _id: u._id || "",
        schoolID: u.schoolID || "",
        email: u.email || "",
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        schoolYear: u.schoolYear || "",
        section: u.section || "",
        profileImage: u.profileImage || "",
        role: (["admin", "student", "faculty"].includes(u.role) ? u.role : "student") as "admin" | "student" | "faculty",
        status: (["active", "inactive", "suspended"].includes(u.status) ? u.status : "inactive") as "active" | "inactive" | "suspended",
        lastLogin: u.lastLogin || null,
        createdAt: u.createdAt || new Date().toISOString(),
        loginCount: u.loginCount || 0,
      }));
      
      setUsers(validatedData);
      setFilteredUsers(validatedData);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to fetch users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filters
  useEffect(() => {
    let result = users;
    if (searchTerm) {
      result = result.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.schoolID || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((u) => u.status === statusFilter);
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    setFilteredUsers(result);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter, users]);

  // Formatters
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Badges with improved design
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Admin</Badge>;
      case "student":
        return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white">Student</Badge>;
      case "faculty":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Faculty</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Analytics data
  const analyticsData = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === "active").length,
    inactiveUsers: users.filter(u => u.status === "inactive").length,
    totalStudents: studentUsers.length,
    activeStudents: activeStudentUsers.length,
    inactiveStudents: inactiveStudentUsers.length,
    newUsers: users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
    recentLogins: users.filter(u => u.lastLogin && new Date(u.lastLogin) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
  };

  // Full screen image viewer
  const openFullScreenImage = (imageUrl: string) => {
    setFullScreenImage({
      isOpen: true,
      imageUrl
    });
  };

  const closeFullScreenImage = () => {
    setFullScreenImage({
      isOpen: false,
      imageUrl: ""
    });
  };

  // Simple base64 image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<string> => {
    return new Promise((resolve, reject) => {
      const file = event.target.files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        reject(new Error("Only JPEG, PNG, or WEBP images are allowed"));
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error("Image size must be less than 2MB"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result.startsWith("data:image/")) {
          resolve(result);
        } else {
          reject(new Error("Failed to process image"));
        }
      };
      reader.onerror = () => {
        reject(new Error("Failed to read image"));
      };
      reader.readAsDataURL(file);
    });
  };

  // Profile image upload for new user
  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      setNewUser(prev => ({ ...prev, profileImage: "uploading..." }));

      const imageData = await handleImageUpload(event);
      setNewUser(prev => ({ ...prev, profileImage: imageData }));
    } catch (error: any) {
      console.error("Image upload error:", error);
      setError(error.message || "Failed to upload profile image");
      setNewUser(prev => ({ ...prev, profileImage: "" }));
    }
  };

  // Profile image upload for edit user
  const handleEditProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      if (editUser) {
        setEditUser({ ...editUser, profileImage: "uploading..." });
      }

      const imageData = await handleImageUpload(event);
      if (editUser) {
        setEditUser({ ...editUser!, profileImage: imageData });
      }
    } catch (error: any) {
      console.error("Image upload error:", error);
      setError(error.message || "Failed to upload profile image");
      if (editUser) {
        setEditUser({ ...editUser, profileImage: editUser.profileImage || "" });
      }
    }
  };

  // CSV Upload Functions
  const downloadCSVTemplate = () => {
    const csvContent = "schoolID,firstName,lastName,email,role,schoolYear,section\n2023-001,John,Doe,john.doe@example.com,student,1,A\n2023-002,Jane,Smith,jane.smith@example.com,faculty,,\n2023-003,Admin,User,admin@example.com,admin,,";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'user_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = async (file: File) => {
    setCsvUploading(true);
    setError(null);
    setCsvResults(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/users/csv-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload CSV');
      }

      setCsvResults(result);
      setSuccess(`CSV upload completed! ${result.success} users created, ${result.failed} failed.`);
      
      // Refresh user list
      await fetchUsers();
      
      // Switch back to single user tab and close dialog after successful upload
      setTimeout(() => {
        setActiveTab("single");
        setIsAddUserDialogOpen(false);
        setCsvResults(null);
      }, 3000);
    } catch (error: any) {
      console.error('CSV upload error:', error);
      setError(error.message || 'Failed to upload CSV');
    } finally {
      setCsvUploading(false);
    }
  };

  // Bulk Status Update Functions - Now only for students
  const handleBulkStatusUpdate = async () => {
    if (!bulkAction) return;

    setIsBulkActionLoading(true);
    setError(null);

    try {
      const studentIds = studentUsers.map(user => user._id);
      
      console.log(`Starting bulk ${bulkAction} for ${studentIds.length} students`);

      const response = await fetch('/api/users/bulk-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: bulkAction,
          userIds: studentIds
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update student statuses: HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Update local state for all students
      const updatedUsers = users.map(user => 
        user.role === "student" 
          ? { ...user, status: bulkAction as "active" | "inactive" }
          : user
      );
      
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      
      setIsBulkStatusDialogOpen(false);
      setBulkAction(null);
      setSuccess(`Successfully ${bulkAction === 'active' ? 'activated' : 'deactivated'} ${result.modifiedCount} students!`);
      
    } catch (error: any) {
      console.error('Bulk status update error:', error);
      setError(error.message || 'Failed to update student statuses. Please try again.');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  // Send OTP function
  const handleSendOTP = async () => {
    if (!newUser.email || !newUser.email.includes('@')) {
      setError("Please enter a valid email address first");
      return;
    }

    // Validate required fields for OTP flow
    if (!newUser.schoolID?.trim()) {
      setError("School ID is required");
      return;
    }
    if (!newUser.firstName?.trim()) {
      setError("First name is required");
      return;
    }
    if (!newUser.lastName?.trim()) {
      setError("Last name is required");
      return;
    }

    // Only validate student fields for student role
    if (newUser.role === "student") {
      if (!newUser.schoolYear?.trim()) {
        setError("School Year is required for students");
        return;
      }
      if (!newUser.section?.trim()) {
        setError("Section is required for students");
        return;
      }
    }

    setIsSendingOTP(true);
    setOtpMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolID: newUser.schoolID.trim(),
          firstName: newUser.firstName.trim(),
          lastName: newUser.lastName.trim(),
          email: newUser.email.trim().toLowerCase(),
          role: newUser.role,
          schoolYear: newUser.role === "student" ? newUser.schoolYear?.trim() : "",
          section: newUser.role === "student" ? newUser.section?.trim() : "",
          profileImage: newUser.profileImage || "",
          skipVerification: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send OTP");
      }

      const result = await response.json();
      setOtpMessage("OTP sent successfully! Check the user's email. A password will be auto-generated and sent to the user.");
      setShowOTPField(true);
      setOtpSentEmail(newUser.email);
      setIsOTPVerified(false);
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      setError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsSendingOTP(false);
    }
  };

  // Verify OTP only
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter a valid 6-digit OTP code");
      return;
    }

    setIsVerifyingOTP(true);
    setError(null);

    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: otpSentEmail || newUser.email.trim().toLowerCase(), 
          otp: otpCode 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "OTP verification failed");
      }

      const userData = await response.json();
      
      // Store verified user data
      setVerifiedUserData(userData);
      setIsOTPVerified(true);
      setOtpMessage("OTP verified successfully! User account created with auto-generated password sent to their email.");
      
    } catch (error: any) {
      console.error("OTP verification error:", error);
      setError(error.message || "OTP verification failed. Please try again.");
      setIsOTPVerified(false);
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  // Create user after OTP verification
  const handleCreateUser = async () => {
    if (!isOTPVerified) {
      setError("Please verify OTP first before creating account");
      return;
    }

    setIsCreatingUser(true);
    setError(null);

    try {
      // Since OTP is already verified and user is created in the PATCH endpoint,
      // we just need to refresh the user list and close the dialog
      await fetchUsers();
      
      // Reset form and close dialog
      setNewUser({
        schoolID: "",
        firstName: "",
        lastName: "",
        email: "",
        role: "student",
        schoolYear: "",
        section: "",
        profileImage: "",
      });
      setOtpCode("");
      setShowOTPField(false);
      setOtpMessage(null);
      setOtpSentEmail("");
      setIsOTPVerified(false);
      setVerifiedUserData(null);
      setIsAddUserDialogOpen(false);
      setError(null);
      setSuccess("User created successfully! An auto-generated password has been sent to the user's email.");
      
    } catch (error: any) {
      console.error("Error finalizing user creation:", error);
      setError("Failed to finalize user creation. Please try again.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Change user status (PATCH)
  const handleStatusChange = async () => {
    if (!selectedUserId || !newStatus) return;
    try {
      const response = await fetch(`/api/users/${selectedUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseErr) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || "Failed to update user status");
      }

      const updatedUser = await response.json();
      
      // Update local state
      setUsers((prev) => prev.map((u) => u._id === selectedUserId ? { ...u, status: newStatus as any } : u));
      setFilteredUsers((prev) => prev.map((u) => u._id === selectedUserId ? { ...u, status: newStatus as any } : u));
      
      setIsStatusDialogOpen(false);
      setSelectedUserId(null);
      setNewStatus(null);
      setError(null);
      setSuccess(`User status updated to ${newStatus} successfully!`);
    } catch (error: any) {
      console.error("Error updating user status:", error);
      setError(error.message || "Failed to update user status. Please try again.");
    }
  };

  // Edit user
  const handleEditUser = async () => {
    if (!editUser) return;
    if (!editUser.schoolID) {
      setError("School ID is required");
      return;
    }
    if (editUser.role === "student") {
      const yearNum = Number(editUser.schoolYear);
      if (isNaN(yearNum) || yearNum < 1 || yearNum > 5) {
        setError("School Year must be a number between 1 and 5");
        return;
      }
    }

    try {
      const updateData: any = {
        schoolID: editUser.schoolID,
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        email: editUser.email,
        role: editUser.role,
        profileImage: editUser.profileImage === "uploading..." ? "" : editUser.profileImage,
      };

      // Only include student-specific fields if role is student
      if (editUser.role === "student") {
        updateData.schoolYear = editUser.schoolYear;
        updateData.section = editUser.section;
      } else {
        updateData.schoolYear = "";
        updateData.section = "";
      }

      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editUser._id,
          updates: updateData,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseErr) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || "Failed to update user");
      }

      const updatedUser = await response.json();
      
      // Update local state
      setUsers((prev) => prev.map((u) => u._id === editUser._id ? { ...u, ...updateData } : u));
      setFilteredUsers((prev) => prev.map((u) => u._id === editUser._id ? { ...u, ...updateData } : u));
      
      setIsEditDialogOpen(false);
      setEditUser(null);
      setError(null);
      setSuccess("User updated successfully!");
    } catch (error: any) {
      console.error("Error updating user:", error);
      setError(error.message || "Failed to update user. Please try again.");
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUserId) return;
    try {
      const response = await fetch(`/api/users/${selectedUserId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseErr) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || "Failed to delete user");
      }

      // Refresh user list
      await fetchUsers();
      
      setIsDeleteDialogOpen(false);
      setSelectedUserId(null);
      setError(null);
      setSuccess("User deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      setError(error.message || "Failed to delete user. Please try again.");
    }
  };

  // Improved image display component
  const UserAvatar = ({ user, size = "md", clickable = true }: { user: User; size?: "sm" | "md" | "lg"; clickable?: boolean }) => {
    const sizeClasses = {
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-24 w-24"
    };

    // Check if profileImage is a valid base64 image
    const isValidBase64Image = user.profileImage && 
      user.profileImage.startsWith("data:image/") && 
      user.profileImage.length > 100;

    const handleImageClick = () => {
      if (clickable && isValidBase64Image) {
        openFullScreenImage(user.profileImage!);
      }
    };

    if (isValidBase64Image) {
      return (
        <img
          src={user.profileImage}
          alt={`${user.firstName} ${user.lastName}`}
          className={`${sizeClasses[size]} rounded-full object-cover border ${
            clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
          }`}
          onClick={handleImageClick}
        />
      );
    }

    // Fallback avatar
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center`}>
        <User className={`${size === "lg" ? "h-8 w-8" : "h-5 w-5"} text-gray-500`} />
      </div>
    );
  };

  // Reset OTP state when dialog closes
  useEffect(() => {
    if (!isAddUserDialogOpen) {
      setShowOTPField(false);
      setOtpCode("");
      setOtpMessage(null);
      setOtpSentEmail("");
      setIsOTPVerified(false);
      setVerifiedUserData(null);
      // Also reset newUser form when dialog closes
      setNewUser({
        schoolID: "",
        firstName: "",
        lastName: "",
        email: "",
        role: "student",
        schoolYear: "",
        section: "",
        profileImage: "",
      });
      // Reset CSV results and tab
      setCsvResults(null);
      setActiveTab("single");
    }
  }, [isAddUserDialogOpen]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Clear error message after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Loader
  if (loading) {
    return (
      <div className="space-y-6 min-h-full p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
                <TableRow className="bg-blue-50">
                  {[...Array(8)].map((_, i) => (
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
    );
  }

  return (
    <div className="space-y-6 min-h-full p-6">
      {/* Full Screen Image Viewer */}
      <FullScreenImageViewer 
        imageUrl={fullScreenImage.imageUrl}
        isOpen={fullScreenImage.isOpen}
        onClose={closeFullScreenImage}
      />

      {/* Success and Error Messages */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-red-700 hover:text-red-900 font-bold text-lg"
          >
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border border-green-300 text-green-700 rounded-md flex justify-between items-center">
          <span>{success}</span>
          <button 
            onClick={() => setSuccess(null)} 
            className="text-green-700 hover:text-green-900 font-bold text-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-2">Monitor and manage user accounts and activity</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Bulk Actions - Only for Students */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBulkAction("inactive");
                setIsBulkStatusDialogOpen(true);
              }}
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
              disabled={studentUsers.length === 0}
            >
              <UserX className="mr-2 h-4 w-4" />
              Deactivate Students
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setBulkAction("active");
                setIsBulkStatusDialogOpen(true);
              }}
              className="border-green-500 text-green-600 hover:bg-green-50"
              disabled={studentUsers.length === 0}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Activate Students
            </Button>
          </div>

          {/* Add User Dialog with Tabs (Single and CSV Upload) */}
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] bg-background border border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add New User</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Create single user or bulk upload via CSV
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "single" | "bulk")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="single" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Single User
                  </TabsTrigger>
                  <TabsTrigger value="bulk" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Bulk CSV Upload
                  </TabsTrigger>
                </TabsList>
                
                {/* Single User Tab */}
                <TabsContent value="single" className="space-y-4">
                  {error && <p className="text-destructive text-sm mb-4">{error}</p>}
                  {otpMessage && (
                    <div className={`p-3 text-sm rounded-md mb-4 ${
                      isOTPVerified ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {otpMessage}
                      {isOTPVerified && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 font-medium">OTP Verified Successfully</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-4">
                      {/* Profile Image Upload */}
                      <div className="space-y-2">
                        <Label htmlFor="profileImage" className="text-sm font-medium text-foreground">
                          Profile Image (Optional)
                        </Label>
                        <Input
                          id="profileImage"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleProfileImageUpload}
                          className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                        />
                        {newUser.profileImage === "uploading..." ? (
                          <div className="mt-2 h-20 w-20 flex items-center justify-center bg-gray-100 rounded-md">
                            <p className="text-sm text-muted-foreground">Uploading...</p>
                          </div>
                        ) : newUser.profileImage && newUser.profileImage.startsWith("data:image/") ? (
                          <div className="mt-2">
                            <img
                              src={newUser.profileImage}
                              alt="Profile Preview"
                              className="h-20 w-20 object-cover rounded-md border hover:border-ring transition-colors cursor-pointer"
                              onClick={() => openFullScreenImage(newUser.profileImage)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Image ready - Click to view
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="schoolID" className="text-sm font-medium text-foreground">
                          School ID *
                        </Label>
                        <Input
                          id="schoolID"
                          placeholder="e.g., XXXXXXXXX"
                          value={newUser.schoolID}
                          onChange={(e) => setNewUser({ ...newUser, schoolID: e.target.value })}
                          className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                          required
                          disabled={isOTPVerified}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                          First Name *
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="Enter first name"
                          value={newUser.firstName}
                          onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                          className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                          required
                          disabled={isOTPVerified}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                          Last Name *
                        </Label>
                        <Input
                          id="lastName"
                          placeholder="Enter last name"
                          value={newUser.lastName}
                          onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                          className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                          required
                          disabled={isOTPVerified}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email" className="text-sm font-medium text-foreground">
                          Email Address *
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter email address"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500 flex-1"
                            required
                            disabled={isOTPVerified}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSendOTP}
                            disabled={
                              !newUser.email || 
                              !newUser.email.includes('@') || 
                              !newUser.schoolID ||
                              !newUser.firstName ||
                              !newUser.lastName ||
                              (newUser.role === "student" && (!newUser.schoolYear || !newUser.section)) ||
                              isSendingOTP ||
                              newUser.profileImage === "uploading..." ||
                              isOTPVerified
                            }
                            className="whitespace-nowrap"
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            {isSendingOTP ? "Sending..." : "Send OTP"}
                          </Button>
                        </div>
                      </div>

                      {/* OTP Input Field - appears after sending OTP */}
                      {showOTPField && (
                        <div className="grid gap-2 animate-in fade-in duration-300">
                          <Label htmlFor="otp" className="text-sm font-medium text-foreground">
                            Enter OTP Code *
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="otp"
                              type="text"
                              placeholder="Enter 6-digit OTP"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500 flex-1"
                              required
                              disabled={isOTPVerified}
                            />
                            <Button
                              type="button"
                              onClick={handleVerifyOTP}
                              disabled={!otpCode || otpCode.length !== 6 || isVerifyingOTP || isOTPVerified}
                              className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Key className="h-4 w-4 mr-1" />
                              {isVerifyingOTP ? "Verifying..." : "Verify OTP"}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Enter the 6-digit verification code sent to {newUser.email}
                          </p>
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label htmlFor="role" className="text-sm font-medium text-foreground">
                          Role *
                        </Label>
                        <select
                          id="role"
                          value={newUser.role}
                          onChange={(e) => setNewUser({ 
                            ...newUser, 
                            role: e.target.value as "admin" | "student" | "faculty",
                            schoolYear: e.target.value !== "student" ? "" : newUser.schoolYear,
                            section: e.target.value !== "student" ? "" : newUser.section
                          })}
                          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 hover:bg-muted transition-colors"
                          disabled={isOTPVerified}
                        >
                          <option value="student">Student</option>
                          <option value="admin">Admin</option>
                          <option value="faculty">Faculty</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* Conditionally show student fields */}
                      {newUser.role === "student" && (
                        <>
                          <div className="grid gap-2">
                            <Label htmlFor="schoolYear" className="text-sm font-medium text-foreground">
                              School Year *
                            </Label>
                            <Input
                              id="schoolYear"
                              type="number"
                              placeholder="Enter year (1-5)"
                              value={newUser.schoolYear}
                              onChange={(e) => setNewUser({ ...newUser, schoolYear: e.target.value })}
                              className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                              min="1"
                              max="5"
                              required
                              disabled={isOTPVerified}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="section" className="text-sm font-medium text-foreground">
                              Section *
                            </Label>
                            <Input
                              id="section"
                              placeholder="Enter section"
                              value={newUser.section}
                              onChange={(e) => setNewUser({ ...newUser, section: e.target.value })}
                              className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                              required
                              disabled={isOTPVerified}
                            />
                          </div>
                        </>
                      )}
                      
                      {/* Password Information */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="h-4 w-4 text-blue-600" />
                          <h4 className="font-medium text-blue-800">Password Information</h4>
                        </div>
                        <p className="text-sm text-blue-700">
                          A secure password will be automatically generated and sent to the user's email address after account creation.
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                    <DialogClose asChild>
                      <Button variant="outline" className="sm:mr-auto">
                        Cancel
                      </Button>
                    </DialogClose>
                    
                    {/* Create Account Button - Only enabled when OTP is verified */}
                    <Button
                      onClick={handleCreateUser}
                      disabled={!isOTPVerified || isCreatingUser}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {isCreatingUser ? "Creating Account..." : "Create Account"}
                    </Button>
                  </DialogFooter>
                </TabsContent>
                
                {/* Bulk CSV Upload Tab */}
                <TabsContent value="bulk" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Button 
                        onClick={downloadCSVTemplate} 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Template
                      </Button>
                    </div>

                    <CSVUploadDropzone onFileUpload={handleCSVUpload} />

                    {csvUploading && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-sm text-muted-foreground mt-2">Processing CSV file...</p>
                      </div>
                    )}

                    {csvResults && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Upload Results:</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-green-600">
                            <CheckCircle className="h-4 w-4 inline mr-1" />
                            Successful: {csvResults.success}
                          </div>
                          <div className="text-red-600">
                            <X className="h-4 w-4 inline mr-1" />
                            Failed: {csvResults.failed}
                          </div>
                        </div>
                        {csvResults.errors.length > 0 && (
                          <div className="mt-3">
                            <h5 className="font-medium text-sm mb-1">Errors:</h5>
                            <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                              {csvResults.errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 text-sm mb-2">CSV Format Requirements:</h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Required columns: <code>schoolID, firstName, lastName, email, role</code></li>
                        <li>• Optional for students: <code>schoolYear, section</code></li>
                        <li>• Valid roles: <code>student, faculty, admin</code></li>
                        <li>• For non-students, leave schoolYear and section empty</li>
                        <li>• Email must be unique across all users</li>
                        <li>• School ID must be unique across all users</li>
                        <li>• Passwords will be auto-generated and sent via email</li>
                      </ul>
                    </div>
                  </div>

                  <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("single")}
                      className="sm:mr-auto"
                    >
                      <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                      Back to Single User
                    </Button>
                    <DialogClose asChild>
                      <Button variant="outline">Close</Button>
                    </DialogClose>
                  </DialogFooter>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analyticsData.totalUsers}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <p className="text-xs text-muted-foreground">All registered users</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-foreground">Active Students</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analyticsData.activeStudents}</div>
            <div className="flex items-center gap-1 mt-1">
              <Activity className="h-3 w-3 text-emerald-500" />
              <p className="text-xs text-muted-foreground">Currently active</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-foreground">Inactive Students</CardTitle>
            <UserX className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analyticsData.inactiveStudents}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-orange-500" />
              <p className="text-xs text-muted-foreground">Currently inactive</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-foreground">Total Students</CardTitle>
            <UserPlus className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analyticsData.totalStudents}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-indigo-500" />
              <p className="text-xs text-muted-foreground">All student accounts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-500" />
            Filters & Search
          </CardTitle>
          <CardDescription>Find users by name, email, status, or role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users by name, email, or School ID..."
                className="pl-10 border-border focus-visible:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px] border-border">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setRoleFilter("all");
                }}
                className="border-border text-foreground hover:bg-gray-100"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border bg-card hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            User Accounts
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {filteredUsers.length} user(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold text-foreground">User</TableHead>
                  <TableHead className="font-semibold text-foreground">School ID</TableHead>
                  <TableHead className="font-semibold text-foreground">Role</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground">Last Login</TableHead>
                  <TableHead className="font-semibold text-foreground">Account Created</TableHead>
                  <TableHead className="font-semibold text-foreground">Logins</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">No users found matching your criteria</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow 
                      key={user._id} 
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} size="md" clickable={true} />
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{`${user.firstName} ${user.lastName}`}</span>
                            <span className="text-sm text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-mono text-sm">
                        {user.schoolID || "N/A"}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-foreground">
                          <Clock className="h-3 w-3" />
                          {user.lastLogin ? formatDateTime(user.lastLogin) : "Never"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(user.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">{user.loginCount}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-muted"
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setViewUser(user);
                                setIsViewDialogOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2 text-blue-600" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditUser(user);
                                setIsEditDialogOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Edit className="h-4 w-4 mr-2 text-yellow-600" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigator.clipboard.writeText(user.email)}
                              className="cursor-pointer"
                            >
                              Copy email
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigator.clipboard.writeText(user.schoolID || "N/A")}
                              className="cursor-pointer"
                            >
                              Copy School ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user._id);
                                setNewStatus("active");
                                setIsStatusDialogOpen(true);
                              }}
                              disabled={user.status === "active"}
                              className="cursor-pointer text-emerald-600"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Set Active
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user._id);
                                setNewStatus("inactive");
                                setIsStatusDialogOpen(true);
                              }}
                              disabled={user.status === "inactive"}
                              className="cursor-pointer text-gray-600"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Set Inactive
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user._id);
                                setNewStatus("suspended");
                                setIsStatusDialogOpen(true);
                              }}
                              disabled={user.status === "suspended"}
                              className="cursor-pointer text-red-600"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Suspend User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4 border-t">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * limit + 1, filteredUsers.length)} to {Math.min(currentPage * limit, filteredUsers.length)} of {filteredUsers.length} results
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Status Update Dialog */}
      <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {bulkAction === "active" ? "Activate All Students" : "Deactivate All Students"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to {bulkAction === "active" ? "activate" : "deactivate"} all {studentUsers.length} student accounts?
              {bulkAction === "inactive" && " This is typically done at the end of a semester."}
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleBulkStatusUpdate}
              disabled={isBulkActionLoading}
              className={
                bulkAction === "active"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }
            >
              {isBulkActionLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {bulkAction === "active" ? "Activating..." : "Deactivating..."}
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  {bulkAction === "active" ? `Activate All Students (${studentUsers.length})` : `Deactivate All Students (${studentUsers.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">User Details</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              View details for {viewUser ? `${viewUser.firstName} ${viewUser.lastName}` : "user"}.
            </DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-6 py-4">
              {/* Profile Section */}
              <div className="flex flex-col items-center space-y-2">
                <UserAvatar user={viewUser} size="lg" clickable={true} />
                <h3 className="text-xl font-semibold text-foreground">{`${viewUser.firstName} ${viewUser.lastName}`}</h3>
                {viewUser.profileImage && viewUser.profileImage.startsWith("data:image/") && (
                  <p className="text-xs text-muted-foreground">Click on image to view full size</p>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-foreground">School ID</Label>
                    <p className="text-foreground mt-1">{viewUser.schoolID || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Email</Label>
                    <p className="text-foreground mt-1 break-all">{viewUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Last Login</Label>
                    <p className="text-foreground mt-1">{viewUser.lastLogin ? formatDateTime(viewUser.lastLogin) : "Never"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Account Created</Label>
                    <p className="text-foreground mt-1">{formatDate(viewUser.createdAt)}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Role</Label>
                    <p className="text-foreground mt-1">{getRoleBadge(viewUser.role)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Status</Label>
                    <p className="text-foreground mt-1">{getStatusBadge(viewUser.status)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Login Count</Label>
                    <p className="text-foreground mt-1 font-medium">{viewUser.loginCount}</p>
                  </div>
                  {viewUser.role === "student" && (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-foreground">School Year</Label>
                        <p className="text-foreground mt-1">{viewUser.schoolYear || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Section</Label>
                        <p className="text-foreground mt-1">{viewUser.section || "N/A"}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-background border border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit User</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update user details.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          {editUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-4">
                {/* Profile Image Upload */}
                <div className="space-y-2">
                  <Label htmlFor="edit-profileImage" className="text-sm font-medium text-foreground">
                    Profile Image (Optional)
                  </Label>
                  <Input
                    id="edit-profileImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleEditProfileImageUpload}
                    className="border-border focus-visible:ring-blue-500"
                  />
                  {editUser.profileImage === "uploading..." ? (
                    <div className="mt-2 h-20 w-20 flex items-center justify-center bg-gray-100 rounded-md">
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                  ) : editUser.profileImage && editUser.profileImage.startsWith("data:image/") ? (
                    <div className="mt-2">
                      <img
                        src={editUser.profileImage}
                        alt="Profile Preview"
                        className="h-20 w-20 object-cover rounded-md border cursor-pointer hover:opacity-80"
                        onClick={() => openFullScreenImage(editUser.profileImage!)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Image ready - Click to view
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-schoolID" className="text-sm font-medium text-foreground">
                    School ID *
                  </Label>
                  <Input
                    id="edit-schoolID"
                    placeholder="e.g., XXXXXXXXX"
                    value={editUser.schoolID}
                    onChange={(e) => setEditUser({ ...editUser, schoolID: e.target.value })}
                    className="border-border focus-visible:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-firstName" className="text-sm font-medium text-foreground">
                    First Name *
                  </Label>
                  <Input
                    id="edit-firstName"
                    placeholder="Enter first name"
                    value={editUser.firstName}
                    onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                    className="border-border focus-visible:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-lastName" className="text-sm font-medium text-foreground">
                    Last Name *
                  </Label>
                  <Input
                    id="edit-lastName"
                    placeholder="Enter last name"
                    value={editUser.lastName}
                    onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                    className="border-border focus-visible:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email" className="text-sm font-medium text-foreground">
                    Email Address *
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="Enter email address"
                    value={editUser.email}
                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                    className="border-border focus-visible:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role" className="text-sm font-medium text-foreground">
                    Role *
                  </Label>
                  <select
                    id="edit-role"
                    value={editUser.role}
                    onChange={(e) => setEditUser({ 
                      ...editUser, 
                      role: e.target.value as "admin" | "student" | "faculty",
                      schoolYear: e.target.value !== "student" ? "" : editUser.schoolYear,
                      section: e.target.value !== "student" ? "" : editUser.section
                    })}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                {editUser.role === "student" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-schoolYear" className="text-sm font-medium text-foreground">
                        School Year *
                      </Label>
                      <Input
                        id="edit-schoolYear"
                        type="number"
                        placeholder="Enter year (1-5)"
                        value={editUser.schoolYear}
                        onChange={(e) => setEditUser({ ...editUser, schoolYear: e.target.value })}
                        className="border-border focus-visible:ring-blue-500"
                        min="1"
                        max="5"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-section" className="text-sm font-medium text-foreground">
                        Section *
                      </Label>
                      <Input
                        id="edit-section"
                        placeholder="Enter section"
                        value={editUser.section}
                        onChange={(e) => setEditUser({ ...editUser, section: e.target.value })}
                        className="border-border focus-visible:ring-blue-500"
                        required
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleEditUser}
              disabled={
                !editUser?.schoolID ||
                !editUser?.firstName ||
                !editUser?.lastName ||
                !editUser?.email ||
                (editUser?.role === "student" && (!editUser?.schoolYear || !editUser?.section)) ||
                editUser?.profileImage === "uploading..."
              }
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Edit className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {newStatus === "active"
                ? "Activate User"
                : newStatus === "inactive"
                ? "Deactivate User"
                : "Suspend User"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to set this user's status to {newStatus}?
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleStatusChange}
              className={
                newStatus === "active"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : newStatus === "inactive"
                  ? "bg-gray-500 hover:bg-gray-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Confirm {newStatus === "active" ? "Activate" : newStatus === "inactive" ? "Deactivate" : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete User</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="border-t bg-background py-6 px-6 mt-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fisheries Lab Management System. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
            <span className="text-sm text-muted-foreground">User Management v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

AdminUsersPage.pageTitle = "User Management";