"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModalStore, useAuthStore } from "@/lib/stores";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Camera, Upload, X, RotateCcw, CheckCircle, XCircle, Info } from "lucide-react";
import { register, sendOTP, verifyOTP } from "@/action/register";

// Import Turnstile
import { Turnstile } from "@marsidev/react-turnstile";

// Custom Toast Component
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) => {
  return (
    <div className="fixed top-4 left-4 z-[100] space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border max-w-sm ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Fixed OTP Input Component (keep this same as before)
const OTPInput = ({ length = 6, value, onChange, disabled }: { length: number; value: string; onChange: (value: string) => void; disabled: boolean }) => {
  // ... (keep all the OTP input code exactly as you have it)
  const inputsRef = useRef<HTMLInputElement[]>([]);

  // Focus on first input when component mounts
  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const inputValue = e.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(inputValue)) return;
    
    // Take only the last character if multiple are pasted
    const newValue = inputValue.slice(-1);
    
    // Create new OTP array
    const otpArray = value.split('');
    otpArray[index] = newValue;
    const newOtp = otpArray.join('').slice(0, length);
    
    onChange(newOtp);

    // Auto-focus next input if value entered
    if (newValue && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // Move to previous input if current is empty
        inputsRef.current[index - 1]?.focus();
      }
      
      // Clear current value and focus current input
      const otpArray = value.split('');
      otpArray[index] = '';
      onChange(otpArray.join(''));
    }
    
    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    
    if (pastedData) {
      onChange(pastedData);
      
      // Focus the last input that has value
      const focusIndex = Math.min(pastedData.length, length - 1);
      setTimeout(() => {
        inputsRef.current[focusIndex]?.focus();
      }, 0);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select the text when focused for better UX
    e.target.select();
  };

  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length }, (_, index) => (
        <Input
          key={index}
          ref={(el) => {
            if (el) inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          onFocus={handleFocus}
          disabled={disabled}
          className="w-12 h-12 text-center text-lg font-semibold border-2 focus:border-[#16a34a] focus:ring-2 focus:ring-green-200 transition-all"
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
};

export default function SignupModal() {
  const { isCreateAccountOpen, setIsCreateAccountOpen, setIsLoginOpen } = useModalStore();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  
  // OTP States
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  // Turnstile States
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0); // For resetting Turnstile

  // Toast States
  const [toasts, setToasts] = useState<Toast[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  // Cloudflare Turnstile site key
  const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"; // Default test key

  // Show toast function
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  // Remove toast function
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isCreateAccountOpen) {
      // Clear form when modal closes
      setEmail("");
      setFirstName("");
      setLastName("");
      setYear("");
      setSection("");
      setSchoolId("");
      setPassword("");
      setProfileImage(null);
      setProfileImagePreview("");
      setShowPassword(false);
      setOtp("");
      setIsOtpSent(false);
      setOtpCooldown(0);
      resetTurnstile();
      // Clear all toasts when modal closes
      setToasts([]);
    }
  }, [isCreateAccountOpen]);

  // OTP cooldown timer
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Turnstile handlers
  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
  };

  const handleTurnstileError = () => {
    setTurnstileToken(null);
    showToast("Security check failed. Please try again.", 'error');
  };

  const handleTurnstileExpire = () => {
    setTurnstileToken(null);
    showToast("Security check expired. Please verify again.", 'info');
  };

  const resetTurnstile = () => {
    setTurnstileToken(null);
    setTurnstileKey(prev => prev + 1); // This will force Turnstile to reset
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast("Please select a valid image file", 'error');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showToast("Image size must be less than 2MB", 'error');
        return;
      }

      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
      
      // Close camera if open
      if (showCamera) {
        stopCamera();
        setShowCamera(false);
      }
      
      showToast("Profile image uploaded successfully", 'success');
    }
  };

  // Start camera
  const startCamera = async () => {
    setIsCameraLoading(true);
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      
      // Wait a bit for video element to be ready
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(error => {
            console.error("Error playing video:", error);
            showToast("Failed to start camera", 'error');
          });
        }
      }, 100);
      
      setShowCamera(true);
      showToast("Camera started", 'success');
    } catch (error) {
      console.error("Camera error:", error);
      setShowCamera(false);
      showToast("Failed to access camera. Please check permissions.", 'error');
    } finally {
      setIsCameraLoading(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && streamRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      
      if (context && video.videoWidth > 0 && video.videoHeight > 0) {
        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob with reduced quality for smaller file size
        canvas.toBlob((blob) => {
          if (blob) {
            // Check if captured image is under 2MB
            if (blob.size > 2 * 1024 * 1024) {
              // If too large, try with lower quality
              canvas.toBlob((smallerBlob) => {
                if (smallerBlob && smallerBlob.size <= 2 * 1024 * 1024) {
                  finalizeCapture(smallerBlob);
                } else {
                  showToast("Image is too large. Please try again.", 'error');
                }
              }, 'image/jpeg', 0.5);
            } else {
              finalizeCapture(blob);
            }
          }
        }, 'image/jpeg', 0.7);
      }
    }
  };

  // Helper function to finalize photo capture
  const finalizeCapture = (blob: Blob) => {
    const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
    setProfileImage(file);
    setProfileImagePreview(URL.createObjectURL(blob));
    stopCamera();
    setShowCamera(false);
    showToast("Photo captured successfully", 'success');
  };

  // Remove profile image
  const removeProfileImage = () => {
    setProfileImage(null);
    setProfileImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    showToast("Profile image removed", 'success');
  };

  // Close camera modal
  const closeCamera = () => {
    stopCamera();
    setShowCamera(false);
    showToast("Camera closed", 'info');
  };

  // Validate form before sending OTP
  const validateForm = (): boolean => {
    if (!firstName || !lastName || !email || !year || !section || !schoolId || !password) {
      showToast("Please fill in all required fields", 'error');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      showToast("Please enter a valid email address", 'error');
      return false;
    }

    const yearNum = Number(year);
    if (isNaN(yearNum) || yearNum < 1 || yearNum > 5) {
      showToast("Year must be between 1 and 5", 'error');
      return false;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters long", 'error');
      return false;
    }

    // Check Turnstile if in production mode
    if (process.env.NODE_ENV === 'production' && !turnstileToken) {
      showToast("Please complete the security check", 'error');
      return false;
    }

    return true;
  };

  // Send OTP
  const handleSendOTP = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await sendOTP(email.trim().toLowerCase(), turnstileToken || undefined);
      setIsOtpSent(true);
      setOtpCooldown(60); // 60 seconds cooldown
      showToast("Verification code sent to your email", 'success');
    } catch (error) {
      // Reset Turnstile on error
      resetTurnstile();
      showToast("Failed to send verification code. Please try again.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (otpCooldown > 0) return;

    setIsResending(true);
    try {
      await sendOTP(email.trim().toLowerCase(), turnstileToken || undefined);
      setOtpCooldown(60); // 60 seconds cooldown
      showToast("Verification code resent to your email", 'success');
    } catch (error) {
      // Reset Turnstile on error
      resetTurnstile();
      showToast("Failed to resend verification code. Please try again.", 'error');
    } finally {
      setIsResending(false);
    }
  };

  // Verify OTP and complete registration
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      showToast("Please enter the complete 6-digit code", 'error');
      return;
    }

    setIsVerifying(true);
    try {
      await verifyOTP(email.trim().toLowerCase(), otp, turnstileToken || undefined);
      showToast("Email verified successfully!", 'success');
      
      // If OTP verification successful, proceed with registration
      await completeRegistration();
    } catch (error) {
      // Reset Turnstile on error
      resetTurnstile();
      showToast("Invalid verification code. Please try again.", 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Complete registration after OTP verification
  const completeRegistration = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Create FormData and append all fields
      const formData = new FormData();
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("year", year);
      formData.append("section", section.trim());
      formData.append("schoolId", schoolId.trim());
      formData.append("password", password);
      formData.append("role", "student");
      
      // Add Turnstile token to form data
      if (turnstileToken) {
        formData.append("turnstileToken", turnstileToken);
      }
      
      // Add profile image if it exists
      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      // Submit to server action
      await register(formData);
      
      showToast("Account created successfully! You can now login.", 'success');
      
      // Close modal and open login
      setIsCreateAccountOpen(false);
      setIsLoginOpen(true);
      
    } catch (error) {
      // Reset Turnstile on error
      resetTurnstile();
      showToast("Failed to create account. Please try again.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Clean up camera when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        stopCamera();
      }
    };
  }, []);

  return (
    <>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <AnimatePresence>
        {isCreateAccountOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
            >
              {/* Close button */}
              <motion.button
                className="absolute top-4 right-4 text-black hover:text-gray-600"
                onClick={() => {
                  if (showCamera) {
                    closeCamera();
                  } else {
                    setIsCreateAccountOpen(false);
                  }
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                disabled={isLoading || isVerifying}
              >
                ✕
              </motion.button>

              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-black mb-2">CHMSU Fisheries System</h1>
                <h1 className="text-2xl font-bold text-black">
                  {isOtpSent ? "Verify Your Email" : "Create your Account"}
                </h1>
                <p className="text-sm text-black mt-1">
                  {isOtpSent 
                    ? "Enter the 6-digit code sent to your email" 
                    : "Enter your details to create your account."
                  }
                </p>
              </div>

              {!isOtpSent ? (
                // Registration Form
                <form onSubmit={(e) => { e.preventDefault(); handleSendOTP(); }} className="space-y-4">
                  {/* Profile Image Upload */}
                  <div className="flex flex-col items-center space-y-4">
                    <Label htmlFor="profileImage" className="text-base font-medium text-black">
                      Profile Image
                    </Label>
                    
                    {/* Image Preview */}
                    {profileImagePreview ? (
                      <div className="relative">
                        <img
                          src={profileImagePreview}
                          alt="Profile preview"
                          className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={removeProfileImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 border-2 border-gray-300 border-dashed flex items-center justify-center">
                        <span className="text-gray-500 text-xs text-center">No Image</span>
                      </div>
                    )}

                    {/* Upload Buttons */}
                    <div className="flex gap-3">
                      <input
                        type="file"
                        id="profileImage"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                        disabled={isLoading}
                      />
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <Upload className="h-4 w-4" />
                        Upload
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={startCamera}
                        disabled={isLoading || isCameraLoading}
                        className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <Camera className="h-4 w-4" />
                        {isCameraLoading ? "Loading..." : "Camera"}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Maximum file size: 2MB
                    </p>
                  </div>

                  {/* First + Last name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-black">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={isLoading}
                        required
                        placeholder="Enter first name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-black">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={isLoading}
                        required
                        placeholder="Enter last name"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="email" className="text-black">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      placeholder="Enter your email"
                      className="mt-1"
                    />
                  </div>

                  {/* School ID */}
                  <div>
                    <Label htmlFor="schoolId" className="text-black">School ID *</Label>
                    <Input
                      id="schoolId"
                      name="schoolId"
                      value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}
                      disabled={isLoading}
                      required
                      placeholder="Enter school ID"
                      className="mt-1"
                    />
                  </div>

                  {/* Year + Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="year" className="text-black">School Year *</Label>
                      <Input
                        id="year"
                        name="year"
                        type="number"
                        min="1"
                        max="5"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        disabled={isLoading}
                        required
                        placeholder="Year"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="section" className="text-black">Section *</Label>
                      <Input
                        id="section"
                        name="section"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        disabled={isLoading}
                        required
                        placeholder="Enter section"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <Label htmlFor="password" className="text-black">Password *</Label>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      placeholder="Enter password"
                      minLength={6}
                      className="mt-1 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-6.5 text-black hover:text-gray-600 disabled:opacity-50"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Cloudflare Turnstile */}
                  <div className="flex justify-center">
                    <Turnstile
                      key={turnstileKey}
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={handleTurnstileSuccess}
                      onError={handleTurnstileError}
                      onExpire={handleTurnstileExpire}
                      options={{
                        theme: 'light',
                        size: 'normal',
                      }}
                      className="mx-auto"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#16a34a] text-white hover:bg-green-700"
                    disabled={isLoading || (!turnstileToken && process.env.NODE_ENV === 'production')}
                  >
                    {isLoading ? "Sending OTP..." : "Send Verification Code"}
                  </Button>

                  <div className="text-center mt-3">
                    <p className="text-sm text-black">
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="text-[#16a34a] font-medium hover:underline disabled:opacity-50"
                        onClick={() => {
                          setIsCreateAccountOpen(false);
                          setIsLoginOpen(true);
                        }}
                        disabled={isLoading}
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                // OTP Verification Form
                <div className="space-y-6">
                  <div className="text-center bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      We sent a 6-digit verification code to:
                    </p>
                    <p className="text-sm font-medium text-gray-900 bg-white py-2 px-4 rounded border border-gray-300 mb-6">
                      {email}
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Enter Verification Code
                        </label>
                        <OTPInput
                          length={6}
                          value={otp}
                          onChange={setOtp}
                          disabled={isVerifying || isLoading}
                        />
                        <p className="text-xs text-gray-500 mt-3">
                          Type the 6-digit code from your email
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <Button
                          onClick={handleVerifyOTP}
                          className="w-full bg-[#16a34a] text-white hover:bg-green-700"
                          disabled={isVerifying || isLoading || otp.length !== 6}
                        >
                          {isVerifying ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Verifying...
                            </div>
                          ) : (
                            "Verify & Create Account"
                          )}
                        </Button>
                        
                        <div className="text-center">
                          <p className="text-sm text-gray-600">
                            Didn't receive the code?{" "}
                            <button
                              type="button"
                              onClick={handleResendOTP}
                              disabled={otpCooldown > 0 || isResending}
                              className="text-[#16a34a] font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isResending ? (
                                <span className="flex items-center justify-center gap-1">
                                  <div className="w-3 h-3 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
                                  Resending...
                                </span>
                              ) : otpCooldown > 0 ? (
                                `Resend in ${otpCooldown}s`
                              ) : (
                                <span className="flex items-center justify-center gap-1">
                                  <RotateCcw className="h-4 w-4" />
                                  Resend OTP
                                </span>
                              )}
                            </button>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpSent(false);
                        setOtp(""); // Clear OTP when going back
                      }}
                      className="text-sm text-[#16a34a] font-medium hover:underline flex items-center justify-center gap-2"
                      disabled={isVerifying || isLoading}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to registration
                    </button>
                  </div>
                </div>
              )}

              {/* Camera Modal */}
              <AnimatePresence>
                {showCamera && (
                  <motion.div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
                      initial={{ scale: 0.8, y: 50 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.8, y: 50 }}
                    >
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-bold text-black">Take a Photo</h3>
                        <p className="text-sm text-gray-600">Position your face in the frame</p>
                      </div>
                      
                      <div className="relative bg-gray-200 rounded-lg mb-4 h-64 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {isCameraLoading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-black">Initializing camera...</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={capturePhoto}
                          className="bg-[#16a34a] text-white hover:bg-green-700"
                          disabled={isCameraLoading}
                        >
                          Capture Photo
                        </Button>
                        <Button
                          onClick={closeCamera}
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}