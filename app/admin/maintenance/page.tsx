"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores";
import { useEffect, useState } from "react";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Plus, 
  CheckCircle, 
  PlayCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  Wrench,
  X,
  Archive,
  ListTodo,
  ChevronsUpDown,
  User,
  RefreshCw,
  Users,
  Package,
  Activity,
  TrendingUp,
  AlertCircle
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Maintenance {
  _id: string;
  equipmentId: string;
  itemId: string;
  equipmentName: string;
  category: string;
  type: string;
  quantity: number;
  availableQuantity: number;
  maintainedQuantity: number;
  remainingQuantity: number;
  scheduledDate: string;
  dueDate: string;
  completedDate?: string;
  nextMaintenance?: string;
  assignedTo: string;
  assignedToName: string;
  assignedToEmail: string;
  status: string;
  priority: string;
  description?: string;
  notes?: string;
  findings?: string;
  actionsTaken?: string;
  partsUsed: Array<{
    name: string;
    quantity: number;
    cost: number;
  }>;
  totalCost: number;
  estimatedDuration: number;
  actualDuration?: number;
  beforeImages: string[];
  afterImages: string[];
  qrCode?: string;
  createdBy: string;
  createdByName: string;
  wasDisposed: boolean;
  disposedQuantity: number;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  daysUntilDue: number;
  completionRate: number;
  quantityCompletionRate: number;
  formattedScheduledDate: string;
  formattedDueDate: string;
  formattedNextMaintenance?: string;
}

interface Equipment {
  _id: string;
  name: string;
  itemId: string;
  category: string;
  condition: string;
  maintenanceNeeds: string;
  availableQuantity: number;
  quantity: number;
  maintenanceQuantity: number;
  nextMaintenance?: string;
  lastMaintenance?: string;
  calibrator: string;
}

interface Faculty {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  schoolID: string;
}

interface Part {
  name: string;
  quantity: number;
  cost: number;
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

const SkeletonTableRow = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
          <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    </TableCell>
    <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-20 bg-muted rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-6 w-24 bg-muted rounded animate-pulse"></div></TableCell>
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
    <TableCell className="text-right"><div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto"></div></TableCell>
  </TableRow>
);

// Safe number parsing helper
const safeParseInt = (value: string, defaultValue: number = 1): number => {
  if (value === '') return defaultValue;
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : Math.max(1, parsed);
};

