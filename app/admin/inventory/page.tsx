"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores";
import { useEffect, useState } from "react";
import { Plus, History, Trash2, Search, Filter, QrCode, Image, MoreHorizontal, Calendar as CalendarIcon, Edit, X, Package, ChevronLeft, ChevronRight, RefreshCw, Users, Activity, TrendingUp, AlertCircle, CheckCircle, MapPin, Eye, EyeOff, Ban, Printer, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QRCodeCanvas } from "qrcode.react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { uploadImageToSupabase } from '@/lib/image-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

// Define types
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface ILaboratory {
  _id: string;
  name: string;
  location?: string;
}

interface IRoom {
  _id: string;
  name: string;
  laboratoryId: string;
  location?: string;
  metadata?: {
    roomNumber: string;
    building: string;
    floor: string;
    capacity?: number;
  };
}

interface RoomOption {
  value: string;
  label: string;
}

interface MaintenanceHistory {
  date: string;
  action: string;
  performedBy: string;
  notes?: string;
}

interface CalibrationHistory {
  date: string;
  performedBy: string;
  calibrator: string;
  notes?: string;
}

interface Specification {
  name: string;
  value: string;
  unit?: string;
}

interface InventoryItem {
  _id: string;
  itemId: string;
  name: string;
  description?: string;
  specifications: Specification[];
  condition: string;
  category: string;
  cost: number;
  yearPurchased: string;
  maintenanceNeeds: string;
  calibration: string;
  roomAssigned: string;
  calibrator: string;
  image?: string;
  images?: string[];
  maintenanceHistory: MaintenanceHistory[];
  calibrationHistory: CalibrationHistory[];
  lastMaintenance?: string;
  nextMaintenance?: string;
  expirationDate?: string;
  quantity: number;
  availableQuantity: number;
  status: string;
  qrCode?: string;
  calibrationQuantity?: number;
  disposalQuantity?: number;
  maintenanceQuantity?: number;
  borrowedQuantity?: number;
  canBeBorrowed?: boolean;
  isDisposed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface Borrowing {
  _id: string;
  equipmentId: {
    _id: string;
    name: string;
    itemId: string;
  };
  borrowerName: string;
  borrowerEmail: string;
  borrowerId: string;
  status: "pending" | "approved" | "rejected" | "released" | "returned" | "overdue";
  requestedDate: string;
  intendedBorrowDate: string;
  intendedReturnDate: string;
  actualReturnDate?: string;
}

interface DisposalData {
  inventoryItem: string;
  itemId: string;
  equipmentName: string;
  category: string;
  reason: string;
  description: string;
  disposedBy: string;
  disposedById: string;
  originalCost: number;
  salvageValue: number;
  disposalMethod: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
  disposalDate: string;
  disposalQuantity: number;
}

// Helper function to check if a string is a valid image
const isValidImage = (imageString: string | undefined): boolean => {
  if (!imageString) return false;
  return imageString.startsWith('data:image/') || 
         imageString.startsWith('https://') || 
         imageString.startsWith('http://');
};

// Helper function to get the first valid image from an item
const getFirstValidImage = (item: InventoryItem): string | null => {
  if (item.image && isValidImage(item.image)) {
    return item.image;
  }
  
  if (item.images && Array.isArray(item.images)) {
    const validImage = item.images.find(img => isValidImage(img));
    if (validImage) return validImage;
  }
  
  return null;
};

// Helper function to get all valid images from an item
const getAllValidImages = (item: InventoryItem): string[] => {
  const validImages: string[] = [];
  
  if (item.image && isValidImage(item.image)) {
    validImages.push(item.image);
  }
  
  if (item.images && Array.isArray(item.images)) {
    item.images.forEach(img => {
      if (isValidImage(img) && !validImages.includes(img)) {
        validImages.push(img);
      }
    });
  }
  
  return validImages;
};

// Check if category is consumable or liquid
const isConsumableOrLiquid = (category: string) => {
  return category === "Consumables" || category === "Liquids";
};

// Check if item is low stock
const isLowStock = (item: InventoryItem) => {
  // If total quantity is 0, it's out of stock, not low stock
  if (item.quantity === 0) return false;
  
  // If available quantity is 0, it's out of stock, not low stock
  if (item.availableQuantity === 0) return false;
  
  // If available quantity equals total quantity (fully stocked), it's not low stock
  if (item.availableQuantity === item.quantity) return false;
  
  // Only show as low stock if available quantity is less than or equal to 5
  // AND there's actually a stock issue (available < total)
  return item.availableQuantity <= 5 && item.availableQuantity < item.quantity;
};

// Check if item is out of stock
const isOutOfStock = (item: InventoryItem) => {
  return item.availableQuantity === 0;
};

// Check if item is fully stocked
const isFullyStocked = (item: InventoryItem) => {
  return item.availableQuantity === item.quantity && item.quantity > 0;
};

// Check if item is expired
const isExpired = (expirationDate?: string) => {
  if (!expirationDate) return false;
  
  const date = parseISO(expirationDate);
  if (!isValid(date)) return false;
  
  return date < new Date();
};

// Check if item expires soon (within 30 days)
const expiresSoon = (expirationDate?: string) => {
  if (!expirationDate) return false;
  
  const date = parseISO(expirationDate);
  if (!isValid(date)) return false;
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return date <= thirtyDaysFromNow && date >= new Date();
};

// Generate QR code text with only the item ID
const generateQRCodeText = (item: InventoryItem): string => {
  return item.itemId;
};

// Get borrowing status badge
const getBorrowingStatusBadge = (item: InventoryItem) => {
  if (item.canBeBorrowed === false) {
    return <Badge className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-1">
      <Ban className="h-3 w-3" />
      Not Borrowable
    </Badge>;
  }
  
  const canBeBorrowed = (item.canBeBorrowed === true || item.canBeBorrowed === undefined) &&
    item.condition !== 'Under Maintenance' &&
    ['Excellent', 'Good', 'Fair'].includes(item.condition) &&
    item.maintenanceNeeds === 'No' &&
    item.status === 'Active' &&
    item.availableQuantity > 0;
  
  if (canBeBorrowed) {
    return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1">
      <Eye className="h-3 w-3" />
      Borrowable
    </Badge>;
  }
  
  return <Badge className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1">
    <EyeOff className="h-3 w-3" />
    Restricted
  </Badge>;
};

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
    <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-32 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-40 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell className="text-right"><div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto"></div></TableCell>
  </TableRow>
);

const SkeletonFilterCard = () => (
  <Card className="border-border bg-card">
    <CardHeader className="pb-3">
      <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
      <div className="h-4 w-48 bg-muted rounded animate-pulse mt-1"></div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 bg-muted rounded animate-pulse"></div>
          <div className="h-10 w-full bg-muted rounded animate-pulse pl-10"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
              <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

const SkeletonHeader = () => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div className="space-y-2">
      <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
      <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
    </div>
    <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
  </div>
);

