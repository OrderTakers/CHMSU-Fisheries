"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Filter, MoreVertical, Plus, Calendar, Eye, Edit, Trash2, Bell, AlertTriangle, Info, Megaphone, Clock, Users, FileText, Download, X, Image, File } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Announcement {
  _id: string;
  announcementId: string;
  title: string;
  message: string;
  type: 'general' | 'maintenance' | 'urgent' | 'update' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetAudience: ('all' | 'students' | 'faculty' | 'admin' | 'specific')[];
  specificUsers: string[];
  scheduledFor?: string;
  expiresAt?: string;
  isActive: boolean;
  isPublished: boolean;
  publishedAt?: string;
  createdBy: string;
  createdByName: string;
  readBy: Array<{ user: string; readAt: string }>;
  attachments: Array<{
    filename: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    base64Data: string;
    uploadedAt: string;
  }>;
  statistics: {
    totalRecipients: number;
    readCount: number;
    clickCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateAnnouncementData {
  title: string;
  message: string;
  type: 'general' | 'maintenance' | 'urgent' | 'update' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetAudience: ('all' | 'students' | 'faculty' | 'admin' | 'specific')[];
  specificUsers: string[];
  scheduledFor?: string;
  expiresAt?: string;
  isActive: boolean;
  attachments: File[];
}

// File to Base64 conversion function
const convertFileToBase64 = (file: File): Promise<{filename: string; fileType: string; fileSize: number; base64Data: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const fullBase64String = reader.result as string;
      
      // Keep the full data URL for display
      resolve({
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        base64Data: fullBase64String
      });
    };
    reader.onerror = error => reject(error);
  });
};

