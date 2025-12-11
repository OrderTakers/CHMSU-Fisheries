"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster, toast } from "sonner";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  Download, 
  QrCode, 
  Smartphone, 
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  User,
  Package,
  RefreshCw,
  ArrowRightLeft,
  Home,
  ArrowLeft,
  ExternalLink,
  Globe,
  Shield,
  Battery,
  Wifi,
  Zap,
  AlertTriangle,
  Smartphone as SmartphoneIcon,
  Check,
  Download as DownloadIcon,
  AppWindow,
  Server,
  Cpu,
  ShieldCheck,
  Bell,
  BatteryCharging,
  Wifi as WifiIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface BorrowRequest {
  _id: string;
  equipmentId: {
    _id: string;
    name: string;
    itemId: string;
  };
  borrowerName: string;
  borrowerEmail: string;
  purpose: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'released' | 'returned' | 'overdue' | 'return_requested' | 'return_approved' | 'return_rejected';
  requestedDate: string;
  intendedBorrowDate: string;
  intendedReturnDate: string;
  approvedDate?: string;
  releasedDate?: string;
  actualReturnDate?: string;
}

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
}

// Platform icons
const PlatformIcons = {
  android: () => (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.3-.15-.68-.04-.84.26l-1.88 3.24c-2.86-1.21-6.08-1.21-8.94 0L5.65 5.71c-.16-.3-.54-.41-.84-.26-.3.15-.42.54-.26.85L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
    </svg>
  ),
  ios: () => (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  ),
  web: Globe
};

