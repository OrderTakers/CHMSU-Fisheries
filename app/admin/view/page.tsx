// view-schedule/page.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { Toaster, toast } from "sonner";
import { Building2, Microscope, Printer } from "lucide-react";
import { useAuthStore } from "@/lib/stores";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Simplified interfaces
interface Laboratory { id: string; name: string; location?: string; }
interface Room { id: string; name: string; location?: string; laboratoryId?: string; }
interface Faculty { id: string; name: string; email?: string; }
interface ScheduleEvent {
  id: string;
  subjectName: string;
  yearSection: string;
  teacher?: string;
  laboratoryId: string;
  roomId: string;
  day: string;
  time: string; // e.g., "08:30" (24-hour format)
  duration: number; // in minutes, default 60
  timeSlot?: string;
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const fullDays = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday"
};

// Mock data fallbacks
const mockFaculty: Faculty[] = [
  { id: "mock1", name: "Dr. Finley Fish", email: "finley@chmsu.edu" },
  { id: "mock2", name: "Prof. Aqua Lee", email: "aqua@chmsu.edu" },
  { id: "mock3", name: "Ms. Coral Reef", email: "coral@chmsu.edu" },
];

const mockLaboratories: Laboratory[] = [
  { id: "507f1f77bcf86cd799439011", name: "Fish Capture Lab", location: "Building A, Floor 1" },
  { id: "507f1f77bcf86cd799439012", name: "Aquaculture Lab", location: "Building B, Floor 2" },
  { id: "507f1f77bcf86cd799439013", name: "Fish Processing Lab", location: "Building C, Floor 1" },
];

const mockRooms: Room[] = [
  { id: "507f1f77bcf86cd799439014", name: "Room 101 - Building A, 1st Floor", location: "East Wing", laboratoryId: "507f1f77bcf86cd799439011" },
  { id: "507f1f77bcf86cd799439015", name: "Room 201 - Building B, 2nd Floor", location: "West Wing", laboratoryId: "507f1f77bcf86cd799439012" },
  { id: "507f1f77bcf86cd799439016", name: "Room 102 - Building C, 1st Floor", location: "North Wing", laboratoryId: "507f1f77bcf86cd799439013" },
];

// Data transformation utility
const transformData = <T extends { _id?: string | object; id?: string }>(data: T[]): T[] =>
  data.map(item => {
    const id = item.id || (typeof item._id === 'string' ? item._id : item._id?.toString()) || `temp-${Date.now()}`;
    const transformed = { ...item, id } as T;
    delete (transformed as any)._id;
    return transformed;
  }).filter((item): item is T & { id: string } => item.id !== undefined && item.id.length > 0);

// Validation utilities
const validateLaboratory = (lab: any): lab is Laboratory =>
  typeof lab.id === 'string' && lab.id.length > 0 && typeof lab.name === 'string' && lab.name.length > 0;

const validateRoom = (room: any): room is Room =>
  typeof room.id === 'string' && room.id.length > 0 && typeof room.name === 'string' && room.name.length > 0;

const validateFaculty = (faculty: any): faculty is Faculty =>
  typeof faculty.id === 'string' && faculty.id.length > 0 && typeof faculty.name === 'string' && faculty.name.length > 0;

// FIXED: Enhanced validation to handle actual data structure
const validateScheduleEvent = (event: any): event is ScheduleEvent => {
  // More flexible validation to handle different data structures
  const hasValidId = typeof event.id === 'string' && event.id.length > 0;
  const hasValidSubject = typeof event.subjectName === 'string' && event.subjectName.length > 0;
  const hasValidDay = typeof event.day === 'string' && days.includes(event.day as any);
  
  // Handle both 'time' and 'startTime' fields
  const hasValidTime = typeof event.time === 'string' || typeof event.startTime === 'string';
  
  // Handle duration - either provided or default to 60
  const hasValidDuration = typeof event.duration === 'number' || true; // duration is optional
  
  const isValid = hasValidId && hasValidSubject && hasValidDay && hasValidTime && hasValidDuration;
  
  if (!isValid) {
    console.warn('❌ Invalid schedule event:', event);
  }
  
  return isValid;
};

