"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores";
import { useEffect, useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  MoreVertical, 
  Package, 
  X, 
  Edit, 
  User, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Download, 
  Calendar as CalendarIcon,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";

// Define types
interface InventoryItem {
  _id: string;
  itemId: string;
  name: string;
  category: string;
  cost: number;
  quantity: number;
  availableQuantity: number;
  status: string;
}

interface FacultyUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  schoolID: string;
  status: string;
}

interface DisposalRecord {
  _id: string;
  inventoryItem: {
    _id: string;
    itemId: string;
    name: string;
    quantity: number;
    availableQuantity: number;
    cost: number;
  } | null;
  itemId: string;
  equipmentName: string;
  category: string;
  reason: string;
  description: string;
  disposedBy: string;
  disposedById: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  originalCost: number;
  salvageValue: number;
  disposalMethod: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
  disposalDate: string;
  disposalQuantity: number;
  createdAt: string;
  updatedAt: string;
}

// Skeleton Component
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

export default function DisposalPage() {
  const { user } = useAuthStore();
  const [disposals, setDisposals] = useState<DisposalRecord[]>([]);
  const [filteredDisposals, setFilteredDisposals] = useState<DisposalRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<FacultyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New disposal state
  const [newDisposal, setNewDisposal] = useState({
    inventoryItemId: "",
    disposedById: "",
    reason: "",
    description: "",
    disposalMethod: "Destroy",
    notes: "",
    disposalDate: format(new Date(), "yyyy-MM-dd"),
    disposalQuantity: 1,
  });

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDisposal, setSelectedDisposal] = useState<DisposalRecord | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Analytics data
  const analyticsData = useMemo(() => {
    const totalDisposals = disposals.length;
    const pendingDisposals = disposals.filter(d => d.status === 'Pending').length;
    const completedDisposals = disposals.filter(d => d.status === 'Completed').length;
    const cancelledDisposals = disposals.filter(d => d.status === 'Cancelled').length;
    const totalValueDisposed = disposals.reduce((sum, d) => sum + d.originalCost, 0);
    const totalSalvageValue = disposals.reduce((sum, d) => sum + d.salvageValue, 0);
    const totalLoss = totalValueDisposed - totalSalvageValue;

    const consumablesDisposals = disposals.filter(d => d.category === 'Consumables').length;
    const liquidsDisposals = disposals.filter(d => d.category === 'Liquids').length;

    return {
      totalDisposals,
      pendingDisposals,
      completedDisposals,
      cancelledDisposals,
      totalValueDisposed,
      totalSalvageValue,
      totalLoss,
      consumablesDisposals,
      liquidsDisposals
    };
  }, [disposals]);

  // Prepare inventory options for combobox
  const inventoryOptions = inventory.map((item) => ({
    value: item._id,
    label: `${item.itemId} - ${item.name} (${item.category}) - Available: ${item.availableQuantity}`,
  }));

  // Prepare faculty options for combobox
  const facultyOptions = facultyUsers.map((faculty) => ({
    value: faculty._id,
    label: `${faculty.firstName} ${faculty.lastName} (${faculty.email}) - ${faculty.schoolID}`,
  }));

  // Fetch disposal records
  const fetchDisposals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/disposals", { 
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        let errorMessage = `Failed to fetch disposal records: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          errorMessage = `Failed to fetch disposal records: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setDisposals(data);
      setFilteredDisposals(data);
      
    } catch (error: any) {
      console.error("Error fetching disposal records:", error);
      setError(`Failed to load disposal records: ${error.message}`);
      setDisposals([]);
      setFilteredDisposals([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch inventory items for disposal - ONLY CONSUMABLES AND LIQUIDS
  const fetchInventory = async () => {
    try {
      setInventoryLoading(true);
      
      const response = await fetch("/api/inventory", { 
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Filter to only show active, non-disposed Consumables and Liquids with available quantity
      const availableItems = data.filter((item: InventoryItem) => 
        item.status === "Active" && 
        item.availableQuantity > 0 &&
        (item.category === "Consumables" || item.category === "Liquids")
      );
      
      setInventory(availableItems);
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      setError(`Failed to load inventory: ${error.message}`);
      setInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  // Fetch faculty users for Disposed By selection - ONLY FACULTY ROLE
  const fetchFacultyUsers = async () => {
    try {
      setFacultyLoading(true);
      
      const response = await fetch("/api/users?role=faculty&status=active", { 
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setFacultyUsers([]);
          return;
        }
        throw new Error(`Failed to fetch faculty users: ${response.status}`);
      }
      
      const data = await response.json();
      const facultyOnly = data.filter((user: FacultyUser) => user.role === 'faculty');
      setFacultyUsers(facultyOnly);
    } catch (error: any) {
      console.error("Error fetching faculty users:", error);
      setFacultyUsers([]);
    } finally {
      setFacultyLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchDisposals(),
          fetchInventory(),
          fetchFacultyUsers()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, []);

  // Filter disposals when filters change
  useEffect(() => {
    let result = disposals;

    if (searchTerm) {
      result = result.filter(
        (disposal) =>
          disposal.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          disposal.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          disposal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          disposal.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
          disposal.disposedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((disposal) => disposal.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((disposal) => disposal.category === categoryFilter);
    }

    if (methodFilter !== "all") {
      result = result.filter((disposal) => disposal.disposalMethod === methodFilter);
    }

    setFilteredDisposals(result);
    setCurrentPage(1);
  }, [disposals, searchTerm, statusFilter, categoryFilter, methodFilter]);

  // Paginated data
  const paginatedDisposals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDisposals.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDisposals, currentPage, itemsPerPage]);

  // Handle input changes for new disposal
  const handleInputChange = (name: string, value: string | number) => {
    setNewDisposal(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === "inventoryItemId" && value) {
      const selectedItem = inventory.find(item => item._id === value);
      if (selectedItem) {
        setNewDisposal(prev => ({
          ...prev,
          disposalQuantity: Math.min(prev.disposalQuantity, selectedItem.availableQuantity)
        }));
      }
    }
  };

  // Get selected inventory item
  const getSelectedInventoryItem = () => {
    return inventory.find(item => item._id === newDisposal.inventoryItemId);
  };

  // Get selected faculty user
  const getSelectedFacultyUser = () => {
    return facultyUsers.find(user => user._id === newDisposal.disposedById);
  };

  // Submit new disposal
  const submitDisposal = async () => {
    setError(null);
    setSuccess(null);

    if (!newDisposal.inventoryItemId || !newDisposal.disposedById || !newDisposal.reason || !newDisposal.description) {
      setError("Please fill in all required fields");
      return;
    }

    const selectedItem = getSelectedInventoryItem();
    if (!selectedItem) {
      setError("Selected inventory item not found");
      return;
    }

    const selectedFaculty = getSelectedFacultyUser();
    if (!selectedFaculty) {
      setError("Selected faculty member not found");
      return;
    }

    if (selectedFaculty.role !== 'faculty') {
      setError("Selected user is not a faculty member");
      return;
    }

    if (newDisposal.disposalQuantity < 1) {
      setError("Disposal quantity must be at least 1");
      return;
    }

    if (newDisposal.disposalQuantity > selectedItem.availableQuantity) {
      setError(`Disposal quantity cannot exceed available quantity (${selectedItem.availableQuantity})`);
      return;
    }

    try {
      const disposalData = {
        ...newDisposal,
        disposedBy: `${selectedFaculty.firstName} ${selectedFaculty.lastName}`,
        disposedById: selectedFaculty._id,
      };

      const response = await fetch("/api/disposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disposalData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to create disposal record: ${response.status}`);
      }

      await fetchDisposals();
      await fetchInventory();
      
      setNewDisposal({
        inventoryItemId: "",
        disposedById: "",
        reason: "",
        description: "",
        disposalMethod: "Destroy",
        notes: "",
        disposalDate: format(new Date(), "yyyy-MM-dd"),
        disposalQuantity: 1,
      });
      
      setSuccess("Disposal record created successfully!");
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating disposal record:", error);
      setError(error.message || "Failed to create disposal record");
    }
  };

  // Update disposal status
  const updateDisposalStatus = async (disposalId: string, status: 'Completed' | 'Cancelled') => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/disposals/${disposalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to update disposal: ${response.status}`);
      }

      await fetchDisposals();
      await fetchInventory();
      setSuccess(`Disposal record ${status.toLowerCase()} successfully!`);
    } catch (error: any) {
      console.error("Error updating disposal record:", error);
      setError(error.message || "Failed to update disposal record");
    }
  };

  // View disposal details
  const viewDisposal = (disposal: DisposalRecord) => {
    setSelectedDisposal(disposal);
    setIsViewDialogOpen(true);
  };

  // Date formatting
  const safeFormat = (dateString: string): string => {
    if (!dateString) return "Not Set";
    
    try {
      const date = parseISO(dateString);
      return date && isValid(date) ? format(date, "MMM dd, yyyy") : "Invalid Date";
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Badge components - Matching dashboard style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Pending</Badge>;
      case "Completed":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Completed</Badge>;
      case "Cancelled":
        return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "Recycle":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Recycle</Badge>;
      case "Donate":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Donate</Badge>;
      case "Sell":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Sell</Badge>;
      case "Destroy":
        return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white">Destroy</Badge>;
      case "Other":
        return <Badge variant="outline">Other</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Consumables":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Consumables</Badge>;
      case "Liquids":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Liquids</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "faculty":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Faculty</Badge>;
      case "admin":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Admin</Badge>;
      case "student":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Student</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setNewDisposal({
      inventoryItemId: "",
      disposedById: "",
      reason: "",
      description: "",
      disposalMethod: "Destroy",
      notes: "",
      disposalDate: format(new Date(), "yyyy-MM-dd"),
      disposalQuantity: 1,
    });
  };

  if (loading || inventoryLoading || facultyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex-1 space-y-6 p-6">
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
            <h1 className="text-3xl font-bold text-foreground">Disposal Management</h1>
            <p className="text-muted-foreground mt-2">Track and manage disposal records for Consumables and Liquids only</p>
            {error && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-600">{success}</p>
              </div>
            )}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create New Disposal Record</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Record the disposal of Consumables and Liquids inventory items with proper documentation.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* Faculty Selection - ONLY FACULTY USERS */}
                <div className="space-y-2">
                  <Label htmlFor="disposedById" className="text-sm font-medium text-foreground">
                    Disposed By (Faculty Only) *
                  </Label>
                  <Combobox
                    options={facultyOptions}
                    value={newDisposal.disposedById}
                    onValueChange={(value) => handleInputChange("disposedById", value)}
                    placeholder="Select faculty member"
                    searchPlaceholder="Search faculty members by name or email..."
                    emptyMessage="No faculty members found."
                    className="w-full"
                  />
                  {facultyUsers.length === 0 && (
                    <p className="text-sm text-red-600">
                      No faculty members available. Please ensure there are active faculty users in the system.
                    </p>
                  )}
                </div>

                {/* Inventory Item Selection */}
                <div className="space-y-2">
                  <Label htmlFor="inventoryItem" className="text-sm font-medium text-foreground">
                    Select Inventory Item *
                  </Label>
                  <Combobox
                    options={inventoryOptions}
                    value={newDisposal.inventoryItemId}
                    onValueChange={(value) => handleInputChange("inventoryItemId", value)}
                    placeholder="Select an item to dispose"
                    searchPlaceholder="Search items by ID, name, or category..."
                    emptyMessage="No items found matching your search."
                    className="w-full"
                  />
                  {inventory.length === 0 && (
                    <p className="text-sm text-red-600">
                      No Consumables or Liquids available for disposal.
                    </p>
                  )}
                </div>

                {/* Disposal Quantity */}
                {newDisposal.inventoryItemId && (
                  <div className="space-y-2">
                    <Label htmlFor="disposalQuantity" className="text-sm font-medium text-foreground">
                      Quantity to Dispose *
                    </Label>
                    <Input
                      id="disposalQuantity"
                      type="number"
                      value={newDisposal.disposalQuantity}
                      onChange={(e) => handleInputChange("disposalQuantity", parseInt(e.target.value) || 1)}
                      min="1"
                      max={getSelectedInventoryItem()?.availableQuantity}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum available: {getSelectedInventoryItem()?.availableQuantity}
                    </p>
                  </div>
                )}

                {/* Disposal Date */}
                <div className="space-y-2">
                  <Label htmlFor="disposalDate" className="text-sm font-medium text-foreground">
                    Disposal Date *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newDisposal.disposalDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newDisposal.disposalDate ? safeFormat(newDisposal.disposalDate) : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newDisposal.disposalDate ? parseISO(newDisposal.disposalDate) : undefined}
                        onSelect={(date) => {
                          if (!date) return;
                          handleInputChange("disposalDate", format(date, "yyyy-MM-dd"));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Disposal Method */}
                <div className="space-y-2">
                  <Label htmlFor="disposalMethod" className="text-sm font-medium text-foreground">
                    Disposal Method *
                  </Label>
                  <Select 
                    value={newDisposal.disposalMethod} 
                    onValueChange={(value) => handleInputChange("disposalMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select disposal method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Recycle">Recycle</SelectItem>
                      <SelectItem value="Donate">Donate</SelectItem>
                      <SelectItem value="Sell">Sell</SelectItem>
                      <SelectItem value="Destroy">Destroy</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-medium text-foreground">
                    Reason for Disposal *
                  </Label>
                  <Input
                    id="reason"
                    value={newDisposal.reason}
                    onChange={(e) => handleInputChange("reason", e.target.value)}
                    placeholder="Enter reason for disposal"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-foreground">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={newDisposal.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Provide detailed description of the disposal"
                    rows={3}
                    required
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-foreground">
                    Additional Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={newDisposal.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Any additional notes or comments"
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={submitDisposal}
                  disabled={
                    !newDisposal.inventoryItemId ||
                    !newDisposal.disposedById ||
                    !newDisposal.reason ||
                    !newDisposal.description ||
                    !newDisposal.disposalDate ||
                    newDisposal.disposalQuantity < 1 ||
                    inventory.length === 0 ||
                    facultyUsers.length === 0
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Disposal Record
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Disposals</CardTitle>
              <Trash2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.totalDisposals}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <p className="text-xs text-muted-foreground">
                  {analyticsData.completedDisposals} completed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Pending Disposals</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analyticsData.pendingDisposals}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <p className="text-xs text-muted-foreground">Awaiting completion</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Value Disposed</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₱{analyticsData.totalValueDisposed.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <p className="text-xs text-muted-foreground">
                  ₱{analyticsData.totalSalvageValue.toLocaleString()} salvage
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground">Total Loss</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₱{analyticsData.totalLoss.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <p className="text-xs text-muted-foreground">Value disposed - salvage</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-500" />
              Filters & Search
            </CardTitle>
            <CardDescription>
              Search and filter disposal records for Consumables and Liquids
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by item ID, equipment name, description, or disposed by..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status-filter" className="text-sm font-medium text-foreground">
                    Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category-filter" className="text-sm font-medium text-foreground">
                    Category
                  </Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Consumables">Consumables</SelectItem>
                      <SelectItem value="Liquids">Liquids</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method-filter" className="text-sm font-medium text-foreground">
                    Disposal Method
                  </Label>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="Recycle">Recycle</SelectItem>
                      <SelectItem value="Donate">Donate</SelectItem>
                      <SelectItem value="Sell">Sell</SelectItem>
                      <SelectItem value="Destroy">Destroy</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
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
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Status: {statusFilter}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setStatusFilter("all")}
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
                {methodFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Method: {methodFilter}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setMethodFilter("all")}
                    />
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disposal Records Table */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Disposal Records - Consumables & Liquids
            </CardTitle>
            <CardDescription>
              {filteredDisposals.length} record(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Item ID</TableHead>
                    <TableHead className="font-semibold">Equipment Name</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Quantity</TableHead>
                    <TableHead className="font-semibold">Disposal Date</TableHead>
                    <TableHead className="font-semibold">Method</TableHead>
                    <TableHead className="font-semibold">Reason</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Disposed By</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDisposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {disposals.length === 0 ? "No disposal records found" : "No disposal records match your filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDisposals.map((disposal) => (
                      <TableRow key={disposal._id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm font-medium text-foreground">
                          {disposal.itemId}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {disposal.equipmentName}
                        </TableCell>
                        <TableCell>
                          {getCategoryBadge(disposal.category)}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {disposal.disposalQuantity}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {safeFormat(disposal.disposalDate)}
                        </TableCell>
                        <TableCell>
                          {getMethodBadge(disposal.disposalMethod)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={disposal.reason}>
                          {disposal.reason}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(disposal.status)}
                        </TableCell>
                        <TableCell className="text-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{disposal.disposedBy}</span>
                            {disposal.disposedById && (
                              <Badge variant="outline" className="text-xs">
                                {disposal.disposedById.role}
                              </Badge>
                            )}
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
                                onClick={() => viewDisposal(disposal)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {disposal.status === 'Pending' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => updateDisposalStatus(disposal._id, 'Completed')}
                                    className="cursor-pointer text-emerald-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Completed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateDisposalStatus(disposal._id, 'Cancelled')}
                                    className="cursor-pointer text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel Disposal
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {filteredDisposals.length > itemsPerPage && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredDisposals.length)} to {Math.min(currentPage * itemsPerPage, filteredDisposals.length)} of {filteredDisposals.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredDisposals.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredDisposals.length / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Disposal Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-foreground">Disposal Record Details</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Complete information for disposal record
              </DialogDescription>
            </DialogHeader>
            
            {selectedDisposal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Item ID</Label>
                    <p className="text-sm text-foreground font-mono">{selectedDisposal.itemId}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Equipment Name</Label>
                    <p className="text-sm text-foreground">{selectedDisposal.equipmentName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Category</Label>
                    <div>{getCategoryBadge(selectedDisposal.category)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Quantity Disposed</Label>
                    <p className="text-sm text-foreground">{selectedDisposal.disposalQuantity}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Original Cost</Label>
                    <p className="text-sm text-foreground">₱{selectedDisposal.originalCost.toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Salvage Value</Label>
                    <p className="text-sm text-foreground">₱{selectedDisposal.salvageValue.toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Disposal Method</Label>
                    <div>{getMethodBadge(selectedDisposal.disposalMethod)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Status</Label>
                    <div>{getStatusBadge(selectedDisposal.status)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Reason for Disposal</Label>
                  <p className="text-sm text-foreground">{selectedDisposal.reason}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Description</Label>
                  <p className="text-sm text-foreground">{selectedDisposal.description}</p>
                </div>

                {selectedDisposal.notes && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Additional Notes</Label>
                    <p className="text-sm text-foreground">{selectedDisposal.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Disposed By</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-foreground font-medium">{selectedDisposal.disposedBy}</p>
                        {selectedDisposal.disposedById && (
                          <div className="flex items-center gap-2 mt-1">
                            {getRoleBadge(selectedDisposal.disposedById.role)}
                            <span className="text-xs text-muted-foreground">
                              {selectedDisposal.disposedById.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Disposal Date</Label>
                    <p className="text-sm text-foreground">{safeFormat(selectedDisposal.disposalDate)}</p>
                  </div>
                </div>
              </div>
            )}
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
            <span className="text-sm text-muted-foreground">Disposal Management v1.0 - Consumables & Liquids Only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

DisposalPage.pageTitle = "Fisheries Lab Disposal Management - Consumables & Liquids";