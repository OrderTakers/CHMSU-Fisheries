"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { 
  BookOpen, 
  Download, 
  User, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { logout } from "@/action/logout";
import { useAuthStore } from "@/lib/stores"; // Import your auth store

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { clearAuth } = useAuthStore(); // Get clearAuth from your store

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      // 1. Clear client-side state FIRST
      clearAuth(); // Clear your auth store
      
      // Clear localStorage
      localStorage.removeItem('studentToken');
      localStorage.removeItem('userSession');
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserId');
      
      // 2. Call server logout to clear cookies
      const result = await logout();
      
      if (result.success) {
        toast.success("Successfully logged out", {
          className: "bg-green-100 text-green-800 border border-green-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
          duration: 2000,
        });
        
        // 3. Wait a moment for the toast to show, then redirect
        setTimeout(() => {
          router.push("/");
          router.refresh(); // Refresh to ensure clean state
        }, 1000);
        
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("Logout failed. Please try again.", {
        className: "bg-red-100 text-red-800 border border-red-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium",
        duration: 3000,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/user/download",
      icon: BookOpen,
      current: pathname === "/user/download"
    },
    {
      name: "Profile",
      href: "/user/profile",
      icon: User,
      current: pathname === "/user/profile"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />
      
      {/* Header/Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#16a34a] rounded-full flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-800">Student Portal</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      item.current
                        ? "bg-[#16a34a] text-white"
                        : "text-gray-600 hover:text-[#16a34a] hover:bg-green-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
              
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="outline"
                className="flex items-center space-x-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </Button>
            </nav>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center space-x-2">
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 mr-2 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">{isLoggingOut ? "..." : "Logout"}</span>
              </Button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-all duration-200"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        router.push(item.href);
                        setIsMenuOpen(false);
                      }}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        item.current
                          ? "bg-[#16a34a] text-white"
                          : "text-gray-600 hover:text-[#16a34a] hover:bg-green-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}