// Generate unique key
const generateUniqueKey = (prefix: string, id?: string, index?: number): string =>
  id ? `${prefix}-${id}` : `${prefix}-temp-${index ?? Math.random().toString(36).substr(2, 9)}`;

// FIXED: Helper function to get end time from start time and duration
const getEndTime = (startTime: string, duration: number): string => {
  // Add validation to prevent undefined errors
  if (!startTime || typeof startTime !== 'string') {
    console.warn('Invalid startTime in getEndTime:', startTime);
    return '08:00'; // Default fallback
  }
  
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Validate time components
    if (isNaN(hours) || isNaN(minutes) || isNaN(duration)) {
      console.warn('Invalid parameters for getEndTime:', { startTime, duration });
      return '08:00';
    }
    
    const totalMinutes = hours * 60 + minutes + duration;
    
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error in getEndTime:', error);
    return '08:00'; // Default fallback
  }
};

// FIXED: Helper to format time for display
const formatTime = (time: string, duration: number) => {
  // Add validation
  if (!time || typeof time !== 'string') {
    console.warn('Invalid time in formatTime:', time);
    return 'Time not available';
  }
  
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(0, 0, 0, hours, minutes);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const format = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${format(start)} - ${format(end)}`;
  } catch (error) {
    console.error('Error in formatTime:', error);
    return `${time} - ${getEndTime(time, duration)}`;
  }
};

// FIXED: Helper to format time to 12-hour with AM/PM for print
const formatTimeForPrint = (time: string): string => {
  if (!time || typeof time !== 'string') {
    return 'N/A';
  }
  
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(0, 0, 0, hours, minutes);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (error) {
    console.error('Error in formatTimeForPrint:', error);
    return time; // Return original if parsing fails
  }
};

// FIXED: Helper to parse 12-hour time string to minutes since midnight
const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string') {
    return 0;
  }
  
  try {
    const [time, period] = timeStr.split(' ');
    const [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  } catch (error) {
    console.error('Error in parseTimeToMinutes:', error);
    return 0;
  }
};

export default function ScheduleViewer({ pageTitle = "Schedule Viewer" }: { pageTitle?: string }) {
  const { user } = useAuthStore();
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<Faculty[]>([]);
  const [selectedLaboratory, setSelectedLaboratory] = useState<Laboratory | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  // FIXED: Enhanced data transformation for schedule events
  const transformScheduleData = (data: any[]): ScheduleEvent[] => {
    return data.map(item => {
      // Handle both 'time' and 'startTime' fields
      const time = item.time || item.startTime || '07:00';
      
      // Handle duration with fallback
      const duration = item.duration || 60;
      
      // Handle yearSection with fallback
      const yearSection = item.yearSection || item.className || 'Unknown Section';
      
      return {
        id: item.id || item._id?.toString() || `temp-${Date.now()}`,
        subjectName: item.subjectName || 'Unknown Subject',
        yearSection: yearSection,
        teacher: item.teacher || item.teacherId,
        laboratoryId: item.laboratoryId || 'default-lab',
        roomId: item.roomId || '',
        day: item.day || 'Mon',
        time: time,
        duration: duration,
        timeSlot: item.timeSlot || `${time}-${getEndTime(time, duration)}`
      };
    });
  };

  // Print function
  const handlePrint = useCallback(() => {
    if (!selectedLaboratory || !selectedRoom) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print the schedule');
      return;
    }

    // Group events by day and time
    const daySchedules: { [key: string]: ScheduleEvent[] } = {};
    days.forEach(day => {
      daySchedules[day] = schedules.filter(s => s.day === day).sort((a, b) => a.time.localeCompare(b.time));
    });

    // Build table rows for events
    const eventRows: string[] = [];
    let globalTimeSlots: string[] = [];
    
    // Collect all unique time slots
    schedules.forEach(event => {
      const endTime24 = getEndTime(event.time, event.duration);
      const startTime12 = formatTimeForPrint(event.time);
      const endTime12 = formatTimeForPrint(endTime24);
      const timeSlot = `${startTime12} - ${endTime12}`;
      if (!globalTimeSlots.includes(timeSlot)) {
        globalTimeSlots.push(timeSlot);
      }
    });

    // Sort time slots chronologically by start time
    globalTimeSlots.sort((a, b) => {
      const startA = a.split(' - ')[0];
      const startB = b.split(' - ')[0];
      return parseTimeToMinutes(startA) - parseTimeToMinutes(startB);
    });

    // For each time slot, create a row
    globalTimeSlots.forEach(timeSlot => {
      const rowCells: string[] = [`<td class="print-table-time">${timeSlot}</td>`];
      days.forEach(day => {
        const dayEvent = daySchedules[day].find(e => {
          const endTime24 = getEndTime(e.time, e.duration);
          const startTime12 = formatTimeForPrint(e.time);
          const endTime12 = formatTimeForPrint(endTime24);
          return `${startTime12} - ${endTime12}` === timeSlot;
        });
        if (dayEvent) {
          const teacherName = facultyUsers.find(f => f.id === dayEvent.teacher)?.name || 'Unknown';
          rowCells.push(`
            <td class="print-event">
              <strong>${dayEvent.subjectName}</strong><br/>
              <small>${dayEvent.yearSection}</small><br/>
              <small>${teacherName}</small>
            </td>
          `);
        } else {
          rowCells.push('<td>&nbsp;</td>');
        }
      });
      eventRows.push(`<tr>${rowCells.join('')}</tr>`);
    });

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Schedule - ${selectedLaboratory?.name || 'Laboratory'} - ${selectedRoom?.name || 'Room'}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
            }
            .print-header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 15px;
            }
            .print-header h1 { 
              color: #1e40af; 
              margin: 0 0 5px 0;
              font-size: 24px;
            }
            .print-header p { 
              margin: 5px 0; 
              color: #6b7280;
            }
            .print-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
            }
            .print-table th { 
              background: #f8fafc; 
              padding: 12px; 
              border: 1px solid #e5e7eb;
              font-weight: bold;
              text-align: center;
            }
            .print-table td { 
              padding: 8px; 
              border: 1px solid #e5e7eb;
              vertical-align: top;
            }
            .print-table-time {
              background: #e0f2fe;
              font-weight: bold;
              width: 120px;
              text-align: right;
            }
            .print-event { 
              background: #f0f9ff; 
              border: 1px solid #bae6fd;
              border-radius: 6px;
              font-size: 11px;
            }
            .print-event strong { 
              display: block; 
              margin-bottom: 2px;
              font-size: 12px;
            }
            .print-event small { 
              display: block; 
              color: #6b7280;
              margin-bottom: 1px;
            }
            .print-footer { 
              margin-top: 30px; 
              text-align: center; 
              color: #6b7280; 
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
            }
            @media print {
              @page {
                size: A4 landscape;
              }
              body { margin: 0; }
              .print-header { margin-bottom: 15px; }
              .print-table {
                font-size: 9px;
                width: 100%;
              }
              .print-table th,
              .print-table td {
                padding: 4px 6px;
              }
              .print-table-time {
                padding-right: 8px;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Laboratory Schedule</h1>
            <p><strong>Laboratory:</strong> ${selectedLaboratory?.name || 'N/A'}</p>
            <p><strong>Room:</strong> ${selectedRoom?.name || 'N/A'}</p>
          </div>
          <table class="print-table">
            <thead>
              <tr>
                <th>Time Slot</th>
                ${days.map(day => `<th>${fullDays[day as keyof typeof fullDays]}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${eventRows.join('')}
            </tbody>
          </table>
          <div class="print-footer">
            <p>CHMSU Fisheries System - Schedule Viewer</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 250);
  }, [selectedLaboratory, selectedRoom, schedules, facultyUsers]);

  // Data fetching functions with mock fallbacks
  const fetchLaboratories = useCallback(async (): Promise<Laboratory[]> => {
    try {
      const res = await fetch("/api/laboratories");
      if (!res.ok) {
        console.warn("Failed to fetch laboratories - using mock data");
        return mockLaboratories;
      }
      const data = await res.json();
      const transformed = transformData(data);
      const validData = transformed.filter(validateLaboratory);
      return validData.length > 0 ? validData : mockLaboratories;
    } catch (err) {
      console.error("Failed to load laboratories:", err);
      return mockLaboratories;
    }
  }, []);

  const fetchAllRooms = useCallback(async (): Promise<Room[]> => {
    try {
      const res = await fetch("/api/rooms");
      if (!res.ok) {
        console.warn("Failed to fetch rooms - using mock data");
        return mockRooms;
      }
      const data = await res.json();
      const transformed = transformData(data);
      const validData = transformed.filter(validateRoom);
      return validData.length > 0 ? validData : mockRooms;
    } catch (err) {
      console.error("Failed to load rooms:", err);
      return mockRooms;
    }
  }, []);

  const fetchFacultyUsers = useCallback(async (): Promise<Faculty[]> => {
    try {
      const res = await fetch("/api/users?role=faculty");
      if (!res.ok) return mockFaculty;
      let data = await res.json();
      // Filter only faculty roles
      data = data.filter((user: any) => user.role === "faculty");
      // Construct full name from firstName and lastName for real data
      data = data.map((user: any) => ({
        ...user,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      }));
      const transformed = transformData(data);
      const valid = transformed.filter(validateFaculty);
      return valid.length > 0 ? valid : mockFaculty;
    } catch (err) {
      console.warn("Failed to load faculty—using mock data");
      return mockFaculty;
    }
  }, []);

  // FIXED: Enhanced fetchSchedules function
  const fetchSchedules = useCallback(async (labId: string, roomId: string): Promise<ScheduleEvent[]> => {
    try {
      console.log('🔄 Fetching schedules for lab:', labId, 'room:', roomId);
      
      let url = `/api/schedules`;
      const params = new URLSearchParams();
      
      if (labId && labId !== 'undefined') params.append('laboratoryId', labId);
      if (roomId && roomId !== 'undefined') params.append('roomId', roomId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('📡 API URL:', url);
      
      const res = await fetch(url);
      console.log('📨 Response status:', res.status);
      
      if (!res.ok) {
        console.warn('Failed to fetch schedules - using empty list');
        return [];
      }
      
      const data = await res.json();
      console.log('✅ Schedules data received, count:', data.length);
      
      // Use the enhanced transformation function
      const transformed = transformScheduleData(data);
      const validSchedules = transformed.filter(validateScheduleEvent);
      
      console.log('🔄 Valid schedules after transformation:', validSchedules.length);
      return validSchedules;
      
    } catch (err) {
      console.error('Failed to load schedules:', err);
      return [];
    }
  }, []);

  // Initialization effect
  useEffect(() => {
    const init = async () => {
      setIsGlobalLoading(true);
      try {
        const [labs, rooms, faculty] = await Promise.all([
          fetchLaboratories(), 
          fetchAllRooms(), 
          fetchFacultyUsers()
        ]);
        setLaboratories(labs);
        setAllRooms(rooms);
        setFacultyUsers(faculty);
        if (labs.length) setSelectedLaboratory(labs[0]);
      } catch (err) {
        console.error("Failed to initialize data:", err);
      } finally {
        setIsGlobalLoading(false);
      }
    };
    init();
  }, [fetchLaboratories, fetchAllRooms, fetchFacultyUsers]);

  // Room filtering effect - FIXED: Added selectedRoom to dependencies
  useEffect(() => {
    if (selectedLaboratory?.id) {
      const labRooms = allRooms.filter(r => 
        (r.laboratoryId && r.laboratoryId === selectedLaboratory.id) || 
        r.name.includes(selectedLaboratory.name)
      );
      setFilteredRooms(labRooms);
      if (labRooms.length && !selectedRoom) {
        setSelectedRoom(labRooms[0]);
      } else if (!labRooms.length) {
        setSelectedRoom(null);
      }
    } else {
      setFilteredRooms([]);
      setSelectedRoom(null);
    }
  }, [selectedLaboratory, allRooms, selectedRoom]);

  // Schedules fetching effect - FIXED: Added proper loading state
  useEffect(() => {
    if (selectedLaboratory?.id && selectedRoom?.id) {
      setIsLoading(true);
      fetchSchedules(selectedLaboratory.id, selectedRoom.id)
        .then(schedulesData => {
          setSchedules(schedulesData);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching schedules:', error);
          setIsLoading(false);
          setSchedules([]);
        });
    } else {
      setSchedules([]);
    }
  }, [selectedLaboratory, selectedRoom, fetchSchedules]);

  // Reusable select items
  const LabSelectItem = ({ lab, index }: { lab: Laboratory; index: number }) => (
    <SelectItem key={generateUniqueKey('lab', lab.id, index)} value={lab.id}>
      <div className="flex items-center gap-2">
        <Microscope className="w-4 h-4 text-blue-500" />
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{lab.name}</span>
          {lab.location && <span className="text-xs text-muted-foreground">{lab.location}</span>}
        </div>
      </div>
    </SelectItem>
  );

  const RoomSelectItem = ({ room, index }: { room: Room; index: number }) => (
    <SelectItem key={generateUniqueKey('room', room.id, index)} value={room.id}>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-green-500" />
          <span className="text-foreground">{room.name}</span>
        </div>
        {room.location && <span className="text-xs text-muted-foreground ml-6">{room.location}</span>}
      </div>
    </SelectItem>
  );

  if (isGlobalLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-teal-50">
        <Toaster position="top-right" richColors />
        <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-blue-100/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
                <Skeleton className="w-full sm:w-64 h-10 border-blue-200" />
                <Skeleton className="w-full sm:w-64 h-10 border-green-200" />
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Card className="border-0 bg-white/70 shadow-lg backdrop-blur-sm overflow-hidden">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-80" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card className="border-0 bg-white/70 shadow-xl backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <TableHead className="w-32 bg-gray-100 text-gray-700 font-semibold py-4 text-left">
                          <Skeleton className="h-4 w-full" />
                        </TableHead>
                        {days.map((_, i) => (
                          <TableHead key={i} className="bg-gradient-to-b from-blue-50 to-white text-center font-semibold py-4 text-gray-700 border-l border-gray-200">
                            <Skeleton className="h-4 w-16 mx-auto" />
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors bg-white/50">
                        <TableCell className="font-semibold text-gray-700 bg-white/60 py-3 px-4 sticky left-0 bg-gradient-to-r from-white/70 to-transparent z-10">
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        {days.map((_, di) => (
                          <TableCell key={di} className="text-center py-3 px-2 border-l border-gray-100">
                            <div className="flex flex-col items-center space-y-2 p-2 rounded-lg w-full h-[200px] bg-white/50">
                              {[...Array(3)].map((_, ei) => (
                                <Skeleton key={ei} className="h-16 w-20 rounded" />
                              ))}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-teal-50 text-foreground">
      <Toaster position="top-right" richColors />
      
      {/* Regular Header - Will NOT follow when scrolling */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-blue-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
              <Select 
                value={selectedLaboratory?.id || ""} 
                onValueChange={v => setSelectedLaboratory(laboratories.find(l => l.id === v) || null)} 
                disabled={isLoading || !laboratories.length}
              >
                <SelectTrigger className="w-full sm:w-64 border-border focus-visible:ring-blue-500 shadow-sm">
                  <SelectValue placeholder="Select Laboratory" />
                </SelectTrigger>
                <SelectContent>
                  {!laboratories.length ? (
                    <SelectItem value="none" disabled>No laboratories available</SelectItem>
                  ) : (
                    laboratories.map((lab, i) => <LabSelectItem key={i} lab={lab} index={i} />)
                  )}
                </SelectContent>
              </Select>
              <Select 
                value={selectedRoom?.id || ""} 
                onValueChange={v => setSelectedRoom(filteredRooms.find(r => r.id === v) || null)} 
                disabled={isLoading || !filteredRooms.length}
              >
                <SelectTrigger className="w-full sm:w-64 border-border focus-visible:ring-blue-500 shadow-sm">
                  <SelectValue placeholder={selectedLaboratory ? `Select Room in ${selectedLaboratory.name}` : "Select Laboratory first"} />
                </SelectTrigger>
                <SelectContent>
                  {!filteredRooms.length ? (
                    <SelectItem value="none" disabled>
                      {selectedLaboratory ? `No rooms in ${selectedLaboratory.name}` : "No laboratory selected"}
                    </SelectItem>
                  ) : (
                    filteredRooms.map((room, i) => <RoomSelectItem key={i} room={room} index={i} />)
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <h1 className="text-xl font-bold text-foreground leading-tight">{pageTitle}</h1>
                <p className="text-xs text-muted-foreground font-medium">
                  {user?.role || 'Admin'}
                  {selectedLaboratory && ` • ${selectedLaboratory.name}`}
                  {selectedRoom && ` • ${selectedRoom.name}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedLaboratory && selectedRoom ? (
            <motion.div key="schedule" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
              <Card className="border-0 bg-white/70 shadow-lg backdrop-blur-sm overflow-hidden">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">📅 Schedule</CardTitle>
                      <p className="text-muted-foreground">
                        <span className="font-medium">{selectedLaboratory.name}</span> • <span className="font-medium">{selectedRoom.name}</span>
                        {selectedLaboratory.location && ` • ${selectedLaboratory.location}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="bg-blue-200/30 border-blue-300/50 text-foreground">
                        {schedules.length} events • {filteredRooms.length} rooms
                      </Badge>
                      <Button 
                        onClick={handlePrint}
                        disabled={schedules.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm"
                      >
                        <Printer className="w-4 h-4" />
                        Print Schedule
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              <Card className="border-0 bg-white/70 shadow-xl backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto" ref={tableRef}>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-border">
                          <TableHead className="w-32 bg-muted text-foreground font-semibold py-4 text-left">Events</TableHead>
                          {days.map((day, i) => (
                            <TableHead key={generateUniqueKey('day', undefined, i)} className="bg-gradient-to-b from-blue-50 to-background text-center font-semibold py-4 text-foreground border-l border-border">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-bold uppercase tracking-wide text-foreground">
                                  {fullDays[day as keyof typeof fullDays]}
                                </span>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="border-b border-border hover:bg-blue-50/50 transition-colors bg-card/50">
                          <TableCell className="font-semibold text-foreground bg-card/60 py-3 px-4 sticky left-0 bg-gradient-to-r from-card/70 to-transparent z-10">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full" />
                              Schedule
                            </div>
                          </TableCell>
                          {days.map((day, di) => {
                            const dayEvents = schedules
                              .filter(s => s.day === day)
                              .sort((a, b) => a.time.localeCompare(b.time));
                            
                            return (
                              <TableCell 
                                key={generateUniqueKey('cell', undefined, di)} 
                                className="text-center py-3 px-2 border-l border-border group hover:bg-blue-100/50 transition-all" 
                              >
                                {isLoading ? (
                                  <div className="flex flex-col items-center space-y-2 p-2 rounded-lg w-full h-full min-h-[200px]">
                                    <Skeleton className="h-16 w-full bg-muted/50 rounded-lg" />
                                    <Skeleton className="h-16 w-full bg-muted/50 rounded-lg" />
                                  </div>
                                ) : (
                                  <motion.div className="flex flex-col items-center space-y-2 p-2 rounded-lg w-full h-full bg-card/50 hover:bg-blue-100 min-h-[200px]">
                                    {dayEvents.map((event, ei) => (
                                      <motion.div 
                                        key={generateUniqueKey('event', event.id, ei)} 
                                        className="flex flex-col items-center space-y-1 p-2 rounded-lg w-full bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200"
                                      >
                                        <div className="flex items-center gap-1">
                                          <span className="font-semibold text-sm text-foreground truncate max-w-[100px]">
                                            {event.subjectName}
                                          </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{event.yearSection}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatTime(event.time, event.duration)}
                                        </span>
                                        {event.teacher && (
                                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                            {facultyUsers.find(f => f.id === event.teacher)?.name || 'Unknown'}
                                          </span>
                                        )}
                                      </motion.div>
                                    ))}
                                    
                                    {dayEvents.length === 0 && (
                                      <motion.div 
                                        className="flex flex-col items-center justify-center p-4 text-muted-foreground h-full min-h-[100px]"
                                      >
                                        <span className="text-xs">No events scheduled</span>
                                      </motion.div>
                                    )}
                                  </motion.div>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div 
              key="empty" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="flex justify-center items-center h-96 bg-card/50 rounded-xl shadow-lg border border-dashed border-border"
            >
              <div className="text-center p-8 max-w-md">
                <Microscope className="h-16 w-16 text-blue-400 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-foreground mb-2">No Schedule Selected</h2>
                <p className="text-muted-foreground mb-6">
                  {laboratories.length === 0 ? "No laboratories available." : "Select a laboratory and room to view the schedule."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}