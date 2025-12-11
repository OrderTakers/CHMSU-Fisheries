"use client";

import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  LogOut,
  ChevronDown,
  Menu,
  ClipboardList,
  ShoppingCart,
  Undo2,
  Calendar,
  Wrench,
  Clock,
  ChevronRight,
  Bell,
  Megaphone,
  MessageSquare,
  CheckCircle2,
  Archive,
  Trash2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores";
import { useEffect, useState } from "react";
import { logout } from "@/action/logout";
import { useRouter, usePathname } from "next/navigation";
import { isValidElement } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/components/providers/notification-provider";

interface RootLayoutProps {
  children: React.ReactNode;
}

interface BreadcrumbItem {
  label: string;
  href: string;
  active?: boolean;
}

/* -------------------------------------------------
   FIXED Notification Bell Component
   ------------------------------------------------- */
function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    isConnected,
    markAsRead, 
    markAllAsRead,
    refreshNotifications,
    deleteNotification,
    archiveNotification
  } = useNotifications();
  
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      'borrowing_request': '📋',
      'borrowing_approved': '✅',
      'borrowing_rejected': '❌',
      'borrowing_released': '📦',
      'borrowing_returned': '🔄',
      'borrowing_overdue': '⚠️',
      'borrowing_cancelled': '🗑️',
      'maintenance_scheduled': '📅',
      'maintenance_completed': '✅',
      'maintenance_cancelled': '🚫',
      'equipment_added': '➕',
      'equipment_updated': '✏️',
      'equipment_low_stock': '📉',
      'user_registration': '👤',
      'user_approved': '👥',
      'system_announcement': '📢',
      'announcement_created': '📢',
      'default': '🔔'
    };
    
    return icons[type] || icons['default'];
  };

  const getNotificationColor = (priority: string, isRead: boolean) => {
    if (isRead) return 'bg-transparent';
    
    switch (priority) {
      case 'urgent': return 'bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500';
      case 'high': return 'bg-orange-50 dark:bg-orange-950/30 border-l-4 border-orange-500';
      case 'medium': return 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500';
      default: return 'bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    setIsOpen(false);
    
    // Navigate based on category
    if (notification.metadata?.url) {
      router.push(notification.metadata.url);
    } else if (notification.category === 'borrowing') {
      router.push('/admin/borrowings');
    } else if (notification.category === 'maintenance') {
      router.push('/admin/maintenance');
    } else if (notification.category === 'inventory') {
      router.push('/admin/inventory');
    } else if (notification.category === 'user') {
      router.push('/admin/users');
    } else {
      router.push('/admin/notifications');
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const handleArchiveNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await archiveNotification(id);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-accent rounded-full"
          aria-label="Notifications"
        >
          <div className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold animate-pulse"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </div>
          
          {/* Connection indicator */}
          <div className={`absolute -bottom-1 -right-1 h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'} border-2 border-background`} />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-[420px] p-0 shadow-xl border-border rounded-lg bg-background z-[100] max-h-[80vh]"
        align="end"
        sideOffset={8}
        collisionPadding={16}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Allow clicks inside the dropdown
          if ((e.target as HTMLElement).closest('[data-radix-dropdown-menu-content]')) {
            e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  refreshNotifications();
                }}
                disabled={isLoading}
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMarkAllAsRead();
                  }}
                  disabled={isLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List - Fixed with proper scroll handling */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
              {!isConnected && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Real-time notifications are offline
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.slice(0, 20).map((notification: any) => (
                <div
                  key={notification._id}
                  className={cn(
                    "px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors relative",
                    getNotificationColor(notification.priority, notification.isRead)
                  )}
                  onClick={() => handleNotificationClick(notification)}
                  onMouseDown={(e) => {
                    // Prevent dropdown from closing when clicking notification
                    if (e.button === 0) { // Left click only
                      e.stopPropagation();
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${!notification.isRead ? 'text-primary' : 'text-muted-foreground'}`}>
                      <div className="text-xl">{getNotificationIcon(notification.type)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-start gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(notification.createdAt)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0 hover:bg-background"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleArchiveNotification(e, notification._id);
                              }}
                              aria-label="Archive"
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0 hover:bg-background"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteNotification(e, notification._id);
                              }}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {notification.category && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs font-normal capitalize px-2 py-0.5"
                          >
                            {notification.category}
                          </Badge>
                        )}
                        {notification.priority === 'urgent' && (
                          <Badge 
                            variant="destructive" 
                            className="text-xs px-2 py-0.5"
                          >
                            Urgent
                          </Badge>
                        )}
                        {notification.priority === 'high' && (
                          <Badge 
                            variant="outline" 
                            className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                          >
                            High
                          </Badge>
                        )}
                        {/* Unread indicator */}
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border p-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground px-2">
              {notifications.length > 0 && (
                <span>Showing {Math.min(notifications.length, 20)} of {notifications.length}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs hover:bg-accent"
              onClick={() => {
                setIsOpen(false);
                router.push("/admin/notifications");
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View all notifications
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* -------------------------------------------------
   Breadcrumb generation
   ------------------------------------------------- */
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = "";

  if (segments[0] === "admin") {
    breadcrumbs.push({
      label: "Admin",
      href: "/admin/dashboard",
      active: segments.length === 1,
    });
    currentPath = "/admin";
  }

  for (let i = 1; i < segments.length; i++) {
    currentPath += `/${segments[i]}`;
    let label = segments[i]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace("Schedule", "Schedules");

    if (segments[i] === "create" && segments[i - 1] === "schedule") label = "Create Schedule";
    if (segments[i] === "view" && segments[i - 1] === "schedule") label = "View Schedule";

    breadcrumbs.push({
      label,
      href: currentPath,
      active: i === segments.length - 1,
    });
  }

  return breadcrumbs;
}

/* -------------------------------------------------
   Main Layout Component
   ------------------------------------------------- */
export default function RootLayoutClient({ children }: RootLayoutProps) {
  const { user, clearAuth, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Use the notification context from provider
  const { isConnected: sseConnected } = useNotifications();

  const breadcrumbs = generateBreadcrumbs(pathname);

  /* ---------- Browser tab title ---------- */
  useEffect(() => {
    const title = getFallbackTitle();
    document.title = `${title} | Fisheries Lab Admin`;
  }, [pathname]);

  /* ---------- Helper: fallback title from route ---------- */
  const getFallbackTitle = () => {
    const lastSegment = pathname.split("/").filter(Boolean).pop() || "";
    if (!lastSegment) return "Fisheries Lab";

    return lastSegment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace("Schedule", "Schedules");
  };

  /* ---------- Page title shown in header (when no breadcrumbs) ---------- */
  const getHeaderTitle = () => {
    if (isValidElement(children)) {
      const childProps = children.props as { pageTitle?: string };
      if (childProps?.pageTitle) return childProps.pageTitle;
    }
    return getFallbackTitle();
  };

  /* ---------- Real-time clock ---------- */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: true,
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------- Auth guard ---------- */
  useEffect(() => {
    if (authLoading) return;
    
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check", { 
          credentials: "include" 
        });
        
        if (!res.ok) throw new Error("Auth check failed");
        
        const data = await res.json();
        
        if (!data.user || data.user.role !== "admin") {
          clearAuth();
          router.replace(data.user ? "/user/userdashboard" : "/");
        }
      } catch {
        clearAuth();
        router.replace("/");
      }
    };
    
    if (!user || user.role !== "admin") {
      checkAuth();
    }
  }, [user, authLoading, router, clearAuth]);

  /* ---------- Auto-close sidebar on mobile ---------- */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ---------- Logout ---------- */
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      clearAuth();
      
      // Clear all localStorage items
      ['studentToken', 'userSession', 'authToken', 'currentUserId'].forEach(key => {
        localStorage.removeItem(key);
      });

      const { success, error } = await logout();
      if (!success) throw new Error(error ?? "Logout failed");

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 500);
    } catch (e) {
      console.error(e);
      setTimeout(() => router.push("/"), 1000);
    } finally {
      setIsLoggingOut(false);
    }
  };

  /* ---------- Active checks ---------- */
  const isActive = (p: string) => pathname === p;
  const isInventoryActive =
    pathname.startsWith("/admin/inventory") ||
    pathname.startsWith("/admin/borrowings") ||
    pathname.startsWith("/admin/returning");
  const isScheduleActive = pathname.startsWith("/admin/schedule");
  const isMaintenanceActive = pathname.startsWith("/admin/maintenance");
  const isReportsActive = 
    pathname.startsWith("/admin/reports") ||
    pathname.startsWith("/admin/announcements") ||
    pathname.startsWith("/admin/feedback");

  /* -------------------------------------------------
     Render
     ------------------------------------------------- */
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ---------- Sidebar ---------- */}
      <aside
        className={`${
          sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-16 md:translate-x-0"
        } bg-green-600 text-white shadow-lg transition-all duration-300 border-r border-green-700 flex flex-col fixed md:relative h-full z-40`}
      >
        {/* Logo + toggle */}
        <div className="p-4 flex justify-between items-center">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <Image
                src="/images/logo-white.png"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-md"
                priority
              />
              <span className="text-xl font-semibold">Fisheries Lab</span>
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-green-500 rounded-md"
                  onClick={() => setSidebarOpen((v) => !v)}
                  aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">
                  <p>{sidebarOpen ? "Collapse" : "Expand"} sidebar</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        <Separator className="bg-green-500" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`w-full justify-start rounded-md transition-colors ${
                    sidebarOpen ? "px-3" : "px-2"
                  } text-white hover:bg-green-500 ${
                    isActive("/admin/dashboard") ? "bg-green-400" : "bg-transparent"
                  }`}
                  onClick={() => router.push("/admin/dashboard")}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {sidebarOpen && <span className="ml-2">Dashboard</span>}
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">
                  <p>Dashboard</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Users */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`w-full justify-start rounded-md transition-colors ${
                    sidebarOpen ? "px-3" : "px-2"
                  } text-white hover:bg-green-500 ${
                    isActive("/admin/users") ? "bg-green-400" : "bg-transparent"
                  }`}
                  onClick={() => router.push("/admin/users")}
                >
                  <Users className="h-4 w-4" />
                  {sidebarOpen && <span className="ml-2">Users</span>}
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">
                  <p>Users</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Reports Dropdown */}
          <Collapsible open={reportsOpen} onOpenChange={setReportsOpen} className="space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <Button
                      className={`w-full justify-between rounded-md transition-colors ${
                        sidebarOpen ? "px-3" : "px-2"
                      } text-white hover:bg-green-500 ${
                        isReportsActive ? "bg-green-400" : "bg-transparent"
                      }`}
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4" />
                        {sidebarOpen && <span className="ml-2">Reports</span>}
                      </div>
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            reportsOpen ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right">
                    <p>Reports</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
              <div className="ml-6 mt-1 space-y-1 border-l border-green-600 pl-2">
                {/* Reports */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`w-full justify-start rounded-md text-sm transition-colors px-3 text-white hover:bg-green-500 ${
                          isActive("/admin/reports") ? "bg-green-400" : "bg-transparent"
                        }`}
                        onClick={() => router.push("/admin/reports")}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {sidebarOpen && <span className="ml-2">Reports</span>}
                      </Button>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right">
                        <p>Reports</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {/* Announcement */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`w-full justify-start rounded-md text-sm transition-colors px-3 text-white hover:bg-green-500 ${
                          isActive("/admin/announcements") ? "bg-green-400" : "bg-transparent"
                        }`}
                        onClick={() => router.push("/admin/announcements")}
                      >
                        <Megaphone className="h-3.5 w-3.5" />
                        {sidebarOpen && <span className="ml-2">Announcement</span>}
                      </Button>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right">
                        <p>Announcement</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {/* Feedback */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`w-full justify-start rounded-md text-sm transition-colors px-3 text-white hover:bg-green-500 ${
                          isActive("/admin/feedback") ? "bg-green-400" : "bg-transparent"
                        }`}
                        onClick={() => router.push("/admin/feedback")}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {sidebarOpen && <span className="ml-2">Feedback</span>}
                      </Button>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right">
                        <p>Feedback</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Inventory */}
          <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen} className="space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <Button
                      className={`w-full justify-between rounded-md transition-colors ${
                        sidebarOpen ? "px-3" : "px-2"
                      } text-white hover:bg-green-500 ${
                        isInventoryActive ? "bg-green-400" : "bg-transparent"
                      }`}
                    >
                      <div className="flex items-center">
                        <Package className="h-4 w-4" />
                        {sidebarOpen && <span className="ml-2">Inventory</span>}
                      </div>
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            inventoryOpen ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right">
                    <p>Inventory</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
              <div className="ml-6 mt-1 space-y-1 border-l border-green-600 pl-2">
                {/* Main Inventory */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`w-full justify-start rounded-md text-sm transition-colors px-3 text-white hover:bg-green-500 ${
                          isActive("/admin/inventory") ? "bg-green-400" : "bg-transparent"
                        }`}
                        onClick={() => router.push("/admin/inventory")}
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        {sidebarOpen && <span className="ml-2">Main Inventory</span>}
                      </Button>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right">
                        <p>Main Inventory</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {/* Borrowing */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`w-full justify-start rounded-md text-sm transition-colors px-3 text-white hover:bg-green-500 ${
                          isActive("/admin/borrowings") ? "bg-green-400" : "bg-transparent"
                        }`}
                        onClick={() => router.push("/admin/borrowings")}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {sidebarOpen && <span className="ml-2">Borrowing</span>}
                      </Button>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right">
                        <p>Borrowing</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {/* Returning */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`w-full justify-start rounded-md text-sm transition-colors px-3 text-white hover:bg-green-500 ${
                          isActive("/admin/returning") ? "bg-green-400" : "bg-transparent"
                        }`}
                        onClick={() => router.push("/admin/returning")}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        {sidebarOpen && <span className="ml-2">Returning</span>}
                      </Button>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right">
                        <p>Returning</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Maintenance & Calibration */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`w-full justify-start rounded-md transition-colors ${
                    sidebarOpen ? "px-3" : "px-2"
                  } text-white hover:bg-green-500 ${
                    isMaintenanceActive ? "bg-green-400" : "bg-transparent"
                  }`}
                  onClick={() => router.push("/admin/maintenance")}
                >
                  <Wrench className="h-4 w-4" />
                  {sidebarOpen && <span className="ml-2">Maintenance & Calibration</span>}
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">
                  <p>Maintenance & Calibration</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Schedule */}
          <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen} className="space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <Button
                      className={`w-full justify-between rounded-md transition-colors ${
                        sidebarOpen ? "px-3" : "px-2"
                      } text-white hover:bg-green-500 ${
                        isScheduleActive ? "bg-green-400" : "bg-transparent"
                      }`}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4" />
                        {sidebarOpen && <span className="ml-2">Schedule</span>}
                      </div>
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            scheduleOpen ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right">
                    <p>Schedule</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
              <div className="ml-6 mt-1 space-y-1 border-l border-green-600 pl-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`w-full justify-start rounded-md text-sm transition-colors px-3 text-white hover:bg-green-500 ${
                          isActive("/admin/schedule/create") ? "bg-green-400" : "bg-transparent"
                        }`}
                        onClick={() => router.push("/admin/schedule/create")}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {sidebarOpen && <span className="ml-2">Create Schedule</span>}
                      </Button>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right">
                        <p>Create Schedule</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`w-full justify-start rounded-md text-sm transition-colors px-3 text-white hover:bg-green-500 ${
                          isActive("/admin/schedule/view") ? "bg-green-400" : "bg-transparent"
                        }`}
                        onClick={() => router.push("/admin/schedule/view")}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {sidebarOpen && <span className="ml-2">View Schedule</span>}
                      </Button>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right">
                        <p>View Schedule</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Disposal Tracking */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`w-full justify-start rounded-md transition-colors ${
                    sidebarOpen ? "px-3" : "px-2"
                  } text-white hover:bg-green-500 ${
                    isActive("/admin/disposal") ? "bg-green-400" : "bg-transparent"
                  }`}
                  onClick={() => router.push("/admin/disposal")}
                >
                  <Package className="h-4 w-4" />
                  {sidebarOpen && <span className="ml-2">Disposal Tracking</span>}
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">
                  <p>Disposal Tracking</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </nav>

        {/* Logout */}
        <div className="p-4 mt-auto border-t border-green-700">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-md transition-colors text-white hover:bg-green-500"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  aria-label={isLoggingOut ? "Logging out..." : "Logout"}
                >
                  <LogOut className="h-4 w-4" />
                  {sidebarOpen && (
                    <span className="ml-2">
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">
                  <p>{isLoggingOut ? "Logging out..." : "Logout"}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ---------- Main area ---------- */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background md:ml-0 transition-all duration-300">
        {/* Header */}
        <header className="bg-card shadow-sm p-4 border-b border-border sticky top-0 z-20">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden mr-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Breadcrumb / Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground overflow-hidden">
                {breadcrumbs.length > 0 ? (
                  breadcrumbs.map((b, i) => (
                    <div key={i} className="flex items-center flex-shrink-0">
                      {b.active ? (
                        <span className="text-foreground font-medium truncate">{b.label}</span>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-muted-foreground hover:text-foreground hover:bg-transparent -m-1 truncate max-w-[150px]"
                            onClick={() => router.push(b.href)}
                          >
                            {b.label}
                          </Button>
                          {i < breadcrumbs.length - 1 && (
                            <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground flex-shrink-0" />
                          )}
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-foreground font-medium">{getHeaderTitle()}</span>
                )}
              </div>
            </div>

            {/* Clock + Notifications */}
            <div className="flex items-center space-x-4">
              {/* Clock */}
              <div className="hidden md:flex items-center bg-muted px-3 py-1.5 rounded-md">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">{currentTime}</span>
              </div>

              {/* Notification Bell */}
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-card">
          {children}
        </main>
      </div>
    </div>
  );
}