// Skeleton Components
const SkeletonTableRow = () => (
  <TableRow>
    <TableCell>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
        <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
      </div>
    </TableCell>
    <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-right"><div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto"></div></TableCell>
  </TableRow>
);

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
        >
          Previous
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
              className={`${
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
        >
          Next
        </Button>
      </div>
    </div>
  );
};

// Image Viewer Component
const ImageViewer = ({ 
  imageUrl, 
  filename, 
  onClose 
}: { 
  imageUrl: string; 
  filename: string; 
  onClose: () => void 
}) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-blue-500" />
            {filename}
          </DialogTitle>
        </DialogHeader>
        <div className="flex justify-center items-center bg-black/5 rounded-lg p-4">
          <img 
            src={imageUrl} 
            alt={filename}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
          <Button 
            onClick={() => {
              const link = document.createElement('a');
              link.href = imageUrl;
              link.download = filename;
              link.click();
            }}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// View Announcement Dialog Component
const ViewAnnouncementDialog = ({ 
  announcement, 
  isOpen, 
  onClose 
}: { 
  announcement: Announcement | null; 
  isOpen: boolean; 
  onClose: () => void 
}) => {
  const [selectedImage, setSelectedImage] = useState<{url: string; filename: string} | null>(null);

  if (!announcement) return null;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "urgent":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Urgent</Badge>;
      case "maintenance":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1"><Clock className="h-3 w-3" /> Maintenance</Badge>;
      case "update":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1"><Info className="h-3 w-3" /> Update</Badge>;
      case "reminder":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-1"><Bell className="h-3 w-3" /> Reminder</Badge>;
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-1"><Megaphone className="h-3 w-3" /> General</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Medium</Badge>;
      case "low":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (announcement: Announcement) => {
    if (!announcement.isPublished) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700">Draft</Badge>;
    }
    if (announcement.expiresAt && new Date(announcement.expiresAt) < new Date()) {
      return <Badge variant="outline" className="bg-gray-200 text-gray-700">Expired</Badge>;
    }
    if (announcement.scheduledFor && new Date(announcement.scheduledFor) > new Date()) {
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Scheduled</Badge>;
    }
    if (announcement.isActive) {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Active</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-100 text-gray-700">Inactive</Badge>;
  };

  const isImageFile = (filename: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const handleDownload = (attachment: any) => {
    try {
      const link = document.createElement('a');
      link.href = attachment.base64Data || attachment.fileUrl;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleViewImage = (attachment: any) => {
    if (attachment.base64Data) {
      const imageUrl = attachment.base64Data;
      setSelectedImage({ url: imageUrl, filename: attachment.filename });
    } else if (attachment.fileUrl) {
      setSelectedImage({ url: attachment.fileUrl, filename: attachment.filename });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              Announcement Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about this announcement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{announcement.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">ID: {announcement.announcementId}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(announcement)}
                {getTypeBadge(announcement.type)}
              </div>
            </div>

            {/* Message */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Message</Label>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-foreground whitespace-pre-wrap">{announcement.message}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Priority</Label>
                <div>{getPriorityBadge(announcement.priority)}</div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Target Audience</Label>
                <div className="flex flex-wrap gap-1">
                  {announcement.targetAudience.map((audience) => (
                    <Badge key={audience} variant="outline" className="text-xs">
                      {audience}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Created</Label>
                <p className="text-sm text-foreground">
                  {new Date(announcement.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Created By</Label>
                <p className="text-sm text-foreground">{announcement.createdByName}</p>
              </div>
              {announcement.scheduledFor && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Scheduled For</Label>
                  <p className="text-sm text-foreground">
                    {new Date(announcement.scheduledFor).toLocaleString()}
                  </p>
                </div>
              )}
              {announcement.expiresAt && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Expires At</Label>
                  <p className="text-sm text-foreground">
                    {new Date(announcement.expiresAt).toLocaleString()}
                  </p>
                </div>
              )}
              {announcement.publishedAt && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Published At</Label>
                  <p className="text-sm text-foreground">
                    {new Date(announcement.publishedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Statistics</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{announcement.statistics.totalRecipients}</p>
                  <p className="text-xs text-muted-foreground">Recipients</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{announcement.statistics.readCount}</p>
                  <p className="text-xs text-muted-foreground">Read</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{announcement.statistics.clickCount}</p>
                  <p className="text-xs text-muted-foreground">Clicks</p>
                </div>
              </div>
            </div>

            {/* Attachments */}
            {announcement.attachments && announcement.attachments.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Attachments ({announcement.attachments.length})
                </Label>
                <div className="space-y-3">
                  {announcement.attachments.map((attachment, index) => {
                    const isImage = isImageFile(attachment.filename);
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-3 flex-1">
                          {isImage ? (
                            <Image className="h-8 w-8 text-blue-500" />
                          ) : (
                            <File className="h-8 w-8 text-gray-500" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{attachment.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.fileType} • {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isImage && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewImage(attachment)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownload(attachment)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Image Previews */}
            {announcement.attachments && announcement.attachments.some(att => isImageFile(att.filename)) && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Image Previews</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {announcement.attachments
                    .filter(att => isImageFile(att.filename))
                    .map((attachment, index) => (
                      <div key={index} className="relative group">
                        <div 
                          className="aspect-square bg-muted/50 rounded-lg border-2 border-transparent group-hover:border-blue-500 transition-colors cursor-pointer overflow-hidden"
                          onClick={() => handleViewImage(attachment)}
                        >
                          <img 
                            src={attachment.base64Data || attachment.fileUrl}
                            alt={attachment.filename}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Error loading image:', attachment.filename);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {attachment.filename}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewer 
          imageUrl={selectedImage.url}
          filename={selectedImage.filename}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
};

export default function AnnouncementsPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [formData, setFormData] = useState<CreateAnnouncementData>({
    title: "",
    message: "",
    type: "general",
    priority: "medium",
    targetAudience: ["all"],
    specificUsers: [],
    scheduledFor: "",
    expiresAt: "",
    isActive: true,
    attachments: []
  });

  // Auth check
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/announcements", { 
        cache: "no-store",
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAnnouncements(data.announcements || []);
        setError(null);
      } else {
        throw new Error(data.error || "Failed to fetch announcements");
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch announcements. Please try again.");
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [fetchAnnouncements, user]);

  // Memoized filtered data with pagination
  const filteredAnnouncements = useMemo(() => {
    let result = announcements;

    // Search filter
    if (searchTerm) {
      result = result.filter(
        (announcement) =>
          announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          announcement.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          announcement.announcementId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((announcement) => announcement.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        result = result.filter((announcement) => announcement.isActive && announcement.isPublished);
      } else if (statusFilter === "inactive") {
        result = result.filter((announcement) => !announcement.isActive);
      } else if (statusFilter === "draft") {
        result = result.filter((announcement) => !announcement.isPublished);
      } else if (statusFilter === "scheduled") {
        result = result.filter((announcement) => 
          announcement.scheduledFor && new Date(announcement.scheduledFor) > new Date()
        );
      }
    }

    // Tab filter
    if (activeTab === "active") {
      result = result.filter((announcement) => announcement.isActive && announcement.isPublished);
    } else if (activeTab === "drafts") {
      result = result.filter((announcement) => !announcement.isPublished);
    } else if (activeTab === "scheduled") {
      result = result.filter((announcement) => 
        announcement.scheduledFor && new Date(announcement.scheduledFor) > new Date()
      );
    } else if (activeTab === "expired") {
      result = result.filter((announcement) => 
        announcement.expiresAt && new Date(announcement.expiresAt) < new Date()
      );
    }

    return result;
  }, [announcements, searchTerm, typeFilter, statusFilter, activeTab]);

  // Paginated data
  const paginatedAnnouncements = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAnnouncements.slice(startIndex, endIndex);
  }, [filteredAnnouncements, currentPage]);

  // Status badges
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "urgent":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 w-20"><AlertTriangle className="h-3 w-3" /> Urgent</Badge>;
      case "maintenance":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 w-24"><Clock className="h-3 w-3" /> Maintenance</Badge>;
      case "update":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 w-20"><Info className="h-3 w-3" /> Update</Badge>;
      case "reminder":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-1 w-22"><Bell className="h-3 w-3" /> Reminder</Badge>;
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-1 w-20"><Megaphone className="h-3 w-3" /> General</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Medium</Badge>;
      case "low":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (announcement: Announcement) => {
    if (!announcement.isPublished) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700">Draft</Badge>;
    }
    if (announcement.expiresAt && new Date(announcement.expiresAt) < new Date()) {
      return <Badge variant="outline" className="bg-gray-200 text-gray-700">Expired</Badge>;
    }
    if (announcement.scheduledFor && new Date(announcement.scheduledFor) > new Date()) {
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Scheduled</Badge>;
    }
    if (announcement.isActive) {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Active</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-100 text-gray-700">Inactive</Badge>;
  };

  // Handlers
  const handleCreateAnnouncement = async () => {
    try {
      setError(null);
      setApiError(null);
      
      // Check if user data is available
      if (!user || !user._id) {
        const errorMsg = "User not found. Please log in again.";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Validate required fields
      if (!formData.title.trim() || !formData.message.trim()) {
        setError("Title and message are required");
        toast.error("Title and message are required");
        return;
      }

      // Convert files to base64
      const processedAttachments = [];
      if (formData.attachments && formData.attachments.length > 0) {
        for (const file of formData.attachments) {
          try {
            const base64Attachment = await convertFileToBase64(file);
            processedAttachments.push(base64Attachment);
          } catch (fileError) {
            console.error('Error converting file to base64:', fileError);
            toast.error(`Failed to process file: ${file.name}`);
            return;
          }
        }
      }

      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title.trim(),
          message: formData.message.trim(),
          type: formData.type,
          priority: formData.priority,
          targetAudience: formData.targetAudience,
          specificUsers: formData.specificUsers,
          scheduledFor: formData.scheduledFor || undefined,
          expiresAt: formData.expiresAt || undefined,
          isActive: formData.isActive,
          isPublished: false,
          createdBy: user._id,
          attachments: processedAttachments
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setApiError(data.error || 'Failed to create announcement');
        if (data.details) {
          setApiError(`${data.error}: ${Array.isArray(data.details) ? data.details.join(', ') : data.details}`);
        }
        throw new Error(data.error || 'Failed to create announcement');
      }

      setAnnouncements(prev => [data.announcement, ...prev]);
      setIsCreateDialogOpen(false);
      setFormData({
        title: "",
        message: "",
        type: "general",
        priority: "medium",
        targetAudience: ["all"],
        specificUsers: [],
        scheduledFor: "",
        expiresAt: "",
        isActive: true,
        attachments: []
      });
      toast.success("Announcement created successfully!");
    } catch (error) {
      console.error("Error creating announcement:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create announcement";
      if (!apiError) setError(errorMessage);
      toast.error(apiError || errorMessage);
    }
  };

  // FIXED: Edit announcement handler
  const handleEditAnnouncement = async () => {
    if (!selectedAnnouncement) return;
    
    try {
      setError(null);
      setApiError(null);
      
      // Validate required fields
      if (!formData.title.trim() || !formData.message.trim()) {
        setError("Title and message are required");
        toast.error("Title and message are required");
        return;
      }

      // Prepare update data - ensure specificUsers is an array
      const updateData: any = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        specificUsers: Array.isArray(formData.specificUsers) ? formData.specificUsers : [],
        isActive: formData.isActive
      };

      // Handle date fields - only include if they have values
      if (formData.scheduledFor && formData.scheduledFor.trim() !== '') {
        updateData.scheduledFor = formData.scheduledFor;
      } else {
        updateData.scheduledFor = null; // Clear the field
      }

      if (formData.expiresAt && formData.expiresAt.trim() !== '') {
        updateData.expiresAt = formData.expiresAt;
      } else {
        updateData.expiresAt = null; // Clear the field
      }

      console.log('Sending update for announcement:', {
        announcementId: selectedAnnouncement._id,
        updateData
      });

      // Use the new endpoint: /api/announcements/[id]
      const response = await fetch(`/api/announcements/${selectedAnnouncement._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      
      console.log('Update response:', data);
      
      if (!data.success) {
        setApiError(data.error || 'Failed to update announcement');
        if (data.details) {
          const detailsMessage = Array.isArray(data.details) ? data.details.join(', ') : data.details;
          setApiError(`${data.error}: ${detailsMessage}`);
        }
        throw new Error(data.error || 'Failed to update announcement');
      }

      setAnnouncements(prev => prev.map(a => a._id === selectedAnnouncement._id ? data.announcement : a));
      setIsEditDialogOpen(false);
      setSelectedAnnouncement(null);
      setFormData({
        title: "",
        message: "",
        type: "general",
        priority: "medium",
        targetAudience: ["all"],
        specificUsers: [],
        scheduledFor: "",
        expiresAt: "",
        isActive: true,
        attachments: []
      });
      toast.success("Announcement updated successfully!");
    } catch (error) {
      console.error("Error updating announcement:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update announcement";
      if (!apiError) setError(errorMessage);
      toast.error(apiError || errorMessage);
    }
  };

  const handlePublishAnnouncement = async (announcementId: string) => {
    try {
      setError(null);
      setApiError(null);
      
      // Use the new endpoint: /api/announcements/[id]
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'publish'
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setApiError(data.error || 'Failed to publish announcement');
        throw new Error(data.error || 'Failed to publish announcement');
      }

      setAnnouncements(prev => prev.map(a => a._id === announcementId ? data.announcement : a));
      toast.success("Announcement published successfully!");
    } catch (error) {
      console.error("Error publishing announcement:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to publish announcement";
      setError(errorMessage);
      toast.error(apiError || errorMessage);
    }
  };

  // DELETE handler using the new endpoint
  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      setApiError(null);
      
      // Use the new endpoint: /api/announcements/[id]
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setApiError(data.error || 'Failed to delete announcement');
        throw new Error(data.error || 'Failed to delete announcement');
      }

      setAnnouncements(prev => prev.filter(a => a._id !== announcementId));
      toast.success("Announcement deleted successfully!");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete announcement";
      setError(errorMessage);
      toast.error(apiError || errorMessage);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setFormData(prev => ({
        ...prev,
        attachments: Array.from(files)
      }));
    }
  };

  const handleViewAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsViewDialogOpen(true);
  };

  const handleEditClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      targetAudience: announcement.targetAudience,
      specificUsers: announcement.specificUsers || [],
      scheduledFor: announcement.scheduledFor ? new Date(announcement.scheduledFor).toISOString().slice(0, 16) : "",
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 16) : "",
      isActive: announcement.isActive,
      attachments: []
    });
    setIsEditDialogOpen(true);
    setError(null);
    setApiError(null);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, activeTab]);

  // Show loading state
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
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
              <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold"><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableHead>
                      <TableHead className="font-semibold"><div className="h-4 w-16 bg-muted rounded animate-pulse"></div></TableHead>
                      <TableHead className="font-semibold"><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableHead>
                      <TableHead className="font-semibold"><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableHead>
                      <TableHead className="font-semibold"><div className="h-4 w-16 bg-muted rounded animate-pulse"></div></TableHead>
                      <TableHead className="font-semibold"><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableHead>
                      <TableHead className="text-right font-semibold"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto"></div></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <SkeletonTableRow key={i} />
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
            <h1 className="text-3xl font-bold text-foreground">Announcement Management</h1>
            <p className="text-muted-foreground mt-2">Create and manage system announcements</p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Announcements</CardTitle>
              <Megaphone className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{announcements.length}</div>
              <p className="text-xs text-muted-foreground">All announcements</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Active</CardTitle>
              <Bell className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {announcements.filter(a => a.isActive && a.isPublished).length}
              </div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Drafts</CardTitle>
              <FileText className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {announcements.filter(a => !a.isPublished).length}
              </div>
              <p className="text-xs text-muted-foreground">Unpublished drafts</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {announcements.filter(a => a.scheduledFor && new Date(a.scheduledFor) > new Date()).length}
              </div>
              <p className="text-xs text-muted-foreground">Future announcements</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-500" />
              Announcements
            </CardTitle>
            <CardDescription>Manage all system announcements and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-5 lg:max-w-2xl bg-muted/50 p-1 rounded-lg">
                <TabsTrigger value="all" className="data-[state=active]:bg-white rounded-md transition-all">
                  All
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-white rounded-md transition-all">
                  Active
                </TabsTrigger>
                <TabsTrigger value="drafts" className="data-[state=active]:bg-white rounded-md transition-all">
                  Drafts
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="data-[state=active]:bg-white rounded-md transition-all">
                  Scheduled
                </TabsTrigger>
                <TabsTrigger value="expired" className="data-[state=active]:bg-white rounded-md transition-all">
                  Expired
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search announcements..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Announcements Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Announcement</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Priority</TableHead>
                    <TableHead className="font-semibold">Audience</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAnnouncements.map((announcement) => (
                    <TableRow key={announcement._id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{announcement.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{announcement.message}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">ID: {announcement.announcementId}</p>
                          {announcement.attachments && announcement.attachments.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {announcement.attachments.length} attachment(s)
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(announcement.type)}</TableCell>
                      <TableCell>{getPriorityBadge(announcement.priority)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {announcement.targetAudience.slice(0, 2).map((audience) => (
                            <Badge key={audience} variant="outline" className="text-xs">
                              {audience}
                            </Badge>
                          ))}
                          {announcement.targetAudience.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{announcement.targetAudience.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(announcement)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(announcement.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleViewAnnouncement(announcement)}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditClick(announcement)}
                              className="cursor-pointer"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {!announcement.isPublished && (
                              <DropdownMenuItem
                                onClick={() => handlePublishAnnouncement(announcement._id)}
                                className="cursor-pointer text-emerald-600"
                              >
                                <Bell className="h-4 w-4 mr-2" />
                                Publish
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedAnnouncements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">No announcements found matching your criteria</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredAnnouncements.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={filteredAnnouncements.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          </CardContent>
        </Card>

        {/* Create Announcement Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-500" />
                Create New Announcement
              </DialogTitle>
              <DialogDescription>
                Create a new announcement to notify users. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            
            {(error || apiError) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error || apiError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter announcement title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience *</Label>
                  <Select 
                    value={formData.targetAudience[0]} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, targetAudience: [value] }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="students">Students Only</SelectItem>
                      <SelectItem value="faculty">Faculty Only</SelectItem>
                      <SelectItem value="admin">Admins Only</SelectItem>
                      <SelectItem value="specific">Specific Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Enter announcement message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledFor">Schedule For (Optional)</Label>
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachments">Attachments (Optional)</Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  You can select multiple files. Maximum file size: 10MB per file.
                </p>
                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                        <span>{file.name}</span>
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active immediately after publishing</Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleCreateAnnouncement}
                disabled={!formData.title.trim() || !formData.message.trim()}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                Create Announcement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Announcement Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-500" />
                Edit Announcement
              </DialogTitle>
              <DialogDescription>
                Update the announcement details below.
              </DialogDescription>
            </DialogHeader>
            
            {(error || apiError) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error || apiError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    placeholder="Enter announcement title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority *</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-targetAudience">Target Audience *</Label>
                  <Select 
                    value={formData.targetAudience[0]} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, targetAudience: [value] }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="students">Students Only</SelectItem>
                      <SelectItem value="faculty">Faculty Only</SelectItem>
                      <SelectItem value="admin">Admins Only</SelectItem>
                      <SelectItem value="specific">Specific Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-message">Message *</Label>
                <Textarea
                  id="edit-message"
                  placeholder="Enter announcement message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-scheduledFor">Schedule For (Optional)</Label>
                  <Input
                    id="edit-scheduledFor"
                    type="datetime-local"
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-expiresAt">Expires At (Optional)</Label>
                  <Input
                    id="edit-expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleEditAnnouncement}
                disabled={!formData.title.trim() || !formData.message.trim()}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Update Announcement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Announcement Dialog */}
        <ViewAnnouncementDialog 
          announcement={selectedAnnouncement}
          isOpen={isViewDialogOpen}
          onClose={() => setIsViewDialogOpen(false)}
        />
      </div>

      {/* Footer */}
      <footer className="border-t bg-background py-6 px-6 mt-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fisheries Lab Management System. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
            <span className="text-sm text-muted-foreground">Announcements v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}