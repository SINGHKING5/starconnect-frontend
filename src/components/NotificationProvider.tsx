import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import socketManager from '@/utils/socket';
import { getCurrentUser } from '@/utils/auth';

export interface Notification {
  id: number;
  celebrityName: string;
  content: string;
  timestamp: string;
  read?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('starconnect_notifications');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
    if (typeof window !== 'undefined') {
      localStorage.setItem('starconnect_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.type !== 'public') return;
    const socket = socketManager.connect();
    const handleNewNotification = (data: any) => {
      // Assume backend sends { post, author }
      const n: Notification = {
        id: Date.now() + Math.random(),
        celebrityName: data.author?.name || 'Celebrity',
        content: data.post?.content || '',
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications(prev => [n, ...prev]);
    };
    socketManager.on('newNotification', handleNewNotification);
    return () => {
      socketManager.off('newNotification', handleNewNotification);
    };
  }, []);

  const addNotification = (n: Notification) => setNotifications(prev => [n, ...prev]);
  const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearNotifications = () => setNotifications([]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllAsRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
}; 