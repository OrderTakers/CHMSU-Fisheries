"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Users, 
  Clock, 
  Calendar, 
  Download, 
  QrCode, 
  BarChart3, 
  Filter,
  UserCheck,
  UserX,
  Loader2,
  ArrowLeft,
  Camera,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';

interface AttendanceRecord {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    schoolID: string;
    role: string;
  };
  roomId: {
    _id: string;
    name: string;
    code: string;
    metadata?: {
      roomNumber: string;
      building: string;
      floor: string;
      capacity?: number;
    };
  };
  laboratoryId: {
    _id: string;
    name: string;
    code: string;
  };
  scanTime: string;
  status: 'present' | 'late' | 'absent';
  type: 'check-in' | 'check-out';
  scannedBy: 'qr' | 'manual';
  session?: string;
}

interface Room {
  _id: string;
  name: string;
  code: string;
  laboratoryId: {
    _id: string;
    name: string;
    code: string;
  };
}

interface AttendanceStats {
  totalRecords: number;
  checkIns: number;
  checkOuts: number;
  uniqueUsers: number;
  statusBreakdown: Array<{ _id: string; count: number }>;
}

// QR Scanner Component
function QRScanner({ 
  onScanSuccess, 
  onScanFailure, 
  roomId, 
  roomName,
  purpose = 'attendance' 
}: { 
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
  roomId?: string;
  roomName?: string;
  purpose?: 'attendance' | 'equipment';
}) {
  const scannerRef = useRef<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string>('');

  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) {
          setHasCamera(false);
          setCameraError('Camera API not supported');
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasCamera(videoDevices.length > 0);
        
        if (videoDevices.length === 0) {
          setCameraError('No camera found on this device');
        }
      } catch (error) {
        console.error('Error checking camera:', error);
        setHasCamera(false);
        setCameraError('Cannot access camera');
      }
    };

    checkCamera();
  }, []);

  const startScanner = async () => {
    if (!hasCamera) {
      onScanFailure?.('Camera not available');
      return;
    }

    setIsLoading(true);

    try {
      // Dynamically import html5-qrcode
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          qrbox: {
            width: 250,
            height: 250,
          },
          fps: 10,
          aspectRatio: 1.0,
        },
        false
      );

      scannerRef.current = scanner;

      scanner.render(
        (decodedText: string) => {
          setLastScanResult({ 
            success: true, 
            message: `${purpose === 'attendance' ? 'Attendance' : 'Equipment'} recorded successfully!` 
          });
          
          onScanSuccess(decodedText);
          
          setTimeout(() => {
            stopScanner();
            setLastScanResult(null);
          }, 2000);
        },
        (error: string) => {
          if (!error.includes('NotFoundException')) {
            console.log('Scan error:', error);
            setLastScanResult({ 
              success: false, 
              message: `Scan failed: ${error}` 
            });
            onScanFailure?.(error);
          }
        }
      );

      setIsScanning(true);
    } catch (error) {
      console.error('Error starting scanner:', error);
      setCameraError('Failed to start scanner');
      onScanFailure?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <QrCode className="h-5 w-5" />
          QR Scanner
        </CardTitle>
        <CardDescription className="text-sm">
          {purpose === 'attendance' 
            ? `Scan QR code to mark attendance${roomName ? ` in ${roomName}` : ''}`
            : 'Scan QR code to manage equipment'
          }
        </CardDescription>
        {roomId && roomId !== 'all' && (
          <Badge variant="secondary" className="w-fit">
            Room: {roomName || roomId}
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Scanner Container */}
        <div className="relative border-2 border-dashed border-border rounded-lg min-h-[300px] flex items-center justify-center bg-muted/20">
          <div id="qr-reader" className="w-full h-full">
            {!isScanning && (
              <div className="text-center text-muted-foreground p-6">
                <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">Scanner Ready</p>
                <p className="text-xs">Click start to begin scanning</p>
                {cameraError && (
                  <p className="text-xs text-destructive mt-2">{cameraError}</p>
                )}
              </div>
            )}
          </div>
          
          {/* Scan Result Overlay */}
          {lastScanResult && (
            <div className={`absolute inset-0 flex items-center justify-center rounded-lg ${
              lastScanResult.success 
                ? 'bg-green-50 border-2 border-green-200 text-green-700' 
                : 'bg-destructive/10 border-2 border-destructive/20 text-destructive'
            }`}>
              <div className="text-center p-4">
                {lastScanResult.success ? (
                  <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                ) : (
                  <XCircle className="h-12 w-12 mx-auto mb-2" />
                )}
                <p className="font-medium text-sm">{lastScanResult.message}</p>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Initializing scanner...</p>
              </div>
            </div>
          )}
        </div>

        {/* Camera Status Alert */}
        {!hasCamera && !cameraError && (
          <Alert variant="destructive" className="py-3">
            <AlertDescription className="text-sm">
              Camera not available. Please check your device permissions.
            </AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button 
              onClick={startScanner} 
              className="flex-1" 
              disabled={!hasCamera || isLoading}
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Starting...' : 'Start Scanner'}
            </Button>
          ) : (
            <Button 
              onClick={stopScanner} 
              variant="outline" 
              className="flex-1"
              size="lg"
            >
              <Camera className="h-4 w-4 mr-2" />
              Stop Scanner
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>• Position QR code within the frame</p>
          <p>• Ensure good lighting for better detection</p>
          <p>• Hold steady until scan completes</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Attendance Page Component
export default function AdminAttendancePage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  // Auth protection
  useEffect(() => {
    if (authLoading) return;

    if (!user || user.role !== 'admin') {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  // Fetch attendance data
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        date: selectedDate,
        limit: '50'
      });
      
      if (selectedRoom !== 'all') {
        params.append('roomId', selectedRoom);
      }

      const response = await fetch(`/api/attendance?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch attendance');
      }

      setAttendance(data.attendance || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  // Fetch rooms
  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms?isActive=true');
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setError('Failed to fetch rooms');
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedRoom !== 'all') {
        params.append('roomId', selectedRoom);
      }

      const response = await fetch(`/api/attendance/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRooms();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAttendance();
      fetchStats();
    }
  }, [selectedRoom, selectedDate, user]);

  // Handle QR scan
  const handleScanSuccess = async (decodedText: string) => {
    try {
      setError('');
      
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCode: decodedText,
          type: 'check-in',
          session: 'auto'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record attendance');
      }

      fetchAttendance();
      fetchStats();
      setIsScannerOpen(false);
    } catch (error) {
      console.error('Error recording attendance:', error);
      setError(error instanceof Error ? error.message : 'Error recording attendance');
    }
  };

  const handleScanFailure = (error: string) => {
    console.log('Scan failed:', error);
    setError(`Scan failed: ${error}`);
  };

  // Filter attendance based on search
  const filteredAttendance = attendance.filter(record =>
    record.userId.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.userId.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.userId.schoolID.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.roomId.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Download attendance report
  const downloadReport = async () => {
    try {
      const csvContent = [
        ['Name', 'School ID', 'Room', 'Laboratory', 'Time', 'Status', 'Type', 'Scanned By'],
        ...filteredAttendance.map((record) => [
          `${record.userId.firstName} ${record.userId.lastName}`,
          record.userId.schoolID,
          record.roomId.name,
          record.laboratoryId.name,
          new Date(record.scanTime).toLocaleString(),
          record.status,
          record.type,
          record.scannedBy
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${selectedDate}-${selectedRoom === 'all' ? 'all-rooms' : rooms.find(r => r._id === selectedRoom)?.code}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Failed to download report');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500 hover:bg-green-600">Present</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Late</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'check-in':
        return <Badge variant="default">Check-in</Badge>;
      case 'check-out':
        return <Badge variant="secondary">Check-out</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Skeleton loaders
  const SkeletonCard = () => (
    <Card>
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
      <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
      <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableCell>
      <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></TableCell>
      <TableCell><div className="h-6 w-16 bg-muted rounded animate-pulse"></div></TableCell>
      <TableCell><div className="h-6 w-16 bg-muted rounded animate-pulse"></div></TableCell>
    </TableRow>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // Will redirect due to useEffect
  }

  if (loading && attendance.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted rounded animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(7)].map((_, i) => (
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
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Attendance Tracking</h1>
              <p className="text-muted-foreground">QR-based attendance system for laboratory rooms</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Admin: {user?.firstName} {user?.lastName}
            </Badge>
            <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <QrCode className="h-4 w-4" />
                  Scan QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Scan Attendance QR Code</DialogTitle>
                </DialogHeader>
                <QRScanner
                  onScanSuccess={handleScanSuccess}
                  onScanFailure={handleScanFailure}
                  roomId={selectedRoom !== 'all' ? selectedRoom : undefined}
                  roomName={selectedRoom !== 'all' ? rooms.find(r => r._id === selectedRoom)?.name : undefined}
                  purpose="attendance"
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search users..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Rooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {rooms.map(room => (
                        <SelectItem key={room._id} value={room._id}>
                          {room.name} ({room.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalRecords}</div>
                    <p className="text-xs text-muted-foreground">Attendance records</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Check-ins</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.checkIns}</div>
                    <p className="text-xs text-muted-foreground">Today's check-ins</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Check-outs</CardTitle>
                    <UserX className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.checkOuts}</div>
                    <p className="text-xs text-muted-foreground">Today's check-outs</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
                    <p className="text-xs text-muted-foreground">Distinct users</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Check-ins</CardTitle>
                  <CardDescription>Latest attendance records</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredAttendance.slice(0, 5).map((record) => (
                      <div key={record._id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                            {record.userId.firstName[0]}{record.userId.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {record.userId.firstName} {record.userId.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{record.roomId.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Date(record.scanTime).toLocaleTimeString()}
                          </p>
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                    ))}
                    {filteredAttendance.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No attendance records found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Manage attendance system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button onClick={downloadReport} variant="outline" className="w-full justify-start gap-2">
                      <Download className="h-4 w-4" />
                      Export Report
                    </Button>
                    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <QrCode className="h-4 w-4" />
                          Scan QR Code
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                    <Button 
                      onClick={() => setActiveTab('records')} 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      View All Records
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Records Tab */}
          <TabsContent value="records" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>
                  {selectedDate} • {selectedRoom === 'all' ? 'All Rooms' : rooms.find(r => r._id === selectedRoom)?.name}
                  {filteredAttendance.length > 0 && ` • ${filteredAttendance.length} records`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>School ID</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Laboratory</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendance.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {record.userId.firstName} {record.userId.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">{record.userId.email}</p>
                              <p className="text-xs text-muted-foreground capitalize">{record.userId.role}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {record.userId.schoolID}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.roomId.name}</p>
                              <p className="text-sm text-muted-foreground">{record.roomId.code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {record.laboratoryId.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(record.scanTime).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(record.scanTime).toLocaleTimeString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(record.type)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(record.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredAttendance.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {attendance.length === 0 ? 'No attendance records found' : 'No records match your search'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}