// Custom Searchable Select Component
const SearchableSelect = ({ 
  options, 
  value, 
  onValueChange, 
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  disabled = false,
  emptyMessage = "No options found"
}: { 
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
}) => {
  const [search, setSearch] = useState("");
  
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase()) ||
    option.value.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="border-border focus:ring-ring hover:bg-muted focus:ring-blue-500 transition-colors">
        <SelectValue placeholder={placeholder}>
          {selectedOption ? selectedOption.label : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px] overflow-hidden">
        {/* Search Input */}
        <div className="sticky top-0 z-10 bg-background px-2 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        
        {/* Options */}
        <div className="overflow-y-auto max-h-[250px] py-1">
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <>
              <SelectItem value="none">
                <span className="text-muted-foreground">None</span>
              </SelectItem>
              {filteredOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

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

export default function InventoryPage() {
  const { user } = useAuthStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<User[]>([]);
  const [laboratories, setLaboratories] = useState<ILaboratory[]>([]);
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [roomOptions, setRoomOptions] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [labsLoading, setLabsLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [borrowingsLoading, setBorrowingsLoading] = useState(true);
  
  // Initialize newItem with proper default values to prevent controlled/uncontrolled issues
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: "",
    description: "",
    specifications: [],
    condition: "Good",
    category: "Equipment",
    cost: 0,
    yearPurchased: format(new Date(), "yyyy-MM-dd"),
    maintenanceNeeds: "No",
    calibration: "No",
    roomAssigned: "",
    calibrator: "",
    image: "",
    images: [],
    lastMaintenance: "",
    nextMaintenance: "",
    expirationDate: "",
    quantity: 1,
    availableQuantity: 1,
    status: "Active",
    canBeBorrowed: true,
  });
  
  const [newSpecification, setNewSpecification] = useState<Specification>({ name: "", value: "", unit: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Initialize editItem with proper default values
  const [editItem, setEditItem] = useState<Partial<InventoryItem>>({
    name: "",
    description: "",
    specifications: [],
    condition: "Good",
    category: "Equipment",
    cost: 0,
    yearPurchased: format(new Date(), "yyyy-MM-dd"),
    maintenanceNeeds: "No",
    calibration: "No",
    roomAssigned: "",
    calibrator: "",
    image: "",
    images: [],
    lastMaintenance: "",
    nextMaintenance: "",
    expirationDate: "",
    quantity: 1,
    availableQuantity: 1,
    status: "Active",
    canBeBorrowed: true,
  });
  
  const [editSpecification, setEditSpecification] = useState<Specification>({ name: "", value: "", unit: "" });
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [qrDialogOpen, setQRDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageItem, setSelectedImageItem] = useState<InventoryItem | null>(null);
  const [selectedQRItem, setSelectedQRItem] = useState<InventoryItem | null>(null);
  
  // Add new state for view details dialog
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedDetailsItem, setSelectedDetailsItem] = useState<InventoryItem | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [maintenanceFilter, setMaintenanceFilter] = useState("all");
  const [calibrationFilter, setCalibrationFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quantityFilter, setQuantityFilter] = useState("all");
  const [borrowingFilter, setBorrowingFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  // Disposal dialog state
  const [isDisposeDialogOpen, setIsDisposeDialogOpen] = useState(false);
  const [itemToDispose, setItemToDispose] = useState<InventoryItem | null>(null);
  const [disposalData, setDisposalData] = useState<DisposalData>({
    inventoryItem: "",
    itemId: "",
    equipmentName: "",
    category: "",
    reason: "",
    description: "",
    disposedBy: "",
    disposedById: "",
    originalCost: 0,
    salvageValue: 0,
    disposalMethod: "Recycle",
    status: "Pending",
    notes: "",
    disposalDate: format(new Date(), "yyyy-MM-dd"),
    disposalQuantity: 1,
  });

  // Image gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Maintenance data for sync status
  const [maintenance, setMaintenance] = useState<any[]>([]);

  // Analytics data
  const analyticsData = {
    totalItems: inventory.length || 0,
    needsRepair: inventory.filter(item => item.condition === "Needs Repair").length || 0,
    lowStock: inventory.filter(item => isLowStock(item)).length || 0,
    outOfStock: inventory.filter(item => isOutOfStock(item)).length || 0,
    needsMaintenance: inventory.filter(item => item.maintenanceNeeds === "Yes").length || 0,
    needsCalibration: inventory.filter(item => item.calibration === "Yes").length || 0,
    expiredItems: inventory.filter(item => isExpired(item.expirationDate)).length || 0,
    expiringSoon: inventory.filter(item => expiresSoon(item.expirationDate)).length || 0,
    borrowableItems: inventory.filter(item => item.canBeBorrowed !== false).length || 0,
    nonBorrowableItems: inventory.filter(item => item.canBeBorrowed === false).length || 0,
  };

  // Prepare faculty options for searchable dropdown
  const facultyOptions = facultyUsers.map(faculty => ({
    value: faculty.email,
    label: `${faculty.firstName} ${faculty.lastName} (${faculty.email})`
  }));

  // Fetch inventory from API with better error handling
  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/inventory", { 
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to fetch inventory: ${response.status} - ${errorData.error || errorData.details || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('Invalid data format:', data);
        throw new Error('Invalid data format received from server');
      }
      
      // Validate and transform the data
      const validatedData: InventoryItem[] = data.map((item: any) => ({
        _id: item._id || "",
        itemId: item.itemId || "",
        name: item.name || "",
        description: item.description || "",
        specifications: item.specifications || [],
        condition: item.condition || "Good",
        category: item.category || "Equipment",
        cost: item.cost || 0,
        yearPurchased: item.yearPurchased || format(new Date(), "yyyy-MM-dd"),
        maintenanceNeeds: item.maintenanceNeeds || "No",
        calibration: item.calibration || "No",
        roomAssigned: item.roomAssigned || "",
        calibrator: item.calibrator || "",
        image: item.image || "",
        images: item.images || [],
        maintenanceHistory: item.maintenanceHistory || [],
        calibrationHistory: item.calibrationHistory || [],
        lastMaintenance: item.lastMaintenance || "",
        nextMaintenance: item.nextMaintenance || "",
        expirationDate: item.expirationDate || "",
        quantity: item.quantity || 1,
        availableQuantity: item.availableQuantity || 1,
        status: item.status || "Active",
        qrCode: item.qrCode || "",
        calibrationQuantity: item.calibrationQuantity || 0,
        disposalQuantity: item.disposalQuantity || 0,
        maintenanceQuantity: item.maintenanceQuantity || 0,
        borrowedQuantity: item.borrowedQuantity || 0,
        canBeBorrowed: item.canBeBorrowed !== undefined ? item.canBeBorrowed : true,
        isDisposed: item.isDisposed || false,
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || ""
      }));
      
      setInventory(validatedData);
      setFilteredInventory(validatedData);
      
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      setError(`Failed to load inventory: ${error.message}`);
      setInventory([]);
      setFilteredInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch maintenance data for sync status
  const fetchMaintenanceData = async () => {
    try {
      const response = await fetch("/api/maintenance", { 
        cache: "no-store",
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMaintenance(data.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching maintenance data:", error);
    }
  };

  const fetchBorrowings = async () => {
    try {
      setBorrowingsLoading(true);
      const response = await fetch("/api/borrowings", { 
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch borrowings: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      setBorrowings(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error fetching borrowings:", error);
      setBorrowings([]);
    } finally {
      setBorrowingsLoading(false);
    }
  };

  const fetchFacultyUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch("/api/users", { 
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch users: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      const usersArray = Array.isArray(data) ? data : (data.users || []);
      const facultyUsers = usersArray.filter((u: any) => u.role === "faculty");
      const validatedUsers: User[] = facultyUsers.map((u: any) => ({
        _id: u._id || "",
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email || "",
        role: u.role || "faculty",
      }));
      setFacultyUsers(validatedUsers);
    } catch (error: any) {
      console.error("Error fetching faculty users:", error);
      setFacultyUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchLaboratories = async () => {
    try {
      setLabsLoading(true);
      const response = await fetch("/api/laboratories", { 
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch laboratories: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      setLaboratories(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error fetching laboratories:", error);
      setLaboratories([]);
    } finally {
      setLabsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      setRoomsLoading(true);
      const response = await fetch("/api/rooms", { 
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch rooms: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error fetching rooms:", error);
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  };

  // Function to update borrowing status
  const updateBorrowingStatus = async (itemId: string, canBeBorrowed: boolean) => {
    try {
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/inventory/${itemId}/borrowing-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ canBeBorrowed }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update borrowing status');
      }
      
      await fetchInventory();
      setSuccess(`Item ${canBeBorrowed ? 'enabled' : 'disabled'} for borrowing`);
    } catch (error: any) {
      console.error('Error updating borrowing status:', error);
      setError(error.message);
    }
  };

  // Load all data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchInventory(),
          fetchFacultyUsers(),
          fetchLaboratories(),
          fetchRooms(),
          fetchBorrowings(),
          fetchMaintenanceData()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, []);

  // Filter inventory when filters change
  useEffect(() => {
    let result = inventory;

    if (searchTerm) {
      result = result.filter(
        (item) =>
          item.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((item) => item.category === categoryFilter);
    }

    if (conditionFilter !== "all") {
      result = result.filter((item) => item.condition === conditionFilter);
    }

    if (maintenanceFilter !== "all") {
      result = result.filter((item) => item.maintenanceNeeds === maintenanceFilter);
    }

    if (calibrationFilter !== "all") {
      result = result.filter((item) => item.calibration === calibrationFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (quantityFilter !== "all") {
      switch (quantityFilter) {
        case "low":
          result = result.filter((item) => isLowStock(item));
          break;
        case "out":
          result = result.filter((item) => isOutOfStock(item));
          break;
        case "available":
          result = result.filter((item) => item.availableQuantity > 0);
          break;
      }
    }

    if (borrowingFilter !== "all") {
      switch (borrowingFilter) {
        case "borrowable":
          result = result.filter((item) => item.canBeBorrowed !== false);
          break;
        case "non-borrowable":
          result = result.filter((item) => item.canBeBorrowed === false);
          break;
      }
    }

    setFilteredInventory(result);
    setCurrentPage(1);
  }, [inventory, searchTerm, categoryFilter, conditionFilter, maintenanceFilter, calibrationFilter, statusFilter, quantityFilter, borrowingFilter]);

  useEffect(() => {
    if (laboratories.length > 0 && rooms.length > 0) {
      const options = rooms.map((room) => {
        const lab = laboratories.find((l) => l._id === room.laboratoryId);
        return {
          value: room.name,
          label: lab ? `${lab.name} - ${room.name}` : room.name,
        };
      });
      setRoomOptions(options);
    }
  }, [laboratories, rooms]);

  // Check if an item is currently borrowed
  const isItemBorrowed = (itemId: string) => {
    if (!Array.isArray(borrowings)) return false;
    
    return borrowings.some(
      (b) =>
        b.equipmentId?._id === itemId &&
        (b.status === "approved" || b.status === "released" || b.status === "pending") &&
        (!b.actualReturnDate || new Date(b.actualReturnDate) > new Date())
    );
  };

  // Get active maintenance count for a calibrator
  const getActiveMaintenanceCount = (email: string, itemId: string) => {
    if (!Array.isArray(maintenance)) return 0;
    
    return maintenance.filter((m: any) => 
      m.assignedToEmail === email && 
      m.status !== 'Completed' &&
      m.equipmentId?._id === itemId
    ).length;
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredInventory.slice(startIndex, endIndex);

  // Date parsing and formatting
  const parseDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    
    const isoDate = parseISO(dateString);
    if (isValid(isoDate)) return isoDate;
    
    const [year, month, day] = dateString.split('-').map(Number);
    if (year && month && day) {
      const date = new Date(year, month - 1, day);
      if (isValid(date)) return date;
    }
    
    return undefined;
  };

  const safeFormat = (dateString: string): string => {
    if (!dateString) return "Not Set";
    
    const date = parseDate(dateString);
    return date && isValid(date) ? format(date, "MMM dd, yyyy") : "Invalid Date";
  };

  const formatForInput = (dateString: string): string => {
    if (!dateString) return "";
    
    const date = parseDate(dateString);
    return date && isValid(date) ? format(date, "yyyy-MM-dd") : "";
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case "Good":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Good</Badge>;
      case "Needs Repair":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Needs Repair</Badge>;
      case "Out of Stock":
        return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Out of Stock</Badge>;
      case "Under Maintenance":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Under Maintenance</Badge>;
      default:
        return <Badge variant="outline">{condition}</Badge>;
    }
  };

  const getMaintenanceBadge = (needs: string) => {
    switch (needs) {
      case "Yes":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Yes</Badge>;
      case "Scheduled":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Scheduled</Badge>;
      default:
        return <Badge variant="outline">No</Badge>;
    }
  };

  const getCalibrationBadge = (needs: string) => {
    switch (needs) {
      case "Yes":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Yes</Badge>;
      case "Due Soon":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Due Soon</Badge>;
      default:
        return <Badge variant="outline">No</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Active</Badge>;
      case "Inactive":
        return <Badge variant="outline">Inactive</Badge>;
      case "Disposed":
        return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Disposed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get quantity badge with proper logic
  const getQuantityBadge = (item: InventoryItem) => {
    if (item.availableQuantity === 0) {
      return <Badge className="bg-red-500 hover:bg-red-600 text-white">Out of Stock</Badge>;
    } else if (isLowStock(item)) {
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Low Stock</Badge>;
    } else if (isFullyStocked(item)) {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">In Stock</Badge>;
    } else {
      // Partially available but not low stock
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Available</Badge>;
    }
  };

  // Get expiration badge
  const getExpirationBadge = (item: InventoryItem) => {
    if (!item.expirationDate) {
      return <Badge variant="outline">Not Set</Badge>;
    }
    
    if (isExpired(item.expirationDate)) {
      return <Badge className="bg-red-500 hover:bg-red-600 text-white">Expired</Badge>;
    } else if (expiresSoon(item.expirationDate)) {
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Expires Soon</Badge>;
    } else {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Valid</Badge>;
    }
  };

  const getAvailabilityBadge = (itemId: string) => {
    const isBorrowed = isItemBorrowed(itemId);
    return isBorrowed ? (
      <Badge className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-1">
        <span>Borrowed</span>
      </Badge>
    ) : (
      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1">
        <span>Available</span>
      </Badge>
    );
  };

  // Get faculty name for display
  const getFacultyName = (email: string, itemId: string) => {
    const faculty = facultyUsers.find((f) => f.email === email);
    if (faculty) {
      const activeMaintenanceCount = getActiveMaintenanceCount(email, itemId);
      const syncStatus = activeMaintenanceCount > 0 ? ` (${activeMaintenanceCount} active)` : '';
      return `${faculty.firstName} ${faculty.lastName}${syncStatus}`;
    }
    return "Not Assigned";
  };

  // Safe input change handlers with proper defaults
  const handleInputChange = (name: string, value: string | number | boolean) => {
    setNewItem((prev) => ({
      ...prev,
      [name]: name === "cost" || name === "quantity" || name === "availableQuantity"
        ? parseFloat(value as string) || 0 
        : value === "none" 
        ? "" 
        : typeof value === 'boolean' 
        ? value 
        : value || "",
    }));
  };

  const handleEditInputChange = (name: string, value: string | number | boolean) => {
    setEditItem((prev) => ({
      ...prev,
      [name]: name === "cost" || name === "quantity" || name === "availableQuantity"
        ? parseFloat(value as string) || 0 
        : value === "none" 
        ? "" 
        : typeof value === 'boolean' 
        ? value 
        : value || "",
    }));

    // SYNC: When calibrator changes, show synchronization message
    if (name === "calibrator") {
      if (value !== "none" && value !== "") {
        const selectedFaculty = facultyUsers.find(fac => fac.email === value);
        if (selectedFaculty) {
          setSuccess(`Calibrator set to ${selectedFaculty.firstName} ${selectedFaculty.lastName}. This will sync with maintenance assignments.`);
        }
      } else {
        setSuccess("Calibrator removed. Maintenance assignments will be updated.");
      }
    }
  };

  const handleCategoryChange = (value: string) => {
    setNewItem((prev) => ({
      ...prev,
      category: value,
      // Clear maintenance fields for consumables and liquids
      ...(isConsumableOrLiquid(value) && {
        lastMaintenance: "",
        nextMaintenance: "",
        maintenanceNeeds: "No",
        calibration: "No",
      }),
      // Clear expiration date for non-consumables
      ...(!isConsumableOrLiquid(value) && {
        expirationDate: "",
      }),
    }));
  };

  const handleEditCategoryChange = (value: string) => {
    setEditItem((prev) => ({
      ...prev,
      category: value,
      // Clear maintenance fields for consumables and liquids
      ...(isConsumableOrLiquid(value) && {
        lastMaintenance: "",
        nextMaintenance: "",
        maintenanceNeeds: "No",
        calibration: "No",
      }),
      // Clear expiration date for non-consumables
      ...(!isConsumableOrLiquid(value) && {
        expirationDate: "",
      }),
    }));
  };

  const handleQuantityChange = (value: number) => {
    setNewItem((prev) => ({
      ...prev,
      quantity: value,
      availableQuantity: Math.min(prev.availableQuantity || 0, value),
    }));
  };

  const handleEditQuantityChange = (value: number) => {
    setEditItem((prev) => ({
      ...prev,
      quantity: value,
      availableQuantity: Math.min(prev.availableQuantity || 0, value),
    }));
  };

  const addSpecification = () => {
    if (newSpecification.name && newSpecification.value) {
      setNewItem(prev => ({
        ...prev,
        specifications: [...(prev.specifications || []), { ...newSpecification }]
      }));
      setNewSpecification({ name: "", value: "", unit: "" });
    }
  };

  const removeSpecification = (index: number) => {
    setNewItem(prev => ({
      ...prev,
      specifications: prev.specifications?.filter((_, i) => i !== index) || []
    }));
  };

  const addEditSpecification = () => {
    if (editSpecification.name && editSpecification.value) {
      setEditItem(prev => ({
        ...prev,
        specifications: [...(prev.specifications || []), { ...editSpecification }]
      }));
      setEditSpecification({ name: "", value: "", unit: "" });
    }
  };

  const removeEditSpecification = (index: number) => {
    setEditItem(prev => ({
      ...prev,
      specifications: prev.specifications?.filter((_, i) => i !== index) || []
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setNewItem(prev => ({ ...prev, image: "uploading..." }));

    try {
      const result = await uploadImageToSupabase(file);
      
      if (result.success && result.imageUrl) {
        setNewItem((prev) => ({
          ...prev,
          image: result.imageUrl ?? "",
          images: result.imageUrl ? [...(prev.images || []), result.imageUrl] : (prev.images || []),
        }));
      } else {
        setError(result.error || "Failed to upload image");
        setNewItem(prev => ({ ...prev, image: "" }));
      }
    } catch (error: any) {
      setError("Failed to upload image: " + error.message);
      setNewItem(prev => ({ ...prev, image: "" }));
    }
  };

  const handleEditImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setEditItem(prev => ({ ...prev, image: "uploading..." }));

    try {
      const result = await uploadImageToSupabase(file);
      
      if (result.success && result.imageUrl) {
        setEditItem((prev) => {
          const imageUrl = result.imageUrl;
          return {
            ...prev,
            image: imageUrl ?? "",
            images: imageUrl ? [...(prev.images || []), imageUrl] : (prev.images || []),
          };
        });
      } else {
        setError(result.error || "Failed to upload image");
        setEditItem(prev => ({ ...prev, image: editItem.image || "" }));
      }
    } catch (error: any) {
      setError("Failed to upload image: " + error.message);
      setEditItem(prev => ({ ...prev, image: editItem.image || "" }));
    }
  };

  const addItem = async () => {
    setError(null);
    setSuccess(null);

    if (!newItem.name?.trim()) {
      setError("Item name is required");
      return;
    }
    if (newItem.cost === undefined || newItem.cost < 0) {
      setError("Cost must be a non-negative number");
      return;
    }
    if (newItem.quantity === undefined || newItem.quantity < 1) {
      setError("Quantity must be at least 1");
      return;
    }
    if (newItem.availableQuantity === undefined || newItem.availableQuantity < 0) {
      setError("Available quantity cannot be negative");
      return;
    }
    if (newItem.availableQuantity > (newItem.quantity || 0)) {
      setError("Available quantity cannot exceed total quantity");
      return;
    }

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to add item: ${response.status}`);
      }

      await fetchInventory();
      // Reset newItem with proper defaults
      setNewItem({
        name: "",
        description: "",
        specifications: [],
        condition: "Good",
        category: "Equipment",
        cost: 0,
        yearPurchased: format(new Date(), "yyyy-MM-dd"),
        maintenanceNeeds: "No",
        calibration: "No",
        roomAssigned: "",
        calibrator: "",
        image: "",
        images: [],
        lastMaintenance: "",
        nextMaintenance: "",
        expirationDate: "",
        quantity: 1,
        availableQuantity: 1,
        status: "Active",
        canBeBorrowed: true,
      });
      setNewSpecification({ name: "", value: "", unit: "" });
      setSuccess("Item added successfully!");
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding item:", error);
      setError(error.message || "Failed to add item");
    }
  };

  const editItemFunc = async () => {
    setError(null);
    setSuccess(null);

    if (!editItem.name?.trim()) {
      setError("Item name is required");
      return;
    }
    if (editItem.cost === undefined || editItem.cost < 0) {
      setError("Cost must be a non-negative number");
      return;
    }
    if (editItem.quantity === undefined || editItem.quantity < 1) {
      setError("Quantity must be at least 1");
      return;
    }
    if (editItem.availableQuantity === undefined || editItem.availableQuantity < 0) {
      setError("Available quantity cannot be negative");
      return;
    }
    if (editItem.availableQuantity > (editItem.quantity || 0)) {
      setError("Available quantity cannot exceed total quantity");
      return;
    }

    try {
      const itemId = editItem._id as string;
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editItem),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to update item: ${response.status}`);
      }

      await fetchInventory();
      await fetchMaintenanceData(); // Refresh maintenance data for sync status
      // Reset editItem with proper defaults
      setEditItem({
        name: "",
        description: "",
        specifications: [],
        condition: "Good",
        category: "Equipment",
        cost: 0,
        yearPurchased: format(new Date(), "yyyy-MM-dd"),
        maintenanceNeeds: "No",
        calibration: "No",
        roomAssigned: "",
        calibrator: "",
        image: "",
        images: [],
        lastMaintenance: "",
        nextMaintenance: "",
        expirationDate: "",
        quantity: 1,
        availableQuantity: 1,
        status: "Active",
        canBeBorrowed: true,
      });
      setEditSpecification({ name: "", value: "", unit: "" });
      setSuccess("Item updated successfully! Maintenance assignments synchronized.");
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating item:", error);
      setError(error.message || "Failed to update item");
    }
  };

  // Delete item function
  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete item: ${response.status}`);
      }

      await fetchInventory();
      setSuccess("Item deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting item:", error);
      setError(error.message || "Failed to delete item");
    }
  };

  // Open edit dialog
  const openEditDialog = (item: InventoryItem) => {
    setEditItem({
      ...item,
      yearPurchased: formatForInput(item.yearPurchased),
      lastMaintenance: formatForInput(item.lastMaintenance || ""),
      nextMaintenance: formatForInput(item.nextMaintenance || ""),
      expirationDate: formatForInput(item.expirationDate || ""),
      canBeBorrowed: item.canBeBorrowed !== undefined ? item.canBeBorrowed : true,
    });
    setEditSpecification({ name: "", value: "", unit: "" });
    setIsEditDialogOpen(true);
  };

  // View details function
  const viewDetails = (item: InventoryItem) => {
    setSelectedDetailsItem(item);
    setViewDetailsDialogOpen(true);
  };

  // Dispose item function
  const disposeItem = async () => {
    if (!itemToDispose) return;

    setError(null);
    setSuccess(null);

    if (!isConsumableOrLiquid(itemToDispose.category)) {
      setError("Disposal is only allowed for Consumables and Liquids categories");
      return;
    }

    if (!disposalData.reason?.trim()) {
      setError("Reason for disposal is required");
      return;
    }
    if (disposalData.disposalQuantity < 1) {
      setError("Disposal quantity must be at least 1");
      return;
    }
    if (disposalData.disposalQuantity > (itemToDispose.quantity || 0)) {
      setError("Disposal quantity cannot exceed total quantity");
      return;
    }
    if (disposalData.disposalQuantity > (itemToDispose.availableQuantity || 0)) {
      setError("Disposal quantity cannot exceed available quantity");
      return;
    }

    try {
      console.log('🗑️ Starting disposal process for item:', {
        itemId: itemToDispose._id,
        itemName: itemToDispose.name,
        currentQuantity: itemToDispose.quantity,
        currentAvailable: itemToDispose.availableQuantity,
        disposalQuantity: disposalData.disposalQuantity
      });

      const disposalPayload: any = {
        inventoryItemId: disposalData.inventoryItem,
        reason: disposalData.reason,
        description: disposalData.description,
        disposedBy: disposalData.disposedBy,
        disposalMethod: disposalData.disposalMethod,
        notes: disposalData.notes,
        disposalDate: disposalData.disposalDate,
        disposalQuantity: disposalData.disposalQuantity,
      };

      if (user?._id && user._id.length === 24) {
        disposalPayload.disposedById = user._id;
      }

      const response = await fetch("/api/disposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disposalPayload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to dispose item: ${response.status}`);
      }

      console.log('✅ Disposal API response:', responseData);

      await fetchInventory();

      setSuccess(`Successfully disposed ${disposalData.disposalQuantity} unit(s) of ${itemToDispose.name}! The item has been moved to disposal records.`);
      setIsDisposeDialogOpen(false);
      setItemToDispose(null);
      
      setDisposalData({
        inventoryItem: "",
        itemId: "",
        equipmentName: "",
        category: "",
        reason: "",
        description: "",
        disposedBy: "",
        disposedById: "",
        originalCost: 0,
        salvageValue: 0,
        disposalMethod: "Recycle",
        status: "Pending",
        notes: "",
        disposalDate: format(new Date(), "yyyy-MM-dd"),
        disposalQuantity: 1,
      });

    } catch (error: any) {
      console.error("❌ Error disposing item:", error);
      setError(error.message || "Failed to dispose item");
    }
  };

  // Open dispose dialog
  const openDisposeDialog = (item: InventoryItem) => {
    if (!isConsumableOrLiquid(item.category)) {
      setError("Disposal is only allowed for Consumables and Liquids categories");
      return;
    }

    setItemToDispose(item);
    setDisposalData({
      inventoryItem: item._id,
      itemId: item.itemId,
      equipmentName: item.name,
      category: item.category,
      reason: "",
      description: `Disposal of ${item.name} (${item.itemId})`,
      disposedBy: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "System Admin",
      disposedById: user?._id || "",
      originalCost: item.cost,
      salvageValue: 0,
      disposalMethod: "Recycle",
      status: "Pending",
      notes: "",
      disposalDate: format(new Date(), "yyyy-MM-dd"),
      disposalQuantity: 1,
    });
    setIsDisposeDialogOpen(true);
  };

  const viewHistory = (item: InventoryItem) => {
    setSelectedItem(item);
    setHistoryDialogOpen(true);
  };

  const viewQRCode = (item: InventoryItem) => {
    setSelectedQRItem(item);
    setQRDialogOpen(true);
  };

  const viewImage = (item: InventoryItem) => {
    setSelectedImageItem(item);
    setCurrentImageIndex(0);
    setImageDialogOpen(true);
  };

  const nextImage = () => {
    if (!selectedImageItem) return;
    const allImages = getAllValidImages(selectedImageItem);
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    if (!selectedImageItem) return;
    const allImages = getAllValidImages(selectedImageItem);
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  // Print QR Code Function
  const printQRCode = () => {
    if (!selectedQRItem) return;
    
    const qrCanvas = document.getElementById("qrCode") as HTMLCanvasElement;
    if (!qrCanvas) {
      setError("QR code not found");
      return;
    }
    
    const qrDataUrl = qrCanvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Failed to open print window. Please check your popup blocker.");
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Code for ${selectedQRItem.itemId}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', 'Roboto', sans-serif;
            color: #333;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          
          .print-container {
            text-align: center;
            width: 100%;
            max-width: 400px;
          }
          
          .header {
            margin-bottom: 30px;
          }
          
          .header h1 {
            font-size: 22px;
            color: #111827;
            margin-bottom: 8px;
            font-weight: 600;
          }
          
          .item-id {
            display: inline-block;
            background: #f3f4f6;
            padding: 8px 20px;
            border-radius: 20px;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.5px;
            border: 1px solid #d1d5db;
            margin: 10px 0;
          }
          
          .qr-container {
            display: inline-block;
            padding: 25px;
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            margin: 20px 0;
          }
          
          .qr-image {
            width: 220px;
            height: 220px;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            width: 100%;
          }
          
          .system-info {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 10px;
          }
          
          .scan-instruction {
            font-size: 13px;
            color: #6b7280;
            margin: 15px 0;
            background: #f9fafb;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          
          @media print {
            body {
              padding: 10px;
            }
            
            .print-container {
              padding: 0;
            }
            
            .no-print {
              display: none;
            }
            
            .qr-image {
              width: 200px;
              height: 200px;
            }
          }
          
          @page {
            size: auto;
            margin: 15mm;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="header">
            <h1>INVENTORY ITEM QR CODE</h1>
            <div class="item-id">${selectedQRItem.itemId}</div>
          </div>
          
          <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR Code for ${selectedQRItem.itemId}" class="qr-image" />
          </div>
        
          
          <div class="footer">
            <p class="no-print">© ${new Date().getFullYear()} Laboratory Inventory System</p>
            <p class="no-print" style="margin-top: 5px; font-style: italic;">
              This document will auto-print. If printing fails, use browser print (Ctrl+P).
            </p>
          </div>
        </div>
        
        <script>
          // Auto-print and close
          window.onload = function() {
            window.focus();
            setTimeout(function() {
              window.print();
            }, 250);
            
            // Close window after print
            window.onafterprint = function() {
              setTimeout(function() {
                window.close();
              }, 500);
            };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle disposal data changes
  const handleDisposalDataChange = (field: string, value: any) => {
    setDisposalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset form when dialog closes
  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setNewItem({
        name: "",
        description: "",
        specifications: [],
        condition: "Good",
        category: "Equipment",
        cost: 0,
        yearPurchased: format(new Date(), "yyyy-MM-dd"),
        maintenanceNeeds: "No",
        calibration: "No",
        roomAssigned: "",
        calibrator: "",
        image: "",
        images: [],
        lastMaintenance: "",
        nextMaintenance: "",
        expirationDate: "",
        quantity: 1,
        availableQuantity: 1,
        status: "Active",
        canBeBorrowed: true,
      });
      setNewSpecification({ name: "", value: "", unit: "" });
      setError(null);
      setSuccess(null);
    }
  };

  // Reset edit form when dialog closes
  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditItem({
        name: "",
        description: "",
        specifications: [],
        condition: "Good",
        category: "Equipment",
        cost: 0,
        yearPurchased: format(new Date(), "yyyy-MM-dd"),
        maintenanceNeeds: "No",
        calibration: "No",
        roomAssigned: "",
        calibrator: "",
        image: "",
        images: [],
        lastMaintenance: "",
        nextMaintenance: "",
        expirationDate: "",
        quantity: 1,
        availableQuantity: 1,
        status: "Active",
        canBeBorrowed: true,
      });
      setEditSpecification({ name: "", value: "", unit: "" });
      setError(null);
      setSuccess(null);
    }
  };

  if (loading || usersLoading || labsLoading || roomsLoading || borrowingsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex-1 space-y-6 p-6">
          {/* Header Skeleton */}
          <SkeletonHeader />

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          {/* Filter Card Skeleton */}
          <SkeletonFilterCard />

          {/* Inventory Table Skeleton */}
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="h-6 w-40 bg-muted rounded animate-pulse"></div>
              <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {[...Array(16)].map((_, i) => (
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
            <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground mt-2">Complete overview and management of laboratory inventory</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] bg-background border border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add New Item</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Fill in the details for the new inventory item.
                </DialogDescription>
              </DialogHeader>
              {error && <p className="text-destructive text-sm mb-4">{error}</p>}
              {success && <p className="text-green-600 text-sm mb-4">{success}</p>}
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-foreground">
                      Item Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={newItem.name || ""}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter item name"
                      className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost" className="text-sm font-medium text-foreground">
                      Cost (₱) *
                    </Label>
                    <Input
                      id="cost"
                      name="cost"
                      type="number"
                      value={newItem.cost || 0}
                      onChange={(e) => handleInputChange("cost", e.target.value)}
                      placeholder="Enter cost"
                      step="0.01"
                      min="0"
                      className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-sm font-medium text-foreground">
                      Quantity *
                    </Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      value={newItem.quantity || 1}
                      onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 1)}
                      placeholder="Enter quantity"
                      min="1"
                      className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availableQuantity" className="text-sm font-medium text-foreground">
                      Available Quantity *
                    </Label>
                    <Input
                      id="availableQuantity"
                      name="availableQuantity"
                      type="number"
                      value={newItem.availableQuantity || 1}
                      onChange={(e) => handleInputChange("availableQuantity", e.target.value)}
                      placeholder="Enter available quantity"
                      min="0"
                      max={newItem.quantity}
                      className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearPurchased" className="text-sm font-medium text-foreground">
                      Purchase Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal border-border hover:bg-muted transition-colors",
                            !newItem.yearPurchased && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newItem.yearPurchased ? safeFormat(newItem.yearPurchased as string) : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          fromYear={2000}
                          toYear={new Date().getFullYear() + 1}
                          selected={newItem.yearPurchased ? parseDate(newItem.yearPurchased as string) : undefined}
                          onSelect={(date) => {
                            if (!date) {
                              handleInputChange("yearPurchased", "");
                              return;
                            }
                            handleInputChange("yearPurchased", format(date, "yyyy-MM-dd"));
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition" className="text-sm font-medium text-foreground">
                      Condition
                    </Label>
                    <Select value={newItem.condition || "Good"} onValueChange={(value) => handleInputChange("condition", value)}>
                      <SelectTrigger className="border-border focus:ring-ring hover:bg-muted focus:ring-blue-500 transition-colors">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                        <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                        <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceNeeds" className="text-sm font-medium text-foreground">
                      Maintenance Needed
                    </Label>
                    <Select 
                      value={newItem.maintenanceNeeds || "No"} 
                      onValueChange={(value) => handleInputChange("maintenanceNeeds", value)}
                      disabled={isConsumableOrLiquid(newItem.category || "")}
                    >
                      <SelectTrigger className="border-border focus:ring-ring hover:bg-muted focus:ring-blue-500 transition-colors">
                        <SelectValue placeholder="Select maintenance needs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                    {isConsumableOrLiquid(newItem.category || "") && (
                      <p className="text-xs text-muted-foreground">Not applicable for {newItem.category}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calibration" className="text-sm font-medium text-foreground">
                      Calibration Needed
                    </Label>
                    <Select 
                      value={newItem.calibration || "No"} 
                      onValueChange={(value) => handleInputChange("calibration", value)}
                      disabled={isConsumableOrLiquid(newItem.category || "")}
                    >
                      <SelectTrigger className="border-border focus:ring-ring hover:bg-muted focus:ring-blue-500 transition-colors">
                        <SelectValue placeholder="Select calibration needs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="Due Soon">Due Soon</SelectItem>
                      </SelectContent>
                    </Select>
                    {isConsumableOrLiquid(newItem.category || "") && (
                      <p className="text-xs text-muted-foreground">Not applicable for {newItem.category}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium text-foreground">
                      Category
                    </Label>
                    <Select value={newItem.category || "Equipment"} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="border-border focus:ring-ring hover:bg-muted focus:ring-blue-500 transition-colors">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Consumables">Consumables</SelectItem>
                        <SelectItem value="Materials">Materials</SelectItem>
                        <SelectItem value="Instruments">Instruments</SelectItem>
                        <SelectItem value="Furniture">Furniture</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                        <SelectItem value="Liquids">Liquids</SelectItem>
                        <SelectItem value="Safety Gear">Safety Gear</SelectItem>
                        <SelectItem value="Lab Supplies">Lab Supplies</SelectItem>
                        <SelectItem value="Tools">Tools</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roomAssigned" className="text-sm font-medium text-foreground">
                      Room Assigned
                    </Label>
                    <SearchableSelect
                      options={roomOptions}
                      value={newItem.roomAssigned || "none"}
                      onValueChange={(value) => handleInputChange("roomAssigned", value)}
                      placeholder="Select a room..."
                      searchPlaceholder="Search rooms..."
                      emptyMessage="No rooms found"
                    />
                  </div>
                  
                  {/* "Can Be Borrowed" Switch */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="canBeBorrowed" className="text-sm font-medium text-foreground">
                        Can Be Borrowed
                      </Label>
                      <Switch
                        id="canBeBorrowed"
                        checked={newItem.canBeBorrowed !== false}
                        onCheckedChange={(checked) => {
                          handleInputChange("canBeBorrowed", checked);
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {newItem.canBeBorrowed !== false ? "Item can be borrowed by users" : "Item cannot be borrowed"}
                    </p>
                  </div>
                  
                  {/* Conditional Fields based on Category */}
                  {!isConsumableOrLiquid(newItem.category || "") ? (
                    <>
                      {/* Last Maintenance Date - Only for non-consumables */}
                      <div className="space-y-2">
                        <Label htmlFor="lastMaintenance" className="text-sm font-medium text-foreground">
                          Last Maintenance Date
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal border-border hover:bg-muted transition-colors",
                                !newItem.lastMaintenance && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newItem.lastMaintenance ? safeFormat(newItem.lastMaintenance as string) : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newItem.lastMaintenance ? parseDate(newItem.lastMaintenance as string) : undefined}
                              onSelect={(date) => {
                                if (!date) {
                                  handleInputChange("lastMaintenance", "");
                                  return;
                                }
                                handleInputChange("lastMaintenance", format(date, "yyyy-MM-dd"));
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Next Maintenance Date - Only for non-consumables */}
                      <div className="space-y-2">
                        <Label htmlFor="nextMaintenance" className="text-sm font-medium text-foreground">
                          Next Maintenance Date
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal border-border hover:bg-muted transition-colors",
                                !newItem.nextMaintenance && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newItem.nextMaintenance ? safeFormat(newItem.nextMaintenance as string) : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newItem.nextMaintenance ? parseDate(newItem.nextMaintenance as string) : undefined}
                              onSelect={(date) => {
                                if (!date) {
                                  handleInputChange("nextMaintenance", "");
                                  return;
                                }
                                handleInputChange("nextMaintenance", format(date, "yyyy-MM-dd"));
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  ) : (
                    /* Expiration Date - Only for consumables and liquids */
                    <div className="space-y-2">
                      <Label htmlFor="expirationDate" className="text-sm font-medium text-foreground">
                        Expiration Date *
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal border-border hover:bg-muted transition-colors",
                              !newItem.expirationDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newItem.expirationDate ? safeFormat(newItem.expirationDate as string) : <span>Pick expiration date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newItem.expirationDate ? parseDate(newItem.expirationDate as string) : undefined}
                            onSelect={(date) => {
                              if (!date) {
                                handleInputChange("expirationDate", "");
                                return;
                              }
                                handleInputChange("expirationDate", format(date, "yyyy-MM-dd"));
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-foreground">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={newItem.description || ""}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Enter item description"
                    className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500 min-h-[80px] transition-colors"
                    rows={3}
                  />
                </div>

                {/* Specifications */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">Specifications</Label>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <Input
                        placeholder="Specification name"
                        value={newSpecification.name}
                        onChange={(e) => setNewSpecification(prev => ({ ...prev, name: e.target.value }))}
                        className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        placeholder="Value"
                        value={newSpecification.value}
                        onChange={(e) => setNewSpecification(prev => ({ ...prev, value: e.target.value }))}
                        className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        placeholder="Unit (optional)"
                        value={newSpecification.unit}
                        onChange={(e) => setNewSpecification(prev => ({ ...prev, unit: e.target.value }))}
                        className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        onClick={addSpecification}
                        disabled={!newSpecification.name || !newSpecification.value}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Specifications List */}
                  {newItem.specifications && newItem.specifications.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {newItem.specifications.map((spec, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border border-border rounded-md">
                          <div className="flex-1 grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                              <span className="text-sm font-medium text-foreground">{spec.name}</span>
                            </div>
                            <div className="col-span-4">
                              <span className="text-sm text-foreground">{spec.value}</span>
                            </div>
                            <div className="col-span-3">
                              <span className="text-sm text-muted-foreground">{spec.unit || "-"}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSpecification(index)}
                            className="text-destructive hover:text-destructive hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="image" className="text-sm font-medium text-foreground">
                      Item Image (JPEG/PNG, max 5MB)
                    </Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                    />
                    {newItem.image === "uploading..." ? (
                      <div className="mt-2 h-20 w-20 flex items-center justify-center bg-gray-100 rounded-md">
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </div>
                    ) : newItem.image && isValidImage(newItem.image) ? (
                      <img
                        src={newItem.image}
                        alt="Preview"
                        className="mt-2 h-20 w-20 object-cover rounded-md border hover:border-ring transition-colors"
                      />
                    ) : newItem.image ? (
                      <p className="text-destructive text-sm">Invalid image format</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calibrator" className="text-sm font-medium text-foreground">
                      Assigned Calibrator (Faculty Only)
                    </Label>
                    <SearchableSelect
                      options={facultyOptions}
                      value={newItem.calibrator || "none"}
                      onValueChange={(value) => handleInputChange("calibrator", value)}
                      placeholder="Select a faculty member..."
                      searchPlaceholder="Search faculty..."
                      disabled={isConsumableOrLiquid(newItem.category || "")}
                      emptyMessage="No faculty members found"
                    />
                    {isConsumableOrLiquid(newItem.category || "") && (
                      <p className="text-xs text-muted-foreground">Not applicable for {newItem.category}</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={addItem}
                    disabled={
                      !newItem.name?.trim() || 
                      newItem.cost === undefined || 
                      newItem.cost < 0 || 
                      newItem.image === "uploading..." ||
                      (isConsumableOrLiquid(newItem.category || "") && !newItem.expirationDate) ||
                      newItem.quantity === undefined ||
                      newItem.quantity < 1 ||
                      newItem.availableQuantity === undefined ||
                      newItem.availableQuantity < 0 ||
                      (newItem.availableQuantity || 0) > (newItem.quantity || 0)
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error and Success Messages */}
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

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:max-w-md bg-muted/50 p-1 rounded-lg">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="management"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all"
            >
              Management
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-foreground">Total Items</CardTitle>
                  <Package className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{analyticsData.totalItems}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">
                      All inventory items
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-foreground">Needs Repair</CardTitle>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{analyticsData.needsRepair}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <p className="text-xs text-muted-foreground">Require maintenance</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-foreground">Low Stock</CardTitle>
                  <Package className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{analyticsData.lowStock}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <p className="text-xs text-muted-foreground">
                      {analyticsData.outOfStock} out of stock
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-foreground">Borrowing Status</CardTitle>
                  <Eye className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{analyticsData.borrowableItems}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-purple-500" />
                    <p className="text-xs text-muted-foreground">
                      {analyticsData.nonBorrowableItems} not borrowable
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-500" />
                    Recent Items
                  </CardTitle>
                  <CardDescription>Recently added inventory items</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inventory.slice(0, 5).map((item) => (
                    <div key={item._id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
                          {item.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">ID: {item.itemId}</p>
                        </div>
                      </div>
                      {getConditionBadge(item.condition)}
                    </div>
                  ))}
                  {inventory.length === 0 && (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No items found</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Items Needing Attention
                  </CardTitle>
                  <CardDescription>Items that require maintenance or are low stock</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inventory
                    .filter(item => item.condition === "Needs Repair" || item.maintenanceNeeds === "Yes" || isLowStock(item) || isExpired(item.expirationDate))
                    .slice(0, 5)
                    .map((item) => (
                      <div key={item._id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.itemId}</p>
                        </div>
                        <div className="flex gap-2">
                          {item.condition === "Needs Repair" && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">Repair</Badge>
                          )}
                          {item.maintenanceNeeds === "Yes" && (
                            <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">Maintenance</Badge>
                          )}
                          {isLowStock(item) && (
                            <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">Low Stock</Badge>
                          )}
                          {isExpired(item.expirationDate) && (
                            <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">Expired</Badge>
                          )}
                          {expiresSoon(item.expirationDate) && !isExpired(item.expirationDate) && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">Expiring Soon</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  {inventory.filter(item => item.condition === "Needs Repair" || item.maintenanceNeeds === "Yes" || isLowStock(item) || isExpired(item.expirationDate)).length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">All items are in good condition</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Management Tab */}
          <TabsContent value="management" className="space-y-6">
            {/* Filters */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-blue-600" />
                  Filters & Search
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Quickly find inventory items using search and filters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search by item ID, name, or description..."
                      className="pl-10 pr-4 py-2 border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500 h-11"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Filter Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="category-filter" className="text-sm font-medium text-foreground flex items-center gap-1">
                        <span>Category</span>
                      </Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger 
                          id="category-filter"
                          className="w-full border-border hover:bg-muted focus:ring-blue-500 transition-colors h-10"
                        >
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Consumables">Consumables</SelectItem>
                          <SelectItem value="Materials">Materials</SelectItem>
                          <SelectItem value="Instruments">Instruments</SelectItem>
                          <SelectItem value="Furniture">Furniture</SelectItem>
                          <SelectItem value="Electronics">Electronics</SelectItem>
                          <SelectItem value="Liquids">Liquids</SelectItem>
                          <SelectItem value="Safety Gear">Safety Gear</SelectItem>
                          <SelectItem value="Lab Supplies">Lab Supplies</SelectItem>
                          <SelectItem value="Tools">Tools</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="condition-filter" className="text-sm font-medium text-foreground flex items-center gap-1">
                        <span>Condition</span>
                      </Label>
                      <Select value={conditionFilter} onValueChange={setConditionFilter}>
                        <SelectTrigger 
                          id="condition-filter"
                          className="w-full border-border hover:bg-muted focus:ring-blue-500 transition-colors h-10"
                        >
                          <SelectValue placeholder="All Conditions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Conditions</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                          <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                          <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status-filter" className="text-sm font-medium text-foreground flex items-center gap-1">
                        <span>Status</span>
                      </Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger 
                          id="status-filter"
                          className="w-full border-border hover:bg-muted focus:ring-blue-500 transition-colors h-10"
                        >
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Disposed">Disposed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity-filter" className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>Stock</span>
                      </Label>
                      <Select value={quantityFilter} onValueChange={setQuantityFilter}>
                        <SelectTrigger 
                          id="quantity-filter"
                          className="w-full border-border hover:bg-muted focus:ring-blue-500 transition-colors h-10"
                        >
                          <SelectValue placeholder="Stock Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stock</SelectItem>
                          <SelectItem value="available">In Stock</SelectItem>
                          <SelectItem value="low">Low Stock</SelectItem>
                          <SelectItem value="out">Out of Stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maintenance-filter" className="text-sm font-medium text-foreground flex items-center gap-1">
                        <span>Maintenance</span>
                      </Label>
                      <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                        <SelectTrigger 
                          id="maintenance-filter"
                          className="w-full border-border hover:bg-muted focus:ring-blue-500 transition-colors h-10"
                        >
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Yes">Needed</SelectItem>
                          <SelectItem value="No">Not Needed</SelectItem>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="calibration-filter" className="text-sm font-medium text-foreground flex items-center gap-1">
                        <span>Calibration</span>
                      </Label>
                      <Select value={calibrationFilter} onValueChange={setCalibrationFilter}>
                        <SelectTrigger 
                          id="calibration-filter"
                          className="w-full border-border hover:bg-muted focus:ring-blue-500 transition-colors h-10"
                        >
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Yes">Needed</SelectItem>
                          <SelectItem value="No">Not Needed</SelectItem>
                          <SelectItem value="Due Soon">Due Soon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="borrowing-filter" className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>Borrowing</span>
                      </Label>
                      <Select value={borrowingFilter} onValueChange={setBorrowingFilter}>
                        <SelectTrigger 
                          id="borrowing-filter"
                          className="w-full border-border hover:bg-muted focus:ring-blue-500 transition-colors h-10"
                        >
                          <SelectValue placeholder="Borrowing Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="borrowable">Borrowable</SelectItem>
                          <SelectItem value="non-borrowable">Not Borrowable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Active Filters & Clear Button */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">Active filters:</span>
                      {searchTerm && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Search: "{searchTerm}"
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setSearchTerm("")}
                          />
                        </Badge>
                      )}
                      {categoryFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Category: {categoryFilter}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setCategoryFilter("all")}
                          />
                        </Badge>
                      )}
                      {conditionFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Condition: {conditionFilter}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setConditionFilter("all")}
                          />
                        </Badge>
                      )}
                      {statusFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Status: {statusFilter}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setStatusFilter("all")}
                          />
                        </Badge>
                      )}
                      {quantityFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Stock: {quantityFilter === "low" ? "Low Stock" : quantityFilter === "out" ? "Out of Stock" : "In Stock"}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setQuantityFilter("all")}
                          />
                        </Badge>
                      )}
                      {maintenanceFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Maintenance: {maintenanceFilter}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setMaintenanceFilter("all")}
                          />
                        </Badge>
                      )}
                      {calibrationFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Calibration: {calibrationFilter}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setCalibrationFilter("all")}
                          />
                        </Badge>
                      )}
                      {borrowingFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Borrowing: {borrowingFilter === "borrowable" ? "Borrowable" : "Not Borrowable"}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setBorrowingFilter("all")}
                          />
                        </Badge>
                      )}
                      {(searchTerm || categoryFilter !== "all" || conditionFilter !== "all" || statusFilter !== "all" || quantityFilter !== "all" || maintenanceFilter !== "all" || calibrationFilter !== "all" || borrowingFilter !== "all") ? null : (
                        <span className="text-sm text-muted-foreground">No active filters</span>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setCategoryFilter("all");
                        setConditionFilter("all");
                        setStatusFilter("all");
                        setQuantityFilter("all");
                        setMaintenanceFilter("all");
                        setCalibrationFilter("all");
                        setBorrowingFilter("all");
                      }}
                      className="flex items-center gap-2 h-9"
                      disabled={!searchTerm && categoryFilter === "all" && conditionFilter === "all" && statusFilter === "all" && quantityFilter === "all" && maintenanceFilter === "all" && calibrationFilter === "all" && borrowingFilter === "all"}
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

           {/* Inventory Table */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-foreground">Inventory Items</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {filteredInventory.length} item(s) found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold">ID</TableHead>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold">Cost</TableHead>
                        {/* Purchase Date removed */}
                        <TableHead className="font-semibold">Condition</TableHead>
                        <TableHead className="font-semibold">Maintenance</TableHead>
                        <TableHead className="font-semibold">Calibration</TableHead>
                        <TableHead className="font-semibold">Quantity</TableHead>
                        <TableHead className="font-semibold">Available</TableHead>
                        {/* Stock removed */}
                        {/* Expiration removed */}
                        {/* Status removed */}
                        {/* Category removed */}
                        {/* Borrowing removed */}
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p>No items found matching your criteria</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentItems.map((item: InventoryItem, index) => {
                          const isConsumable = isConsumableOrLiquid(item.category);
                          const hasImages = getAllValidImages(item).length > 0;
                          const activeMaintenanceCount = getActiveMaintenanceCount(item.calibrator, item._id);
                          
                          return (
                            <TableRow
                              key={item._id}
                              className="hover:bg-muted/50 transition-colors"
                            >
                              <TableCell className="font-mono text-sm">{item.itemId}</TableCell>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="max-w-xs truncate" title={item.description}>
                                {item.description || "No description"}
                              </TableCell>
                              <TableCell>₱{item.cost.toFixed(2)}</TableCell>
                              {/* Purchase Date cell removed */}
                              <TableCell>{getConditionBadge(item.condition)}</TableCell>
                              <TableCell>
                                {isConsumable ? (
                                  <Badge variant="outline">N/A</Badge>
                                ) : (
                                  getMaintenanceBadge(item.maintenanceNeeds)
                                )}
                              </TableCell>
                              <TableCell>
                                {isConsumable ? (
                                  <Badge variant="outline">N/A</Badge>
                                ) : (
                                  getCalibrationBadge(item.calibration)
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {item.quantity}
                              </TableCell>
                              <TableCell>
                                {item.availableQuantity}
                              </TableCell>
                              {/* Stock cell removed */}
                              {/* Expiration cell removed */}
                              {/* Status cell removed */}
                              {/* Category cell removed */}
                              {/* Borrowing cell removed */}
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    {/* Add View Details as first option */}
                                    <DropdownMenuItem onClick={() => viewDetails(item)}>
                                      <Info className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEditDialog(item)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Item
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => viewHistory(item)}>
                                      <History className="h-4 w-4 mr-2" />
                                      View History
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => viewQRCode(item)}>
                                      <QrCode className="h-4 w-4 mr-2" />
                                      View QR Code
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => viewImage(item)}
                                      disabled={!hasImages}
                                    >
                                      <Image className="h-4 w-4 mr-2" />
                                      View Image{getAllValidImages(item).length > 1 ? 's' : ''}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem
                                      onClick={() => updateBorrowingStatus(item._id, !(item.canBeBorrowed !== false))}
                                    >
                                      {item.canBeBorrowed !== false ? (
                                        <>
                                          <EyeOff className="h-4 w-4 mr-2" />
                                          Disable Borrowing
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="h-4 w-4 mr-2" />
                                          Enable Borrowing
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    
                                    {isConsumableOrLiquid(item.category) && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => openDisposeDialog(item)}
                                          className="text-amber-600"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Dispose Item
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={filteredInventory.length}
                  itemsPerPage={itemsPerPage}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Details Dialog */}
        <Dialog open={viewDetailsDialogOpen} onOpenChange={setViewDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] bg-background border border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Item Details</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Complete information for {selectedDetailsItem?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedDetailsItem && (
              <div className="space-y-6 py-2">
                {/* Item Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedDetailsItem.name}</h2>
                    <p className="text-sm text-muted-foreground">ID: {selectedDetailsItem.itemId}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(selectedDetailsItem.status)}
                    {getQuantityBadge(selectedDetailsItem)}
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Basic Information */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Basic Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Category:</span>
                          <span className="text-sm font-medium text-foreground">{selectedDetailsItem.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Condition:</span>
                          <span>{getConditionBadge(selectedDetailsItem.condition)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Purchase Date:</span>
                          <span className="text-sm font-medium text-foreground">{safeFormat(selectedDetailsItem.yearPurchased)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Cost:</span>
                          <span className="text-sm font-medium text-foreground">₱{selectedDetailsItem.cost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Information */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Quantity Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Quantity:</span>
                          <span className="text-sm font-medium text-foreground">{selectedDetailsItem.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Available Quantity:</span>
                          <span className="text-sm font-medium text-foreground">{selectedDetailsItem.availableQuantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Borrowed Quantity:</span>
                          <span className="text-sm font-medium text-foreground">{selectedDetailsItem.borrowedQuantity || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">In Maintenance:</span>
                          <span className="text-sm font-medium text-foreground">{selectedDetailsItem.maintenanceQuantity || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Room Assignment */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Room Assigned:</span>
                          <span className="text-sm font-medium text-foreground">{selectedDetailsItem.roomAssigned || "Not Assigned"}</span>
                        </div>
                        {selectedDetailsItem.roomAssigned && (
                          <div className="p-3 bg-muted/50 rounded-md">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Location:</span> {selectedDetailsItem.roomAssigned}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {roomOptions.find(room => room.value === selectedDetailsItem.roomAssigned)?.label || 
                               "Room details not available"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Maintenance & Calibration */}
                    {!isConsumableOrLiquid(selectedDetailsItem.category) && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Maintenance & Calibration
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Maintenance Needed:</span>
                            {getMaintenanceBadge(selectedDetailsItem.maintenanceNeeds)}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Calibration Needed:</span>
                            {getCalibrationBadge(selectedDetailsItem.calibration)}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Last Maintenance:</span>
                            <span className="text-sm font-medium text-foreground">
                              {selectedDetailsItem.lastMaintenance ? safeFormat(selectedDetailsItem.lastMaintenance) : "Not Set"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Next Maintenance:</span>
                            <span className="text-sm font-medium text-foreground">
                              {selectedDetailsItem.nextMaintenance ? safeFormat(selectedDetailsItem.nextMaintenance) : "Not Set"}
                            </span>
                          </div>
                          {selectedDetailsItem.calibrator && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Calibrator:</span>
                              <span className="text-sm font-medium text-foreground">
                                {getFacultyName(selectedDetailsItem.calibrator, selectedDetailsItem._id)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expiration Information */}
                    {isConsumableOrLiquid(selectedDetailsItem.category) && selectedDetailsItem.expirationDate && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          Expiration Information
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Expiration Status:</span>
                            {getExpirationBadge(selectedDetailsItem)}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Expiration Date:</span>
                            <span className="text-sm font-medium text-foreground">
                              {safeFormat(selectedDetailsItem.expirationDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Borrowing Status */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Borrowing Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Borrowing Status:</span>
                          {getBorrowingStatusBadge(selectedDetailsItem)}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Can Be Borrowed:</span>
                          <span className="text-sm font-medium text-foreground">
                            {selectedDetailsItem.canBeBorrowed !== false ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Current Availability:</span>
                          {getAvailabilityBadge(selectedDetailsItem._id)}
                        </div>
                      </div>
                    </div>

                    {/* Specifications */}
                    {selectedDetailsItem.specifications && selectedDetailsItem.specifications.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Specifications
                        </h3>
                        <div className="space-y-1">
                          {selectedDetailsItem.specifications.map((spec, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{spec.name}:</span>
                              <span className="font-medium text-foreground">
                                {spec.value} {spec.unit ? spec.unit : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedDetailsItem.description && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <h3 className="font-semibold text-foreground">Description</h3>
                    <p className="text-sm text-foreground">{selectedDetailsItem.description}</p>
                  </div>
                )}

                {/* Created/Updated Info */}
                <div className="pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    {selectedDetailsItem.createdAt && (
                      <div>
                        <span className="font-medium">Created:</span> {safeFormat(selectedDetailsItem.createdAt)}
                      </div>
                    )}
                    {selectedDetailsItem.updatedAt && (
                      <div>
                        <span className="font-medium">Last Updated:</span> {safeFormat(selectedDetailsItem.updatedAt)}
                      </div>
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
          <DialogContent className="sm:max-w-[800px] bg-background border border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Edit Item</DialogTitle>
              <div className="space-y-3">
                <DialogDescription className="text-muted-foreground">
                  Update the details for this inventory item. Changing the calibrator will synchronize with maintenance assignments.
                </DialogDescription>
              </div>
            </DialogHeader>
            {error && <p className="text-destructive text-sm mb-4">{error}</p>}
            {success && <p className="text-green-600 text-sm mb-4">{success}</p>}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-medium text-foreground">
                    Item Name *
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={editItem.name || ""}
                    onChange={(e) => handleEditInputChange("name", e.target.value)}
                    placeholder="Enter item name"
                    className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cost" className="text-sm font-medium text-foreground">
                    Cost (₱) *
                  </Label>
                  <Input
                    id="edit-cost"
                    name="cost"
                    type="number"
                    value={editItem.cost || 0}
                    onChange={(e) => handleEditInputChange("cost", e.target.value)}
                    placeholder="Enter cost"
                    step="0.01"
                    min="0"
                    className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity" className="text-sm font-medium text-foreground">
                    Quantity *
                  </Label>
                  <Input
                    id="edit-quantity"
                    name="quantity"
                    type="number"
                    value={editItem.quantity || 1}
                    onChange={(e) => handleEditQuantityChange(parseFloat(e.target.value) || 1)}
                    placeholder="Enter quantity"
                    min="1"
                    className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-availableQuantity" className="text-sm font-medium text-foreground">
                    Available Quantity *
                  </Label>
                  <Input
                    id="edit-availableQuantity"
                    name="availableQuantity"
                    type="number"
                    value={editItem.availableQuantity || 1}
                    onChange={(e) => handleEditInputChange("availableQuantity", e.target.value)}
                    placeholder="Enter available quantity"
                    min="0"
                    max={editItem.quantity}
                    className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-yearPurchased" className="text-sm font-medium text-foreground">
                    Purchase Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal border-border hover:bg-muted transition-colors",
                          !editItem.yearPurchased && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editItem.yearPurchased ? safeFormat(editItem.yearPurchased as string) : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 1}
                        selected={editItem.yearPurchased ? parseDate(editItem.yearPurchased as string) : undefined}
                        onSelect={(date) => {
                          if (!date) {
                            handleEditInputChange("yearPurchased", "");
                            return;
                          }
                          handleEditInputChange("yearPurchased", format(date, "yyyy-MM-dd"));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-condition" className="text-sm font-medium text-foreground">
                    Condition
                  </Label>
                  <Select value={editItem.condition || "Good"} onValueChange={(value) => handleEditInputChange("condition", value)}>
                    <SelectTrigger className="border-border focus:ring-ring hover:bg-muted focus:ring-blue-500 transition-colors">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                      <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                      <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-maintenanceNeeds" className="text-sm font-medium text-foreground">
                    Maintenance Needed
                  </Label>
                  <Select 
                    value={editItem.maintenanceNeeds || "No"} 
                    onValueChange={(value) => handleEditInputChange("maintenanceNeeds", value)}
                    disabled={isConsumableOrLiquid(editItem.category || "")}
                  >
                    <SelectTrigger className="border-border focus:ring-ring hover:bg-muted focus:ring-blue-500 transition-colors">
                      <SelectValue placeholder="Select maintenance needs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                  {isConsumableOrLiquid(editItem.category || "") && (
                    <p className="text-xs text-muted-foreground">Not applicable for {editItem.category}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-calibration" className="text-sm font-medium text-foreground">
                    Calibration Needed
                  </Label>
                  <Select 
                    value={editItem.calibration || "No"} 
                    onValueChange={(value) => handleEditInputChange("calibration", value)}
                    disabled={isConsumableOrLiquid(editItem.category || "")}
                  >
                    <SelectTrigger className="border-border focus:ring-ring hover:bg-muted focus:ring-blue-500 transition-colors">
                      <SelectValue placeholder="Select calibration needs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="Due Soon">Due Soon</SelectItem>
                    </SelectContent>
                  </Select>
                  {isConsumableOrLiquid(editItem.category || "") && (
                    <p className="text-xs text-muted-foreground">Not applicable for {editItem.category}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category" className="text-sm font-medium text-foreground">
                    Category
                  </Label>
                  <Select value={editItem.category || "Equipment"} onValueChange={handleEditCategoryChange}>
                    <SelectTrigger className="border-border focus:ring-ring hover:bg-muted focus:ring-blue-500 transition-colors">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Consumables">Consumables</SelectItem>
                      <SelectItem value="Materials">Materials</SelectItem>
                      <SelectItem value="Instruments">Instruments</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Liquids">Liquids</SelectItem>
                      <SelectItem value="Safety Gear">Safety Gear</SelectItem>
                      <SelectItem value="Lab Supplies">Lab Supplies</SelectItem>
                      <SelectItem value="Tools">Tools</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-roomAssigned" className="text-sm font-medium text-foreground">
                    Room Assigned
                  </Label>
                  <SearchableSelect
                    options={roomOptions}
                    value={editItem.roomAssigned || "none"}
                    onValueChange={(value) => handleEditInputChange("roomAssigned", value)}
                    placeholder="Select a room..."
                    searchPlaceholder="Search rooms..."
                    emptyMessage="No rooms found"
                  />
                </div>
                
                {/* "Can Be Borrowed" Switch for Edit Dialog */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-canBeBorrowed" className="text-sm font-medium text-foreground">
                      Can Be Borrowed
                    </Label>
                    <Switch
                      id="edit-canBeBorrowed"
                      checked={editItem.canBeBorrowed !== false}
                      onCheckedChange={(checked) => handleEditInputChange("canBeBorrowed", checked)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editItem.canBeBorrowed !== false ? "Item can be borrowed by users" : "Item cannot be borrowed"}
                  </p>
                </div>
                
                {/* Conditional Fields based on Category */}
                {!isConsumableOrLiquid(editItem.category || "") ? (
                  <>
                    {/* Last Maintenance Date - Only for non-consumables */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-lastMaintenance" className="text-sm font-medium text-foreground">
                        Last Maintenance Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal border-border hover:bg-muted transition-colors",
                              !editItem.lastMaintenance && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editItem.lastMaintenance ? safeFormat(editItem.lastMaintenance as string) : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={editItem.lastMaintenance ? parseDate(editItem.lastMaintenance as string) : undefined}
                            onSelect={(date) => {
                              if (!date) {
                                handleEditInputChange("lastMaintenance", "");
                                return;
                              }
                              handleEditInputChange("lastMaintenance", format(date, "yyyy-MM-dd"));
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Next Maintenance Date - Only for non-consumables */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-nextMaintenance" className="text-sm font-medium text-foreground">
                        Next Maintenance Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal border-border hover:bg-muted transition-colors",
                              !editItem.nextMaintenance && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editItem.nextMaintenance ? safeFormat(editItem.nextMaintenance as string) : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={editItem.nextMaintenance ? parseDate(editItem.nextMaintenance as string) : undefined}
                            onSelect={(date) => {
                              if (!date) {
                                handleEditInputChange("nextMaintenance", "");
                                return;
                              }
                              handleEditInputChange("nextMaintenance", format(date, "yyyy-MM-dd"));
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                ) : (
                  /* Expiration Date - Only for consumables and liquids */
                  <div className="space-y-2">
                    <Label htmlFor="edit-expirationDate" className="text-sm font-medium text-foreground">
                      Expiration Date *
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal border-border hover:bg-muted transition-colors",
                            !editItem.expirationDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editItem.expirationDate ? safeFormat(editItem.expirationDate as string) : <span>Pick expiration date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={editItem.expirationDate ? parseDate(editItem.expirationDate as string) : undefined}
                          onSelect={(date) => {
                            if (!date) {
                              handleEditInputChange("expirationDate", "");
                              return;
                            }
                            handleEditInputChange("expirationDate", format(date, "yyyy-MM-dd"));
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm font-medium text-foreground">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={editItem.description || ""}
                  onChange={(e) => handleEditInputChange("description", e.target.value)}
                  placeholder="Enter item description"
                  className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500 min-h-[80px] transition-colors"
                  rows={3}
                />
              </div>

              {/* Specifications */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Specifications</Label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <Input
                      placeholder="Specification name"
                      value={editSpecification.name}
                      onChange={(e) => setEditSpecification(prev => ({ ...prev, name: e.target.value }))}
                      className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      placeholder="Value"
                      value={editSpecification.value}
                      onChange={(e) => setEditSpecification(prev => ({ ...prev, value: e.target.value }))}
                      className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      placeholder="Unit (optional)"
                      value={editSpecification.unit}
                      onChange={(e) => setEditSpecification(prev => ({ ...prev, unit: e.target.value }))}
                      className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      onClick={addEditSpecification}
                      disabled={!editSpecification.name || !editSpecification.value}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Specifications List */}
                {editItem.specifications && editItem.specifications.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {editItem.specifications.map((spec, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border border-border rounded-md">
                        <div className="flex-1 grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <span className="text-sm font-medium text-foreground">{spec.name}</span>
                          </div>
                          <div className="col-span-4">
                            <span className="text-sm text-foreground">{spec.value}</span>
                          </div>
                          <div className="col-span-3">
                            <span className="text-sm text-muted-foreground">{spec.unit || "-"}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEditSpecification(index)}
                          className="text-destructive hover:text-destructive hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-image" className="text-sm font-medium text-foreground">
                    Item Image (JPEG/PNG, max 5MB)
                  </Label>
                  <Input
                    id="edit-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleEditImageUpload}
                    className="border-border focus-visible:ring-ring hover:border-ring focus-visible:ring-blue-500"
                  />
                  {editItem.image === "uploading..." ? (
                    <div className="mt-2 h-20 w-20 flex items-center justify-center bg-gray-100 rounded-md">
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                  ) : editItem.image && isValidImage(editItem.image) ? (
                    <img
                      src={editItem.image}
                      alt="Preview"
                      className="mt-2 h-20 w-20 object-cover rounded-md border hover:border-ring transition-colors"
                    />
                  ) : editItem.image ? (
                    <p className="text-destructive text-sm">Invalid image format</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-calibrator" className="text-sm font-medium text-foreground">
                    Assigned Calibrator (Faculty Only)
                  </Label>
                  <SearchableSelect
                    options={facultyOptions}
                    value={editItem.calibrator || "none"}
                    onValueChange={(value) => handleEditInputChange("calibrator", value)}
                    placeholder="Select a faculty member..."
                    searchPlaceholder="Search faculty..."
                    disabled={isConsumableOrLiquid(editItem.category || "")}
                    emptyMessage="No faculty members found"
                  />
                  {isConsumableOrLiquid(editItem.category || "") && (
                    <p className="text-xs text-muted-foreground">Not applicable for {editItem.category}</p>
                  )}
                  {editItem.calibrator && editItem.calibrator !== "none" && (
                    <p className="text-xs text-blue-600">
                      Currently assigned to: {getFacultyName(editItem.calibrator, editItem._id || "")}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={editItemFunc}
                  disabled={
                    !editItem.name?.trim() || 
                    editItem.cost === undefined || 
                    editItem.cost < 0 || 
                    editItem.image === "uploading..." ||
                    (isConsumableOrLiquid(editItem.category || "") && !editItem.expirationDate) ||
                    editItem.quantity === undefined ||
                    editItem.quantity < 1 ||
                    editItem.availableQuantity === undefined ||
                    editItem.availableQuantity < 0 ||
                    (editItem.availableQuantity || 0) > (editItem.quantity || 0)
                  }
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Update Item
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dispose Item Dialog */}
        <Dialog open={isDisposeDialogOpen} onOpenChange={setIsDisposeDialogOpen}>
          <DialogContent className="max-w-2xl bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Dispose Item</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Dispose {itemToDispose?.name} (ID: {itemToDispose?.itemId})
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-destructive text-sm mb-4">{error}</p>}
            {success && <p className="text-green-600 text-sm mb-4">{success}</p>}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="disposal-quantity" className="text-sm font-medium text-foreground">
                    Disposal Quantity *
                  </Label>
                  <Input
                    id="disposal-quantity"
                    type="number"
                    value={disposalData.disposalQuantity}
                    onChange={(e) => handleDisposalDataChange('disposalQuantity', parseInt(e.target.value) || 1)}
                    min="1"
                    max={itemToDispose?.quantity || 1}
                    className="border-border focus-visible:ring-ring"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {itemToDispose?.availableQuantity || 0} / Total: {itemToDispose?.quantity || 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disposal-method" className="text-sm font-medium text-foreground">
                    Disposal Method *
                  </Label>
                  <Select 
                    value={disposalData.disposalMethod} 
                    onValueChange={(value) => handleDisposalDataChange('disposalMethod', value)}
                  >
                    <SelectTrigger className="border-border focus:ring-ring">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Recycle">Recycle</SelectItem>
                      <SelectItem value="Donate">Donate</SelectItem>
                      <SelectItem value="Scrap">Scrap</SelectItem>
                      <SelectItem value="Hazardous Waste">Hazardous Waste</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="original-cost" className="text-sm font-medium text-foreground">
                    Original Cost (₱)
                  </Label>
                  <Input
                    id="original-cost"
                    type="number"
                    value={disposalData.originalCost}
                    onChange={(e) => handleDisposalDataChange('originalCost', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min="0"
                    className="border-border focus-visible:ring-ring"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salvage-value" className="text-sm font-medium text-foreground">
                    Salvage Value (₱)
                  </Label>
                  <Input
                    id="salvage-value"
                    type="number"
                    value={disposalData.salvageValue}
                    onChange={(e) => handleDisposalDataChange('salvageValue', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min="0"
                    className="border-border focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="disposal-reason" className="text-sm font-medium text-foreground">
                    Reason for Disposal *
                  </Label>
                  <Input
                    id="disposal-reason"
                    value={disposalData.reason}
                    onChange={(e) => handleDisposalDataChange('reason', e.target.value)}
                    placeholder="Enter reason for disposal"
                    className="border-border focus-visible:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="disposal-date" className="text-sm font-medium text-foreground">
                    Disposal Date *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal border-border",
                          !disposalData.disposalDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {disposalData.disposalDate ? safeFormat(disposalData.disposalDate) : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={disposalData.disposalDate ? parseDate(disposalData.disposalDate) : undefined}
                        onSelect={(date) => {
                          if (!date) return;
                          handleDisposalDataChange('disposalDate', format(date, "yyyy-MM-dd"));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="disposal-notes" className="text-sm font-medium text-foreground">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="disposal-notes"
                    value={disposalData.notes || ""}
                    onChange={(e) => handleDisposalDataChange('notes', e.target.value)}
                    placeholder="Additional notes about the disposal"
                    className="border-border focus-visible:ring-ring min-h-[80px]"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={disposeItem}
                disabled={
                  !disposalData.reason?.trim() ||
                  disposalData.disposalQuantity < 1 ||
                  disposalData.disposalQuantity > (itemToDispose?.quantity || 0) ||
                  disposalData.disposalQuantity > (itemToDispose?.availableQuantity || 0)
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Dispose Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Item History</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Maintenance and calibration history for {selectedItem?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-6">
                {/* Maintenance History */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Maintenance History
                  </h3>
                  {selectedItem.maintenanceHistory && selectedItem.maintenanceHistory.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedItem.maintenanceHistory.map((history, index) => (
                        <div key={index} className="p-3 border border-border rounded-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-foreground">{history.action}</p>
                              <p className="text-sm text-muted-foreground">By: {history.performedBy}</p>
                              {history.notes && (
                                <p className="text-sm text-foreground mt-1">{history.notes}</p>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {safeFormat(history.date)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No maintenance history recorded</p>
                  )}
                </div>

                {/* Calibration History */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Calibration History
                  </h3>
                  {selectedItem.calibrationHistory && selectedItem.calibrationHistory.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedItem.calibrationHistory.map((history, index) => (
                        <div key={index} className="p-3 border border-border rounded-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-foreground">Calibration by {history.calibrator}</p>
                              <p className="text-sm text-muted-foreground">Performed by: {history.performedBy}</p>
                              {history.notes && (
                                <p className="text-sm text-foreground mt-1">{history.notes}</p>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {safeFormat(history.date)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No calibration history recorded</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQRDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">QR Code for {selectedQRItem?.name}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Scan this QR code to quickly access item information
              </DialogDescription>
            </DialogHeader>
            {selectedQRItem && (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 border border-border rounded-lg bg-white">
                  <QRCodeCanvas
                    id="qrCode"
                    value={generateQRCodeText(selectedQRItem)}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium text-foreground">{selectedQRItem.name}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedQRItem.itemId}</p>
                  <p className="text-sm text-muted-foreground">Category: {selectedQRItem.category}</p>
                </div>
                <Button onClick={printQRCode} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Printer className="mr-2 h-4 w-4" />
                  Print QR Code
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Dialog */}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Images for {selectedImageItem?.name}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedImageItem && getAllValidImages(selectedImageItem).length > 1 
                  ? `Viewing image ${currentImageIndex + 1} of ${getAllValidImages(selectedImageItem).length}` 
                  : "Item image"}
              </DialogDescription>
            </DialogHeader>
            {selectedImageItem && (
              <div className="space-y-4">
                <div className="relative aspect-square bg-muted rounded-lg flex items-center justify-center">
                  {getAllValidImages(selectedImageItem).length > 0 ? (
                    <>
                      <img
                        src={getAllValidImages(selectedImageItem)[currentImageIndex]}
                        alt={selectedImageItem.name}
                        className="w-full h-full object-contain rounded-lg"
                      />
                      {getAllValidImages(selectedImageItem).length > 1 && (
                        <>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                            onClick={prevImage}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                            onClick={nextImage}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No image available</p>
                    </div>
                  )}
                </div>
                
                {getAllValidImages(selectedImageItem).length > 1 && (
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {getAllValidImages(selectedImageItem).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 border-2 rounded-md overflow-hidden ${
                          index === currentImageIndex ? 'border-emerald-500' : 'border-border'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}