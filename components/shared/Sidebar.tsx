'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Wallet, Store, ClipboardList,
  Users, AlertTriangle, BarChart3, LogOut, Zap, Shield, Settings,
  Undo2, X, User, Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { toast } from '@/components/ui/toast';

interface NavItem { href: string; label: string; Icon: React.ElementType; }

const customerNav: NavItem[] = [
  { href: '/customer/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/customer/orders',    label: 'My Orders',  Icon: ShoppingBag },
  { href: '/customer/wallet',    label: 'Wallet',     Icon: Wallet },
  { href: '/customer/refunds',   label: 'Refunds',    Icon: Undo2 },
  { href: '/customer/profile',   label: 'Profile',    Icon: User },
];

const workerNav: NavItem[] = [
  { href: '/worker/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/worker/marketplace',  label: 'Marketplace',  Icon: Store },
  { href: '/worker/orders',       label: 'My Orders',    Icon: ClipboardList },
  { href: '/worker/wallet',       label: 'Earnings',     Icon: Wallet },
  { href: '/worker/leaderboard',  label: 'Leaderboard',  Icon: Trophy },
  { href: '/worker/profile',      label: 'Profile',      Icon: User },
];

const adminNav: NavItem[] = [
  { href: '/admin/dashboard',    label: 'Dashboard',    Icon: BarChart3 },
  { href: '/admin/orders',       label: 'All Orders',   Icon: ClipboardList },
  { href: '/admin/users',        label: 'Users',        Icon: Users },
  { href: '/admin/withdrawals',  label: 'Withdrawals',  Icon: Wallet },
  { href: '/admin/refunds',      label: 'Refunds',      Icon: Undo2 },
  { href: '/admin/disputes',     label: 'Disputes',     Icon: AlertTriangle },
  { href: '/admin/settings',     label: 'Settings',     Icon: Settings },
  { href: '/admin/profile',      label: 'Profile',      Icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { mobileSidebarOpen, closeMobileSidebar } = useUIStore();

  const nav = user?.role === 'admin' ? adminNav : user?.role === 'worker' ? workerNav : customerNav;

  const logout = () => { clearAuth(); toast.info('Signed out.'); router.push('/login'); };

  return (
    <>
      {/* Mobile overlay — click to close */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside className={cn(
        'w-64 h-screen bg-[#111827] border-r border-[#374151] flex flex-col',
        'fixed left-0 top-0 z-50 transition-transform duration-200 ease-out',
        'md:translate-x-0', // Always visible on desktop
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo + mobile close button */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#374151]">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-none">Marketplace</p>
            <p className="text-xs text-gray-500 capitalize mt-0.5">{user?.role} panel</p>
          </div>
          <button
            onClick={closeMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#374151]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMobileSidebar}
                className={cn(active ? 'nav-item-active' : 'nav-item')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-[#374151] space-y-1">
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
              <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-xs text-purple-400">Admin access</span>
            </div>
          )}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-purple-300">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
