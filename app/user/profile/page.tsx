"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toaster, toast } from "sonner";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  School, 
  Calendar,
  BookOpen,
  Camera,
  Save,
  Edit,
  X,
  CheckCircle2,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";

interface StudentProfile {
  _id: string;
  schoolID: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolYear: string;
  section: string;
  role: string;
  status: string;
  profileImage: string;
  lastLogin: string;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function StudentProfile() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    schoolYear: "",
    section: "",
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/student/profile');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.user) {
          setStudentProfile(data.user);
          setFormData({
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            email: data.user.email,
            schoolYear: data.user.schoolYear,
            section: data.user.section,
          });
          setImagePreview(data.user.profileImage || "");
        } else {
          throw new Error(data.error || 'Failed to fetch profile');
        }
      } else if (response.status === 401) {
        toast.error('Please login again');
        setTimeout(() => router.push('/'), 2000);
        return;
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }

      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!studentProfile) return;

    setIsSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('schoolYear', formData.schoolYear);
      formDataToSend.append('section', formData.section);
      
      if (profileImage) {
        formDataToSend.append('profileImage', profileImage);
      }

      const response = await fetch('/api/student/profile', {
        method: 'PUT',
        body: formDataToSend,
      });

      if (response.ok) {
        const data = await response.json();
        setStudentProfile(data.user);
        setIsEditing(false);
        setProfileImage(null);
        toast.success('Profile updated successfully!', {
          className: "bg-green-100 text-green-800 border border-green-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 4000,
          position: "top-right",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile', {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 4000,
        position: "top-right",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (studentProfile) {
      setFormData({
        firstName: studentProfile.firstName,
        lastName: studentProfile.lastName,
        email: studentProfile.email,
        schoolYear: studentProfile.schoolYear,
        section: studentProfile.section,
      });
      setImagePreview(studentProfile.profileImage || "");
      setProfileImage(null);
    }
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading && !studentProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16a34a] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load your profile information.</p>
          <Button onClick={fetchStudentProfile} className="bg-[#16a34a] hover:bg-green-700">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

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
            Student Profile
          </h1>
          <p className="text-lg text-black max-w-2xl mx-auto mb-8">
            Manage your personal information and profile settings
          </p>
        </motion.div>
      </section>

      {/* Profile Content */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2 space-y-8">
              {/* Profile Information Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-2 border-[#16a34a] hover:shadow-lg transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-[#16a34a]">Profile Information</CardTitle>
                        <CardDescription className="text-black">
                          Your personal details and information
                        </CardDescription>
                      </div>
                      {!isEditing ? (
                        <Button
                          onClick={() => setIsEditing(true)}
                          className="bg-[#16a34a] hover:bg-green-700 text-white"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <Button
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="bg-[#16a34a] hover:bg-green-700 text-white"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Profile Image */}
                      <div className="md:col-span-2 flex flex-col items-center mb-6">
                        <div className="relative">
                          <Avatar className="h-32 w-32 border-4 border-[#16a34a]">
                            <AvatarImage 
                              src={imagePreview} 
                              alt={`${studentProfile.firstName} ${studentProfile.lastName}`}
                            />
                            <AvatarFallback className="bg-[#16a34a] text-white text-2xl font-semibold">
                              {getInitials(studentProfile.firstName, studentProfile.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          {isEditing && (
                            <Label htmlFor="profileImage" className="absolute bottom-0 right-0 bg-[#16a34a] text-white p-2 rounded-full cursor-pointer hover:bg-green-700 transition-colors">
                              <Camera className="h-4 w-4" />
                              <input
                                id="profileImage"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                            </Label>
                          )}
                        </div>
                        {isEditing && (
                          <p className="text-sm text-gray-500 mt-2 text-center">
                            Click the camera icon to upload a new profile image
                          </p>
                        )}
                      </div>

                      {/* First Name */}
                      <div>
                        <Label htmlFor="firstName" className="text-black font-medium">
                          First Name
                        </Label>
                        {isEditing ? (
                          <Input
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        ) : (
                          <p className="mt-1 text-gray-700 text-lg font-semibold">
                            {studentProfile.firstName}
                          </p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div>
                        <Label htmlFor="lastName" className="text-black font-medium">
                          Last Name
                        </Label>
                        {isEditing ? (
                          <Input
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        ) : (
                          <p className="mt-1 text-gray-700 text-lg font-semibold">
                            {studentProfile.lastName}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <Label htmlFor="email" className="text-black font-medium">
                          <Mail className="h-4 w-4 inline mr-2" />
                          Email Address
                        </Label>
                        {isEditing ? (
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        ) : (
                          <p className="mt-1 text-gray-700 text-lg">
                            {studentProfile.email}
                          </p>
                        )}
                      </div>

                      {/* School ID */}
                      <div>
                        <Label htmlFor="schoolID" className="text-black font-medium">
                          <School className="h-4 w-4 inline mr-2" />
                          School ID
                        </Label>
                        <p className="mt-1 text-gray-700 text-lg font-mono">
                          {studentProfile.schoolID}
                        </p>
                        <p className="text-sm text-gray-500">School ID cannot be changed</p>
                      </div>

                      {/* School Year */}
                      <div>
                        <Label htmlFor="schoolYear" className="text-black font-medium">
                          <BookOpen className="h-4 w-4 inline mr-2" />
                          School Year
                        </Label>
                        {isEditing ? (
                          <Input
                            id="schoolYear"
                            name="schoolYear"
                            value={formData.schoolYear}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        ) : (
                          <p className="mt-1 text-gray-700 text-lg">
                            Year {studentProfile.schoolYear}
                          </p>
                        )}
                      </div>

                      {/* Section */}
                      <div>
                        <Label htmlFor="section" className="text-black font-medium">
                          Section
                        </Label>
                        {isEditing ? (
                          <Input
                            id="section"
                            name="section"
                            value={formData.section}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        ) : (
                          <p className="mt-1 text-gray-700 text-lg">
                            {studentProfile.section}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar - Right Side */}
            <div className="space-y-8">
              {/* Account Status Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2 border-[#16a34a] hover:shadow-lg transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                    <CardTitle className="text-[#16a34a]">Account Status</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-black font-medium">Status</span>
                      <Badge className={`${
                        studentProfile.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : studentProfile.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {studentProfile.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-black font-medium">Role</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {studentProfile.role.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-black font-medium">Login Count</span>
                      <span className="text-gray-700 font-semibold">{studentProfile.loginCount}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Activity Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-2 border-[#16a34a] hover:shadow-lg transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                    <CardTitle className="text-[#16a34a]">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-black font-medium">Last Login</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(studentProfile.lastLogin)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-black font-medium">Member Since</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(studentProfile.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
                      <div>
                        <p className="text-black font-medium">Last Updated</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(studentProfile.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="border-2 border-[#16a34a] hover:shadow-lg transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                    <CardTitle className="text-[#16a34a]">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <Button
                      className="w-full justify-start gap-2 bg-[#16a34a] hover:bg-green-700 text-white transition-all duration-300"
                      onClick={() => router.push('/user/download')}
                    >
                      <BookOpen className="h-4 w-4" />
                      Back to Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white transition-all duration-300"
                      onClick={() => router.push('/user/change-password')}
                    >
                      <User className="h-4 w-4" />
                      Change Password
                    </Button>
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