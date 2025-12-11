"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  Package,
  Calendar,
  BookOpen,
  ArrowLeft,
  Search,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Equipment {
  _id: string;
  itemId: string;
  name: string;
  description: string;
  condition: string;
  category: string;
  specifications: Array<{ name: string; value: string; unit?: string }>;
  images: string[];
  available: boolean;
  quantity: number;
  availableQuantity: number;
  actuallyAvailable: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface BorrowFormData {
  equipmentId: string;
  purpose: string;
  quantity: number;
  description: string;
  intendedBorrowDate: string;
  intendedReturnDate: string;
}

export default function BorrowEquipment() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const [formData, setFormData] = useState<BorrowFormData>({
    equipmentId: "",
    purpose: "",
    quantity: 1,
    description: "",
    intendedBorrowDate: "",
    intendedReturnDate: ""
  });

  useEffect(() => {
    fetchAvailableEquipment();
  }, []);

  useEffect(() => {
    filterEquipment();
  }, [equipment, searchTerm, selectedCategory]);

  const fetchAvailableEquipment = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching available equipment...");
      
      const response = await fetch('/api/student/available-equipment');
      
      if (!response.ok) {
        console.error("❌ API response not OK:", response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📋 Equipment API Response:", data);
      
      if (data.success) {
        setEquipment(data.equipment);
        console.log("✅ Equipment loaded successfully:", data.equipment.length);
        
        // Log equipment details for debugging
        data.equipment.forEach((eq: Equipment, index: number) => {
          console.log(`📦 ${index + 1}. ${eq.name} (${eq.itemId}) - Available: ${eq.actuallyAvailable}`);
        });
      } else {
        throw new Error(data.error || 'Failed to fetch equipment');
      }
    } catch (error) {
      console.error('❌ Error fetching equipment:', error);
      toast.error('Failed to load equipment. Please try again.', {
        description: error instanceof Error ? error.message : 'Please check your connection',
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const filterEquipment = () => {
    let filtered = equipment;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredEquipment(filtered);
  };

  const handleEquipmentSelect = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setFormData(prev => ({
      ...prev,
      equipmentId: equipment._id,
      quantity: 1
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuantityChange = (value: string) => {
    const quantity = parseInt(value) || 1;
    
    // Check if requested quantity is available
    if (selectedEquipment && quantity > selectedEquipment.actuallyAvailable) {
      toast.error(`Only ${selectedEquipment.actuallyAvailable} items available`, {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      quantity: quantity
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.equipmentId) {
      toast.error('Please select an equipment item.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    if (!formData.purpose) {
      toast.error('Please provide a purpose for borrowing.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    if (!formData.intendedBorrowDate || !formData.intendedReturnDate) {
      toast.error('Please select both borrow and return dates.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    const borrowDate = new Date(formData.intendedBorrowDate);
    const returnDate = new Date(formData.intendedReturnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (borrowDate < today) {
      toast.error('Borrow date cannot be in the past.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    if (returnDate <= borrowDate) {
      toast.error('Return date must be after borrow date.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    // Check quantity availability
    if (selectedEquipment && formData.quantity > selectedEquipment.actuallyAvailable) {
      toast.error(`Only ${selectedEquipment.actuallyAvailable} items available. Please adjust quantity.`, {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    setSubmitting(true);
    try {
      console.log("🔄 Submitting borrow request...", formData);
      
      const response = await fetch('/api/student/borrow-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log("📡 Response status:", response.status);
      
      // First, check if we got a response at all
      if (!response) {
        throw new Error('No response from server');
      }

      // Try to parse the JSON, but handle non-JSON responses
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("❌ Error parsing JSON:", jsonError);
        throw new Error('Invalid response from server. Please try again.');
      }

      if (response.ok) {
        console.log("✅ Borrow request submitted:", data);
        
        toast.success('Borrow request submitted successfully!', {
          description: 'Your request has been sent for approval.',
          className: "bg-green-100 text-green-800 border border-green-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 5000,
        });

        // Reset form
        setFormData({
          equipmentId: "",
          purpose: "",
          quantity: 1,
          description: "",
          intendedBorrowDate: "",
          intendedReturnDate: ""
        });
        setSelectedEquipment(null);

        // Redirect to requests page after success
        setTimeout(() => {
          router.push('/user/borrow-requests');
        }, 2000);

      } else {
        console.error("❌ API error response:", data);
        throw new Error(data.error || `Failed to submit borrow request (${response.status})`);
      }
    } catch (error) {
      console.error('❌ Error submitting borrow request:', error);
      
      let errorMessage = 'Failed to submit borrow request. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Only show "Equipment" category since that's all we're fetching
  const categories = ["all", "Equipment"];

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Good": return "bg-green-100 text-green-800";
      case "Needs Repair": return "bg-yellow-100 text-yellow-800";
      case "Out of Stock": return "bg-red-100 text-red-800";
      case "Under Maintenance": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getAvailabilityBadge = (available: boolean, actuallyAvailable: number) => {
    if (!available || actuallyAvailable === 0) {
      return { color: "bg-red-100 text-red-800", text: "Not Available" };
    }
    return { 
      color: "bg-green-100 text-green-800", 
      text: `Available (${actuallyAvailable})` 
    };
  };

  const formatImageSrc = (images: string[] | undefined) => {
    if (!images || images.length === 0) return null;
    
    const firstImage = images[0];
    
    // If it's a base64 string
    if (firstImage.startsWith('data:image/')) {
      return firstImage;
    }
    
    // If it's a URL
    if (firstImage.startsWith('http')) {
      return firstImage;
    }
    
    return null;
  };

  // Generate quantity options based on available quantity
  const getQuantityOptions = (equipment: Equipment | null) => {
    if (!equipment) return [1];
    
    const maxQuantity = Math.min(equipment.actuallyAvailable, 10);
    return Array.from({ length: maxQuantity }, (_, i) => i + 1);
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />
      
      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-br from-green-50 to-blue-50">
        <motion.div
          className="container mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <h1 className="text-4xl font-bold text-[#16a34a] mb-4">
            Borrow Equipment
          </h1>
          <p className="text-lg text-black max-w-2xl mx-auto mb-8">
            Browse and request laboratory equipment for your academic activities
          </p>
          
          {/* Quick Stats */}
          <div className="max-w-md mx-auto grid grid-cols-2 gap-4 text-center">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-2xl font-bold text-[#16a34a]">{equipment.length}</div>
              <div className="text-sm text-gray-600">Total Equipment</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-2xl font-bold text-green-600">
                {equipment.filter(eq => eq.actuallyAvailable > 0).length}
              </div>
              <div className="text-sm text-gray-600">Available Now</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Equipment Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-2 border-[#16a34a] hover:shadow-lg transition-all duration-300 h-full">
                <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/user/download')}
                        className="text-[#16a34a] hover:bg-green-100 hover:text-green-700"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div>
                        <CardTitle className="text-[#16a34a]">Available Equipment</CardTitle>
                        <CardDescription className="text-black">
                          {equipment.length} items found • {equipment.filter(eq => eq.actuallyAvailable > 0).length} available now
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchAvailableEquipment}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Search and Filter */}
                  <div className="space-y-4 mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search equipment by name, description, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="flex space-x-4">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category === "all" ? "All Categories" : category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Equipment List */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a] mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading equipment from database...</p>
                        <p className="text-sm text-gray-500">Fetching all available equipment</p>
                      </div>
                    ) : filteredEquipment.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">
                          {equipment.length === 0 
                            ? "No equipment available in the database." 
                            : "No equipment matches your search criteria."
                          }
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          {equipment.length === 0 
                            ? "Please check if equipment items are added to the system."
                            : "Try adjusting your search terms or filters."
                          }
                        </p>
                        <Button 
                          onClick={fetchAvailableEquipment}
                          variant="outline"
                          className="mt-2"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh List
                        </Button>
                      </div>
                    ) : (
                      filteredEquipment.map(item => {
                        const availability = getAvailabilityBadge(item.available, item.actuallyAvailable);
                        const imageSrc = formatImageSrc(item.images);
                        const canSelect = item.available && item.actuallyAvailable > 0;
                        
                        return (
                          <div
                            key={item._id}
                            className={`p-4 border rounded-lg transition-all ${
                              selectedEquipment?._id === item._id
                                ? 'border-[#16a34a] bg-green-50'
                                : canSelect 
                                  ? 'border-gray-200 hover:border-[#16a34a] hover:bg-gray-50 cursor-pointer'
                                  : 'border-gray-200 opacity-60 cursor-not-allowed'
                            }`}
                            onClick={() => canSelect && handleEquipmentSelect(item)}
                          >
                            <div className="flex space-x-3">
                              {/* Equipment Image */}
                              <div className="flex-shrink-0">
                                {imageSrc ? (
                                  <div className="w-16 h-16 relative rounded-lg overflow-hidden border border-gray-200">
                                    <Image
                                      src={imageSrc}
                                      alt={item.name}
                                      fill
                                      className="object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-black truncate">{item.name}</h3>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs">
                                        {item.itemId}
                                      </Badge>
                                      <Badge className={`text-xs ${getConditionColor(item.condition)}`}>
                                        {item.condition}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {item.category}
                                      </Badge>
                                      <Badge className={`text-xs ${availability.color}`}>
                                        {availability.text}
                                      </Badge>
                                    </div>
                                  </div>
                                  {selectedEquipment?._id === item._id && (
                                    <CheckCircle2 className="h-5 w-5 text-[#16a34a] flex-shrink-0 mt-1" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Borrow Request Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-2 border-[#16a34a] hover:shadow-lg transition-all duration-300 h-full">
                <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                  <CardTitle className="text-[#16a34a]">Borrowing Details</CardTitle>
                  <CardDescription className="text-black">
                    {selectedEquipment 
                      ? `Request to borrow: ${selectedEquipment.name}`
                      : 'Select equipment to continue'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedEquipment ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Selected Equipment Info */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex space-x-4">
                          {/* Equipment Image */}
                          {formatImageSrc(selectedEquipment.images) ? (
                            <div className="flex-shrink-0">
                              <div className="w-20 h-20 relative rounded-lg overflow-hidden border border-gray-300">
                                <Image
                                  src={formatImageSrc(selectedEquipment.images)!}
                                  alt={selectedEquipment.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <h4 className="font-semibold text-black">{selectedEquipment.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{selectedEquipment.description}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                ID: {selectedEquipment.itemId}
                              </Badge>
                              <Badge className={`text-xs ${getConditionColor(selectedEquipment.condition)}`}>
                                {selectedEquipment.condition}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {selectedEquipment.category}
                              </Badge>
                              <Badge className={`text-xs ${getAvailabilityBadge(selectedEquipment.available, selectedEquipment.actuallyAvailable).color}`}>
                                {getAvailabilityBadge(selectedEquipment.available, selectedEquipment.actuallyAvailable).text}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-black font-medium">
                          Quantity (Max: {selectedEquipment.actuallyAvailable})
                        </Label>
                        <Select
                          value={formData.quantity.toString()}
                          onValueChange={handleQuantityChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getQuantityOptions(selectedEquipment).map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          {selectedEquipment.actuallyAvailable} items available • Total stock: {selectedEquipment.quantity}
                        </p>
                      </div>

                      {/* Purpose */}
                      <div className="space-y-2">
                        <Label htmlFor="purpose" className="text-black font-medium">
                          Purpose <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="purpose"
                          name="purpose"
                          value={formData.purpose}
                          onChange={handleInputChange}
                          placeholder="Describe what you'll use this equipment for..."
                          required
                        />
                      </div>

                      {/* Additional Description */}
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-black font-medium">
                          Additional Notes (Optional)
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Any additional information about your request..."
                          rows={3}
                        />
                      </div>

                      {/* Dates */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="intendedBorrowDate" className="text-black font-medium">
                            <Calendar className="h-4 w-4 inline mr-2" />
                            Borrow Date <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="intendedBorrowDate"
                            name="intendedBorrowDate"
                            type="date"
                            value={formData.intendedBorrowDate}
                            onChange={handleInputChange}
                            required
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="intendedReturnDate" className="text-black font-medium">
                            <Clock className="h-4 w-4 inline mr-2" />
                            Return Date <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="intendedReturnDate"
                            name="intendedReturnDate"
                            type="date"
                            value={formData.intendedReturnDate}
                            onChange={handleInputChange}
                            required
                            min={formData.intendedBorrowDate || new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className="w-full bg-[#16a34a] hover:bg-green-700 text-white"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting Request...
                          </>
                        ) : (
                          <>
                            <BookOpen className="h-4 w-4 mr-2" />
                            Submit Borrow Request
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">Please select an equipment item from the list to continue.</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Click on any available equipment to start your borrowing request.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Badge component
const Badge = ({ 
  variant = "default", 
  className, 
  children 
}: { 
  variant?: "default" | "outline";
  className?: string;
  children: React.ReactNode;
}) => {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};