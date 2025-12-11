"use client";

import { useState, useEffect } from 'react';
import { useNotifications } from '@/components/providers/notification-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  CheckCircle2, 
  Archive, 
  Trash2, 
  Clock, 
  AlertCircle,
  MessageSquare,
  Package,
  Wrench,
  Users,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    archiveNotification,
    refreshNotifications 
  } = useNotifications();
  
  const [activeTab, setActiveTab] = useState('all');
  const [filteredNotifications, setFilteredNotifications] = useState(notifications);

  useEffect(() => {
    let filtered = [...notifications];
    
    switch (activeTab) {
      case 'unread':
        filtered = filtered.filter(n => !n.isRead);
        break;
      case 'read':
        filtered = filtered.filter(n => n.isRead);
        break;
      case 'urgent':
        filtered = filtered.filter(n => n.priority === 'urgent' || n.priority === 'high');
        break;
    }
    
    setFilteredNotifications(filtered);
  }, [notifications, activeTab]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'borrowing': return <Package className="h-4 w-4" />;
      case 'maintenance': return <Wrench className="h-4 w-4" />;
      case 'inventory': return <Package className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      case 'system': return <Bell className="h-4 w-4" />;
      case 'announcement': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      // Borrowing icons
      'borrowing_request': '📋',
      'borrowing_approved': '✅',
      'borrowing_rejected': '❌',
      'borrowing_released': '📦',
      'borrowing_returned': '🔄',
      'borrowing_overdue': '⚠️',
      'borrowing_cancelled': '🗑️',
      
      // Faculty borrowing icons
      'faculty_borrowing_request': '👨‍🏫',
      'faculty_borrowing_approved': '✅',
      'faculty_borrowing_rejected': '❌',
      'faculty_borrowing_released': '📦',
      'faculty_borrowing_cancelled': '🗑️',
      
      // Faculty return icons
      'faculty_return_deadline_reminder': '⏰',
      'faculty_equipment_returned_admin': '📦',
      'faculty_return_late_warning': '🚨',
      'faculty_return_completed': '✅',
      
      // Maintenance icons
      'maintenance_scheduled': '📅',
      'maintenance_assigned_faculty': '🔧',
      'maintenance_in_progress': '⚙️',
      'maintenance_completed': '✅',
      'maintenance_cancelled': '🚫',
      'maintenance_overdue': '⚠️',
      
      // Equipment maintenance admin icons
      'equipment_under_maintenance_admin': '🔧',
      'equipment_maintenance_completed_admin': '✅',
      'equipment_maintenance_disposed_admin': '🗑️',
      
      // Equipment icons
      'equipment_added': '➕',
      'equipment_updated': '✏️',
      'equipment_disposed': '♻️',
      'equipment_low_stock': '📉',
      
      // User icons
      'user_registration': '👤',
      'user_approved': '👥',
      'user_deactivated': '🚷',
      
      // System icons
      'system_announcement': '📢',
      'announcement_created': '📢',
      'announcement_updated': '✏️',
      'announcement_deleted': '🗑️',
      'announcement_targeted': '🎯',
      'system_maintenance': '⚙️',
      'system_update': '🔄',
      
      // Return icons
      'return_deadline_reminder': '⏰',
      'equipment_returned_admin': '📦',
      'return_late_warning': '🚨',
      'return_completed_student': '✅',
      
      // Schedule icons
      'schedule_created_student': '📚',
      'schedule_created_faculty': '👨‍🏫',
      'schedule_updated_student': '✏️',
      'schedule_updated_faculty': '📝',
      'schedule_cancelled_student': '🚫',
      'schedule_cancelled_faculty': '❌'
    };
    
    return icons[type] || '🔔';
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;

    const labels = {
      urgent: 'Urgent',
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'outline'} className="text-xs">
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    toast.success('All notifications marked as read');
  };

  const handleDeleteAllRead = async () => {
    const readNotifications = notifications.filter(n => n.isRead);
    for (const notification of readNotifications) {
      await deleteNotification(notification._id);
    }
    toast.success(`Deleted ${readNotifications.length} read notifications`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and stay updated
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refreshNotifications}
            disabled={isLoading}
          >
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Total Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notifications.length}</div>
            <p className="text-sm text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Unread
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{unreadCount}</div>
            <p className="text-sm text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {notifications.length > 0 ? formatDate(notifications[0].createdAt).split(',')[0] : 'No recent'}
            </div>
            <p className="text-sm text-muted-foreground">Latest notification</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Notification Center</CardTitle>
              <CardDescription>
                View and manage all your notifications
              </CardDescription>
            </div>
            
            {notifications.filter(n => n.isRead).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteAllRead}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="read">
                Read ({notifications.length - unreadCount})
              </TabsTrigger>
              <TabsTrigger value="urgent">
                Urgent ({notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                  <h3 className="text-lg font-medium">No notifications found</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'all' 
                      ? "You don't have any notifications yet." 
                      : `No ${activeTab} notifications found.`}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {filteredNotifications.map((notification) => (
                      <Card 
                        key={notification._id} 
                        className={`transition-all hover:shadow-md ${
                          !notification.isRead ? 'border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${
                                !notification.isRead 
                                  ? 'bg-primary/10 text-primary' 
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                <span className="text-lg">
                                  {getNotificationIcon(notification.type)}
                                </span>
                              </div>
                              
                              <div className="flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className={`font-medium ${
                                    !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                                  }`}>
                                    {notification.title}
                                  </h4>
                                  {getPriorityBadge(notification.priority)}
                                </div>
                                
                                <p className="text-sm text-muted-foreground">
                                  {notification.message}
                                </p>
                                
                                <div className="flex items-center gap-3 pt-2">
                                  <div className="flex items-center gap-2">
                                    {getCategoryIcon(notification.category)}
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {notification.category}
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(notification.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => markAsRead(notification._id)}
                                  title="Mark as read"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => archiveNotification(notification._id)}
                                title="Archive"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteNotification(notification._id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}