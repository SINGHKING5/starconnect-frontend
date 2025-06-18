"use client";
import { useNotificationContext } from '@/components/NotificationProvider';
import NotificationList from '@/components/NotificationList';

export default function NotificationsPage() {
  const { unreadCount, markAllAsRead } = useNotificationContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center px-2 sm:px-0">
      <div className="w-full max-w-2xl mt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors"
            >
              Mark All as Read
            </button>
          )}
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg p-4 sm:p-8 border border-white/20 animate-fade-in">
          <NotificationList />
        </div>
      </div>
    </div>
  );
} 