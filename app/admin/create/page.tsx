// app/admin/schedule/create/page.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Toaster, toast } from "sonner";
import { Building2, Microscope, Plus, Edit, Trash2, Calendar, BookOpen, School, User, RefreshCw, Clock, Hash } from "lucide-react";
import { useAuthStore } from "@/lib/stores";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// Updated interfaces to match models
interface Laboratory { 
  _id: string;
  id: string; 
  name: string; 
  location?: string; 
}

interface Room { 
  _id: string;
  id: string; 
  name: string; 
  location?: string; 
  laboratoryId: string;
  metadata?: {
    roomNumber: string;
    building: string;
    floor: string;
    capacity?: number;
  };
}

interface Faculty { 
  _id: string;
  id: string; 
  firstName: string;
  lastName: string;
  name: string; 
  email?: string;
  role: string;
}

interface ScheduleEvent {
  _id: string;
  id: string;
  scheduleId: string;
  subjectName: string;
  className: string;
  year: number;
  section: string;
  yearSection: string;
  schoolYear: string;
  semester: '1st' | '2nd';
  semesterDisplay: string;
  teacher?: string;
  teacherName?: string;
  laboratoryId: string;
  laboratoryName?: string;
  roomId: string;
  roomName: string;
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  timeSlot: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'rescheduled';
  semesterLocked: boolean;
  metadata: {
    recurring: boolean;
    recurrencePattern: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    maxStudents: number;
  };
  students: string[];
  qrCode: string;
  createdAt: string;
  updatedAt: string;
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const semesters = ['1st', '2nd'] as const;
const years = [1, 2, 3, 4];

// Helper functions
const formatDisplayTime = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(0, 0, 0, hours, minutes);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const calculateDuration = (startTime: string, endTime: string): number => {
  const parseTime = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  return parseTime(endTime) - parseTime(startTime);
};

const getDayFromDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  } catch {
    return 'Mon';
  }
};

const generateTimeOptions = (): string[] => {
  const times: string[] = [];
  for (let hour = 7; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 17 && minute > 0) continue;
      times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return times;
};

// Function to generate school years from current year onward
const generateSchoolYears = (startYear = 2023): string[] => {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  
  for (let year = startYear; year <= currentYear + 5; year++) {
    years.push(`${year}-${year + 1}`);
  }
  
  return years;
};

// Data transformation utility
const transformData = <T extends { _id?: string | object; id?: string; firstName?: string; lastName?: string; role?: string; name?: string; email?: string }>(data: T[]): T[] =>
  data.map(item => {
    const id = item.id || (typeof item._id === 'string' ? item._id : item._id?.toString()) || `temp-${Date.now()}`;
    const transformed = { ...item, id, _id: id } as T;
    return transformed;
  }).filter((item): item is T & { id: string; _id: string } => item.id !== undefined && item.id.length > 0);

// Validation utilities
const validateLaboratory = (lab: any): lab is Laboratory =>
  typeof lab._id === 'string' && lab._id.length > 0 && typeof lab.name === 'string' && lab.name.length > 0;

const validateRoom = (room: any): room is Room =>
  typeof room._id === 'string' && room._id.length > 0 && typeof room.name === 'string' && room.name.length > 0;

const validateFaculty = (faculty: any): faculty is Faculty => {
  if (!faculty || typeof faculty !== 'object') return false;
  const id = faculty._id || faculty.id;
  if (typeof id !== 'string' || id.length === 0) return false;
  if (faculty.role !== 'faculty') return false;
  if (typeof faculty.firstName !== 'string' || faculty.firstName.length === 0) return false;
  if (typeof faculty.lastName !== 'string' || faculty.lastName.length === 0) return false;
  return true;
};

