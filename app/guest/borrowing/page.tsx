"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster, toast } from "sonner";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { GuestBorrowingStatus } from "@/components/public/guest-borrowing-status";
import Image from "next/image";
import { LogOut, ChevronLeft, ChevronRight, Search, Filter, Mail, Key, Check, RefreshCw, MapPin } from "lucide-react";

// Animation variants
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

// Define category enum from Inventory model
const CATEGORY_ENUM = [
  "Equipment",
  "Consumables", 
  "Materials",
  "Instruments",
  "Furniture",
  "Electronics",
  "Liquids",
  "Safety Gear",
  "Lab Supplies",
  "Tools"
] as const;

interface Specification {
  name: string;
  value: string;
  unit?: string;
}

interface RoomMetadata {
  roomNumber?: string;
  building?: string;
  floor?: string;
  capacity?: number;
}

interface RoomDetails {
  name: string;
  location?: string;
  metadata?: RoomMetadata;
}

interface Equipment {
  _id: string;
  itemId: string;
  name: string;
  description: string;
  specifications: Specification[];
  condition: string;
  category: string;
  cost: number;
  yearPurchased: string;
  maintenanceNeeds: string;
  calibration: string;
  roomAssigned: string;
  roomDetails?: RoomDetails;
  calibrator: string;
  images: string[];
  maintenanceHistory: any[];
  calibrationHistory: any[];
  createdAt: string;
  updatedAt: string;
  canBeBorrowed: boolean;
  quantity: number;
  availableQuantity: number;
  borrowingAvailableQuantity: number;
  status: string;
  maintenanceQuantity?: number;
  calibrationQuantity?: number;
  disposalQuantity?: number;
  borrowedQuantity?: number;
}

interface BorrowRequest {
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  course: string;
  year: string;
  section: string;
  purpose: string;
  equipmentId: string;
  borrowDuration: string;
}

interface CategoryWithStatus {
  name: string;
  hasBorrowableItems: boolean;
  itemCount: number;
  borrowableCount: number;
}

// Helper function to get displayable image URL from images array
const getDisplayableImageUrl = (images: string[] | undefined): string | null => {
  if (!images || images.length === 0) {
    return null;
  }

  const firstImage = images[0];
  
  if (firstImage.startsWith('data:image/')) {
    return firstImage;
  }

  if (firstImage.startsWith('http')) {
    return firstImage;
  }

  return null;
};

// Helper function to format room information
const formatRoomInfo = (equipment: Equipment): string => {
  if (!equipment.roomAssigned) {
    return "Not assigned";
  }
  
  if (equipment.roomDetails) {
    const details = equipment.roomDetails;
    const parts = [];
    
    if (details.metadata?.building) {
      parts.push(details.metadata.building);
    }
    
    if (details.metadata?.roomNumber) {
      parts.push(`Room ${details.metadata.roomNumber}`);
    } else if (details.name) {
      parts.push(details.name);
    }
    
    if (details.metadata?.floor) {
      parts.push(`${details.metadata.floor} floor`);
    }
    
    if (details.location) {
      parts.push(details.location);
    }
    
    return parts.join(" • ") || equipment.roomAssigned;
  }
  
  return equipment.roomAssigned;
};

