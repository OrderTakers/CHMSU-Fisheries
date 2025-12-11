"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { 
  Package,
  Calendar,
  Clock,
  Camera,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  MapPin,
  Home
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

interface BorrowRequest {
  _id: string;
  equipmentId: {
    _id: string;
    name: string;
    itemId: string;
    description: string;
    roomAssigned?: string;
    images?: string[];
  };
  borrowerName: string;
  borrowerEmail: string;
  purpose: string;
  quantity: number;
  status: string;
  requestedDate: string;
  intendedBorrowDate: string;
  intendedReturnDate: string;
  conditionOnBorrow?: string;
  roomAssigned?: string;
}

interface ReturnFormData {
  borrowingId: string;
  conditionAfter: string;
  damageDescription: string;
  damageSeverity: 'None' | 'Minor' | 'Moderate' | 'Severe';
  remarks: string;
  roomReturned: string;
  actualReturnDate: string;
}

export default function ReturnRequest() {
  const router = useRouter();
  const params = useParams();
  const borrowingId = params.id as string;
  
  const [borrowRequest, setBorrowRequest] = useState<BorrowRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [damageImages, setDamageImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ReturnFormData>({
    borrowingId: borrowingId,
    conditionAfter: "",
    damageDescription: "",
    damageSeverity: "None",
    remarks: "",
    roomReturned: "",
    actualReturnDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (borrowingId) {
      fetchBorrowRequest();
    }
  }, [borrowingId]);

  const fetchBorrowRequest = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching borrow request for return...");
      
      const response = await fetch(`/api/student/borrow-requests/${borrowingId}`);
      
      if (!response.ok) {
        console.error("❌ API response not OK:", response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📋 Borrow request API Response:", data);
      
      if (data.success) {
        setBorrowRequest(data.borrowRequest);
        
        // Get equipment room assigned from equipment data
        const equipmentRoom = data.borrowRequest.equipmentId?.roomAssigned || 
                             data.borrowRequest.roomAssigned || 
                             'Default Laboratory Room';
        
        // Set default room returned to the equipment's assigned room
        setFormData(prev => ({
          ...prev,
          roomReturned: equipmentRoom
        }));
        
        console.log("✅ Borrow request loaded successfully for return");
        console.log("📍 Equipment room assigned:", equipmentRoom);
      } else {
        throw new Error(data.error || 'Failed to fetch borrow request');
      }
    } catch (error) {
      console.error('❌ Error fetching borrow request:', error);
      toast.error('Failed to load borrow request. Please try again.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files);
    
    // Validate file types and sizes
    const validImages = newImages.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select only image files.', {
          className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        });
        return false;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB.', {
          className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        });
        return false;
      }
      
      return true;
    });

    if (validImages.length === 0) return;

    // Add to existing images (limit to 5 total)
    const totalImages = damageImages.length + validImages.length;
    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    setDamageImages(prev => [...prev, ...validImages]);

    // Create previews
    validImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setDamageImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.conditionAfter) {
      toast.error('Please describe the equipment condition after use.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    if (!formData.roomReturned) {
      toast.error('Please specify the room where equipment is returned.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
      });
      return;
    }

    setSubmitting(true);
    try {
      console.log("🔄 Submitting return request...", formData);
      
      // Create FormData to handle file uploads
      const submitFormData = new FormData();
      
      // Add form data
      Object.entries(formData).forEach(([key, value]) => {
        submitFormData.append(key, value);
      });
      
      // Add damage images
      damageImages.forEach((image, index) => {
        submitFormData.append('damageImages', image);
      });

      const response = await fetch('/api/student/return-requests', {
        method: 'POST',
        body: submitFormData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Return request submitted:", data);
        
        toast.success('Return request submitted successfully!', {
          className: "bg-green-100 text-green-800 border border-green-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 5000,
        });

        // Redirect to borrow requests page after success
        setTimeout(() => {
          router.push('/user/borrow-requests');
        }, 2000);

      } else {
        const errorData = await response.json();
        console.error("❌ API error response:", errorData);
        throw new Error(errorData.error || 'Failed to submit return request');
      }
    } catch (error) {
      console.error('❌ Error submitting return request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit return request. Please try again.', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateLateDays = () => {
    if (!borrowRequest) return 0;
    
    const intendedReturn = new Date(borrowRequest.intendedReturnDate);
    const actualReturn = new Date(formData.actualReturnDate);
    
    if (actualReturn > intendedReturn) {
      const timeDiff = actualReturn.getTime() - intendedReturn.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    
    return 0;
  };

  const lateDays = calculateLateDays();
  const isLate = lateDays > 0;

  // Common lab rooms for quick selection
  const labRooms = [
    "Main Laboratory",
    "Chemistry Lab", 
    "Physics Lab",
    "Biology Lab",
    "Equipment Storage",
    "Faculty Room",
    "Workshop Room",
    "Computer Lab",
    "Research Lab"
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16a34a] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading equipment details...</p>
        </div>
      </div>
    );
  }

  if (!borrowRequest) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Request Not Found</h2>
          <p className="text-gray-600 mb-4">The borrow request you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/user/borrow-requests')}>
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />
      
      {/* Hero Section */}
      <section className="py-8 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="flex items-center space-x-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/user/borrow-requests')}
                className="text-[#16a34a] hover:bg-green-100 hover:text-green-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-[#16a34a]">
                  Return Equipment
                </h1>
                <p className="text-lg text-black">
                  {borrowRequest.equipmentId.name}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Equipment Info and Return Form */}
            <div className="space-y-6">
              {/* Equipment Information */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-2 border-[#16a34a]">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                    <CardTitle className="text-[#16a34a] flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Equipment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      {borrowRequest.equipmentId.images?.[0] ? (
                        <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                          <Image
                            src={borrowRequest.equipmentId.images[0]}
                            alt={borrowRequest.equipmentId.name}
                            width={96}
                            height={96}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-black">{borrowRequest.equipmentId.name}</h3>
                        <p className="text-gray-600">{borrowRequest.equipmentId.itemId}</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Assigned Room:</span>
                            <span className="text-blue-600">
                              {borrowRequest.equipmentId.roomAssigned || borrowRequest.roomAssigned || 'Not specified'}
                            </span>
                          </div>
                          <p className="text-sm">
                            <span className="font-medium">Condition:</span>{' '}
                            {borrowRequest.conditionOnBorrow || 'Good'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          Intended Return Date
                        </Label>
                        <p className="font-semibold text-black">
                          {new Date(borrowRequest.intendedReturnDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Label className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          Borrow Purpose
                        </Label>
                        <p className="font-semibold text-black">{borrowRequest.purpose}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm">Description</Label>
                        <p className="text-gray-700">{borrowRequest.equipmentId.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Return Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2 border-blue-200">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="text-blue-800">Return Details</CardTitle>
                    <CardDescription>
                      Please provide details about the equipment condition upon return
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Actual Return Date */}
                      <div className="space-y-2">
                        <Label htmlFor="actualReturnDate" className="text-black font-medium">
                          <Calendar className="h-4 w-4 inline mr-2" />
                          Actual Return Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="actualReturnDate"
                          name="actualReturnDate"
                          type="date"
                          value={formData.actualReturnDate}
                          onChange={handleInputChange}
                          required
                          max={new Date().toISOString().split('T')[0]}
                        />
                        {isLate && (
                          <div className="flex items-center gap-2 text-orange-600 text-sm mt-1">
                            <AlertTriangle className="h-4 w-4" />
                            <span>This return is {lateDays} day{lateDays !== 1 ? 's' : ''} late</span>
                          </div>
                        )}
                      </div>

                      {/* Room Returned */}
                      <div className="space-y-2">
                        <Label htmlFor="roomReturned" className="text-black font-medium flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Room Returned To <span className="text-red-500">*</span>
                          {borrowRequest.equipmentId.roomAssigned && (
                            <span className="text-xs text-blue-600 font-normal">
                              (Equipment's assigned room: {borrowRequest.equipmentId.roomAssigned})
                            </span>
                          )}
                        </Label>
                        
                        {/* Quick room selection buttons */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {labRooms.map((room) => (
                            <Button
                              key={room}
                              type="button"
                              variant="outline"
                              size="sm"
                              className={`text-xs ${
                                formData.roomReturned === room 
                                  ? 'border-[#16a34a] bg-green-50 text-[#16a34a]' 
                                  : ''
                              }`}
                              onClick={() => setFormData(prev => ({ ...prev, roomReturned: room }))}
                            >
                              {room}
                            </Button>
                          ))}
                        </div>
                        
                        <Input
                          id="roomReturned"
                          name="roomReturned"
                          value={formData.roomReturned}
                          onChange={handleInputChange}
                          placeholder="Enter the laboratory room where equipment is returned"
                          required
                        />
                        <p className="text-xs text-gray-500">
                          Enter the exact room where you're leaving the equipment
                        </p>
                      </div>

                      {/* Condition After Use */}
                      <div className="space-y-2">
                        <Label htmlFor="conditionAfter" className="text-black font-medium">
                          Equipment Condition After Use <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="conditionAfter"
                          name="conditionAfter"
                          value={formData.conditionAfter}
                          onChange={handleInputChange}
                          placeholder="Describe the current condition of the equipment. Be specific about any changes from when you borrowed it..."
                          rows={3}
                          required
                        />
                      </div>

                      {/* Damage Severity */}
                      <div className="space-y-2">
                        <Label htmlFor="damageSeverity" className="text-black font-medium">
                          Damage Assessment
                        </Label>
                        <Select
                          value={formData.damageSeverity}
                          onValueChange={(value: 'None' | 'Minor' | 'Moderate' | 'Severe') => 
                            handleSelectChange('damageSeverity', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">No Damage - Equipment is in same condition</SelectItem>
                            <SelectItem value="Minor">Minor Damage - Small scratches, cosmetic issues</SelectItem>
                            <SelectItem value="Moderate">Moderate Damage - Functional but needs minor repair</SelectItem>
                            <SelectItem value="Severe">Severe Damage - Not functional, needs major repair</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Damage Description */}
                      {formData.damageSeverity !== 'None' && (
                        <div className="space-y-2">
                          <Label htmlFor="damageDescription" className="text-black font-medium">
                            Damage Description
                          </Label>
                          <Textarea
                            id="damageDescription"
                            name="damageDescription"
                            value={formData.damageDescription}
                            onChange={handleInputChange}
                            placeholder="Please describe any damage to the equipment in detail..."
                            rows={3}
                          />
                        </div>
                      )}

                      {/* Damage Images */}
                      {formData.damageSeverity !== 'None' && (
                        <div className="space-y-2">
                          <Label className="text-black font-medium flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            Damage Photos (Required for damage reports)
                          </Label>
                          <div className="space-y-4">
                            {/* Image Upload Button */}
                            <div className="flex items-center gap-4">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2"
                              >
                                <Upload className="h-4 w-4" />
                                Upload Images
                              </Button>
                              <span className="text-sm text-gray-500">
                                {damageImages.length}/5 images
                              </span>
                            </div>

                            {/* Image Previews */}
                            {imagePreviews.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {imagePreviews.map((preview, index) => (
                                  <div key={index} className="relative group">
                                    <div className="aspect-square rounded-lg border border-gray-200 overflow-hidden">
                                      <Image
                                        src={preview}
                                        alt={`Damage image ${index + 1}`}
                                        width={150}
                                        height={150}
                                        className="object-cover w-full h-full"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => removeImage(index)}
                                    >
                                      ×
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            Upload clear photos showing any damage. Required for damage assessment.
                          </p>
                        </div>
                      )}

                      {/* Additional Remarks */}
                      <div className="space-y-2">
                        <Label htmlFor="remarks" className="text-black font-medium">
                          Additional Remarks
                        </Label>
                        <Textarea
                          id="remarks"
                          name="remarks"
                          value={formData.remarks}
                          onChange={handleInputChange}
                          placeholder="Any additional information about the return, usage, or special handling..."
                          rows={2}
                        />
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
                            Submitting Return Request...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Submit Return Request
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Summary and Information */}
            <div className="space-y-6">
              {/* Return Summary */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-2 border-purple-200">
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="text-purple-800">Return Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Equipment:</span>
                        <span className="font-semibold">{borrowRequest.equipmentId.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Equipment ID:</span>
                        <span className="font-semibold">{borrowRequest.equipmentId.itemId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-semibold">{borrowRequest.quantity}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Intended Return:</span>
                        <span className="font-semibold">
                          {new Date(borrowRequest.intendedReturnDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Actual Return:</span>
                        <span className="font-semibold">
                          {new Date(formData.actualReturnDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Return Room:</span>
                        <span className="font-semibold text-blue-600">
                          {formData.roomReturned || 'Not specified'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Status:</span>
                        <Badge className={
                          isLate 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-green-100 text-green-800'
                        }>
                          {isLate ? 'Late Return' : 'On Time'}
                        </Badge>
                      </div>
                      {isLate && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Days Late:</span>
                          <span className="font-semibold text-orange-600">{lateDays}</span>
                        </div>
                      )}
                    </div>

                    {/* Late Return Warning */}
                    {isLate && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-800">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Late Return Notice</span>
                        </div>
                        <p className="text-sm text-orange-700 mt-1">
                          This equipment is being returned {lateDays} day{lateDays !== 1 ? 's' : ''} after the intended return date. 
                          Penalty fees may apply as per laboratory policies.
                        </p>
                        <p className="text-sm text-orange-700 mt-2">
                          Estimated penalty: ₱{lateDays * 50}.00
                        </p>
                      </div>
                    )}

                    {/* Damage Assessment Info */}
                    {formData.damageSeverity !== 'None' && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">Damage Assessment</span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">
                          {formData.damageSeverity} damage reported. 
                          Damage fees may apply based on assessment.
                        </p>
                        <p className="text-sm text-yellow-700 mt-2">
                          Estimated damage fees:
                          {formData.damageSeverity === 'Minor' && ' ₱100.00'}
                          {formData.damageSeverity === 'Moderate' && ' ₱500.00'}
                          {formData.damageSeverity === 'Severe' && ' ₱1,000.00'}
                        </p>
                      </div>
                    )}

                    {/* Total Estimated Fees */}
                    {(isLate || formData.damageSeverity !== 'None') && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center justify-between text-red-800">
                          <span className="font-medium">Total Estimated Fees:</span>
                          <span className="font-bold">
                            ₱{(lateDays * 50) + 
                              (formData.damageSeverity === 'Minor' ? 100 : 
                               formData.damageSeverity === 'Moderate' ? 500 : 
                               formData.damageSeverity === 'Severe' ? 1000 : 0)}.00
                          </span>
                        </div>
                        <p className="text-xs text-red-700 mt-1">
                          Final fees will be confirmed after equipment inspection.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Return Guidelines */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2 border-gray-200">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-gray-800">Return Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Return to correct room:</strong> Equipment must be returned to its assigned laboratory room</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Clean equipment:</strong> Clean the equipment before returning it</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Report damage accurately:</strong> Be honest about any damage or issues</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Provide photos:</strong> Take clear photos if there's any damage</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Late returns incur fees:</strong> ₱50 per day for late returns</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Damage fees apply:</strong> Based on severity of damage</span>
                      </li>
                    </ul>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        <strong>Note:</strong> Equipment will be inspected by laboratory staff upon return. 
                        Final fees and approval will be determined after inspection.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Badge component
const Badge = ({ 
  className, 
  children 
}: { 
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
};