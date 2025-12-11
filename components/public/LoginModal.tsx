"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModalStore, useAuthStore } from "@/lib/stores";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle, XCircle, Info, X } from "lucide-react";
import { login } from "@/action/login";

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

// Simplified User interface matching the store
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolID: string;
  schoolYear: string;
  section: string;
  role: string;
  profileImage?: string;
}

export default function LoginModal() {
  const { isLoginOpen, setIsLoginOpen, setIsCreateAccountOpen } = useModalStore();
  const { user, setUser, clearAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0); // For resetting Turnstile
  
  // Toast States
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  const handleLogin = async (formData: FormData) => {
    if (isLoading) return;

    // Check Turnstile
    if (!turnstileToken) {
      showToast("Please complete the security check before logging in.", 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Client-side validation
      const normalizedEmail = formData.get("email")?.toString().trim().toLowerCase() || "";
      const password = formData.get("password")?.toString() || "";

      if (!normalizedEmail) throw new Error("Email is required.");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) throw new Error("Please enter a valid email address.");
      if (!password) throw new Error("Password is required.");

      // Add Turnstile token to form data
      formData.append("turnstileToken", turnstileToken);

      // Submit to server action
      const userData = await login(formData);

      // Create simplified user object - only essential fields
      const userObj: User = {
        _id: userData._id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        schoolID: userData.schoolID,
        schoolYear: userData.schoolYear,
        section: userData.section,
        role: userData.role,
        profileImage: userData.profileImage,
      };

      // Set user data in store
      setUser(userObj);

      // Show success notification
      showToast(`Login successful as ${userData.role}!`, 'success');

      // Close modal
      setIsLoginOpen(false);

      // Clear form
      setEmail("");
      setPassword("");
      resetTurnstile();

      // Redirect based on role
      if (userData.role === "admin") {
        router.replace("/admin/dashboard");
      } else if (userData.role === "student" || userData.role === "faculty") {
        router.replace("/user/download");
      } else {
        router.replace("/");
      }

    } catch (error) {
      // Reset Turnstile on error
      resetTurnstile();
      showToast(error instanceof Error ? error.message : "Login failed.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (isGuestLoading) return;

    // Check Turnstile for guest login too
    if (!turnstileToken) {
      showToast("Please complete the security check before logging in.", 'error');
      return;
    }

    setIsGuestLoading(true);
    try {
      // Create simplified guest user object
      const guestUserObj: User = {
        _id: "guest-user-id",
        firstName: "Guest",
        lastName: "User",
        email: "guest@fisheries.com",
        schoolID: "GUEST001",
        schoolYear: "2024",
        section: "Guest",
        role: "guest",
        profileImage: "",
      };

      // Set guest user data in store
      setUser(guestUserObj);

      // Show success notification
      showToast(`Guest login successful!`, 'success');

      // Close modal
      setIsLoginOpen(false);

      // Clear form
      setEmail("");
      setPassword("");
      resetTurnstile();

      // Redirect to guest page
      router.replace("/guest/borrowing");

    } catch (error) {
      resetTurnstile();
      showToast("Guest login failed. Please try again.", 'error');
    } finally {
      setIsGuestLoading(false);
    }
  };

  // Clear auth state if modal is reopened (handles logout case)
  useEffect(() => {
    if (isLoginOpen) {
      clearAuth();
      setEmail("");
      setPassword("");
      resetTurnstile();
      // Clear all toasts when modal opens
      setToasts([]);
    }
  }, [isLoginOpen, clearAuth]);

  return (
    <>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <AnimatePresence>
        {isLoginOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
            >
              {/* Close button */}
              <motion.button
                className="absolute top-4 right-4 text-black hover:text-gray-600"
                onClick={() => setIsLoginOpen(false)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                disabled={isLoading || isGuestLoading}
              >
                ✕
              </motion.button>

              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-black mb-2">CHMSU Fisheries System</h1>
                <h1 className="text-2xl font-bold text-black">Sign In to your Account</h1>
                <p className="text-sm text-black mt-1">Enter your credentials to access fisheries system.</p>
              </div>

              <form action={handleLogin} className="space-y-4">
                {/* Email */}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || isGuestLoading}
                    required
                    className="mt-1"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isGuestLoading}
                    required
                    className="mt-1 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-6.5 text-black hover:text-gray-600 disabled:opacity-50"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    disabled={isLoading || isGuestLoading}
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
                  disabled={isLoading || isGuestLoading || !turnstileToken}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>

                {/* Divider */}
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-sm text-gray-500">or</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* Login as Guest Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={handleGuestLogin}
                  disabled={isLoading || isGuestLoading || !turnstileToken}
                >
                  {isGuestLoading ? "Signing In..." : "Login as Guest"}
                </Button>

                <div className="text-center mt-3">
                  <p className="text-sm text-black">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="text-[#16a34a] font-medium hover:underline disabled:opacity-50"
                      onClick={() => {
                        setIsLoginOpen(false);
                        setIsCreateAccountOpen(true);
                      }}
                      disabled={isLoading || isGuestLoading}
                    >
                      Sign Up
                    </button>
                  </p>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}