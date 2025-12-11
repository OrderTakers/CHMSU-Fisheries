"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuthStore } from '@/lib/stores';
import { toast } from 'sonner';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  reconnectSSE: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get user ID from user object
  const userId = user?._id || (user as any)?.id || (user as any)?.userId || null;

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    try {
      if (!silent) setIsLoading(true);
      const response = await fetch('/api/notifications?limit=50', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } else {
        console.warn('Failed to fetch notifications, will retry...');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Don't show toast for fetch errors to avoid spam
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [userId]);

  const setupSSEConnection = useCallback(() => {
    if (!userId) {
      console.log('No user ID, skipping SSE setup');
      cleanupSSE();
      return;
    }

    // Clean up existing connection
    cleanupSSE();

    console.log(`🔄 Setting up SSE connection for user: ${userId}`);
    
    // Reset reconnect attempts
    reconnectAttemptRef.current = 0;

    try {
      // Create new EventSource with cache busting
      const es = new EventSource(`/api/notifications/stream?t=${Date.now()}`, {
        withCredentials: true
      });

      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('✅ SSE Connection established');
        setIsConnected(true);
        reconnectAttemptRef.current = 0; // Reset attempts on successful connection
      };

      es.onmessage = (event) => {
        try {
          if (!event.data.trim()) return;
          
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_notification') {
            console.log('🔔 New real-time notification:', data.notification.title);
            
            // Add new notification at the beginning
            setNotifications(prev => [data.notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show toast for important notifications
            const notif = data.notification;
            if (notif.priority === 'urgent' || notif.priority === 'high') {
              toast.info(notif.title, {
                description: notif.message,
                duration: 5000,
              });
            }
          } else if (data.type === 'heartbeat') {
            // Heartbeat received, connection is alive
          } else if (data.type === 'connected') {
            console.log('✅ SSE connection confirmed');
            setIsConnected(true);
          }
        } catch (error) {
          // Non-JSON messages or parse errors
        }
      };

      es.onerror = (error) => {
        console.error('❌ SSE Error:', error);
        setIsConnected(false);
        
        // Close the connection
        if (eventSourceRef.current === es) {
          es.close();
          eventSourceRef.current = null;
        }
        
        // Attempt to reconnect with exponential backoff
        reconnectAttemptRef.current += 1;
        
        if (reconnectAttemptRef.current <= maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (userId) {
              setupSSEConnection();
            }
          }, delay);
        } else {
          console.log('❌ Max reconnection attempts reached');
        }
      };

    } catch (error) {
      console.error('Failed to create EventSource:', error);
      setIsConnected(false);
      
      // Attempt to reconnect
      reconnectAttemptRef.current += 1;
      if (reconnectAttemptRef.current <= maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (userId) {
            setupSSEConnection();
          }
        }, delay);
      }
    }
  }, [userId]);

  // Cleanup function
  const cleanupSSE = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('🧹 Cleaning up SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (fetchIntervalRef.current) {
      clearInterval(fetchIntervalRef.current);
      fetchIntervalRef.current = null;
    }
  }, []);

  // Manual reconnection function
  const reconnectSSE = useCallback(() => {
    console.log('🔄 Manual reconnection requested');
    reconnectAttemptRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setupSSEConnection();
  }, [setupSSEConnection]);

  // Setup SSE connection on mount and when userId changes
  useEffect(() => {
    if (userId) {
      console.log('👤 User ID available, setting up SSE');
      setupSSEConnection();
    } else {
      console.log('👤 No user ID, cleaning up SSE');
      cleanupSSE();
      setIsConnected(false);
    }
    
    return () => {
      cleanupSSE();
    };
  }, [userId, setupSSEConnection, cleanupSSE]);

  // Initial fetch and periodic refresh - EVERY 2 SECONDS
  useEffect(() => {
    if (userId) {
      // Initial fetch
      fetchNotifications();
      
      // Setup periodic refresh every 2 seconds (2000ms) for real-time updates
      fetchIntervalRef.current = setInterval(() => {
        fetchNotifications(true); // Silent refresh
      }, 2000);
      
      return () => {
        if (fetchIntervalRef.current) {
          clearInterval(fetchIntervalRef.current);
        }
      };
    } else {
      // Clear notifications if no user
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => 
          notif._id === id ? { ...notif, isRead: true } : notif
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const deletedNotif = notifications.find(n => n._id === id);
        setNotifications(prev => prev.filter(notif => notif._id !== id));
        if (deletedNotif && !deletedNotif.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  }, [notifications]);

  const archiveNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' })
      });

      if (response.ok) {
        const archivedNotif = notifications.find(n => n._id === id);
        setNotifications(prev => prev.filter(notif => notif._id !== id));
        if (archivedNotif && !archivedNotif.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        toast.success('Notification archived');
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast.error('Failed to archive notification');
    }
  }, [notifications]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
    toast.success('Notifications refreshed');
  }, [fetchNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    deleteNotification,
    archiveNotification,
    reconnectSSE,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};