export default function DownloadPage() {
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'app' | 'features' | 'benefits'>('app');
  const router = useRouter();

  // App download links
  const appDownloadLinks = {
    android: {
      url: '/downloads/fisheries-app.apk',
      label: 'Android APK',
      icon: PlatformIcons.android,
      size: '25 MB',
      version: '2.1.0'
    },
    ios: {
      url: 'https://apps.apple.com/app/fisheries-equipment-borrowing',
      label: 'iOS App Store',
      icon: PlatformIcons.ios,
      size: '45 MB',
      version: '2.1.0'
    },
    web: {
      url: '/app',
      label: 'Web App',
      icon: PlatformIcons.web,
      size: 'PWA',
      version: 'Latest'
    }
  };

  // App features
  const appFeatures = [
    {
      icon: Calendar,
      title: "Easy Booking",
      description: "Book equipment with just a few taps"
    },
    {
      icon: Clock,
      title: "Real-time Tracking",
      description: "Track your borrowing status in real-time"
    },
    {
      icon: ShieldCheck,
      title: "Secure",
      description: "End-to-end encrypted for your security"
    },
    {
      icon: BatteryCharging,
      title: "Offline Mode",
      description: "Access your data even without internet"
    },
    {
      icon: Bell,
      title: "Push Notifications",
      description: "Get notified about approvals and returns"
    },
    {
      icon: Zap,
      title: "Fast & Responsive",
      description: "Optimized for smooth performance"
    }
  ];

  // App benefits
  const appBenefits = [
    {
      title: "Time Saving",
      description: "Reduce paperwork and waiting time by 80%"
    },
    {
      title: "Easy Access",
      description: "Access equipment catalog anytime, anywhere"
    },
    {
      title: "Notifications",
      description: "Get instant updates on your requests"
    },
    {
      title: "Digital Records",
      description: "All your borrowing history in one place"
    }
  ];

  useEffect(() => {
    fetchStudentData();
    fetchBorrowRequests();
  }, []);

  const fetchStudentData = async () => {
    try {
      console.log("🔄 Fetching student profile...");
      const response = await fetch('/api/student/profile');
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
          setTimeout(() => router.push('/'), 2000);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📋 Profile API Response:", data);
      
      if (data.user) {
        setStudentProfile(data.user);
        console.log("✅ Profile loaded successfully:", data.user.email);
      } else {
        throw new Error(data.error || 'Failed to fetch profile data');
      }
    } catch (error) {
      console.error('❌ Error fetching student data:', error);
      toast.error('Failed to load profile data. Please try again.');
    }
  };

  const fetchBorrowRequests = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching borrow requests...");
      
      const response = await fetch('/api/student/borrow-requests');
      
      if (response.ok) {
        const data = await response.json();
        console.log("📋 Borrow requests API Response:", data);
        
        if (data.success) {
          setBorrowRequests(data.borrowRequests);
          console.log("✅ Borrow requests loaded successfully:", data.borrowRequests.length);
        } else {
          throw new Error(data.error || 'Failed to fetch borrow requests');
        }
      } else if (response.status === 401) {
        toast.error('Please login again');
        setTimeout(() => router.push('/'), 2000);
        return;
      } else {
        throw new Error('Failed to fetch borrow requests');
      }
    } catch (error) {
      console.error('❌ Error fetching borrow requests:', error);
      toast.error('Failed to load borrow requests');
      
      // Fallback to empty array instead of mock data
      setBorrowRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadApp = (platform: 'android' | 'ios' | 'web') => {
    const platformData = appDownloadLinks[platform];
    
    toast.success(`Downloading ${platformData.label}...`, {
      description: `Version ${platformData.version} • ${platformData.size}`,
      duration: 3000,
    });
    
    // Open in new tab
    window.open(platformData.url, '_blank');
  };

  const handleReturnEquipment = () => {
    // Check if there are any released items to return
    const releasableItems = borrowRequests.filter(req => 
      req.status === 'released' || req.status === 'return_requested'
    );
    
    if (releasableItems.length === 0) {
      toast.info('No equipment to return at the moment.', {
        description: 'You currently have no borrowed equipment that needs returning.'
      });
      return;
    }
    
    // If there's exactly one item, go directly to its return page
    if (releasableItems.length === 1) {
      router.push(`/student/return-requests/${releasableItems[0]._id}`);
    } else {
      // Otherwise, go to borrow requests page
      router.push('/user/borrow-requests');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      approved: { variant: 'default' as const, icon: CheckCircle2, label: 'Approved', className: 'bg-green-100 text-green-800' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejected', className: 'bg-red-100 text-red-800' },
      released: { variant: 'default' as const, icon: CheckCircle2, label: 'Released', className: 'bg-blue-100 text-blue-800' },
      returned: { variant: 'outline' as const, icon: CheckCircle2, label: 'Returned', className: 'bg-gray-100 text-gray-800' },
      overdue: { variant: 'destructive' as const, icon: XCircle, label: 'Overdue', className: 'bg-red-100 text-red-800' },
      return_requested: { variant: 'secondary' as const, icon: Clock, label: 'Return Requested', className: 'bg-purple-100 text-purple-800' },
      return_approved: { variant: 'default' as const, icon: CheckCircle2, label: 'Return Approved', className: 'bg-green-100 text-green-800' },
      return_rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Return Rejected', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge className={`flex items-center gap-1 ${config.className}`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const pendingRequests = borrowRequests.filter(req => req.status === 'pending');
  const approvedRequests = borrowRequests.filter(req => 
    ['approved', 'released', 'return_requested', 'return_approved'].includes(req.status)
  );
  
  // Calculate active borrowings (released but not yet returned)
  const activeBorrowings = borrowRequests.filter(req => 
    req.status === 'released' || req.status === 'return_requested'
  );
  
  const totalRequests = borrowRequests.length;

  if (loading && !studentProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16a34a] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your dashboard...</p>
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
          className="container mx-auto px-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="text-[#16a34a] hover:bg-green-100 hover:text-green-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold text-[#16a34a]">
                  Mobile App Download
                </h1>
                <p className="text-lg text-black max-w-2xl">
                  Take your equipment borrowing experience everywhere with our mobile app
                </p>
              </div>
            </div>
            
            {studentProfile && (
              <div className="hidden md:flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-green-200">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-black">{studentProfile.firstName} {studentProfile.lastName}</p>
                  <p className="text-sm text-gray-600">{studentProfile.schoolID}</p>
                </div>
              </div>
            )}
          </div>

          {/* App Preview Banner */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white mb-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-4">Fisheries Equipment Manager</h2>
                <p className="text-lg mb-6 opacity-90">
                  The official mobile app for BS Fisheries students to borrow and manage laboratory equipment with ease.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                    <Check className="h-3 w-3 mr-1" />
                    Real-time Updates
                  </Badge>
                  <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Secure & Encrypted
                  </Badge>
                  <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                    <BatteryCharging className="h-3 w-3 mr-1" />
                    Offline Mode
                  </Badge>
                  <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                    <Bell className="h-3 w-3 mr-1" />
                    Push Notifications
                  </Badge>
                </div>
              </div>
              <div className="relative">
                <div className="w-64 h-64 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <SmartphoneIcon className="h-32 w-32 text-white/80" />
                </div>
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-yellow-400 rounded-2xl flex items-center justify-center">
                  <QrCode className="h-20 w-20 text-black" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Download Options */}
            <div className="lg:col-span-2 space-y-8">
              {/* Download Options */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-2 border-[#16a34a] hover:shadow-xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                    <CardTitle className="text-[#16a34a]">Download Options</CardTitle>
                    <CardDescription className="text-black">
                      Choose your preferred platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Android */}
                      <Card className="border-2 border-green-200 hover:border-green-400 transition-all">
                        <CardContent className="p-6 text-center">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PlatformIcons.android />
                          </div>
                          <h3 className="font-bold text-lg text-black mb-2">Android</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Download APK directly to your Android device
                          </p>
                          <div className="text-xs text-gray-500 mb-4">
                            <div className="flex justify-between mb-1">
                              <span>Version:</span>
                              <span className="font-medium">{appDownloadLinks.android.version}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Size:</span>
                              <span className="font-medium">{appDownloadLinks.android.size}</span>
                            </div>
                          </div>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleDownloadApp('android')}
                          >
                            <DownloadIcon className="h-4 w-4 mr-2" />
                            Download APK
                          </Button>
                        </CardContent>
                      </Card>

                      {/* iOS */}
                      <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all">
                        <CardContent className="p-6 text-center">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PlatformIcons.ios />
                          </div>
                          <h3 className="font-bold text-lg text-black mb-2">iOS</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Available on the Apple App Store
                          </p>
                          <div className="text-xs text-gray-500 mb-4">
                            <div className="flex justify-between mb-1">
                              <span>Version:</span>
                              <span className="font-medium">{appDownloadLinks.ios.version}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Size:</span>
                              <span className="font-medium">{appDownloadLinks.ios.size}</span>
                            </div>
                          </div>
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleDownloadApp('ios')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            App Store
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Web */}
                      <Card className="border-2 border-purple-200 hover:border-purple-400 transition-all">
                        <CardContent className="p-6 text-center">
                          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Globe className="h-8 w-8 text-purple-600" />
                          </div>
                          <h3 className="font-bold text-lg text-black mb-2">Web App</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Progressive Web App - works on any device
                          </p>
                          <div className="text-xs text-gray-500 mb-4">
                            <div className="flex justify-between mb-1">
                              <span>Version:</span>
                              <span className="font-medium">{appDownloadLinks.web.version}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Type:</span>
                              <span className="font-medium">{appDownloadLinks.web.size}</span>
                            </div>
                          </div>
                          <Button
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => handleDownloadApp('web')}
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            Open Web App
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    {/* QR Code Section */}
                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <div className="bg-gray-50 p-6 rounded-xl">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                            <div className="w-48 h-48 flex items-center justify-center">
                              <QrCode className="h-32 w-32 text-gray-400" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-black mb-2">Scan to Download</h4>
                            <p className="text-gray-600 mb-4">
                              Use your phone's camera to scan this QR code and download the app directly to your device.
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Works on both iOS and Android</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Direct download, no app store required</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Always get the latest version</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tabs Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2 border-gray-200">
                  <CardHeader className="border-b border-gray-200">
                    <div className="flex space-x-4">
                      <Button
                        variant={activeTab === 'app' ? "default" : "ghost"}
                        onClick={() => setActiveTab('app')}
                        className={activeTab === 'app' ? 'bg-[#16a34a] text-white' : ''}
                      >
                        App Features
                      </Button>
                      <Button
                        variant={activeTab === 'features' ? "default" : "ghost"}
                        onClick={() => setActiveTab('features')}
                        className={activeTab === 'features' ? 'bg-[#16a34a] text-white' : ''}
                      >
                        Key Features
                      </Button>
                      <Button
                        variant={activeTab === 'benefits' ? "default" : "ghost"}
                        onClick={() => setActiveTab('benefits')}
                        className={activeTab === 'benefits' ? 'bg-[#16a34a] text-white' : ''}
                      >
                        Benefits
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {activeTab === 'app' && (
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold text-black">App Features</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {appFeatures.map((feature, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                <feature.icon className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-black">{feature.title}</h4>
                                <p className="text-sm text-gray-600">{feature.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'features' && (
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold text-black">Key Features</h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-bold text-blue-800 mb-2">Real-time Equipment Booking</h4>
                            <p className="text-blue-700">
                              Browse available equipment, check real-time availability, and book instantly from your mobile device.
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="font-bold text-green-800 mb-2">Push Notifications</h4>
                            <p className="text-green-700">
                              Get instant notifications when your request is approved, equipment is ready for pickup, or return reminders.
                            </p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h4 className="font-bold text-purple-800 mb-2">Digital Documentation</h4>
                            <p className="text-purple-700">
                              All your borrowing history, receipts, and equipment details stored digitally and accessible anytime.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'benefits' && (
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold text-black">Benefits</h3>
                        <div className="grid gap-4">
                          {appBenefits.map((benefit, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-black">{benefit.title}</h4>
                                <p className="text-gray-600">{benefit.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Quick Actions and Status */}
            <div className="space-y-8">
              {/* Quick Actions Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2 border-[#16a34a] hover:shadow-lg transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                    <CardTitle className="text-[#16a34a]">Quick Actions</CardTitle>
                    <CardDescription className="text-black">
                      Manage your equipment borrowing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <Button
                      className="w-full justify-start gap-2 bg-[#16a34a] hover:bg-green-700 text-white transition-all duration-300"
                      onClick={() => router.push('/user/borrow-equipment')}
                    >
                      <BookOpen className="h-4 w-4" />
                      Borrow Equipment
                    </Button>
                    
                    <Button
                      className="w-full justify-start gap-2 bg-[#16a34a] hover:bg-green-700 text-white transition-all duration-300"
                       onClick={() => router.push('/user/return-request')}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      Return Equipment
                      {activeBorrowings.length > 0 && (
                        <Badge className="ml-auto bg-white text-blue-600 hover:bg-white">
                          {activeBorrowings.length}
                        </Badge>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white transition-all duration-300"
                      onClick={() => router.push('/user/borrow-requests')}
                    >
                      <Calendar className="h-4 w-4" />
                      My Requests
                      {pendingRequests.length > 0 && (
                        <Badge className="ml-auto bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          {pendingRequests.length}
                        </Badge>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white transition-all duration-300"
                      onClick={() => router.push('/user/profile')}
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white transition-all duration-300"
                      onClick={() => router.push('/user/return-request')}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Return Requests
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Borrowing Status Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-2 border-blue-200">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="text-blue-800">Borrowing Status</CardTitle>
                    <CardDescription className="text-black">
                      Your current equipment status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {borrowRequests.length === 0 ? (
                      <div className="text-center py-4">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-black mb-2">No borrowing activity yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/user/borrow-equipment')}
                          className="mt-2"
                        >
                          Start Borrowing
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{totalRequests}</p>
                            <p className="text-sm text-gray-600">Total Requests</p>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{activeBorrowings.length}</p>
                            <p className="text-sm text-gray-600">Active</p>
                          </div>
                        </div>
                        
                        {/* Recent Activity */}
                        <div className="pt-4 border-t border-gray-200">
                          <h4 className="font-medium text-black mb-3">Recent Activity</h4>
                          <div className="space-y-3">
                            {borrowRequests.slice(0, 3).map((request) => (
                              <div key={request._id} className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-black truncate">
                                    {request.equipmentId.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(request.requestedDate)}
                                  </p>
                                </div>
                                {getStatusBadge(request.status)}
                              </div>
                            ))}
                          </div>
                          
                          {borrowRequests.length > 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-3 text-[#16a34a]"
                              onClick={() => router.push('/user/borrow-requests')}
                            >
                              View All Requests
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* System Requirements */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="border-2 border-gray-200">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-gray-800">System Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Android Version</span>
                        <Badge className="bg-green-100 text-green-800">8.0+</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">iOS Version</span>
                        <Badge className="bg-blue-100 text-blue-800">13.0+</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Storage Space</span>
                        <Badge className="bg-purple-100 text-purple-800">50 MB</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Internet</span>
                        <Badge className="bg-yellow-100 text-yellow-800">Required</Badge>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-1 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Important Notice
                      </h4>
                      <p className="text-sm text-yellow-700">
                        The app requires an active student account. Please ensure you're logged in with your institutional credentials.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 bg-gradient-to-r from-green-50 to-blue-50 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-2xl font-bold text-[#16a34a] mb-4">
              Ready to enhance your borrowing experience?
            </h2>
            <p className="text-lg text-black mb-8 max-w-2xl mx-auto">
              Download the app now and enjoy seamless equipment management on the go.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-[#16a34a] hover:bg-green-700 text-white px-8"
                onClick={() => handleDownloadApp('android')}
              >
                <div className="flex items-center">
                  <PlatformIcons.android />
                  <span className="ml-2">Download for Android</span>
                </div>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white px-8"
                onClick={() => handleDownloadApp('ios')}
              >
                <div className="flex items-center">
                  <PlatformIcons.ios />
                  <span className="ml-2">Download for iOS</span>
                </div>
              </Button>
            </div>
            <p className="mt-6 text-sm text-gray-600">
              Need help? Contact the laboratory support team at lab-support@fisheries.edu
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}