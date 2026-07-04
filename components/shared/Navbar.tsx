'use client';
import { useState } from 'react';
import { Bell, X, CheckCheck, Menu } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useSocket } from '@/hooks/useSocket';
import { useUIStore } from '@/store/uiStore';
import { timeAgo, cn } from '@/lib/utils';

interface NavbarProps { title: string; }

export function Navbar({ title }: NavbarProps) {
  useSocket(); // Keep socket alive throughout session
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, handleMarkAsRead, handleMarkAllAsRead } = useNotifications();
  const { toggleMobileSidebar } = useUIStore();

  return (
    <>
      <header className="h-16 bg-[#111827]/80 backdrop-blur-sm border-b border-[#374151] flex items-center px-4 md:px-6 gap-3 md:gap-4 sticky top-0 z-20">
        {/* Mobile hamburger — hidden on desktop since sidebar is always visible there */}
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 -ml-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#374151] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="font-semibold text-white text-base md:text-lg flex-1 truncate">{title}</h1>

        {/* Notification bell */}
        <button onClick={() => setOpen(true)} className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#374151] transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Notification panel */}
      {open && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative w-[85vw] max-w-80 h-full bg-[#111827] border-l border-[#374151] flex flex-col animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-[#374151]">
              <h2 className="font-semibold text-white">Notifications</h2>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllAsRead}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#374151]">
                    <CheckCheck className="w-3.5 h-3.5" /> All read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#374151]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button key={n._id} onClick={() => handleMarkAsRead(n._id)}
                    className={cn(
                      'w-full text-left p-4 border-b border-[#374151]/50 hover:bg-[#374151]/30 transition-colors',
                      !n.isRead && 'bg-purple-500/5'
                    )}>
                    <div className="flex items-start gap-3">
                      {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />}
                      <div className={cn('flex-1', n.isRead && 'ml-4')}>
                        <p className={cn('text-sm font-medium', n.isRead ? 'text-gray-400' : 'text-white')}>{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-xs text-gray-600 mt-1.5">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
