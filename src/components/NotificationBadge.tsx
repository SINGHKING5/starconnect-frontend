'use client';

import Link from 'next/link';
import { useNotificationContext } from './NotificationProvider';
import { useEffect, useRef } from 'react';

export default function NotificationBadge() {
  const { unreadCount } = useNotificationContext();
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (badgeRef.current) {
      badgeRef.current.classList.remove('animate-bounce');
      // Trigger reflow for animation restart
      void badgeRef.current.offsetWidth;
      if (unreadCount > 0) badgeRef.current.classList.add('animate-bounce');
    }
  }, [unreadCount]);

  return (
    <Link href="/notifications" className="relative inline-block">
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
      </svg>
      {unreadCount > 0 && (
        <span
          ref={badgeRef}
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow animate-fade-in"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
} 