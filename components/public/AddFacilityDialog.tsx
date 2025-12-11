"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Microscope, Building2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// Reuse interfaces from main (or import if separate)
interface NewLaboratory {
  labType: "Fish Capture Lab" | "Aquaculture Lab" | "Fish Processing Lab";
  location: string;
}

interface NewRoom {
  laboratoryId: string;
  roomNumber: string;
  building: string;
  floor: string;
  capacity: string;
  location: string;
}

interface Laboratory {
  id: string;
  name: string;
  location?: string;
}

interface AddFacilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityType: "laboratory" | "room";
  setFacilityType: (type: "laboratory" | "room") => void;
  newLaboratory: NewLaboratory;
  setNewLaboratory: (lab: NewLaboratory) => void;
  newRoom: NewRoom;
  setNewRoom: (room: NewRoom) => void;
  laboratories: Laboratory[];
  isLoading: boolean;
  onAddFacility: () => void;
  error: string | null;
  setError: (error: string | null) => void;
  selectedLaboratory?: Laboratory | null;
}

export function AddFacilityDialog({
  open,
  onOpenChange,
  facilityType,
  setFacilityType,
  newLaboratory,
  setNewLaboratory,
  newRoom,
  setNewRoom,
  laboratories,
  isLoading,
  onAddFacility,
  error,
  setError,
  selectedLaboratory,
}: AddFacilityDialogProps) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const; // Not used here, but for consistency

  // Safe Laboratory SelectItem (reused from main)
  const SafeLaboratorySelectItem = ({ lab, index }: { lab: Laboratory; index: number }) => (
    <SelectItem key={`add-lab-${index}`} value={lab.id}>
      <div className="flex items-center gap-2">
        <Microscope className="w-4 h-4 text-blue-500" />
        <div className="flex flex-col">
          <span className="font-medium">{lab.name}</span>
          {lab.location && <span className="text-xs text-gray-500">{lab.location}</span>}
        </div>
      </div>
    </SelectItem>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white shadow-xl border-blue-200">
        <DialogHeader>
          <DialogTitle className="text-blue-800 flex items-center gap-2 text-xl">
            <Microscope className="h-5 w-5" />
            Add New Facility
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Create a new {facilityType === 'laboratory' ? 'laboratory' : 'room'} for scheduling.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="facilityType" className="text-gray-700 font-medium">
              Facility Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={facilityType}
              onValueChange={(value) => {
                setFacilityType(value as "laboratory" | "room");
                setError(null);
                setNewLaboratory({ labType: "Fish Capture Lab", location: "" });
                setNewRoom({ 
                  laboratoryId: selectedLaboratory?.id || "", 
                  roomNumber: "", 
                  building: "", 
                  floor: "", 
                  capacity: "", 
                  location: "" 
                });
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="border-blue-200 focus:ring-2 focus:ring-blue-500/50">
                <SelectValue placeholder="Select facility type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="laboratory">
                  <div className="flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-blue-500" />
                    Laboratory
                  </div>
                </SelectItem>
                <SelectItem value="room">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-500" />
                    Room
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-md p-3"
            >
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}
          
          {facilityType === "laboratory" ? (
            <>
              <div>
                <Label htmlFor="labType" className="text-gray-700 font-medium">
                  Laboratory Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={newLaboratory.labType}
                  onValueChange={(value) => {
                    setNewLaboratory({ 
                      ...newLaboratory, 
                      labType: value as NewLaboratory['labType'] 
                    });
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger className="border-blue-200 focus:ring-2 focus:ring-blue-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fish Capture Lab">🐟 Fish Capture Lab</SelectItem>
                    <SelectItem value="Aquaculture Lab">🌱 Aquaculture Lab</SelectItem>
                    <SelectItem value="Fish Processing Lab">🐠 Fish Processing Lab</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Selected lab will be named: <strong>"{newLaboratory.labType}"</strong>
                </p>
              </div>
              
              <div>
                <Label htmlFor="labLocation" className="text-gray-700 font-medium">
                  Location (Optional)
                </Label>
                <Input
                  id="labLocation"
                  value={newLaboratory.location}
                  onChange={(e) => {
                    setNewLaboratory({ ...newLaboratory, location: e.target.value });
                    setError(null);
                  }}
                  placeholder="e.g., Fisheries Building, 1st Floor"
                  className="border-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500/50"
                  disabled={isLoading}
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">Max 50 characters</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="laboratory" className="text-gray-700 font-medium">
                  Parent Laboratory <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={newRoom.laboratoryId}
                  onValueChange={(value) => {
                    setNewRoom({ ...newRoom, laboratoryId: value });
                    setError(null);
                  }}
                  disabled={isLoading || laboratories.length === 0}
                >
                  <SelectTrigger className="border-green-200 focus:ring-2 focus:ring-green-500/50">
                    <SelectValue placeholder="Select laboratory" />
                  </SelectTrigger>
                  <SelectContent>
                    {laboratories.length === 0 ? (
                      <SelectItem value="none" disabled>No laboratories available</SelectItem>
                    ) : (
                      laboratories.map((lab, index) => (
                        <SafeLaboratorySelectItem key={`add-lab-${index}`} lab={lab} index={index} />
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="roomNumber" className="text-gray-700 font-medium">
                  Room Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="roomNumber"
                  type="text"
                  value={newRoom.roomNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setNewRoom({ ...newRoom, roomNumber: value });
                    setError(null);
                  }}
                  placeholder="e.g., 201"
                  className="border-green-200 focus-visible:ring-2 focus-visible:ring-green-500/50"
                  disabled={isLoading}
                  maxLength={4}
                />
                <p className="text-xs text-gray-500 mt-1">Must be numeric (1-4 digits)</p>
              </div>
              
              <div>
                <Label htmlFor="building" className="text-gray-700 font-medium">
                  Building Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="building"
                  type="text"
                  value={newRoom.building}
                  onChange={(e) => {
                    setNewRoom({ ...newRoom, building: e.target.value });
                    setError(null);
                  }}
                  placeholder="e.g., Fisheries Building"
                  className="border-green-200 focus-visible:ring-2 focus-visible:ring-green-500/50"
                  disabled={isLoading}
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">Where is this room located?</p>
              </div>
              
              <div>
                <Label htmlFor="floor" className="text-gray-700 font-medium">
                  Floor <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="floor"
                  type="text"
                  value={newRoom.floor}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9a-zA-Z\s]/g, '');
                    setNewRoom({ ...newRoom, floor: value });
                    setError(null);
                  }}
                  placeholder="e.g., 2nd or Second"
                  className="border-green-200 focus-visible:ring-2 focus-visible:ring-green-500/50"
                  disabled={isLoading}
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">e.g., 2nd Floor, Ground Floor, etc.</p>
              </div>
              
              <div>
                <Label htmlFor="capacity" className="text-gray-700 font-medium">
                  Capacity (Optional)
                </Label>
                <Input
                  id="capacity"
                  type="text"
                  value={newRoom.capacity}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setNewRoom({ ...newRoom, capacity: value });
                    setError(null);
                  }}
                  placeholder="e.g., 30"
                  className="border-green-200 focus-visible:ring-2 focus-visible:ring-green-500/50"
                  disabled={isLoading}
                  maxLength={4}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum number of students (for reference)</p>
              </div>
              
              <div>
                <Label htmlFor="roomLocation" className="text-gray-700 font-medium">
                  Additional Location (Optional)
                </Label>
                <Input
                  id="roomLocation"
                  value={newRoom.location}
                  onChange={(e) => {
                    setNewRoom({ ...newRoom, location: e.target.value });
                    setError(null);
                  }}
                  placeholder="e.g., East Wing"
                  className="border-green-200 focus-visible:ring-2 focus-visible:ring-green-500/50"
                  disabled={isLoading}
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">Any additional location details</p>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter className="gap-2 pt-4">
          <DialogClose asChild>
            <Button 
              variant="outline" 
              className="border-gray-300 hover:bg-gray-100 flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={onAddFacility}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg flex-1"
            disabled={
              isLoading ||
              (facilityType === "room" && (
                !newRoom.laboratoryId ||
                !newRoom.roomNumber.trim() ||
                !newRoom.building.trim() ||
                !newRoom.floor.trim()
              )) ||
              (facilityType === "laboratory" && false)
            }
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Creating..." : `Create ${facilityType === 'laboratory' ? 'Laboratory' : 'Room'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}