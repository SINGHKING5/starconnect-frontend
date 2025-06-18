import { useNotificationContext } from './NotificationProvider';

export default function NotificationList() {
  const { notifications } = useNotificationContext();

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (notifications.length === 0) {
    return <div className="text-white/60 text-center py-8">No notifications yet.</div>;
  }

  return (
    <ul className="divide-y divide-white/10">
      {notifications.map((n, i) => (
        <li
          key={n.id}
          className={`flex flex-col sm:flex-row sm:items-center gap-2 py-4 px-2 sm:px-0 transition-all duration-300 animate-fade-in-up`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-pink-400 text-base">{n.celebrityName}</span>
              <span className="text-xs text-white/50 ml-2">{formatTimestamp(n.timestamp)}</span>
            </div>
            <div className="text-white/80 text-sm mt-1">{n.content}</div>
          </div>
          {/* Optional: View Post button if post linking is implemented */}
        </li>
      ))}
    </ul>
  );
} 