export default function GuestBorrowingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [categoriesWithStatus, setCategoriesWithStatus] = useState<CategoryWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [borrowRequest, setBorrowRequest] = useState<BorrowRequest>({
    schoolId: "",
    firstName: "",
    lastName: "",
    email: "",
    course: "",
    year: "",
    section: "",
    purpose: "",
    equipmentId: "",
    borrowDuration: "1 week"
  });
  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Email verification state
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<'unverified' | 'verifying' | 'verified'>('unverified');
  const [emailVerificationOtp, setEmailVerificationOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpResendDisabled, setOtpResendDisabled] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  // Fetch equipment data
  useEffect(() => {
    fetchEquipment();
  }, []);

  // OTP Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      setOtpResendDisabled(true);
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setOtpResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedCondition !== 'All') params.append('condition', selectedCondition);
      
      // Only add borrowable=true if we want to filter for borrowable items
      params.append('borrowable', 'true');
      
      // Add debug parameter to see what's happening
      if (process.env.NODE_ENV === 'development') {
        params.append('debug', 'true');
      }
      
      console.log('🔄 Fetching equipment with params:', params.toString());
      
      // Fetch equipment data
      const response = await fetch(`/api/guest/equipment?${params.toString()}`);
      const result = await response.json();
      
      console.log('📊 API Response:', {
        success: result.success,
        count: result.count,
        totalInDatabase: result.totalInDatabase,
        categories: result.categories?.length,
        debug: result.debug
      });
      
      if (result.success) {
        const transformedData = result.data.map((item: any) => ({
          ...item,
          yearPurchased: item.yearPurchased 
            ? new Date(item.yearPurchased).getFullYear().toString()
            : new Date().getFullYear().toString(),
          canBeBorrowed: item.canBeBorrowed ?? true,
          quantity: Number(item.quantity) || 1,
          availableQuantity: Number(item.availableQuantity) || 0,
          borrowingAvailableQuantity: Number(item.borrowingAvailableQuantity) || 0,
          status: item.status || 'Active',
          maintenanceQuantity: Number(item.maintenanceQuantity) || 0,
          calibrationQuantity: Number(item.calibrationQuantity) || 0,
          disposalQuantity: Number(item.disposalQuantity) || 0,
          borrowedQuantity: Number(item.borrowedQuantity) || 0,
          images: item.images || []
        }));
        setEquipment(transformedData);
        
        // Set categories with status from API response
        if (result.categories && Array.isArray(result.categories)) {
          const categoriesData: CategoryWithStatus[] = result.categories;
          setCategoriesWithStatus(categoriesData);
          
          // Create categories array with "All" first, then all enum categories
          const allCategories = ["All"];
          
          // Add all categories from the enum, preserving order
          CATEGORY_ENUM.forEach(category => {
            allCategories.push(category);
          });
          
          setCategories(allCategories);
        } else {
          // Fallback to enum categories
          const allCategories = ["All", ...CATEGORY_ENUM];
          setCategories(allCategories);
        }
        
        console.log(`✅ Loaded ${transformedData.length} equipment items`);
        
        // Log room information
        const itemsWithRooms = transformedData.filter((item: Equipment) => item.roomAssigned);
        console.log(`🏢 ${itemsWithRooms.length} items have room assignments`);
        
        // Debug: Show items with borrowing availability
        const borrowableItems = transformedData.filter((item: Equipment) => item.borrowingAvailableQuantity > 0);
        console.log(`📊 Items with borrowing availability: ${borrowableItems.length}`);
        
        if (borrowableItems.length === 0 && transformedData.length > 0) {
          console.warn('⚠️ All items have 0 borrowing availability. Checking first few items:',
            transformedData.slice(0, 3).map((item: Equipment) => ({
              name: item.name,
              canBeBorrowed: item.canBeBorrowed,
              borrowingAvailableQuantity: item.borrowingAvailableQuantity,
              condition: item.condition,
              status: item.status,
              roomAssigned: item.roomAssigned
            }))
          );
        }
      } else {
        toast.error(result.error || 'Failed to load equipment');
        setEquipment([]);
        // Set default categories from enum
        setCategories(["All", ...CATEGORY_ENUM]);
      }
    } catch (error) {
      console.error('❌ Error fetching equipment:', error);
      toast.error('Error loading equipment');
      setEquipment([]);
      // Set default categories from enum
      setCategories(["All", ...CATEGORY_ENUM]);
    } finally {
      setLoading(false);
    }
  };

  // Refetch equipment when filters change
  useEffect(() => {
    fetchEquipment();
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedCondition]);

  // Filter equipment based on search and category
  const filteredEquipment = equipment.filter((item: Equipment) => {
    if (!item.canBeBorrowed || item.borrowingAvailableQuantity <= 0) {
      return false;
    }
    
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.roomAssigned && item.roomAssigned.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesCondition = selectedCondition === "All" || item.condition === selectedCondition;
    return matchesSearch && matchesCategory && matchesCondition;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEquipment.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);

  const conditions = ["All", "Excellent", "Good", "Fair", "Poor", "Damaged", "Needs Repair", "Under Maintenance", "Out of Stock"];

  const handleBorrowInquiry = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setBorrowRequest(prev => ({
      ...prev,
      equipmentId: equipment.itemId,
    }));
    setShowBorrowForm(true);
    // Reset email verification state when opening form
    setEmailVerificationStatus('unverified');
    setShowOtpField(false);
    setEmailVerificationOtp("");
    setOtpTimer(0);
  };

  const handleSendEmailOtp = async () => {
    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(borrowRequest.email)) {
      toast.error("Please enter a valid email address first.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
      return;
    }

    // Check if name fields are filled (optional but good practice)
    if (!borrowRequest.firstName || !borrowRequest.lastName) {
      toast.warning("Please enter your first and last name before requesting OTP.", {
        className: "bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
    }

    setSendingOtp(true);
    try {
      console.log('📧 Sending OTP to email:', borrowRequest.email);
      
      const response = await fetch('/api/guest/borrow-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: borrowRequest.email,
          firstName: borrowRequest.firstName,
          lastName: borrowRequest.lastName
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "OTP sent successfully! Check your email.", {
          className: "bg-green-100 text-green-800 border border-green-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 5000,
        });
        
        setEmailVerificationStatus('verifying');
        setShowOtpField(true);
        setOtpTimer(300); // 5 minutes timer
        setOtpResendDisabled(true);
      } else {
        toast.error(result.error || "Failed to send OTP. Please try again.", {
          className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('💥 Error sending OTP:', error);
      toast.error("Failed to send OTP. Please check your connection and try again.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailVerificationOtp || emailVerificationOtp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
      return;
    }

    setVerifyingOtp(true);
    try {
      console.log('🔐 Verifying OTP:', emailVerificationOtp);
      
      const response = await fetch('/api/guest/borrow-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: borrowRequest.email,
          otp: emailVerificationOtp
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Email verified successfully!", {
          className: "bg-green-100 text-green-800 border border-green-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 5000,
        });
        
        setEmailVerificationStatus('verified');
        setShowOtpField(false);
        setEmailVerificationOtp("");
        setOtpTimer(0);
      } else {
        toast.error(result.error || "Invalid OTP. Please try again.", {
          className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('💥 Error verifying OTP:', error);
      toast.error("Failed to verify OTP. Please try again.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (otpResendDisabled) {
      toast.warning("Please wait before requesting a new OTP.", {
        className: "bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 3000,
      });
      return;
    }

    await handleSendEmailOtp();
  };

  const handleSubmitBorrowRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check all required fields
    if (!borrowRequest.schoolId || !borrowRequest.firstName || !borrowRequest.lastName || 
        !borrowRequest.email || !borrowRequest.course || !borrowRequest.year || 
        !borrowRequest.section || !borrowRequest.purpose) {
      toast.error("Please fill in all required fields.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
      return;
    }

    // Check if email is verified
    if (emailVerificationStatus !== 'verified') {
      toast.error("Please verify your email address before submitting the request.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
      return;
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(borrowRequest.email)) {
      toast.error("Please enter a valid email address.", {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
      return;
    }

    // Check equipment availability
    if (selectedEquipment && selectedEquipment.borrowingAvailableQuantity < 1) {
      toast.error(`Equipment is not available for borrowing.`, {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
      });
      return;
    }

    setSubmitting(true);
    try {
      console.log('🔄 Submitting borrow request:', borrowRequest);
      
      const response = await fetch('/api/guest/borrow-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(borrowRequest),
      });

      const result = await response.json();
      console.log('📨 API Response:', result);

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          if (result.error?.includes('already have a pending request')) {
            toast.warning("You already have a pending request for this equipment. Please wait for it to be processed.", {
              className: "bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
              duration: 5000,
            });
          } else if (result.error?.includes('not available for borrowing')) {
            toast.error("This equipment is not available for borrowing at the moment.", {
              className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
              duration: 5000,
            });
          } else if (result.requiresVerification) {
            setEmailVerificationStatus('unverified');
            setShowOtpField(false);
            toast.error("Email verification expired. Please verify your email again.", {
              className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
              duration: 5000,
            });
          } else {
            toast.error(result.error || "Please check your input and try again.", {
              className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
              duration: 5000,
            });
          }
          return;
        }
        
        // For other HTTP errors
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (result.success) {
        toast.success(result.message || "Borrowing request submitted successfully!", {
          className: "bg-green-100 text-green-800 border border-green-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 5000,
        });
        
        // Reset form
        resetForm();
        fetchEquipment();
      } else {
        console.error('❌ API Error:', result.error);
        
        // Handle verification expired case
        if (result.requiresVerification) {
          setEmailVerificationStatus('unverified');
          setShowOtpField(false);
          toast.error("Email verification expired. Please verify your email again.", {
            className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
            duration: 5000,
          });
        } else if (result.error?.includes('already have a pending request')) {
          toast.warning("You already have a pending request for this equipment. Please wait for it to be processed.", {
            className: "bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
            duration: 5000,
          });
        } else {
          toast.error(result.error || "Failed to submit request. Please check your input and try again.", {
            className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
            duration: 5000,
          });
        }
      }
    } catch (error: any) {
      console.error('💥 Fetch Error:', error);
      
      if (error.message.includes('HTTP error!')) {
        toast.error("Server error. Please try again later.", {
          className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 4000,
        });
      } else {
        toast.error("Network error. Please check your connection and try again.", {
          className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 4000,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setBorrowRequest({
      schoolId: "",
      firstName: "",
      lastName: "",
      email: "",
      course: "",
      year: "",
      section: "",
      purpose: "",
      equipmentId: "",
      borrowDuration: "1 week"
    });
    setShowBorrowForm(false);
    setSelectedEquipment(null);
    setEmailVerificationStatus('unverified');
    setShowOtpField(false);
    setEmailVerificationOtp("");
    setOtpTimer(0);
  };

  const handleLogout = () => {
    localStorage.removeItem('guestToken');
    localStorage.removeItem('guestSession');
    
    toast.success("Successfully logged out", {
      className: "bg-green-100 text-green-800 border border-green-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      duration: 3000,
    });
    
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  };

  // Debug function to test API directly
  const handleDebugAPI = async () => {
    try {
      console.log('🔍 Testing API with different parameters...');
      
      // Test 1: Get all data
      const response1 = await fetch('/api/guest/equipment?debug=true&getAll=false');
      const result1 = await response1.json();
      console.log('📊 Test 1 - Default fetch:', {
        success: result1.success,
        count: result1.count,
        debug: result1.debug
      });
      
      // Test 2: Get without borrowable filter
      const response2 = await fetch('/api/guest/equipment?debug=true&borrowable=false');
      const result2 = await response2.json();
      console.log('📊 Test 2 - Without borrowable filter:', {
        success: result2.success,
        count: result2.count,
        debug: result2.debug
      });
      
      toast.info("Debug tests completed. Check console for details.", {
        duration: 3000,
      });
    } catch (error) {
      console.error('💥 Debug test failed:', error);
    }
  };

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const getStatusColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'bg-green-700 text-white';
      case 'Good': return 'bg-[#16a34a] text-white';
      case 'Fair': return 'bg-yellow-500 text-white';
      case 'Poor': return 'bg-orange-500 text-white';
      case 'Damaged': return 'bg-red-600 text-white';
      case 'Needs Repair': return 'bg-yellow-600 text-white';
      case 'Under Maintenance': return 'bg-red-600 text-white';
      case 'Out of Stock': return 'bg-gray-600 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  const getAvailableQuantityText = (item: Equipment) => {
    const total = item.quantity || 1;
    const available = item.borrowingAvailableQuantity || 0;
    return `${available} of ${total} available for borrowing`;
  };

  const isBorrowable = (item: Equipment) => {
    return item.canBeBorrowed && 
           item.borrowingAvailableQuantity > 0 &&
           item.condition !== "Under Maintenance" &&
           item.condition !== "Out of Stock" &&
           item.maintenanceNeeds === "No" &&
           item.status === "Active";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if category has any borrowable items
  const hasBorrowableItemsInCategory = (category: string) => {
    if (category === "All") return true;
    
    const categoryStatus = categoriesWithStatus.find(cat => cat.name === category);
    if (categoryStatus) {
      return categoryStatus.hasBorrowableItems;
    }
    
    // Fallback: check equipment array
    return equipment.some((item: Equipment) => 
      item.category === category && 
      item.canBeBorrowed && 
      item.borrowingAvailableQuantity > 0
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#16a34a] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-800">Guest Portal</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center space-x-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-br from-green-50 to-blue-50">
        <motion.div
          className="container mx-auto px-4 text-center"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-4xl font-bold text-[#16a34a] mb-4">
            Guest Equipment Borrowing
          </h1>
          <p className="text-lg text-black max-w-2xl mx-auto mb-8">
            Explore our fisheries equipment inventory. Submit borrowing requests and verify via email OTP.
          </p>
          
          {/* Search and Filter */}
          <Card className="max-w-4xl mx-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="search" className="text-black mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Equipment
                </Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name, description, or room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-gray-300 focus:border-[#16a34a]"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-black mb-2 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Category
                </Label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-[#16a34a] focus:ring-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {categories.map(category => {
                    const hasItems = hasBorrowableItemsInCategory(category);
                    return (
                      <option 
                        key={category} 
                        value={category}
                        disabled={!hasItems && category !== "All"}
                        className={!hasItems && category !== "All" ? "text-gray-400 bg-gray-100" : ""}
                      >
                        {category} {!hasItems && category !== "All" && "(No borrowable items)"}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {categories.length - 1} categories available
                </p>
              </div>
              <div>
                <Label htmlFor="condition" className="text-black mb-2">Condition</Label>
                <select
                  id="condition"
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-[#16a34a] focus:ring-[#16a34a]"
                >
                  {conditions.map(condition => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-600">
                Showing {filteredEquipment.length} borrowable equipment items
                {searchTerm && ` for "${searchTerm}"`}
                {selectedCategory !== "All" && ` in ${selectedCategory}`}
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={fetchEquipment}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </Button>
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("All");
                    setSelectedCondition("All");
                  }}
                  variant="outline"
                  className="text-sm"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Equipment Grid */}
      <section className="py-12 bg-white">
        <motion.div
          className="container mx-auto px-4"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#16a34a] mb-4">
              Available Equipment for Borrowing
            </h2>
            <p className="text-black max-w-2xl mx-auto">
              Browse available equipment. Submit requests and verify via email OTP.
            </p>
            {categories.length > 1 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="text-sm text-gray-600">Categories:</span>
                {categories.slice(1).map(category => (
                  <span 
                    key={category}
                    className={`text-xs px-2 py-1 rounded-full ${
                      hasBorrowableItemsInCategory(category) 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <Card className="text-center p-8">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16a34a] mb-4"></div>
                <p className="text-black">Loading equipment...</p>
              </div>
            </Card>
          ) : filteredEquipment.length === 0 ? (
            <Card className="text-center p-8">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Borrowable Equipment Found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory !== "All" || selectedCondition !== "All" 
                    ? "No equipment matches your current filters." 
                    : "Currently, there are no equipment items available for borrowing."}
                </p>
                {selectedCategory !== "All" && !hasBorrowableItemsInCategory(selectedCategory) && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      The category "{selectedCategory}" has no borrowable items at the moment.
                    </p>
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button 
                    onClick={fetchEquipment}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Try Again</span>
                  </Button>
                  <Button 
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("All");
                      setSelectedCondition("All");
                    }}
                    className="bg-[#16a34a] hover:bg-green-700"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {currentItems.map((item: Equipment) => (
                  <motion.div
                    key={item._id}
                    variants={cardVariants}
                    whileHover={{ scale: 1.02 }}
                    className="h-full"
                  >
                    <Card className="overflow-hidden border-2 border-[#16a34a] hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                      <div className="relative h-48 w-full bg-gray-100 flex items-center justify-center">
                        {getDisplayableImageUrl(item.images) ? (
                          <Image
                            src={getDisplayableImageUrl(item.images)!}
                            alt={item.name}
                            width={300}
                            height={200}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-gray-200 text-gray-500">
                            <div className="w-12 h-12 mb-2">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="text-sm">No Image</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                          <p className="text-sm text-gray-200">{item.category}</p>
                        </div>
                        <span
                          className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.condition)}`}
                        >
                          {item.condition}
                        </span>
                      </div>
                      <CardContent className="p-4 flex-1 flex flex-col">
                        <p className="text-sm text-black mb-4 flex-1 line-clamp-3">
                          {item.description || "No description available."}
                        </p>
                        
                        {/* Room Information */}
                        {item.roomAssigned && (
                          <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-100">
                            <div className="flex items-center gap-1 mb-1">
                              <MapPin className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-medium text-blue-800">Location:</span>
                            </div>
                            <p className="text-xs text-blue-700">
                              {formatRoomInfo(item)}
                            </p>
                          </div>
                        )}
                        
                        {/* Availability Status */}
                        <div className="mb-3 p-2 bg-gray-50 rounded">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-700">Available:</span>
                            <span className={`text-xs font-semibold ${item.borrowingAvailableQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {getAvailableQuantityText(item)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-600">Status:</span>
                            <span className={`text-xs font-medium ${item.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-600">Can be borrowed:</span>
                            <span className={`text-xs font-medium ${item.canBeBorrowed ? 'text-green-600' : 'text-red-600'}`}>
                              {item.canBeBorrowed ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Specifications */}
                        {item.specifications && item.specifications.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-black mb-2">Specifications:</h4>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {item.specifications.slice(0, 2).map((spec: Specification, index: number) => (
                                <li key={index} className="truncate">• {spec.name}: {spec.value} {spec.unit || ''}</li>
                              ))}
                              {item.specifications.length > 2 && (
                                <li className="text-gray-500 text-xs">+{item.specifications.length - 2} more specifications</li>
                              )}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs text-gray-600">
                            ID: {item.itemId}
                          </span>
                          <span className="text-xs text-gray-600">
                            ₱{item.cost?.toLocaleString() || '0'}
                          </span>
                        </div>
                        
                        <Button
                          className="w-full bg-[#16a34a] hover:bg-white hover:text-[#16a34a] hover:border-[#16a34a] transition-all duration-300 rounded-lg"
                          onClick={() => handleBorrowInquiry(item)}
                          disabled={!isBorrowable(item)}
                        >
                          {isBorrowable(item) ? "Request to Borrow" : "Not Available"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                  <div className="text-sm text-gray-600">
                    Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredEquipment.length)} of {filteredEquipment.length} items
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="flex items-center space-x-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </Button>

                    <div className="flex space-x-1">
                      {getPageNumbers().map((pageNumber: number) => (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageClick(pageNumber)}
                          className={`w-10 h-10 ${
                            currentPage === pageNumber 
                              ? 'bg-[#16a34a] text-white' 
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </section>

      {/* Borrowing Information */}
      <section className="py-12 bg-gray-50">
        <motion.div
          className="container mx-auto px-4"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-[#16a34a] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">1</span>
              </div>
              <h3 className="font-semibold text-black mb-2">Submit Request</h3>
              <p className="text-sm text-gray-600">Fill out the borrowing request form with your details.</p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-[#16a34a] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">2</span>
              </div>
              <h3 className="font-semibold text-black mb-2">Verify Email</h3>
              <p className="text-sm text-gray-600">Check your email for OTP verification code.</p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-[#16a34a] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">3</span>
              </div>
              <h3 className="font-semibold text-black mb-2">Submit Request</h3>
              <p className="text-sm text-gray-600">Submit your verified borrowing request.</p>
            </Card>
          </div>
        </motion.div>
      </section>

      {/* Status Check Section */}
      <section className="py-12 bg-white">
        <motion.div
          className="container mx-auto px-4"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <GuestBorrowingStatus />
        </motion.div>
      </section>

      {/* Borrowing Form Modal */}
      <AnimatePresence>
        {showBorrowForm && selectedEquipment && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-[#16a34a]">Borrowing Request</h3>
                  <Button
                    variant="ghost"
                    onClick={() => setShowBorrowForm(false)}
                    className="text-black hover:text-gray-600"
                    disabled={submitting}
                  >
                    ✕
                  </Button>
                </div>

                <Card className="mb-6 border-[#16a34a]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        {getDisplayableImageUrl(selectedEquipment.images) ? (
                          <Image
                            src={getDisplayableImageUrl(selectedEquipment.images)!}
                            alt={selectedEquipment.name}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full rounded"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-500 rounded">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-black">{selectedEquipment.name}</h4>
                        <p className="text-sm text-gray-600">{selectedEquipment.category}</p>
                        <p className="text-xs text-gray-500">ID: {selectedEquipment.itemId}</p>
                        
                        {/* Room Information in Modal */}
                        {selectedEquipment.roomAssigned && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                            <MapPin className="h-3 w-3" />
                            <span>{formatRoomInfo(selectedEquipment)}</span>
                          </div>
                        )}
                        
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedEquipment.condition)}`}>
                            {selectedEquipment.condition}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${selectedEquipment.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedEquipment.status}
                          </span>
                          <span className="text-xs text-gray-600">
                            Available: {selectedEquipment.borrowingAvailableQuantity} units
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${selectedEquipment.canBeBorrowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedEquipment.canBeBorrowed ? 'Borrowable' : 'Not Borrowable'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <form onSubmit={handleSubmitBorrowRequest} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="schoolId" className="text-black">School ID *</Label>
                      <Input
                        id="schoolId"
                        name="schoolId"
                        value={borrowRequest.schoolId}
                        onChange={(e) => setBorrowRequest(prev => ({ ...prev, schoolId: e.target.value }))}
                        required
                        disabled={submitting}
                        placeholder="Enter your school ID"
                        className="border-gray-300 focus:border-[#16a34a]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-black flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address *
                        {emailVerificationStatus === 'verified' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            <Check className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                        {emailVerificationStatus === 'verifying' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            <Key className="h-3 w-3" />
                            Verifying
                          </span>
                        )}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={borrowRequest.email}
                          onChange={(e) => {
                            setBorrowRequest(prev => ({ ...prev, email: e.target.value }));
                            // Reset verification if email changes
                            if (emailVerificationStatus !== 'unverified') {
                              setEmailVerificationStatus('unverified');
                              setShowOtpField(false);
                              setEmailVerificationOtp("");
                            }
                          }}
                          required
                          disabled={submitting || emailVerificationStatus === 'verified'}
                          placeholder="Enter your email address"
                          className="border-gray-300 focus:border-[#16a34a] flex-1"
                        />
                        <Button
                          type="button"
                          variant={emailVerificationStatus === 'verified' ? "default" : "outline"}
                          onClick={emailVerificationStatus === 'verified' ? undefined : handleSendEmailOtp}
                          disabled={submitting || sendingOtp || !borrowRequest.email || emailVerificationStatus === 'verified'}
                          className={`whitespace-nowrap ${
                            emailVerificationStatus === 'verified' 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : ''
                          }`}
                        >
                          {emailVerificationStatus === 'verified' ? (
                            <Check className="h-4 w-4" />
                          ) : sendingOtp ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            "Send OTP"
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {emailVerificationStatus === 'unverified' && "Click 'Send OTP' to verify your email"}
                        {emailVerificationStatus === 'verifying' && "Enter the OTP sent to your email"}
                        {emailVerificationStatus === 'verified' && "Email verified successfully"}
                      </p>
                    </div>
                  </div>

                  {/* OTP Verification Field (only shown when verifying) */}
                  {showOtpField && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-yellow-50 border border-yellow-200 rounded-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="otp" className="text-black flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          Verification Code (6-digit OTP)
                        </Label>
                        <div className="flex items-center gap-2">
                          {otpTimer > 0 && (
                            <span className="text-xs font-medium text-red-600">
                              Expires in: {formatTime(otpTimer)}
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResendEmailOtp}
                            disabled={otpResendDisabled || sendingOtp}
                            className="text-xs h-7"
                          >
                            {sendingOtp ? "Sending..." : "Resend OTP"}
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="otp"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={emailVerificationOtp}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setEmailVerificationOtp(value);
                          }}
                          placeholder="Enter 6-digit OTP"
                          className="border-gray-300 focus:border-[#16a34a] text-center text-lg tracking-widest"
                          disabled={verifyingOtp || emailVerificationStatus === 'verified'}
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyEmailOtp}
                          disabled={!emailVerificationOtp || emailVerificationOtp.length !== 6 || verifyingOtp || emailVerificationStatus === 'verified'}
                          className="whitespace-nowrap bg-[#16a34a] hover:bg-green-700"
                        >
                          {verifyingOtp ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : emailVerificationStatus === 'verified' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Check your email for the 6-digit verification code. The code expires in 5 minutes.
                      </p>
                    </motion.div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-black">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={borrowRequest.firstName}
                        onChange={(e) => setBorrowRequest(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                        disabled={submitting}
                        placeholder="Enter your first name"
                        className="border-gray-300 focus:border-[#16a34a]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-black">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={borrowRequest.lastName}
                        onChange={(e) => setBorrowRequest(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                        disabled={submitting}
                        placeholder="Enter your last name"
                        className="border-gray-300 focus:border-[#16a34a]"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="course" className="text-black">Course *</Label>
                      <Input
                        id="course"
                        name="course"
                        value={borrowRequest.course}
                        onChange={(e) => setBorrowRequest(prev => ({ ...prev, course: e.target.value }))}
                        required
                        disabled={submitting}
                        placeholder="e.g., BS Fisheries"
                        className="border-gray-300 focus:border-[#16a34a]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="year" className="text-black">Year Level *</Label>
                      <select
                        id="year"
                        name="year"
                        value={borrowRequest.year}
                        onChange={(e) => setBorrowRequest(prev => ({ ...prev, year: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-[#16a34a] focus:ring-[#16a34a]"
                        required
                        disabled={submitting}
                      >
                        <option value="">Select Year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                        <option value="5">5th Year</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="section" className="text-black">Section *</Label>
                      <Input
                        id="section"
                        name="section"
                        value={borrowRequest.section}
                        onChange={(e) => setBorrowRequest(prev => ({ ...prev, section: e.target.value }))}
                        required
                        disabled={submitting}
                        placeholder="e.g., A, B, C"
                        className="border-gray-300 focus:border-[#16a34a]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="borrowDuration" className="text-black">Borrowing Duration *</Label>
                      <select
                        id="borrowDuration"
                        name="borrowDuration"
                        value={borrowRequest.borrowDuration}
                        onChange={(e) => setBorrowRequest(prev => ({ ...prev, borrowDuration: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-[#16a34a] focus:ring-[#16a34a]"
                        required
                        disabled={submitting}
                      >
                        <option value="1 day">1 day</option>
                        <option value="3 days">3 days</option>
                        <option value="1 week">1 week</option>
                        <option value="2 weeks">2 weeks</option>
                        <option value="1 month">1 month</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="purpose" className="text-black">Purpose of Use *</Label>
                    <textarea
                      id="purpose"
                      name="purpose"
                      value={borrowRequest.purpose}
                      onChange={(e) => setBorrowRequest(prev => ({ ...prev, purpose: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[100px] resize-none focus:border-[#16a34a] focus:ring-[#16a34a]"
                      placeholder="Please describe your research or educational purpose..."
                      required
                      disabled={submitting}
                    />
                  </div>

                  {/* Hidden equipmentId field */}
                  <input
                    type="hidden"
                    name="equipmentId"
                    value={selectedEquipment?.itemId || ''}
                  />

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowBorrowForm(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#16a34a] hover:bg-green-700"
                      disabled={submitting || emailVerificationStatus !== 'verified'}
                    >
                      {submitting ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}