export default function ScheduleMaker() {
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
  
  // School years state
  const [schoolYears, setSchoolYears] = useState<string[]>(generateSchoolYears(2023));
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<'1st' | '2nd'>('1st');
  
  // New school year form state
  const [newSchoolYearInput, setNewSchoolYearInput] = useState('');
  const [showAddSchoolYear, setShowAddSchoolYear] = useState(false);
  
  // Add Facility states
  const [isAddFacilityDialogOpen, setIsAddFacilityDialogOpen] = useState(false);
  const [facilityType, setFacilityType] = useState<"laboratory" | "room">("laboratory");
  const [newLaboratory, setNewLaboratory] = useState({
    labType: "Fish Capture Lab",
    location: ""
  });
  const [newRoomData, setNewRoomData] = useState({
    laboratoryId: "",
    roomNumber: "",
    building: "",
    floor: "",
    capacity: "",
    location: ""
  });
  
  const [newEvent, setNewEvent] = useState({
    subjectName: "",
    className: "",
    year: 1,
    section: "",
    schoolYear: '',
    semester: '1st' as '1st' | '2nd',
    teacher: "",
    teacherName: "",
    day: "Mon",
    date: new Date().toISOString().split('T')[0],
    startTime: "07:00",
    endTime: "08:00",
    laboratoryId: "",
    roomId: "",
    roomName: "",
    metadata: {
      recurring: false,
      recurrencePattern: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'monthly',
      maxStudents: 30
    }
  });
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isClearScheduleDialogOpen, setIsClearScheduleDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize with current school year on component mount
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const schoolYearStart = currentMonth >= 6 ? currentYear : currentYear - 1;
    const currentSchoolYear = `${schoolYearStart}-${schoolYearStart + 1}`;
    
    setSelectedSchoolYear(currentSchoolYear);
    setNewEvent(prev => ({ ...prev, schoolYear: currentSchoolYear }));
    
    if (!schoolYears.includes(currentSchoolYear)) {
      setSchoolYears(prev => {
        const updated = [...prev, currentSchoolYear].sort((a, b) => {
          const aStart = parseInt(a.split('-')[0]);
          const bStart = parseInt(b.split('-')[0]);
          return bStart - aStart;
        });
        return updated;
      });
    }
  }, []);

  // Fetch all data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setIsGlobalLoading(true);
      try {
        await Promise.all([
          fetchLaboratories(),
          fetchFaculty(),
          fetchAllRooms()
        ]);
      } catch (error) {
        console.error("Failed to load initial data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsGlobalLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Fetch schedules when filters change
  useEffect(() => {
    if (selectedSchoolYear && selectedSemester && selectedLaboratory) {
      fetchSchedules();
    }
  }, [selectedSchoolYear, selectedSemester, selectedLaboratory, selectedRoom]);

  // Filter rooms when lab changes
  useEffect(() => {
    if (selectedLaboratory?._id) {
      const filtered = allRooms.filter(room => room.laboratoryId === selectedLaboratory._id);
      setFilteredRooms(filtered);
      if (filtered.length > 0 && !selectedRoom) {
        setSelectedRoom(filtered[0]);
        setNewEvent(prev => ({ 
          ...prev, 
          laboratoryId: selectedLaboratory._id,
          roomId: filtered[0]._id,
          roomName: filtered[0].name
        }));
      } else if (filtered.length === 0) {
        setSelectedRoom(null);
        setNewEvent(prev => ({ 
          ...prev, 
          laboratoryId: selectedLaboratory._id,
          roomId: "",
          roomName: ""
        }));
      }
    } else {
      setFilteredRooms(allRooms);
    }
  }, [selectedLaboratory, allRooms]);

  // Update newRoomData when laboratory changes
  useEffect(() => {
    if (selectedLaboratory?._id && !newRoomData.laboratoryId && facilityType === "room") {
      setNewRoomData(prev => ({
        ...prev,
        laboratoryId: selectedLaboratory._id
      }));
    }
  }, [selectedLaboratory, facilityType]);

  // Update day when date changes
  useEffect(() => {
    if (newEvent.date) {
      const day = getDayFromDate(newEvent.date);
      setNewEvent(prev => ({ ...prev, day }));
    }
  }, [newEvent.date]);

  // Fetch laboratories
  const fetchLaboratories = async () => {
    try {
      const res = await fetch('/api/laboratories');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch laboratories');
      }
      const data = await res.json();
      
      const labs = transformData(data);
      const validLabs = labs.filter(validateLaboratory);
      
      console.log(`Fetched ${validLabs.length} laboratories`);
      setLaboratories(validLabs);
      
      if (validLabs.length > 0 && !selectedLaboratory) {
        setSelectedLaboratory(validLabs[0]);
      }
    } catch (err) {
      console.error("Error fetching laboratories:", err);
      toast.error("Failed to load laboratories");
    }
  };

  // Fetch rooms
  const fetchAllRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch rooms');
      }
      const data = await res.json();
      
      const rooms = transformData(data);
      const validRooms = rooms.filter(validateRoom);
      
      console.log(`Fetched ${validRooms.length} rooms`);
      setAllRooms(validRooms);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      toast.error("Failed to load rooms");
    }
  };

  // Fetch faculty - ONLY faculty role
  const fetchFaculty = async () => {
    try {
      const res = await fetch('/api/users?role=faculty');
      if (!res.ok) {
        console.log("Faculty fetch failed, continuing without faculty data");
        return;
      }
      const data = await res.json();
      
      // Transform and validate faculty data with proper typing
      const faculty = transformData(data)
        .map((item: any) => {
          // Safely extract properties with type checking
          const firstName = typeof item.firstName === 'string' ? item.firstName : '';
          const lastName = typeof item.lastName === 'string' ? item.lastName : '';
          const role = typeof item.role === 'string' ? item.role : '';
          const email = typeof item.email === 'string' ? item.email : '';
          const id = item._id || item.id || '';
          
          return {
            _id: id,
            id: id,
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            email,
            role
          };
        })
        .filter((item: any) => item.role === 'faculty' && item.firstName && item.lastName);
      
      console.log(`Fetched ${faculty.length} faculty members`);
      setFacultyUsers(faculty);
    } catch (err) {
      console.error("Error fetching faculty:", err);
      // Don't show error for faculty as it's optional
    }
  };

  // Fetch schedules
  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      let url = `/api/schedules?schoolYear=${selectedSchoolYear}&semester=${selectedSemester}`;
      
      if (selectedLaboratory?._id) {
        url += `&laboratoryId=${selectedLaboratory._id}`;
      }
      
      if (selectedRoom?._id) {
        url += `&roomId=${selectedRoom._id}`;
      }
      
      console.log("Fetching schedules from:", url);
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch schedules');
      }
      
      const data = await res.json();
      console.log(`Fetched ${data.length} schedules from database`);
      
      // Transform data to match ScheduleEvent interface
      const transformedSchedules = transformData(data).map((item: any) => ({
        ...item,
        id: item._id,
        semester: (item.semester === '1st' || item.semester === '2nd') ? item.semester : '1st',
        status: item.status || 'scheduled',
        metadata: item.metadata || {
          recurring: false,
          recurrencePattern: 'weekly',
          maxStudents: 30
        },
        students: item.students || [],
        qrCode: item.qrCode || '',
        yearSection: `${item.year || 1}-${item.section || 'A'}`
      }));
      
      setSchedules(transformedSchedules);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      toast.error("Failed to load schedules");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add new school year
  const handleAddSchoolYear = () => {
    if (!newSchoolYearInput.trim()) {
      toast.error("Please enter a valid school year");
      return;
    }

    const regex = /^\d{4}-\d{4}$/;
    if (!regex.test(newSchoolYearInput)) {
      toast.error("Please enter school year in format: YYYY-YYYY (e.g., 2026-2027)");
      return;
    }

    const [startYear, endYear] = newSchoolYearInput.split('-').map(Number);
    
    if (endYear !== startYear + 1) {
      toast.error("School year must be in format: YYYY-(YYYY+1) (e.g., 2026-2027)");
      return;
    }

    if (schoolYears.includes(newSchoolYearInput)) {
      toast.error("This school year already exists");
      return;
    }

    const updatedYears = [...schoolYears, newSchoolYearInput].sort((a, b) => {
      const aStart = parseInt(a.split('-')[0]);
      const bStart = parseInt(b.split('-')[0]);
      return bStart - aStart;
    });

    setSchoolYears(updatedYears);
    setSelectedSchoolYear(newSchoolYearInput);
    setNewEvent(prev => ({ ...prev, schoolYear: newSchoolYearInput }));
    setNewSchoolYearInput('');
    setShowAddSchoolYear(false);
    
    toast.success(`School year ${newSchoolYearInput} added!`);
  };

  // Handle add laboratory
  const handleAddLaboratory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!newLaboratory.labType.trim()) {
        throw new Error("Laboratory type is required");
      }
      
      if (newLaboratory.location && newLaboratory.location.length > 50) {
        throw new Error("Location must be 50 characters or less");
      }
      
      const payload = {
        name: newLaboratory.labType,
        location: newLaboratory.location?.trim() || undefined
      };
      
      console.log("Adding new laboratory:", payload);
      
      const res = await fetch('/api/laboratories', { 
        method: 'POST', 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add laboratory");
      }
      
      const savedLab = await res.json();
      console.log("Laboratory added:", savedLab);
      
      toast.success("Laboratory added successfully!");
      
      setNewLaboratory({
        labType: "Fish Capture Lab",
        location: ""
      });
      
      await fetchLaboratories();
      
      if (savedLab._id) {
        const newLab = { 
          _id: savedLab._id,
          id: savedLab._id, 
          name: savedLab.name,
          location: savedLab.location
        };
        setSelectedLaboratory(newLab);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add laboratory";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add room
  const handleAddRoom = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validation
      if (!newRoomData.laboratoryId) {
        throw new Error("Laboratory is required");
      }
      
      if (!newRoomData.roomNumber.trim()) {
        throw new Error("Room number is required");
      }
      
      if (!/^\d+$/.test(newRoomData.roomNumber)) {
        throw new Error("Room number must be a number");
      }
      
      if (!newRoomData.building.trim()) {
        throw new Error("Building is required");
      }
      
      if (!newRoomData.floor.trim()) {
        throw new Error("Floor is required");
      }
      
      if (newRoomData.capacity && !/^\d+$/.test(newRoomData.capacity)) {
        throw new Error("Capacity must be a number");
      }
      
      if (newRoomData.location && newRoomData.location.length > 50) {
        throw new Error("Location must be 50 characters or less");
      }
      
      // Find the laboratory
      const lab = laboratories.find(l => l._id === newRoomData.laboratoryId);
      if (!lab) {
        throw new Error("Laboratory not found");
      }
      
      // Create room name with proper formatting
      const floorNum = parseInt(newRoomData.floor) || 1;
      const ordinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
      };
      
      const floorDisplay = newRoomData.floor.includes('Floor') 
        ? newRoomData.floor 
        : `${newRoomData.floor}${ordinal(floorNum)} Floor`;
      
      const roomName = `${lab.name} - Room ${newRoomData.roomNumber} - ${newRoomData.building}, ${floorDisplay}`;
      
      const roomLocation = `${newRoomData.building} Building, ${floorDisplay}${newRoomData.location ? ` - ${newRoomData.location}` : ''}`.trim();
      
      // Prepare payload
      const payload = {
        name: roomName,
        laboratoryId: newRoomData.laboratoryId,
        location: roomLocation,
        metadata: {
          roomNumber: newRoomData.roomNumber.trim(),
          building: newRoomData.building.trim(),
          floor: newRoomData.floor.trim(),
          capacity: newRoomData.capacity ? parseInt(newRoomData.capacity) : undefined
        }
      };
      
      console.log("Adding new room:", payload);
      
      const res = await fetch('/api/rooms', { 
        method: 'POST', 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add room");
      }
      
      const savedRoom = await res.json();
      console.log("Room added:", savedRoom);
      
      toast.success("Room added successfully!");
      
      // Reset form
      setNewRoomData({
        laboratoryId: selectedLaboratory?._id || "",
        roomNumber: "",
        building: "",
        floor: "",
        capacity: "",
        location: ""
      });
      
      // Refresh rooms list
      await fetchAllRooms();
      
      // Auto-select the newly added room
      if (savedRoom._id && selectedLaboratory?._id === newRoomData.laboratoryId) {
        const newRoom = { 
          _id: savedRoom._id,
          id: savedRoom._id, 
          name: savedRoom.name,
          location: savedRoom.location,
          laboratoryId: savedRoom.laboratoryId,
          metadata: savedRoom.metadata
        };
        setSelectedRoom(newRoom);
        setNewEvent(prev => ({ 
          ...prev, 
          roomId: savedRoom._id,
          roomName: savedRoom.name
        }));
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add room";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add facility
  const handleAddFacility = () => {
    if (facilityType === "laboratory") {
      handleAddLaboratory();
    } else {
      handleAddRoom();
    }
  };

  // Handle save event
  const handleSaveEvent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { 
        subjectName, className, year, section, schoolYear, semester, 
        day, date, startTime, endTime, laboratoryId, roomId, teacher, teacherName,
        metadata
      } = newEvent;
      
      // Validation
      if (!subjectName.trim()) throw new Error("Subject name is required");
      if (!className.trim()) throw new Error("Class name is required");
      if (!section.trim()) throw new Error("Section is required");
      if (!schoolYear) throw new Error("School year is required");
      if (!semester) throw new Error("Semester is required");
      if (!date) throw new Error("Date is required");
      if (!day) throw new Error("Day is required");
      if (!startTime) throw new Error("Start time is required");
      if (!endTime) throw new Error("End time is required");
      if (!laboratoryId) throw new Error("Laboratory is required");
      if (!roomId) throw new Error("Room is required");
      
      const duration = calculateDuration(startTime, endTime);
      if (duration <= 0) throw new Error("End time must be after start time");
      
      const room = allRooms.find(r => r._id === roomId);
      if (!room) throw new Error("Selected room not found");
      
      // Find teacher name if teacher is selected
      let finalTeacherName = teacherName;
      if (teacher && teacher !== "no-faculty") {
        const selectedTeacher = facultyUsers.find(f => f._id === teacher);
        if (selectedTeacher) {
          finalTeacherName = `${selectedTeacher.firstName} ${selectedTeacher.lastName}`.trim();
        }
      }
      
      const payload = {
        subjectName: subjectName.trim(),
        className: className.trim(),
        year,
        section: section.trim().toUpperCase(),
        schoolYear,
        semester,
        teacher: teacher || "",
        teacherName: finalTeacherName || "",
        laboratoryId,
        roomId,
        roomName: room.name,
        day,
        date,
        startTime,
        endTime,
        duration,
        timeSlot: `${startTime}-${endTime}`,
        status: 'scheduled',
        semesterLocked: false,
        metadata: metadata || {
          recurring: false,
          recurrencePattern: 'weekly',
          maxStudents: 30
        }
      };
      
      console.log("Saving schedule:", payload);
      
      const method = selectedEventId ? "PUT" : "POST";
      const url = selectedEventId ? `/api/schedules?id=${selectedEventId}` : "/api/schedules";
      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save schedule");
      }
      
      const savedEvent = await res.json();
      console.log("Schedule saved:", savedEvent);
      
      toast.success(selectedEventId ? "Schedule updated!" : "Schedule added!");
      setIsEditDialogOpen(false);
      setSelectedEventId(null);
      
      // Reset form with current selections
      setNewEvent({
        subjectName: "",
        className: "",
        year: 1,
        section: "",
        schoolYear: selectedSchoolYear,
        semester: selectedSemester,
        teacher: "",
        teacherName: "",
        day: "Mon",
        date: new Date().toISOString().split('T')[0],
        startTime: "07:00",
        endTime: "08:00",
        laboratoryId: selectedLaboratory?._id || "",
        roomId: selectedRoom?._id || "",
        roomName: selectedRoom?.name || "",
        metadata: {
          recurring: false,
          recurrencePattern: 'weekly',
          maxStudents: 30
        }
      });
      
      // Refresh schedules
      await fetchSchedules();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save schedule";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete event
  const handleDeleteEvent = async () => {
    if (!selectedEventId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/schedules?id=${selectedEventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete schedule");
      
      toast.success("Schedule deleted!");
      setIsDeleteDialogOpen(false);
      setSelectedEventId(null);
      
      await fetchSchedules();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete schedule";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clear schedule
  const handleClearSchedule = async () => {
    if (!selectedRoom?._id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/schedules?roomId=${selectedRoom._id}&schoolYear=${selectedSchoolYear}&semester=${selectedSemester}`, { 
        method: "DELETE" 
      });
      if (!res.ok) throw new Error("Failed to clear schedule");
      
      toast.success("Schedule cleared!");
      setIsClearScheduleDialogOpen(false);
      
      await fetchSchedules();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to clear schedule";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (day: string, event?: ScheduleEvent) => {
    const endTime = event?.endTime || "08:00";
    const labId = event?.laboratoryId || selectedLaboratory?._id || "";
    const roomId = event?.roomId || selectedRoom?._id || "";
    
    setNewEvent({
      subjectName: event?.subjectName || "",
      className: event?.className || "",
      year: event?.year || 1,
      section: event?.section || "",
      schoolYear: event?.schoolYear || selectedSchoolYear,
      semester: event?.semester || selectedSemester,
      teacher: event?.teacher || "",
      teacherName: event?.teacherName || "",
      day: event?.day || day,
      date: event?.date ? new Date(event.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      startTime: event?.startTime || "07:00",
      endTime: endTime,
      laboratoryId: labId,
      roomId: roomId,
      roomName: event?.roomName || selectedRoom?.name || "",
      metadata: event?.metadata || {
        recurring: false,
        recurrencePattern: 'weekly',
        maxStudents: 30
      }
    });
    
    setSelectedEventId(event?._id || null);
    setError(null);
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (eventId: string) => {
    setSelectedEventId(eventId);
    setError(null);
    setIsDeleteDialogOpen(true);
  };

  // Refresh all data
  const handleRefreshSchedules = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchLaboratories(),
        fetchAllRooms(),
        fetchFaculty(),
        fetchSchedules()
      ]);
      toast.success("Data refreshed!");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };

  // Time options
  const timeOptions = generateTimeOptions();

  // Loading state
  if (isGlobalLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-teal-50">
        <Toaster position="top-right" richColors />
        <div className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-blue-100/50">
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
        </div>
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
      
      {/* Main Header */}
      <div className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-blue-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
              <Select 
                value={selectedLaboratory?._id || ""} 
                onValueChange={(v: string) => {
                  const lab = laboratories.find(l => l._id === v) || null;
                  setSelectedLaboratory(lab);
                  if (lab) {
                    setNewEvent(prev => ({ ...prev, laboratoryId: lab._id }));
                  }
                }} 
                disabled={isLoading || !laboratories.length}
              >
                <SelectTrigger className="w-full sm:w-56 border-border focus-visible:ring-blue-500 shadow-sm text-sm">
                  <SelectValue placeholder="Select Laboratory" />
                </SelectTrigger>
                <SelectContent>
                  {!laboratories.length ? (
                    <SelectItem value="none" disabled>No laboratories available</SelectItem>
                  ) : (
                    laboratories.map((lab, i) => (
                      <SelectItem key={`lab-${i}`} value={lab._id}>
                        <div className="flex items-center gap-2">
                          <Microscope className="w-4 h-4 text-blue-500" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-foreground truncate">{lab.name}</span>
                            {lab.location && <span className="text-xs text-muted-foreground truncate">{lab.location}</span>}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 w-full sm:w-56">
                <Select 
                  value={selectedRoom?._id || ""} 
                  onValueChange={(v: string) => {
                    const room = filteredRooms.find(r => r._id === v) || null;
                    setSelectedRoom(room);
                    if (room) {
                      setNewEvent(prev => ({ ...prev, roomId: room._id, roomName: room.name }));
                    }
                  }} 
                  disabled={isLoading || !filteredRooms.length}
                >
                  <SelectTrigger className="border-border focus-visible:ring-blue-500 shadow-sm text-sm flex-1">
                    <SelectValue placeholder={selectedLaboratory ? `Select Room` : "Select Lab first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {!filteredRooms.length ? (
                      <SelectItem value="none" disabled>
                        {selectedLaboratory ? `No rooms in ${selectedLaboratory.name}` : "No laboratory selected"}
                      </SelectItem>
                    ) : (
                      filteredRooms.map((room, i) => (
                        <SelectItem key={`room-${i}`} value={room._id}>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-foreground truncate">{room.name}</span>
                            </div>
                            {room.location && <span className="text-xs text-muted-foreground truncate ml-6">{room.location}</span>}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={() => {
                    setFacilityType("room");
                    setIsAddFacilityDialogOpen(true);
                  }}
                  title="Add New Room"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right min-w-0">
                <h1 className="text-lg font-bold text-foreground leading-tight truncate">Schedule Maker</h1>
                <p className="text-xs text-muted-foreground font-medium truncate">
                  {user?.role || 'Admin'}
                  {selectedLaboratory && ` • ${selectedLaboratory.name}`}
                  {selectedRoom && ` • ${selectedRoom.name.split(' - ')[0]}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <main className="p-2 sm:p-4 lg:p-6 flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div key="schedule" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            {/* Info Card */}
            <Card className="border-0 bg-white/90 backdrop-blur-sm shadow-lg overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2 text-foreground">📅 Schedule Maker</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {selectedLaboratory?.name || 'Select Laboratory'} • {selectedRoom?.name || 'Select Room'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <School className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                      <div className="relative">
                        <Select 
                          value={selectedSchoolYear} 
                          onValueChange={(v: string) => {
                            setSelectedSchoolYear(v);
                            setNewEvent(prev => ({ ...prev, schoolYear: v }));
                          }}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="w-24 sm:w-28 md:w-32 h-8 sm:h-9 text-xs border-border focus-visible:ring-blue-500">
                            <SelectValue placeholder="School Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {schoolYears.map((year) => (
                              <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                            <div className="border-t mt-1 pt-1">
                              <div 
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowAddSchoolYear(true);
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Add New Year</span>
                              </div>
                            </div>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                      <Select value={selectedSemester} onValueChange={(v: string) => {
                        setSelectedSemester(v as '1st' | '2nd');
                        setNewEvent(prev => ({ ...prev, semester: v as '1st' | '2nd' }));
                      }} disabled={isLoading}>
                        <SelectTrigger className="w-20 sm:w-24 md:w-28 h-8 sm:h-9 text-xs border-border focus-visible:ring-green-500">
                          <SelectValue placeholder="Semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {semesters.map((sem) => (
                            <SelectItem key={sem} value={sem}>{sem} Semester</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Badge className="bg-blue-600 text-white px-2 py-0.5 text-xs">
                      {schedules.length} events
                    </Badge>
                    <Button variant="outline" size="sm" onClick={handleRefreshSchedules} disabled={isLoading || isGlobalLoading} className="h-8 sm:h-9 px-2 sm:px-3 text-xs">
                      <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    {selectedRoom && schedules.length > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setIsClearScheduleDialogOpen(true)} 
                        disabled={isLoading || schedules.length === 0}
                        className="h-8 sm:h-9 px-2 sm:px-3 text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Clear Schedule
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            {/* Empty state when no laboratory or room selected */}
            {!selectedLaboratory || !selectedRoom ? (
              <Card className="border-0 bg-white/70 shadow-xl backdrop-blur-sm overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex justify-center items-center h-96 rounded-xl border border-dashed border-gray-300">
                    <div className="text-center p-8 max-w-md">
                      <Microscope className="h-16 w-16 text-blue-500 mx-auto mb-6" />
                      <h2 className="text-2xl font-bold text-foreground mb-2">Ready to Schedule?</h2>
                      <p className="text-muted-foreground mb-6">
                        {laboratories.length === 0 ? "Create a laboratory first!" : "Select a laboratory and room to get started."}
                      </p>
                      <div className="space-y-2">
                        {!laboratories.length && (
                          <Button 
                            onClick={() => {
                              setFacilityType("laboratory");
                              setIsAddFacilityDialogOpen(true);
                            }} 
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full mb-2" 
                            size="sm"
                          >
                            <Plus className="mr-2 h-4 w-4" />Create First Laboratory
                          </Button>
                        )}
                        {selectedLaboratory && !filteredRooms.length && (
                          <Button 
                            onClick={() => {
                              setFacilityType("room");
                              setNewRoomData({ ...newRoomData, laboratoryId: selectedLaboratory._id });
                              setIsAddFacilityDialogOpen(true);
                            }} 
                            variant="outline" 
                            className="border-border text-foreground hover:bg-gray-100 w-full" 
                            size="sm"
                          >
                            <Plus className="mr-2 h-4 w-4" />Add First Room to {selectedLaboratory.name}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Schedule Table */
              <Card className="border-0 bg-white/70 shadow-xl backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-auto relative" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-hidden">
                        <Table className="w-full min-w-[800px]">
                          <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-border">
                            <TableRow>
                              <TableHead className="w-36 sm:w-40 md:w-48 py-3 px-2 sm:px-4 bg-blue-50 text-left sticky left-0 z-40 border-r border-border">
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground text-sm">Schedule</span>
                                  <span className="text-xs text-muted-foreground font-normal truncate">
                                    {selectedSchoolYear} • {selectedSemester} Semester
                                  </span>
                                </div>
                              </TableHead>
                              {days.map((day, i) => (
                                <TableHead 
                                  key={`day-${i}`} 
                                  className="py-3 px-2 text-center min-w-[150px] sm:min-w-[180px] md:min-w-[200px] bg-gradient-to-b from-blue-50 to-background border-r border-border last:border-r-0"
                                >
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs sm:text-sm font-bold uppercase text-foreground">{day}</span>
                                    <span className="text-[10px] xs:text-xs text-muted-foreground mt-0.5 hidden xs:block">
                                      {day === 'Mon' ? 'Monday' : 
                                       day === 'Tue' ? 'Tuesday' : 
                                       day === 'Wed' ? 'Wednesday' : 
                                       day === 'Thu' ? 'Thursday' : 
                                       'Friday'}
                                    </span>
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow className="hover:bg-transparent">
                              <TableCell className="font-semibold bg-card p-2 sm:p-3 sticky left-0 z-30 w-36 sm:w-40 md:w-48 border-r border-border bg-white align-top">
                                <div className="flex flex-col gap-3">
                                  <div className="space-y-1.5">
                                    <div className="text-center">
                                      <div className="flex items-center justify-center gap-2 text-sm sm:text-base mb-2">
                                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                        <span className="font-bold text-foreground">Schedule only</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-3">
                                        {selectedLaboratory?.name || 'No lab selected'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-border">
                                    <p className="text-[10px] xs:text-xs text-muted-foreground mb-1.5">Quick Stats:</p>
                                    <div className="flex flex-wrap gap-1 text-[10px] xs:text-xs">
                                      <Badge variant="outline" className="py-0 px-1.5 border-border text-foreground">
                                        {schedules.length} events
                                      </Badge>
                                      <Badge variant="outline" className="py-0 px-1.5 border-border text-foreground">
                                        {laboratories.length} labs
                                      </Badge>
                                      <Badge variant="outline" className="py-0 px-1.5 border-border text-foreground">
                                        {allRooms.length} rooms
                                      </Badge>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-border">
                                      <p className="text-[10px] xs:text-xs text-muted-foreground mb-1">Available Years:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {schoolYears.slice(0, 3).map((year) => (
                                          <Badge 
                                            key={year}
                                            variant={selectedSchoolYear === year ? "default" : "outline"}
                                            className="py-0 px-1.5 text-[10px] cursor-pointer"
                                            onClick={() => {
                                              setSelectedSchoolYear(year);
                                              setNewEvent(prev => ({ ...prev, schoolYear: year }));
                                            }}
                                          >
                                            {year}
                                          </Badge>
                                        ))}
                                        {schoolYears.length > 3 && (
                                          <Badge 
                                            variant="outline" 
                                            className="py-0 px-1.5 text-[10px] cursor-pointer"
                                            onClick={() => setShowAddSchoolYear(true)}
                                          >
                                            +{schoolYears.length - 3} more
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-border">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full h-7 sm:h-8 text-xs"
                                        onClick={() => {
                                          setFacilityType("room");
                                          setIsAddFacilityDialogOpen(true);
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add New Room
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              {days.map((day, di) => {
                                const dayEvents = schedules
                                  .filter(s => s.day === day)
                                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                                
                                return (
                                  <TableCell 
                                    key={`cell-${di}`} 
                                    className="p-1.5 sm:p-2 align-top border-r border-border last:border-r-0 bg-white"
                                    style={{ minWidth: '150px', maxWidth: '200px' }}
                                  >
                                    {isLoading ? (
                                      <div className="flex flex-col items-center space-y-2 p-2 min-h-[120px] sm:min-h-[150px]">
                                        <Skeleton className="h-12 sm:h-16 w-full rounded-lg" />
                                        <Skeleton className="h-12 sm:h-16 w-full rounded-lg" />
                                      </div>
                                    ) : (
                                      <div className="flex flex-col space-y-1.5 sm:space-y-2 p-1.5 sm:p-2 min-h-[120px] sm:min-h-[150px] bg-card/30 rounded-lg">
                                        {dayEvents.length > 0 ? (
                                          <div className="space-y-1.5 sm:space-y-2">
                                            {dayEvents.map((event, ei) => (
                                              <motion.div 
                                                key={`event-${ei}`}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-2 sm:p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer group transition-all"
                                                onClick={() => openEditDialog(day, event)}
                                              >
                                                <div className="space-y-1.5">
                                                  <div className="flex justify-between items-start gap-1">
                                                    <div className="flex-1 min-w-0">
                                                      <h4 className="font-semibold text-xs sm:text-sm line-clamp-1 text-foreground">
                                                        {event.subjectName}
                                                      </h4>
                                                      <p className="text-[10px] xs:text-xs text-muted-foreground mt-0.5 truncate">{event.className}</p>
                                                    </div>
                                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                      <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-blue-200"
                                                        onClick={(e) => { 
                                                          e.stopPropagation(); 
                                                          openEditDialog(day, event); 
                                                        }}
                                                      >
                                                        <Edit className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-600" />
                                                      </Button>
                                                      <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-red-200"
                                                        onClick={(e) => { 
                                                          e.stopPropagation(); 
                                                          openDeleteDialog(event.id); 
                                                        }}
                                                      >
                                                        <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-600" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                  
                                                  <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                      <Badge variant="outline" className="text-[10px] py-0 h-4 sm:h-5 border-border text-foreground">
                                                        <Hash className="w-1.5 h-1.5 sm:w-2 sm:h-2 mr-0.5" />
                                                        <span className="truncate">{event.yearSection}</span>
                                                      </Badge>
                                                      <span className="text-[10px] xs:text-xs text-muted-foreground">
                                                        Year {event.year}
                                                      </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1 text-[10px] xs:text-xs">
                                                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 text-muted-foreground" />
                                                      <span className="text-muted-foreground truncate">
                                                        {formatDisplayTime(event.startTime)} - {formatDisplayTime(event.endTime)}
                                                      </span>
                                                      <span className="text-muted-foreground">•</span>
                                                      <span className="text-muted-foreground">{event.duration} mins</span>
                                                    </div>
                                                    
                                                    {event.teacherName && (
                                                      <div className="flex items-center gap-1 text-[10px] xs:text-xs">
                                                        <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 text-muted-foreground" />
                                                        <span className="text-muted-foreground truncate">
                                                          {event.teacherName}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </motion.div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center h-full py-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                                            <div className="text-center p-2">
                                              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 mx-auto mb-1.5 sm:mb-2" />
                                              <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">No schedules for {day}</p>
                                              <Button variant="outline" size="sm" onClick={() => openEditDialog(day)} className="h-7 sm:h-9 text-xs">
                                                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Add
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                        
                                        <div className="mt-1.5 sm:mt-2">
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full h-7 sm:h-9 border-dashed hover:bg-blue-50 transition-colors border-border text-xs"
                                            onClick={() => openEditDialog(day)}
                                          >
                                            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Add New
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[55%] max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>{selectedEventId ? "Edit Schedule" : "Add New Schedule"}</DialogTitle>
            <DialogDescription>Schedule a teaching session</DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>School Year *</Label>
                <div className="flex gap-2">
                  <Select 
                    value={newEvent.schoolYear} 
                    onValueChange={(v: string) => setNewEvent({ ...newEvent, schoolYear: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolYears.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                      <div className="border-t mt-1 pt-1">
                        <div 
                          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAddSchoolYear(true);
                            setIsEditDialogOpen(false);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          <span>Add New Year</span>
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Semester *</Label>
                <Select value={newEvent.semester} onValueChange={(v: string) => setNewEvent({ ...newEvent, semester: v as '1st' | '2nd' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((sem) => (
                      <SelectItem key={sem} value={sem}>{sem} Semester</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Laboratory *</Label>
                <Select value={newEvent.laboratoryId} onValueChange={(v: string) => setNewEvent({ ...newEvent, laboratoryId: v, roomId: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lab" />
                  </SelectTrigger>
                  <SelectContent>
                    {laboratories.map((lab) => (
                      <SelectItem key={lab._id} value={lab._id}>{lab.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Room *</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select 
                      value={newEvent.roomId} 
                      onValueChange={(v: string) => setNewEvent({ ...newEvent, roomId: v })} 
                      disabled={!newEvent.laboratoryId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {allRooms
                          .filter(room => room.laboratoryId === newEvent.laboratoryId)
                          .map((room) => (
                            <SelectItem key={room._id} value={room._id}>{room.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setTimeout(() => {
                        setFacilityType("room");
                        setIsAddFacilityDialogOpen(true);
                      }, 100);
                    }}
                    title="Add New Room"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label>Subject Name *</Label>
              <Input 
                value={newEvent.subjectName} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, subjectName: e.target.value })} 
                placeholder="e.g., Fish Processing Technology" 
              />
            </div>

            <div>
              <Label>Class Name *</Label>
              <Input 
                value={newEvent.className} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, className: e.target.value })} 
                placeholder="e.g., FPT 101" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Year Level *</Label>
                <Select value={newEvent.year.toString()} onValueChange={(v: string) => setNewEvent({ ...newEvent, year: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year} Year</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section *</Label>
                <Input 
                  value={newEvent.section} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, section: e.target.value.toUpperCase() })} 
                  placeholder="e.g., A" 
                />
              </div>
            </div>

            <div>
              <Label>Faculty (Optional)</Label>
              <Select value={newEvent.teacher} onValueChange={(v: string) => setNewEvent({ ...newEvent, teacher: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-faculty">No faculty</SelectItem>
                  {facultyUsers.map((f) => (
                    <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <Input 
                    type="date" 
                    value={newEvent.date} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, date: e.target.value })} 
                  />
                </div>
              </div>
              <div>
                <Label>Day *</Label>
                <Select value={newEvent.day} onValueChange={(v: string) => setNewEvent({ ...newEvent, day: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time *</Label>
                <Select value={newEvent.startTime} onValueChange={(v: string) => setNewEvent({ ...newEvent, startTime: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatDisplayTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>End Time *</Label>
                <Select value={newEvent.endTime} onValueChange={(v: string) => setNewEvent({ ...newEvent, endTime: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions
                      .filter(time => calculateDuration(newEvent.startTime, time) > 0)
                      .map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatDisplayTime(time)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 pt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleSaveEvent} 
              className="bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : (selectedEventId ? "Update" : "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Facility Dialog */}
      <Dialog open={isAddFacilityDialogOpen} onOpenChange={(open) => {
        setIsAddFacilityDialogOpen(open);
        if (!open) {
          setNewLaboratory({ labType: "Fish Capture Lab", location: "" });
          setNewRoomData({ 
            laboratoryId: selectedLaboratory?._id || "", 
            roomNumber: "", 
            building: "", 
            floor: "", 
            capacity: "", 
            location: "" 
          });
          setError(null);
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>
              {facilityType === "laboratory" ? "Add New Laboratory" : "Add New Room"}
            </DialogTitle>
            <DialogDescription>
              {facilityType === "laboratory" 
                ? "Create a new laboratory for scheduling." 
                : "Add a new room to the selected laboratory."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Facility Type Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={facilityType === "laboratory" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFacilityType("laboratory")}
              >
                <Microscope className="mr-2 h-4 w-4" />
                Laboratory
              </Button>
              <Button
                type="button"
                variant={facilityType === "room" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFacilityType("room")}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Room
              </Button>
            </div>
            
            {facilityType === "laboratory" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="labType">Laboratory Type *</Label>
                  <Select 
                    value={newLaboratory.labType} 
                    onValueChange={(v: string) => setNewLaboratory({ ...newLaboratory, labType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select laboratory type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fish Capture Lab">Fish Capture Lab</SelectItem>
                      <SelectItem value="Aquaculture Lab">Aquaculture Lab</SelectItem>
                      <SelectItem value="Fish Processing Lab">Fish Processing Lab</SelectItem>
                      <SelectItem value="General Lab">General Lab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Building A, Floor 1"
                    value={newLaboratory.location}
                    onChange={(e) => setNewLaboratory({ ...newLaboratory, location: e.target.value })}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum 50 characters
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="laboratory">Laboratory *</Label>
                  <Select 
                    value={newRoomData.laboratoryId} 
                    onValueChange={(v: string) => setNewRoomData({ ...newRoomData, laboratoryId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Laboratory" />
                    </SelectTrigger>
                    <SelectContent>
                      {laboratories.map((lab) => (
                        <SelectItem key={lab._id} value={lab._id}>
                          <div className="flex items-center gap-2">
                            <Microscope className="w-4 h-4" />
                            {lab.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomNumber">Room Number *</Label>
                    <Input
                      id="roomNumber"
                      placeholder="e.g., 101"
                      value={newRoomData.roomNumber}
                      onChange={(e) => setNewRoomData({ ...newRoomData, roomNumber: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      placeholder="e.g., 30"
                      value={newRoomData.capacity}
                      onChange={(e) => setNewRoomData({ ...newRoomData, capacity: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="building">Building *</Label>
                  <Input
                    id="building"
                    placeholder="e.g., Main Building"
                    value={newRoomData.building}
                    onChange={(e) => setNewRoomData({ ...newRoomData, building: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor *</Label>
                  <Input
                    id="floor"
                    placeholder="e.g., 2nd Floor or 2"
                    value={newRoomData.floor}
                    onChange={(e) => setNewRoomData({ ...newRoomData, floor: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Additional Location Info (Optional)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., East Wing, Near Elevator"
                    value={newRoomData.location}
                    onChange={(e) => setNewRoomData({ ...newRoomData, location: e.target.value })}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum 50 characters
                  </p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleAddFacility}
              disabled={isLoading || (facilityType === "laboratory" 
                ? !newLaboratory.labType.trim()
                : !newRoomData.laboratoryId || !newRoomData.roomNumber.trim() || !newRoomData.building.trim() || !newRoomData.floor.trim()
              )}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Adding..." : `Add ${facilityType === "laboratory" ? "Laboratory" : "Room"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add School Year Dialog */}
      <Dialog open={showAddSchoolYear} onOpenChange={setShowAddSchoolYear}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New School Year</DialogTitle>
            <DialogDescription>Enter a new school year in format: YYYY-YYYY</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schoolYear">School Year</Label>
              <Input
                id="schoolYear"
                placeholder="YYYY-YYYY (e.g., 2026-2027)"
                value={newSchoolYearInput}
                onChange={(e) => setNewSchoolYearInput(e.target.value)}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Format: StartYear-EndYear (must be consecutive years)
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <h4 className="text-sm font-semibold text-blue-800 mb-1">Available School Years:</h4>
              <div className="flex flex-wrap gap-1">
                {schoolYears.map((year) => (
                  <Badge 
                    key={year}
                    variant="outline"
                    className="text-xs"
                  >
                    {year}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleAddSchoolYear}
              disabled={!newSchoolYearInput.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add School Year
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-800 font-medium">Are you sure?</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleDeleteEvent} className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Clear Schedule Dialog */}
      <Dialog open={isClearScheduleDialogOpen} onOpenChange={setIsClearScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear Schedule?</DialogTitle>
            <DialogDescription>This will delete all events in the current schedule. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-800 font-medium">Are you sure?</p>
              <p className="text-sm text-red-700 mt-1">All events will be removed from {selectedRoom?.name}.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleClearSchedule} className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
              {isLoading ? "Clearing..." : "Clear Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Footer */}
      <footer className="bg-muted border-t py-3 px-4 sm:px-6 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fisheries Lab Management System
          </p>
          <div className="flex items-center space-x-2 sm:space-x-4 mt-1 sm:mt-0">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {selectedSchoolYear} • {selectedSemester} Semester • Monday-Friday
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}