const safeParseFloat = (value: string, defaultValue: number = 0): number => {
  if (value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
};

// Date helper functions
const formatDateForInput = (dateString: string | Date): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const calculateDueDate = (scheduledDate: string, estimatedDuration: number): string => {
  if (!scheduledDate) return '';
  const date = new Date(scheduledDate);
  date.setDate(date.getDate() + estimatedDuration);
  return formatDateForInput(date);
};

// Equipment Select Component with Search
const EquipmentSelect = ({ 
  equipment, 
  value, 
  onSelect 
}: { 
  equipment: Equipment[]; 
  value: string; 
  onSelect: (equipmentName: string, itemId: string, availableQuantity: number, equipmentId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEquipment = equipment.filter((eq) =>
    eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.itemId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEquipment = equipment.find(eq => eq.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-border h-auto min-h-[40px] py-2"
        >
          {selectedEquipment ? (
            <div className="flex flex-col items-start text-left w-full">
              <span className="font-medium text-sm">{selectedEquipment.name}</span>
              <span className="text-xs text-muted-foreground">
                {selectedEquipment.itemId} • {selectedEquipment.category} • {selectedEquipment.condition}
              </span>
              <span className="text-xs text-blue-600 font-medium">
                Available: {selectedEquipment.availableQuantity} / {selectedEquipment.quantity}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select equipment...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command className="w-full">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search equipment by name, ID, or category..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="flex-1 border-0 focus:ring-0 outline-none"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-8 w-8 p-0 opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CommandList className="max-h-[300px] overflow-auto">
            <CommandEmpty className="py-6 text-center text-sm">
              No equipment found.
            </CommandEmpty>
            <CommandGroup>
              {filteredEquipment.map((eq) => (
                <CommandItem
                  key={eq._id}
                  value={eq.name}
                  onSelect={() => {
                    onSelect(eq.name, eq.itemId, eq.availableQuantity, eq._id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="flex flex-col items-start py-3 cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  disabled={eq.availableQuantity === 0}
                >
                  <div className="flex justify-between w-full items-start">
                    <span className="font-medium text-sm">{eq.name}</span>
                    <Badge 
                      variant={
                        eq.condition === "Good" ? "default" :
                        eq.condition === "Needs Repair" ? "destructive" :
                        eq.condition === "Under Maintenance" ? "secondary" : "outline"
                      }
                      className="text-xs ml-2 flex-shrink-0"
                    >
                      {eq.condition}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-1">
                    <span>ID: {eq.itemId}</span>
                    <span>•</span>
                    <span>{eq.category}</span>
                    <span>•</span>
                    <span className={cn(
                      "font-medium",
                      eq.availableQuantity === 0 ? "text-red-600" : "text-blue-600"
                    )}>
                      Available: {eq.availableQuantity}/{eq.quantity}
                    </span>
                  </div>
                  {eq.availableQuantity === 0 && (
                    <div className="text-xs text-red-600 font-medium mt-1">
                      No available units for maintenance
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Faculty Select Component with Search
const FacultySelect = ({ 
  faculty, 
  value, 
  onSelect 
}: { 
  faculty: Faculty[]; 
  value: string; 
  onSelect: (facultyName: string, facultyEmail: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaculty = faculty.filter((fac) =>
    fac.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fac.schoolID.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fac.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFaculty = faculty.find(fac => fac.fullName === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-border h-auto min-h-[40px] py-2"
        >
          {selectedFaculty ? (
            <div className="flex flex-col items-start text-left w-full">
              <span className="font-medium text-sm">{selectedFaculty.fullName}</span>
              <span className="text-xs text-muted-foreground">
                {selectedFaculty.schoolID} • {selectedFaculty.email}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select faculty member...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command className="w-full">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search faculty by name, ID, or email..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="flex-1 border-0 focus:ring-0 outline-none"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-8 w-8 p-0 opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CommandList className="max-h-[300px] overflow-auto">
            <CommandEmpty className="py-6 text-center text-sm">
              No faculty members found.
            </CommandEmpty>
            <CommandGroup>
              {filteredFaculty.map((fac) => (
                <CommandItem
                  key={fac._id}
                  value={fac.fullName}
                  onSelect={() => {
                    onSelect(fac.fullName, fac.email);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="flex flex-col items-start py-3 cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <div className="flex justify-between w-full items-start">
                    <span className="font-medium text-sm">{fac.fullName}</span>
                    <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                      Faculty
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-1">
                    <span>ID: {fac.schoolID}</span>
                    <span>•</span>
                    <span>{fac.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Part Item Component
const PartItem = ({ 
  part, 
  index, 
  onUpdate, 
  onRemove 
}: { 
  part: Part; 
  index: number; 
  onUpdate: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
}) => {
  const totalCost = part.quantity * part.cost;

  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label htmlFor={`part-name-${index}`} className="text-xs font-medium">
            Part Name
          </Label>
          <Input
            id={`part-name-${index}`}
            value={part.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            placeholder="Enter part name"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`part-quantity-${index}`} className="text-xs font-medium">
            Quantity
          </Label>
          <Input
            id={`part-quantity-${index}`}
            type="number"
            min="1"
            value={part.quantity}
            onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`part-cost-${index}`} className="text-xs font-medium">
            Unit Cost (₱)
          </Label>
          <Input
            id={`part-cost-${index}`}
            type="number"
            min="0"
            step="0.01"
            value={part.cost}
            onChange={(e) => onUpdate(index, 'cost', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right min-w-[80px]">
          <div className="text-sm font-medium">₱{totalCost.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
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
          <ChevronsUpDown className="h-4 w-4 rotate-90" />
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
          <ChevronsUpDown className="h-4 w-4 -rotate-90" />
        </Button>
      </div>
    </div>
  );
};

export default function MaintenancePage() {
  const { user, clearAuth, isLoading } = useAuthStore();
  const router = useRouter();
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [filteredMaintenance, setFilteredMaintenance] = useState<Maintenance[]>([]);
  const [activeMaintenance, setActiveMaintenance] = useState<Maintenance[]>([]);
  const [completedMaintenance, setCompletedMaintenance] = useState<Maintenance[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [completedSearchTerm, setCompletedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMaintenance, setViewMaintenance] = useState<Maintenance | null>(null);
  const [editMaintenance, setEditMaintenance] = useState<Maintenance | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [maintainedQuantity, setMaintainedQuantity] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    totalCost: 0
  });

  const [newMaintenance, setNewMaintenance] = useState({
    equipmentName: "",
    itemId: "",
    equipmentId: "",
    type: "Maintenance",
    category: "Equipment",
    priority: "Medium",
    status: "Scheduled",
    description: "",
    scheduledDate: "",
    dueDate: "",
    nextMaintenance: "",
    assignedToName: "",
    assignedToEmail: "",
    estimatedDuration: 1,
    quantity: 1,
    availableQuantity: 0,
    partsUsed: [] as Part[],
    totalCost: 0
  });

  const [editParts, setEditParts] = useState<Part[]>([]);

  const itemsPerPage = 10;
  
  // Pagination for active maintenance
  const totalPages = Math.ceil(activeMaintenance.length / itemsPerPage);
  const paginatedData = activeMaintenance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  // Pagination for completed maintenance
  const completedTotalPages = Math.ceil(completedMaintenance.length / itemsPerPage);
  const completedPaginatedData = completedMaintenance.slice((completedCurrentPage - 1) * itemsPerPage, completedCurrentPage * itemsPerPage);

  // Calculate total cost from parts
  const calculateTotalCost = (parts: Part[]) => {
    return parts.reduce((total, part) => total + (part.quantity * part.cost), 0);
  };

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
        if (!data.user) {
          clearAuth();
          router.replace("/");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        clearAuth();
        router.replace("/");
      }
    };

    if (!user) {
      checkAuth();
    }
  }, [user, isLoading, router, clearAuth]);

  // Formatters
  const formatDate = (dateString: string | Date) => {
    if (!dateString || dateString === '') return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Fetch all data
  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/maintenance", { 
        cache: "no-store",
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch maintenance data");
      }
      
      const data = await response.json();
      
      if (data.success) {
        const maintenanceData = data.data.map((item: Maintenance) => {
          const formattedScheduledDate = formatDate(item.scheduledDate);
          const formattedDueDate = formatDate(item.dueDate);
          
          const hasNextMaintenance = item.nextMaintenance && item.nextMaintenance !== '' && !isNaN(new Date(item.nextMaintenance).getTime());
          const formattedNextMaintenance = hasNextMaintenance ? formatDate(item.nextMaintenance || '') : 'Not set';
          
          return {
            ...item,
            nextMaintenance: hasNextMaintenance ? item.nextMaintenance : '',
            formattedScheduledDate,
            formattedDueDate,
            formattedNextMaintenance,
            maintainedQuantity: item.maintainedQuantity || 0,
            remainingQuantity: item.remainingQuantity || item.quantity,
            availableQuantity: item.availableQuantity || item.quantity
          };
        });
        
        setMaintenance(maintenanceData);
        setFilteredMaintenance(maintenanceData);
        
        const active = maintenanceData.filter((item: Maintenance) => item.status !== 'Completed');
        const completed = maintenanceData.filter((item: Maintenance) => item.status === 'Completed');
        
        setActiveMaintenance(active);
        setCompletedMaintenance(completed);
        
        setEquipment(data.equipment || []);
        setFaculty(data.faculty || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error("Error fetching maintenance data:", error);
      setError("Failed to fetch maintenance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  // Update total cost when parts change
  useEffect(() => {
    const totalCost = calculateTotalCost(newMaintenance.partsUsed);
    setNewMaintenance(prev => ({ ...prev, totalCost }));
  }, [newMaintenance.partsUsed]);

  // Update edit total cost when edit parts change
  useEffect(() => {
    if (editMaintenance) {
      const totalCost = calculateTotalCost(editParts);
      setEditMaintenance(prev => prev ? { ...prev, totalCost, partsUsed: editParts } : null);
    }
  }, [editParts, editMaintenance]);

  // Auto-calculate due date when scheduled date or estimated duration changes
  useEffect(() => {
    if (newMaintenance.scheduledDate && newMaintenance.estimatedDuration > 0) {
      const dueDate = calculateDueDate(newMaintenance.scheduledDate, newMaintenance.estimatedDuration);
      setNewMaintenance(prev => ({
        ...prev,
        dueDate
      }));
    }
  }, [newMaintenance.scheduledDate, newMaintenance.estimatedDuration]);

  // Auto-calculate due date for edit form
  useEffect(() => {
    if (editMaintenance?.scheduledDate && editMaintenance.estimatedDuration > 0) {
      const dueDate = calculateDueDate(editMaintenance.scheduledDate, editMaintenance.estimatedDuration);
      setEditMaintenance(prev => prev ? {
        ...prev,
        dueDate
      } : null);
    }
  }, [editMaintenance?.scheduledDate, editMaintenance?.estimatedDuration]);

  // Filters for active maintenance
  useEffect(() => {
    let result = maintenance.filter(item => item.status !== 'Completed');
    
    if (searchTerm) {
      result = result.filter(
        (item) =>
          item.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.assignedToName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }
    
    if (priorityFilter !== "all") {
      result = result.filter((item) => item.priority === priorityFilter);
    }
    
    if (typeFilter !== "all") {
      result = result.filter((item) => item.type === typeFilter);
    }
    
    setActiveMaintenance(result);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, typeFilter, maintenance]);

  // Filters for completed maintenance
  useEffect(() => {
    let result = maintenance.filter(item => item.status === 'Completed');
    
    if (completedSearchTerm) {
      result = result.filter(
        (item) =>
          item.equipmentName.toLowerCase().includes(completedSearchTerm.toLowerCase()) ||
          item.itemId.toLowerCase().includes(completedSearchTerm.toLowerCase()) ||
          item.assignedToName.toLowerCase().includes(completedSearchTerm.toLowerCase())
      );
    }
    
    setCompletedMaintenance(result);
    setCompletedCurrentPage(1);
  }, [completedSearchTerm, maintenance]);

  // Badges - Updated to match dashboard style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Completed</Badge>;
      case "In Progress":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">In Progress</Badge>;
      case "Scheduled":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Scheduled</Badge>;
      case "Overdue":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Overdue</Badge>;
      case "Cancelled":
        return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Critical":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Critical</Badge>;
      case "High":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">High</Badge>;
      case "Medium":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Medium</Badge>;
      case "Low":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Maintenance":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Maintenance</Badge>;
      case "Calibration":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Calibration</Badge>;
      case "Repair":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Repair</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-4 w-4" />;
      case "In Progress":
        return <PlayCircle className="h-4 w-4" />;
      case "Scheduled":
        return <Clock className="h-4 w-4" />;
      case "Overdue":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Calculate completion rate based on maintained quantity
  const calculateCompletionRate = (item: Maintenance) => {
    if (item.status === 'Completed') return 100;
    if (item.quantity > 0) {
      return Math.round(((item.maintainedQuantity || 0) / item.quantity) * 100);
    }
    return 0;
  };

  // Handle equipment selection
  const handleEquipmentSelect = (equipmentName: string, itemId: string, availableQuantity: number, equipmentId: string) => {
    setNewMaintenance({
      ...newMaintenance,
      equipmentName,
      itemId,
      equipmentId,
      availableQuantity,
      quantity: Math.min(newMaintenance.quantity, availableQuantity)
    });
  };

  // Handle faculty selection
  const handleFacultySelect = (facultyName: string, facultyEmail: string) => {
    setNewMaintenance({
      ...newMaintenance,
      assignedToName: facultyName,
      assignedToEmail: facultyEmail
    });
  };

  // Handle edit faculty selection
  const handleEditFacultySelect = (facultyName: string, facultyEmail: string) => {
    if (editMaintenance) {
      setEditMaintenance({
        ...editMaintenance,
        assignedToName: facultyName,
        assignedToEmail: facultyEmail
      });
    }
  };

  // Handle quantity change
  const handleQuantityChange = (quantity: number) => {
    setNewMaintenance({
      ...newMaintenance,
      quantity: Math.min(quantity, newMaintenance.availableQuantity)
    });
  };

  // Handle scheduled date change
  const handleScheduledDateChange = (date: string) => {
    setNewMaintenance(prev => ({
      ...prev,
      scheduledDate: date
    }));
  };

  // Handle estimated duration change
  const handleEstimatedDurationChange = (duration: number) => {
    setNewMaintenance(prev => ({
      ...prev,
      estimatedDuration: duration
    }));
  };

  // Handle next maintenance date change
  const handleNextMaintenanceChange = (date: string) => {
    setNewMaintenance(prev => ({
      ...prev,
      nextMaintenance: date
    }));
  };

  // Handle edit scheduled date change
  const handleEditScheduledDateChange = (date: string) => {
    if (editMaintenance) {
      setEditMaintenance(prev => prev ? {
        ...prev,
        scheduledDate: date
      } : null);
    }
  };

  // Handle edit estimated duration change
  const handleEditEstimatedDurationChange = (duration: number) => {
    if (editMaintenance) {
      setEditMaintenance(prev => prev ? {
        ...prev,
        estimatedDuration: duration
      } : null);
    }
  };

  // Handle edit next maintenance date change
  const handleEditNextMaintenanceChange = (date: string) => {
    if (editMaintenance) {
      setEditMaintenance(prev => prev ? {
        ...prev,
        nextMaintenance: date
      } : null);
    }
  };

  // Parts management for new maintenance
  const addPart = () => {
    setNewMaintenance(prev => ({
      ...prev,
      partsUsed: [...prev.partsUsed, { name: '', quantity: 1, cost: 0 }]
    }));
  };

  const updatePart = (index: number, field: string, value: string) => {
    setNewMaintenance(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.map((part, i) => 
        i === index 
          ? { 
              ...part, 
              [field]: field === 'name' ? value : 
                      field === 'quantity' ? safeParseInt(value, 1) : 
                      safeParseFloat(value, 0)
            } 
          : part
      )
    }));
  };

  const removePart = (index: number) => {
    setNewMaintenance(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.filter((_, i) => i !== index)
    }));
  };

  // Parts management for edit maintenance
  const addEditPart = () => {
    setEditParts(prev => [...prev, { name: '', quantity: 1, cost: 0 }]);
  };

  const updateEditPart = (index: number, field: string, value: string) => {
    setEditParts(prev => 
      prev.map((part, i) => 
        i === index 
          ? { 
              ...part, 
              [field]: field === 'name' ? value : 
                      field === 'quantity' ? safeParseInt(value, 1) : 
                      safeParseFloat(value, 0)
            } 
          : part
      )
    );
  };

  const removeEditPart = (index: number) => {
    setEditParts(prev => prev.filter((_, i) => i !== index));
  };

  // API Handlers
  const handleAddMaintenance = async () => {
    try {
      setError(null);
      setSuccess(null);
      
      const validParts = newMaintenance.partsUsed.filter(part => 
        part.name.trim() !== '' && part.quantity > 0 && part.cost >= 0
      );

      const maintenanceData = {
        ...newMaintenance,
        partsUsed: validParts,
        totalCost: calculateTotalCost(validParts)
      };

      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maintenanceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add maintenance record");
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchMaintenanceData();
        
        setNewMaintenance({
          equipmentName: "",
          itemId: "",
          equipmentId: "",
          type: "Maintenance",
          category: "Equipment",
          priority: "Medium",
          status: "Scheduled",
          description: "",
          scheduledDate: "",
          dueDate: "",
          nextMaintenance: "",
          assignedToName: "",
          assignedToEmail: "",
          estimatedDuration: 1,
          quantity: 1,
          availableQuantity: 0,
          partsUsed: [],
          totalCost: 0
        });
        
        setSuccess("Maintenance record created successfully!");
        setIsAddDialogOpen(false);
      }
    } catch (error: any) {
      console.error("Error adding maintenance:", error);
      setError(error.message || "Failed to add maintenance record. Please try again.");
    }
  };

  const handleUpdateMaintenance = async () => {
    if (!editMaintenance) return;
    
    try {
      setError(null);
      setSuccess(null);
      
      const validParts = editParts.filter(part => 
        part.name.trim() !== '' && part.quantity > 0 && part.cost >= 0
      );

      const maintenanceData = {
        ...editMaintenance,
        partsUsed: validParts,
        totalCost: calculateTotalCost(validParts)
      };

      const response = await fetch(`/api/maintenance/${editMaintenance._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maintenanceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update maintenance record");
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchMaintenanceData();
        setSuccess("Maintenance record updated successfully!");
        setIsEditDialogOpen(false);
        setEditMaintenance(null);
        setEditParts([]);
      }
    } catch (error: any) {
      console.error("Error updating maintenance:", error);
      setError(error.message || "Failed to update maintenance record. Please try again.");
    }
  };

  const handleDeleteMaintenance = async () => {
    if (!selectedId) return;
    
    try {
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/maintenance/${selectedId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete maintenance record");
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchMaintenanceData();
        setSuccess("Maintenance record deleted successfully!");
        setIsDeleteDialogOpen(false);
        setSelectedId(null);
      }
    } catch (error: any) {
      console.error("Error deleting maintenance:", error);
      setError(error.message || "Failed to delete maintenance record. Please try again.");
    }
  };

  const handleUpdateQuantity = async () => {
    if (!selectedMaintenance) return;
    
    try {
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/maintenance/${selectedMaintenance._id}/quantity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintainedQuantity
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update maintenance quantity");
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchMaintenanceData();
        setSuccess("Maintenance quantity updated successfully!");
        setQuantityModalOpen(false);
        setSelectedMaintenance(null);
        setMaintainedQuantity(0);
      }
    } catch (error: any) {
      console.error("Error updating quantity:", error);
      setError(error.message || "Failed to update maintenance quantity. Please try again.");
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          completedDate: newStatus === 'Completed' ? new Date().toISOString() : undefined
        }),
      });

      if (response.ok) {
        await fetchMaintenanceData();
        setSuccess(`Maintenance status updated to ${newStatus}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      setError(error.message || "Failed to update maintenance status.");
    }
  };

  const handlePartialMaintenance = (item: Maintenance) => {
    setSelectedMaintenance(item);
    setMaintainedQuantity(item.maintainedQuantity || 0);
    setQuantityModalOpen(true);
  };

  // Open edit dialog with current parts
  const openEditDialog = (item: Maintenance) => {
    setEditMaintenance({
      ...item,
      scheduledDate: formatDateForInput(item.scheduledDate),
      dueDate: formatDateForInput(item.dueDate),
      nextMaintenance: item.nextMaintenance ? formatDateForInput(item.nextMaintenance) : ''
    });
    setEditParts(item.partsUsed || []);
    setIsEditDialogOpen(true);
  };

  // Loader
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
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
                  <TableRow>
                    {[...Array(9)].map((_, i) => (
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex-1 space-y-6 p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Maintenance Management</h1>
            <p className="text-muted-foreground mt-2">Monitor and manage equipment maintenance schedules</p>
          </div>
          
          {/* Add Maintenance Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] bg-background border border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add New Maintenance</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Create a new maintenance record for equipment.
                </DialogDescription>
              </DialogHeader>
              {error && <p className="text-destructive text-sm mb-4">{error}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="equipmentName" className="text-sm font-medium text-foreground">
                      Equipment *
                    </Label>
                    <EquipmentSelect
                      equipment={equipment}
                      value={newMaintenance.equipmentName}
                      onSelect={handleEquipmentSelect}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="itemId" className="text-sm font-medium text-foreground">
                      Item ID
                    </Label>
                    <Input
                      id="itemId"
                      value={newMaintenance.itemId}
                      disabled
                      className="border-border bg-muted/50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity" className="text-sm font-medium text-foreground">
                      Quantity to Maintain *
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={newMaintenance.availableQuantity}
                      value={newMaintenance.quantity || ""}
                      onChange={(e) => handleQuantityChange(safeParseInt(e.target.value, 1))}
                      className="border-border focus-visible:ring-ring"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: {newMaintenance.availableQuantity} units
                      {newMaintenance.availableQuantity === 0 && (
                        <span className="text-red-600 ml-2 font-medium">No available units</span>
                      )}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type" className="text-sm font-medium text-foreground">
                      Type *
                    </Label>
                    <Select
                      value={newMaintenance.type}
                      onValueChange={(value) => setNewMaintenance({ ...newMaintenance, type: value })}
                    >
                      <SelectTrigger className="border-border focus-visible:ring-ring">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Calibration">Calibration</SelectItem>
                        <SelectItem value="Repair">Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority" className="text-sm font-medium text-foreground">
                      Priority *
                    </Label>
                    <Select
                      value={newMaintenance.priority}
                      onValueChange={(value) => setNewMaintenance({ ...newMaintenance, priority: value })}
                    >
                      <SelectTrigger className="border-border focus-visible:ring-ring">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="assignedToName" className="text-sm font-medium text-foreground">
                      Assigned To *
                    </Label>
                    <FacultySelect
                      faculty={faculty}
                      value={newMaintenance.assignedToName}
                      onSelect={handleFacultySelect}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="scheduledDate" className="text-sm font-medium text-foreground">
                      Scheduled Date *
                    </Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={newMaintenance.scheduledDate}
                      onChange={(e) => handleScheduledDateChange(e.target.value)}
                      className="border-border focus-visible:ring-ring"
                      required
                      min={formatDateForInput(new Date())}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="estimatedDuration" className="text-sm font-medium text-foreground">
                      Estimated Duration (days) *
                    </Label>
                    <Input
                      id="estimatedDuration"
                      type="number"
                      min="1"
                      value={newMaintenance.estimatedDuration || ""}
                      onChange={(e) => handleEstimatedDurationChange(safeParseInt(e.target.value, 1))}
                      className="border-border focus-visible:ring-ring"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate" className="text-sm font-medium text-foreground">
                      Due Date *
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newMaintenance.dueDate}
                      onChange={(e) => setNewMaintenance({ ...newMaintenance, dueDate: e.target.value })}
                      className="border-border focus-visible:ring-ring bg-muted/50"
                      required
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Automatically calculated from scheduled date + duration
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nextMaintenance" className="text-sm font-medium text-foreground">
                      Next Maintenance Date *
                    </Label>
                    <Input
                      id="nextMaintenance"
                      type="date"
                      value={newMaintenance.nextMaintenance}
                      onChange={(e) => handleNextMaintenanceChange(e.target.value)}
                      className="border-border focus-visible:ring-ring"
                      required
                      min={newMaintenance.dueDate || formatDateForInput(new Date())}
                    />
                    <p className="text-xs text-muted-foreground">
                      Set the date for the next maintenance
                    </p>
                  </div>
                  {/* Total Cost Display */}
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium text-foreground">
                      Total Cost
                    </Label>
                    <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
                      <span className="text-lg font-bold text-green-600">
                        ₱{newMaintenance.totalCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parts Used Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">
                    Parts Used
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPart}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Part
                  </Button>
                </div>
                
                {newMaintenance.partsUsed.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                    <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No parts added yet</p>
                    <p className="text-xs text-muted-foreground">Add parts to calculate total cost</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {newMaintenance.partsUsed.map((part, index) => (
                      <PartItem
                        key={index}
                        part={part}
                        index={index}
                        onUpdate={updatePart}
                        onRemove={removePart}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Enter maintenance description"
                  value={newMaintenance.description}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, description: e.target.value })}
                  className="border-border focus-visible:ring-ring min-h-[100px]"
                />
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                <DialogClose asChild>
                  <Button variant="outline" className="sm:mr-auto">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleAddMaintenance}
                  disabled={
                    !newMaintenance.equipmentName ||
                    !newMaintenance.itemId ||
                    !newMaintenance.scheduledDate ||
                    !newMaintenance.dueDate ||
                    !newMaintenance.nextMaintenance ||
                    !newMaintenance.assignedToName ||
                    !newMaintenance.quantity ||
                    newMaintenance.quantity > newMaintenance.availableQuantity
                  }
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Maintenance
                </Button>
              </DialogFooter>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Units</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <p className="text-xs text-muted-foreground">
                  All maintenance units
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <p className="text-xs text-muted-foreground">
                  Successfully completed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.inProgress}</div>
              <div className="flex items-center gap-1 mt-1">
                <Activity className="h-3 w-3 text-amber-500" />
                <p className="text-xs text-muted-foreground">
                  Currently being worked on
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.overdue}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <p className="text-xs text-muted-foreground">
                  Past due date
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Cost</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₱{stats.totalCost.toFixed(2)}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-purple-500" />
                <p className="text-xs text-muted-foreground">
                  All maintenance costs
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:max-w-md bg-muted/50 p-1 rounded-lg">
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center gap-2"
            >
              <ListTodo className="h-4 w-4" />
              Active Maintenance
              <Badge variant="secondary" className="ml-2">
                {activeMaintenance.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Completed
              <Badge variant="secondary" className="ml-2">
                {completedMaintenance.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Active Maintenance Tab */}
          <TabsContent value="active" className="space-y-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-blue-500" />
                  Active Maintenance Tasks
                </CardTitle>
                <CardDescription>Manage ongoing maintenance activities and schedules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search by equipment, ID, or assigned to..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Calibration">Calibration</SelectItem>
                        <SelectItem value="Repair">Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold">Equipment</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Priority</TableHead>
                        <TableHead className="font-semibold">Quantity</TableHead>
                        <TableHead className="font-semibold">Assigned To</TableHead>
                        <TableHead className="font-semibold">Due Date</TableHead>
                        <TableHead className="font-semibold">Progress</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((item) => {
                        const maintainedQty = item.maintainedQuantity || 0;
                        const totalQty = item.quantity || 1;
                        const completionRate = calculateCompletionRate(item);
                        
                        return (
                          <TableRow key={item._id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-full ${
                                  item.status === 'Completed' ? 'bg-emerald-100' :
                                  item.status === 'In Progress' ? 'bg-amber-100' :
                                  item.status === 'Overdue' ? 'bg-red-100' : 'bg-blue-100'
                                }`}>
                                  {getStatusIcon(item.status)}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{item.equipmentName}</p>
                                  <p className="text-sm text-muted-foreground">{item.itemId}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getTypeBadge(item.type)}</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">
                                  {maintainedQty}/{totalQty}
                                </span>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      maintainedQty === totalQty ? 'bg-emerald-500' :
                                      maintainedQty > 0 ? 'bg-amber-500' : 'bg-gray-300'
                                    }`}
                                    style={{ 
                                      width: `${(maintainedQty / totalQty) * 100}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-foreground">{item.assignedToName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.formattedDueDate || formatDate(item.dueDate)}
                              {item.isOverdue && (
                                <Badge variant="destructive" className="ml-1 text-xs">
                                  Overdue
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      completionRate === 100 ? 'bg-emerald-500' :
                                      completionRate >= 50 ? 'bg-amber-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${completionRate}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-foreground w-8">
                                  {completionRate}%
                                </span>
                              </div>
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
                                    onClick={() => {
                                      setViewMaintenance(item);
                                      setIsViewDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(item)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handlePartialMaintenance(item)}
                                    disabled={item.status === 'Completed'}
                                  >
                                    <Wrench className="h-4 w-4 mr-2" />
                                    Update Quantity
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleStatusUpdate(item._id, 'Scheduled')}
                                    disabled={item.status === 'Scheduled'}
                                  >
                                    <Clock className="h-4 w-4 mr-2" />
                                    Set Scheduled
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusUpdate(item._id, 'In Progress')}
                                    disabled={item.status === 'In Progress'}
                                  >
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Start Progress
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusUpdate(item._id, 'Completed')}
                                    disabled={item.status === 'Completed'}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedId(item._id);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {paginatedData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground">No active maintenance tasks found</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={activeMaintenance.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Completed Maintenance Tab */}
          <TabsContent value="completed" className="space-y-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-emerald-500" />
                  Completed Maintenance History
                </CardTitle>
                <CardDescription>Review completed maintenance tasks and their details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search completed maintenance..."
                      className="pl-10"
                      value={completedSearchTerm}
                      onChange={(e) => setCompletedSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold">Equipment</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Priority</TableHead>
                        <TableHead className="font-semibold">Quantity</TableHead>
                        <TableHead className="font-semibold">Assigned To</TableHead>
                        <TableHead className="font-semibold">Completed Date</TableHead>
                        <TableHead className="font-semibold">Duration</TableHead>
                        <TableHead className="font-semibold">Total Cost</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedPaginatedData.map((item) => (
                        <TableRow key={item._id} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-full bg-emerald-100">
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{item.equipmentName}</p>
                                <p className="text-sm text-muted-foreground">{item.itemId}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(item.type)}</TableCell>
                          <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">
                                {item.maintainedQuantity || item.quantity}/{item.quantity}
                              </span>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="h-2 rounded-full bg-emerald-500"
                                  style={{ width: '100%' }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">{item.assignedToName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.completedDate ? formatDate(item.completedDate) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.actualDuration ? `${item.actualDuration} days` : 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">
                            ₱{item.totalCost?.toFixed(2) || '0.00'}
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
                                  onClick={() => {
                                    setViewMaintenance(item);
                                    setIsViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Record
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(item._id, 'In Progress')}
                                >
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  Reopen Task
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {completedPaginatedData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground">No completed maintenance tasks found</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <Pagination
                    currentPage={completedCurrentPage}
                    totalPages={completedTotalPages}
                    onPageChange={setCompletedCurrentPage}
                    totalItems={completedMaintenance.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Update Quantity Modal */}
        <Dialog open={quantityModalOpen} onOpenChange={setQuantityModalOpen}>
          <DialogContent className="sm:max-w-[500px] bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Update Maintenance Quantity</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Update the quantity of {selectedMaintenance?.equipmentName} that has been maintained.
              </DialogDescription>
            </DialogHeader>
            {selectedMaintenance && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Total Quantity</Label>
                    <p className="text-foreground font-semibold">{selectedMaintenance.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Already Maintained</Label>
                    <p className="text-foreground font-semibold">{selectedMaintenance.maintainedQuantity || 0}</p>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="maintainedQuantity" className="text-sm font-medium text-foreground">
                    Maintained Quantity *
                  </Label>
                  <Input
                    id="maintainedQuantity"
                    type="number"
                    min={selectedMaintenance.maintainedQuantity || 0}
                    max={selectedMaintenance.quantity}
                    value={maintainedQuantity}
                    onChange={(e) => setMaintainedQuantity(safeParseInt(e.target.value, 0))}
                    className="border-border focus-visible:ring-ring"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter how many units have been maintained ({selectedMaintenance.maintainedQuantity || 0} to {selectedMaintenance.quantity})
                  </p>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    {maintainedQuantity === selectedMaintenance.quantity 
                      ? "All units will be marked as completed and moved to completed maintenance."
                      : `${selectedMaintenance.quantity - maintainedQuantity} units will remain under maintenance.`
                    }
                  </p>
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
                onClick={handleUpdateQuantity}
                disabled={maintainedQuantity < (selectedMaintenance?.maintainedQuantity || 0) || maintainedQuantity > selectedMaintenance?.quantity!}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Wrench className="mr-2 h-4 w-4" />
                Update Quantity
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Maintenance Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-background border border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Maintenance Details</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                View details for {viewMaintenance?.equipmentName}.
              </DialogDescription>
            </DialogHeader>
            {viewMaintenance && (
              <div className="space-y-6 py-4">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${
                    viewMaintenance.status === 'Completed' ? 'bg-emerald-100' :
                    viewMaintenance.status === 'In Progress' ? 'bg-amber-100' :
                    viewMaintenance.status === 'Overdue' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {getStatusIcon(viewMaintenance.status)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{viewMaintenance.equipmentName}</h3>
                    <p className="text-muted-foreground">{viewMaintenance.itemId} • {viewMaintenance.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-foreground">Status</Label>
                      <p className="text-foreground mt-1">{getStatusBadge(viewMaintenance.status)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">Priority</Label>
                      <p className="text-foreground mt-1">{getPriorityBadge(viewMaintenance.priority)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">Type</Label>
                      <p className="text-foreground mt-1">{getTypeBadge(viewMaintenance.type)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">Category</Label>
                      <p className="text-foreground mt-1">{viewMaintenance.category}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">Assigned To</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-foreground">{viewMaintenance.assignedToName}</p>
                      </div>
                      {viewMaintenance.assignedToEmail && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Email: {viewMaintenance.assignedToEmail}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-foreground">Quantity</Label>
                      <div className="mt-1">
                        <p className="text-foreground font-semibold">
                          {viewMaintenance.maintainedQuantity || 0} / {viewMaintenance.quantity} maintained
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              (viewMaintenance.maintainedQuantity || 0) === viewMaintenance.quantity ? 'bg-emerald-500' :
                              (viewMaintenance.maintainedQuantity || 0) > 0 ? 'bg-amber-500' : 'bg-gray-300'
                            }`}
                            style={{ 
                              width: `${((viewMaintenance.maintainedQuantity || 0) / viewMaintenance.quantity) * 100}%` 
                            }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {viewMaintenance.remainingQuantity || viewMaintenance.quantity} units remaining
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">Scheduled Date</Label>
                      <p className="text-foreground mt-1">{viewMaintenance.formattedScheduledDate || formatDate(viewMaintenance.scheduledDate)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">Due Date</Label>
                      <p className="text-foreground mt-1">{viewMaintenance.formattedDueDate || formatDate(viewMaintenance.dueDate)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">Next Maintenance</Label>
                      <p className="text-foreground mt-1">
                        {viewMaintenance.nextMaintenance && viewMaintenance.nextMaintenance !== '' ? 
                          formatDate(viewMaintenance.nextMaintenance || '') : 'Not set'
                        }
                      </p>
                    </div>
                    {viewMaintenance.completedDate && (
                      <div>
                        <Label className="text-sm font-medium text-foreground">Completed Date</Label>
                        <p className="text-foreground mt-1">{formatDate(viewMaintenance.completedDate)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {viewMaintenance.description && (
                  <div>
                    <Label className="text-sm font-medium text-foreground">Description</Label>
                    <p className="text-foreground mt-1">{viewMaintenance.description}</p>
                  </div>
                )}

                {viewMaintenance.partsUsed && viewMaintenance.partsUsed.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-foreground">Parts Used</Label>
                    <div className="mt-2 space-y-2">
                      {viewMaintenance.partsUsed.map((part, index) => (
                        <div key={index} className="flex justify-between text-sm border-b pb-2">
                          <span>{part.name} (x{part.quantity})</span>
                          <span>₱{(part.quantity * part.cost).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total Cost</span>
                        <span>₱{viewMaintenance.totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
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

        {/* Edit Maintenance Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[800px] bg-background border border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Edit Maintenance</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Update maintenance details.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-destructive text-sm mb-4">{error}</p>}
            {editMaintenance && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-equipmentName" className="text-sm font-medium text-foreground">
                        Equipment Name *
                      </Label>
                      <Input
                        id="edit-equipmentName"
                        value={editMaintenance.equipmentName}
                        onChange={(e) => setEditMaintenance({ ...editMaintenance, equipmentName: e.target.value })}
                        className="border-border focus-visible:ring-ring"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-itemId" className="text-sm font-medium text-foreground">
                        Item ID *
                      </Label>
                      <Input
                        id="edit-itemId"
                        value={editMaintenance.itemId}
                        onChange={(e) => setEditMaintenance({ ...editMaintenance, itemId: e.target.value })}
                        className="border-border focus-visible:ring-ring"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-quantity" className="text-sm font-medium text-foreground">
                        Quantity *
                      </Label>
                      <Input
                        id="edit-quantity"
                        type="number"
                        min="1"
                        value={editMaintenance.quantity || ""}
                        onChange={(e) => setEditMaintenance({ 
                          ...editMaintenance, 
                          quantity: safeParseInt(e.target.value, 1)
                        })}
                        className="border-border focus-visible:ring-ring"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-type" className="text-sm font-medium text-foreground">
                        Type *
                      </Label>
                      <Select
                        value={editMaintenance.type}
                        onValueChange={(value) => setEditMaintenance({ ...editMaintenance, type: value })}
                      >
                        <SelectTrigger className="border-border focus-visible:ring-ring">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Calibration">Calibration</SelectItem>
                          <SelectItem value="Repair">Repair</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-priority" className="text-sm font-medium text-foreground">
                        Priority *
                      </Label>
                      <Select
                        value={editMaintenance.priority}
                        onValueChange={(value) => setEditMaintenance({ ...editMaintenance, priority: value })}
                      >
                        <SelectTrigger className="border-border focus-visible:ring-ring">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-assignedToName" className="text-sm font-medium text-foreground">
                        Assigned To *
                      </Label>
                      <FacultySelect
                        faculty={faculty}
                        value={editMaintenance.assignedToName}
                        onSelect={handleEditFacultySelect}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-scheduledDate" className="text-sm font-medium text-foreground">
                        Scheduled Date *
                      </Label>
                      <Input
                        id="edit-scheduledDate"
                        type="date"
                        value={editMaintenance.scheduledDate}
                        onChange={(e) => handleEditScheduledDateChange(e.target.value)}
                        className="border-border focus-visible:ring-ring"
                        required
                        min={formatDateForInput(new Date())}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-estimatedDuration" className="text-sm font-medium text-foreground">
                        Estimated Duration (days) *
                      </Label>
                      <Input
                        id="edit-estimatedDuration"
                        type="number"
                        min="1"
                        value={editMaintenance.estimatedDuration || ""}
                        onChange={(e) => handleEditEstimatedDurationChange(safeParseInt(e.target.value, 1))}
                        className="border-border focus-visible:ring-ring"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-dueDate" className="text-sm font-medium text-foreground">
                        Due Date *
                      </Label>
                      <Input
                        id="edit-dueDate"
                        type="date"
                        value={editMaintenance.dueDate}
                        onChange={(e) => setEditMaintenance({ ...editMaintenance, dueDate: e.target.value })}
                        className="border-border focus-visible:ring-ring bg-muted/50"
                        required
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Automatically calculated from scheduled date + duration
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-nextMaintenance" className="text-sm font-medium text-foreground">
                        Next Maintenance Date *
                      </Label>
                      <Input
                        id="edit-nextMaintenance"
                        type="date"
                        value={editMaintenance.nextMaintenance || ''}
                        onChange={(e) => handleEditNextMaintenanceChange(e.target.value)}
                        className="border-border focus-visible:ring-ring"
                        required
                        min={editMaintenance.dueDate || formatDateForInput(new Date())}
                      />
                      <p className="text-xs text-muted-foreground">
                        Set the date for the next maintenance
                      </p>
                    </div>
                    {/* Total Cost Display */}
                    <div className="grid gap-2">
                      <Label className="text-sm font-medium text-foreground">
                        Total Cost
                      </Label>
                      <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
                        <span className="text-lg font-bold text-green-600">
                          ₱{editMaintenance.totalCost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parts Used Section for Edit */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">
                      Parts Used
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEditPart}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add Part
                    </Button>
                  </div>
                  
                  {editParts.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                      <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No parts added yet</p>
                      <p className="text-xs text-muted-foreground">Add parts to calculate total cost</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {editParts.map((part, index) => (
                        <PartItem
                          key={index}
                          part={part}
                          index={index}
                          onUpdate={updateEditPart}
                          onRemove={removeEditPart}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-description" className="text-sm font-medium text-foreground">
                    Description
                  </Label>
                  <Textarea
                    id="edit-description"
                    value={editMaintenance?.description || ''}
                    onChange={(e) => setEditMaintenance(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="border-border focus-visible:ring-ring min-h-[100px]"
                  />
                </div>
              </>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleUpdateMaintenance}
                disabled={
                  !editMaintenance?.equipmentName ||
                  !editMaintenance?.itemId ||
                  !editMaintenance?.scheduledDate ||
                  !editMaintenance?.dueDate ||
                  !editMaintenance?.nextMaintenance ||
                  !editMaintenance?.assignedToName
                }
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Edit className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Maintenance Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Delete Maintenance</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Are you sure you want to delete this maintenance record? This action cannot be undone.
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
                onClick={handleDeleteMaintenance}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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
            <span className="text-sm text-muted-foreground">Maintenance Dashboard v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

MaintenancePage.pageTitle = "Maintenance Management";