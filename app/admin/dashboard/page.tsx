"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores";
import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Search, 
  MoreVertical, 
  UserCheck, 
  UserX, 
  Users, 
  Activity, 
  Clock, 
  Package, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  Wrench,
  Trash2,
  Download
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  schoolYear: string;
  section: string;
  role: string;
  status: string;
  lastLogin?: string | null;
  loginCount: number;
  schoolID: string;
  createdAt: string;
}

interface InventoryItem {
  _id: string;
  itemId: string;
  name: string;
  condition: string;
  category: string;
  cost: number;
  yearPurchased: string;
  maintenanceNeeds: string;
  calibration: string;
  roomAssigned: string;
  calibrator: string;
  quantity: number;
  availableQuantity: number;
  status: string;
  borrowedQuantity: number;
  maintenanceQuantity: number;
  disposalQuantity: number;
  isDisposed: boolean;
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
  borrowerType: string;
  purpose: string;
  status: "pending" | "approved" | "rejected" | "released" | "returned" | "overdue";
  requestedDate: string;
  intendedBorrowDate: string;
  intendedReturnDate: string;
  actualReturnDate?: string;
  quantity: number;
}

interface Maintenance {
  _id: string;
  equipmentId: {
    _id: string;
    name: string;
    itemId: string;
  };
  equipmentName: string;
  type: string;
  status: string;
  priority: string;
  scheduledDate: string;
  dueDate: string;
  completedDate?: string;
  assignedToName: string;
  totalCost: number;
  quantity: number;
  maintainedQuantity: number;
}

interface Disposal {
  _id: string;
  inventoryItem: {
    _id: string;
    name: string;
    itemId: string;
  };
  equipmentName: string;
  reason: string;
  disposalMethod: string;
  status: string;
  disposalDate: string;
  disposalQuantity: number;
  originalCost: number;
  salvageValue: number;
}

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  pendingRequests: number;
  totalInventory: number;
  needsRepair: number;
  activeBorrowings: number;
  totalMaintenance: number;
  activeMaintenance: number;
  completedMaintenance: number;
  totalDisposals: number;
  pendingReturns: number;
  totalValue: number;
  lowStockItems: number;
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

// Status badge components
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
    case "faculty":
      return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Faculty</Badge>;
    case "student":
      return <Badge variant="outline" className="border-gray-300 text-gray-700">Student</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
};

const getConditionBadge = (condition: string) => {
  switch (condition) {
    case "Good":
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Good</Badge>;
    case "Needs Repair":
      return <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 text-white">Needs Repair</Badge>;
    case "Out of Stock":
      return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Out of Stock</Badge>;
    case "Under Maintenance":
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Under Maintenance</Badge>;
    default:
      return <Badge variant="outline">{condition}</Badge>;
  }
};

const getBorrowingStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Approved</Badge>;
    case "pending":
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Pending</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">Rejected</Badge>;
    case "returned":
      return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Returned</Badge>;
    case "released":
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Released</Badge>;
    case "overdue":
      return <Badge className="bg-red-500 hover:bg-red-600 text-white">Overdue</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getMaintenanceStatusBadge = (status: string) => {
  switch (status) {
    case "Completed":
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Completed</Badge>;
    case "In Progress":
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">In Progress</Badge>;
    case "Scheduled":
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Scheduled</Badge>;
    case "Overdue":
      return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">Overdue</Badge>;
    case "Cancelled":
      return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Custom Pie Chart Label Component
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name
}: any) => {
  if (!percent || percent < 0.05) return null; // Don't show label for small slices
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Mock data for demonstration
const mockUsers: User[] = [
  {
    _id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@university.edu",
    schoolID: "20230001",
    schoolYear: "3rd Year",
    section: "BS Fisheries",
    role: "student",
    status: "active",
    loginCount: 15,
    createdAt: "2023-09-01T00:00:00.000Z"
  },
  {
    _id: "2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@university.edu",
    schoolID: "20230002",
    schoolYear: "2nd Year",
    section: "BS Marine Biology",
    role: "student",
    status: "active",
    loginCount: 8,
    createdAt: "2023-09-02T00:00:00.000Z"
  },
  {
    _id: "3",
    firstName: "Dr. Michael",
    lastName: "Johnson",
    email: "michael.johnson@university.edu",
    schoolID: "FAC001",
    schoolYear: "",
    section: "",
    role: "faculty",
    status: "active",
    loginCount: 45,
    createdAt: "2023-08-15T00:00:00.000Z"
  }
];

const mockInventory: InventoryItem[] = [
  {
    _id: "1",
    itemId: "EQP-001",
    name: "Microscope",
    condition: "Good",
    category: "Equipment",
    cost: 25000,
    yearPurchased: "2022",
    maintenanceNeeds: "No",
    calibration: "Yes",
    roomAssigned: "Lab A",
    calibrator: "Tech Corp",
    quantity: 5,
    availableQuantity: 3,
    status: "available",
    borrowedQuantity: 2,
    maintenanceQuantity: 0,
    disposalQuantity: 0,
    isDisposed: false
  },
  {
    _id: "2",
    itemId: "EQP-002",
    name: "Centrifuge",
    condition: "Needs Repair",
    category: "Equipment",
    cost: 15000,
    yearPurchased: "2021",
    maintenanceNeeds: "Yes",
    calibration: "No",
    roomAssigned: "Lab B",
    calibrator: "",
    quantity: 2,
    availableQuantity: 1,
    status: "available",
    borrowedQuantity: 0,
    maintenanceQuantity: 1,
    disposalQuantity: 0,
    isDisposed: false
  },
  {
    _id: "3",
    itemId: "CON-001",
    name: "Test Tubes",
    condition: "Good",
    category: "Consumables",
    cost: 500,
    yearPurchased: "2023",
    maintenanceNeeds: "No",
    calibration: "No",
    roomAssigned: "Storage Room",
    calibrator: "",
    quantity: 100,
    availableQuantity: 85,
    status: "available",
    borrowedQuantity: 15,
    maintenanceQuantity: 0,
    disposalQuantity: 0,
    isDisposed: false
  },
  {
    _id: "4",
    itemId: "EQP-003",
    name: "Bunsen Burner",
    condition: "Good",
    category: "Equipment",
    cost: 3000,
    yearPurchased: "2023",
    maintenanceNeeds: "No",
    calibration: "No",
    roomAssigned: "Lab A",
    calibrator: "",
    quantity: 10,
    availableQuantity: 8,
    status: "available",
    borrowedQuantity: 2,
    maintenanceQuantity: 0,
    disposalQuantity: 0,
    isDisposed: false
  },
  {
    _id: "5",
    itemId: "CHEM-001",
    name: "Chemical Solution",
    condition: "Good",
    category: "Chemicals",
    cost: 800,
    yearPurchased: "2024",
    maintenanceNeeds: "No",
    calibration: "No",
    roomAssigned: "Storage Room",
    calibrator: "",
    quantity: 50,
    availableQuantity: 45,
    status: "available",
    borrowedQuantity: 5,
    maintenanceQuantity: 0,
    disposalQuantity: 0,
    isDisposed: false
  }
];

const mockBorrowings: Borrowing[] = [
  {
    _id: "1",
    equipmentId: {
      _id: "1",
      name: "Microscope",
      itemId: "EQP-001"
    },
    borrowerName: "John Doe",
    borrowerEmail: "john.doe@university.edu",
    borrowerId: "20230001",
    borrowerType: "student",
    purpose: "Research project",
    status: "pending",
    requestedDate: "2024-01-15T10:00:00.000Z",
    intendedBorrowDate: "2024-01-16T00:00:00.000Z",
    intendedReturnDate: "2024-01-20T00:00:00.000Z",
    quantity: 1
  },
  {
    _id: "2",
    equipmentId: {
      _id: "3",
      name: "Test Tubes",
      itemId: "CON-001"
    },
    borrowerName: "Jane Smith",
    borrowerEmail: "jane.smith@university.edu",
    borrowerId: "20230002",
    borrowerType: "student",
    purpose: "Laboratory experiment",
    status: "approved",
    requestedDate: "2024-01-14T14:30:00.000Z",
    intendedBorrowDate: "2024-01-15T00:00:00.000Z",
    intendedReturnDate: "2024-01-18T00:00:00.000Z",
    quantity: 10
  }
];

const mockMaintenance: Maintenance[] = [
  {
    _id: "1",
    equipmentId: {
      _id: "2",
      name: "Centrifuge",
      itemId: "EQP-002"
    },
    equipmentName: "Centrifuge",
    type: "Repair",
    status: "In Progress",
    priority: "High",
    scheduledDate: "2024-01-10T00:00:00.000Z",
    dueDate: "2024-01-20T00:00:00.000Z",
    assignedToName: "Tech Team",
    totalCost: 1500,
    quantity: 1,
    maintainedQuantity: 0
  }
];

const mockDisposals: Disposal[] = [
  {
    _id: "1",
    inventoryItem: {
      _id: "4",
      name: "Old Microscope",
      itemId: "EQP-005"
    },
    equipmentName: "Old Microscope",
    reason: "Obsolete equipment",
    disposalMethod: "Recycle",
    status: "Completed",
    disposalDate: "2024-01-05T00:00:00.000Z",
    disposalQuantity: 1,
    originalCost: 8000,
    salvageValue: 500
  }
];

export default function AdminDashboard({ pageTitle = "Fisheries Lab Dashboard" }: { pageTitle?: string }) {
  const { user, clearAuth, isLoading } = useAuthStore();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [inventoryFilter, setInventoryFilter] = useState<string>("all");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const itemsPerPage = 5;

  // Auth check
  useEffect(() => {
    if (isLoading) return;
    
    if (!user || user.role !== "admin") {
      router.replace("/");
      return;
    }
  }, [user, isLoading, router, clearAuth]);

  // Fetch all data with fallback to mock data
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to fetch real data first, fall back to mock data if APIs don't exist
        const fetchWithFallback = async (endpoint: string, mockData: any[]) => {
          try {
            const response = await fetch(endpoint, { 
              cache: "no-store",
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              // Handle different response structures
              if (Array.isArray(data)) return data;
              if (data.users && Array.isArray(data.users)) return data.users;
              if (data.inventory && Array.isArray(data.inventory)) return data.inventory;
              if (data.borrowings && Array.isArray(data.borrowings)) return data.borrowings;
              if (data.maintenance && Array.isArray(data.maintenance)) return data.maintenance;
              if (data.disposals && Array.isArray(data.disposals)) return data.disposals;
              return [];
            }
            throw new Error('API not available');
          } catch (error) {
            console.warn(`API ${endpoint} not available, using mock data`);
            return mockData;
          }
        };

        if (!isMounted) return;

        // Fetch all data with fallbacks
        const [
          usersData,
          inventoryData, 
          borrowingsData,
          maintenanceData,
          disposalsData
        ] = await Promise.all([
          fetchWithFallback("/api/users", mockUsers),
          fetchWithFallback("/api/inventory", mockInventory),
          fetchWithFallback("/api/borrowings", mockBorrowings),
          fetchWithFallback("/api/maintenance", mockMaintenance),
          fetchWithFallback("/api/disposals", mockDisposals)
        ]);

        if (!isMounted) return;

        setUsers(usersData);
        setInventory(inventoryData);
        setBorrowings(borrowingsData);
        setMaintenance(maintenanceData);
        setDisposals(disposalsData);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data. Using demo data instead.");
        
        // Fallback to mock data
        if (isMounted) {
          setUsers(mockUsers);
          setInventory(mockInventory);
          setBorrowings(mockBorrowings);
          setMaintenance(mockMaintenance);
          setDisposals(mockDisposals);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Analytics data - FIXED: Added proper NaN handling
  const analyticsData = useMemo((): AnalyticsData => {
    const totalValue = inventory.reduce((sum, item) => {
      const cost = Number(item.cost) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + (cost * quantity);
    }, 0);
    
    const lowStockItems = inventory.filter(item => (item.availableQuantity || 0) < 5).length;

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === "active").length,
      pendingRequests: borrowings.filter(b => b.status === "pending").length,
      totalInventory: inventory.length,
      needsRepair: inventory.filter(item => item.condition === "Needs Repair").length,
      activeBorrowings: borrowings.filter(b => b.status === "approved" || b.status === "released").length,
      totalMaintenance: maintenance.length,
      activeMaintenance: maintenance.filter(m => m.status === "In Progress" || m.status === "Scheduled").length,
      completedMaintenance: maintenance.filter(m => m.status === "Completed").length,
      totalDisposals: disposals.length,
      pendingReturns: borrowings.filter(b => b.status === "released" && !b.actualReturnDate).length,
      totalValue,
      lowStockItems
    };
  }, [users, borrowings, inventory, maintenance, disposals]);

  // Chart data with NaN protection - IMPROVED VERSION
  const inventoryByCategory = useMemo(() => {
    const categories = inventory.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const result = Object.entries(categories)
      .map(([name, value]) => ({ 
        name, 
        value: value || 0,
        count: value || 0
      }))
      .sort((a, b) => b.value - a.value);

    return result;
  }, [inventory]);

  const borrowingsByStatus = useMemo(() => {
    const statusCounts = borrowings.reduce((acc, borrowing) => {
      const status = borrowing.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Ensure all statuses are represented
    const allStatuses = ["pending", "approved", "rejected", "released", "returned", "overdue"];
    allStatuses.forEach(status => {
      if (!statusCounts[status]) {
        statusCounts[status] = 0;
      }
    });

    return Object.entries(statusCounts)
      .map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value: value || 0 
      }))
      .filter(item => item.value > 0) // Only show statuses with data
      .sort((a, b) => b.value - a.value);
  }, [borrowings]);

  // Filtered data with pagination
  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchTerm) {
      result = result.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.schoolID.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((u) => u.status === statusFilter);
    }
    return result;
  }, [users, searchTerm, statusFilter]);

  const filteredInventory = useMemo(() => {
    if (inventoryFilter === "all") return inventory;
    return inventory.filter((item) => item.condition === inventoryFilter);
  }, [inventory, inventoryFilter]);

  // Paginated data
  const paginatedUsers = useMemo(() => {
    const startIndex = (usersPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, usersPage]);

  const paginatedInventory = useMemo(() => {
    const startIndex = (inventoryPage - 1) * itemsPerPage;
    return filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventory, inventoryPage]);

  const paginatedBorrowings = useMemo(() => {
    const startIndex = (requestsPage - 1) * itemsPerPage;
    return borrowings.slice(startIndex, startIndex + itemsPerPage);
  }, [borrowings, requestsPage]);

  // Recent data
  const recentUsers = useMemo(() => users.slice(0, 5), [users]);
  const pendingBorrowings = useMemo(() => borrowings.filter(b => b.status === "pending").slice(0, 5), [borrowings]);
  const recentMaintenance = useMemo(() => maintenance.slice(0, 5), [maintenance]);

  // Handlers
  const handleStatusChange = useCallback(async () => {
    if (!selectedUserId || !newStatus) return;
    try {
      // In a real app, you would make an API call here
      // For now, we'll just update the local state
      setUsers(prev => prev.map(user => 
        user._id === selectedUserId ? { ...user, status: newStatus } : user
      ));
      setIsStatusDialogOpen(false);
      setSelectedUserId(null);
      setNewStatus(null);
      setError(null);
    } catch (error) {
      console.error("Error updating user status:", error);
      setError("Failed to update user status. Please try again.");
    }
  }, [selectedUserId, newStatus]);

  const handleBorrowingStatusUpdate = useCallback(async (borrowingId: string, newStatus: string) => {
    try {
      // In a real app, you would make an API call here
      // For now, we'll just update the local state
      setBorrowings(prev => prev.map(borrowing => 
        borrowing._id === borrowingId ? { ...borrowing, status: newStatus as any } : borrowing
      ));
    } catch (error) {
      console.error("Error updating borrowing status:", error);
      setError("Failed to update borrowing status. Please try again.");
    }
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setUsersPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    setInventoryPage(1);
  }, [inventoryFilter]);

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
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
            <p className="text-muted-foreground mt-2">Complete overview and management system</p>
            {error && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-600">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.totalUsers}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <p className="text-xs text-muted-foreground">
                  {analyticsData.activeUsers} active
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.pendingRequests}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Inventory Items</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.totalInventory}</div>
              <div className="flex items-center gap-1 mt-1">
                {analyticsData.needsRepair > 0 ? (
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                ) : (
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                )}
                <p className="text-xs text-muted-foreground">
                  {analyticsData.needsRepair} need repair
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Active Borrowings</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.activeBorrowings}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-purple-500" />
                <p className="text-xs text-muted-foreground">Currently borrowed</p>
              </div>
            </CardContent>
          </Card>

          {/* Additional Stats */}
          <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.activeMaintenance}</div>
              <div className="flex items-center gap-1 mt-1">
                <Wrench className="h-3 w-3 text-orange-500" />
                <p className="text-xs text-muted-foreground">
                  {analyticsData.completedMaintenance} completed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Disposals</CardTitle>
              <Trash2 className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.totalDisposals}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <p className="text-xs text-muted-foreground">Total disposed items</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Inventory Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₱{analyticsData.totalValue.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-1">
                <Package className="h-3 w-3 text-green-500" />
                <p className="text-xs text-muted-foreground">Total asset value</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Low Stock</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.lowStockItems}</div>
              <div className="flex items-center gap-1 mt-1">
                <Package className="h-3 w-3 text-yellow-500" />
                <p className="text-xs text-muted-foreground">Items need restocking</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts - IMPROVED VERSION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Improved Inventory Chart */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                Inventory by Category
              </CardTitle>
              <CardDescription>Distribution of inventory items across categories</CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryByCategory.length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={inventoryByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={(props: any) => 
                          props?.percent && props.percent > 0.05 ? `${(props.percent * 100).toFixed(0)}%` : ''
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {inventoryByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [
                          `${value} items`, 
                          props.payload.name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Legend */}
                  <div className="space-y-3 min-w-[200px]">
                    <h4 className="text-sm font-medium text-foreground mb-2">Categories:</h4>
                    {inventoryByCategory.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-foreground font-medium">{entry.name}:</span>
                        <span className="text-muted-foreground">
                          {entry.value} item{entry.value !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No inventory data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Borrowing Requests Chart */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                Borrowing Requests Status
              </CardTitle>
              <CardDescription>Current status of all borrowing requests</CardDescription>
            </CardHeader>
            <CardContent>
              {borrowingsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={borrowingsByStatus}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [`${value} requests`, 'Count']}
                    />
                    <Bar 
                      dataKey="value" 
                      name="Requests"
                      radius={[4, 4, 0, 0]}
                    >
                      {borrowingsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No borrowing data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                Recent Users
              </CardTitle>
              <CardDescription>Recently registered users in the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(user.status)}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Requests
              </CardTitle>
              <CardDescription>Requests awaiting your approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingBorrowings.map((borrowing) => (
                <div key={borrowing._id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{borrowing.equipmentId?.name || 'Unknown Item'}</p>
                    <p className="text-xs text-muted-foreground">{borrowing.borrowerName}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {new Date(borrowing.requestedDate).toLocaleDateString()}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" />
                Recent Maintenance
              </CardTitle>
              <CardDescription>Latest maintenance activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentMaintenance.map((item) => (
                <div key={item._id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.equipmentName}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                  {getMaintenanceStatusBadge(item.status)}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users Management */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                User Management
              </CardTitle>
              <CardDescription>Manage system users and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search users..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow key={user._id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(user.email)}
                                className="cursor-pointer"
                              >
                                Copy email address
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
                                <XCircle className="h-4 w-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={usersPage}
                  totalPages={Math.ceil(filteredUsers.length / itemsPerPage)}
                  onPageChange={setUsersPage}
                  totalItems={filteredUsers.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inventory Management */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                Inventory Management
              </CardTitle>
              <CardDescription>Manage laboratory equipment and materials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Select value={inventoryFilter} onValueChange={setInventoryFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="Good">Good Condition</SelectItem>
                    <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">Item ID</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Condition</TableHead>
                      <TableHead className="font-semibold">Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInventory.map((item) => (
                      <TableRow key={item._id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm font-medium text-foreground">{item.itemId}</TableCell>
                        <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                        <TableCell>{getConditionBadge(item.condition)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{item.availableQuantity}/{item.quantity}</span>
                            <Progress 
                              value={item.quantity > 0 ? (item.availableQuantity / item.quantity) * 100 : 0} 
                              className="w-16 h-2"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={inventoryPage}
                  totalPages={Math.ceil(filteredInventory.length / itemsPerPage)}
                  onPageChange={setInventoryPage}
                  totalItems={filteredInventory.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Borrowing Requests */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              Borrowing Requests
            </CardTitle>
            <CardDescription>Manage equipment borrowing requests and approvals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Item</TableHead>
                    <TableHead className="font-semibold">Borrower</TableHead>
                    <TableHead className="font-semibold">Date Requested</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBorrowings.map((borrowing) => (
                    <TableRow key={borrowing._id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{borrowing.equipmentId?.name || 'Unknown Item'}</p>
                          <p className="text-sm text-muted-foreground">ID: {borrowing.equipmentId?.itemId || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{borrowing.borrowerName}</p>
                          <p className="text-sm text-muted-foreground">{borrowing.borrowerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(borrowing.requestedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {getBorrowingStatusBadge(borrowing.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {borrowing.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleBorrowingStatusUpdate(borrowing._id, "approved")}
                              className="bg-emerald-500 hover:bg-emerald-600"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBorrowingStatusUpdate(borrowing._id, "rejected")}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {borrowing.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => handleBorrowingStatusUpdate(borrowing._id, "released")}
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            Mark Released
                          </Button>
                        )}
                        {borrowing.status === "released" && (
                          <Button
                            size="sm"
                            onClick={() => handleBorrowingStatusUpdate(borrowing._id, "returned")}
                            className="bg-gray-500 hover:bg-gray-600"
                          >
                            Mark Returned
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={requestsPage}
                totalPages={Math.ceil(borrowings.length / itemsPerPage)}
                onPageChange={setRequestsPage}
                totalItems={borrowings.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status Change Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {newStatus === "active" ? (
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                ) : newStatus === "inactive" ? (
                  <UserX className="h-5 w-5 text-gray-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                {newStatus === "active"
                  ? "Activate User"
                  : newStatus === "inactive"
                  ? "Deactivate User"
                  : "Suspend User"}
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to set this user's status to <strong>{newStatus}</strong>?
                This action will affect their system access.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1 sm:flex-none">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleStatusChange}
                className={
                  newStatus === "active"
                    ? "bg-emerald-500 hover:bg-emerald-600 flex-1 sm:flex-none"
                    : newStatus === "inactive"
                    ? "bg-gray-500 hover:bg-gray-600 flex-1 sm:flex-none"
                    : "bg-red-500 hover:bg-red-600 flex-1 sm:flex-none"
                }
              >
                {newStatus === "active" ? "Activate User" : newStatus === "inactive" ? "Deactivate User" : "Suspend User"}
              </Button>
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
            <span className="text-sm text-muted-foreground">Admin Dashboard v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}