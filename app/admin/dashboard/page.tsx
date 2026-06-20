'use client';
import { useState, useEffect } from 'react';
import { Users, ShoppingBag, Wallet, AlertTriangle, TrendingUp, Activity, Clock } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1F2937',
    border: '1px solid #374151',
    borderRadius: '12px',
    color: '#F9FAFB',
    fontSize: '12px',
  },
};

export default function AdminDashboard() {
  const [stats,     setStats]     = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Fetch both stats and real analytics in parallel
        const [statsRes, analyticsRes] = await Promise.allSettled([
          api.get('/admin/stats'),
          api.get('/admin/analytics'),
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
          setStats(statsRes.value.data.data);
        }
        if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data.success) {
          setAnalytics(analyticsRes.value.data.data);
        }
      } catch {
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_,i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Real-time platform overview</p>
      </div>

      {/* Revenue stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue"  value={formatCurrency(stats?.totalRevenue ?? 0)} icon={TrendingUp}  color="green"  />
        <StatCard title="Today Revenue"  value={formatCurrency(stats?.todayRevenue  ?? 0)} icon={Activity}   color="blue"   />
        <StatCard title="Total Orders"   value={stats?.totalOrders  ?? 0}                  icon={ShoppingBag} color="purple" />
        <StatCard title="Today Orders"   value={stats?.todayOrders  ?? 0}                  icon={Clock}       color="yellow" />
      </div>

      {/* User + activity stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Customers"           value={stats?.totalCustomers    ?? 0} icon={Users}         color="purple" />
        <StatCard title="Workers"             value={stats?.totalWorkers      ?? 0} icon={Users}         color="blue"   />
        <StatCard title="Online Now"          value={stats?.onlineWorkers     ?? 0} icon={Activity}      color="green"  />
        <StatCard title="Pending Orders"      value={stats?.pendingOrders     ?? 0} icon={Clock}         color="yellow" />
      </div>

      {/* Alert stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Pending Withdrawals" value={stats?.pendingWithdrawals ?? 0} icon={Wallet}        color="yellow" />
        <StatCard title="Open Disputes"       value={stats?.openDisputes       ?? 0} icon={AlertTriangle} color="red"    />
      </div>

      {/* REAL-TIME CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Revenue Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Revenue — Last 7 Days</h2>
            <span className="text-xs text-gray-500">Live from DB</span>
          </div>
          {analytics.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
              No completed orders yet — chart will populate as orders complete.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analytics}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day"     tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`₹${v}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2}
                  fill="url(#revenueGrad)" dot={{ fill: '#8B5CF6', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Orders — Last 7 Days</h2>
            <span className="text-xs text-gray-500">Live from DB</span>
          </div>
          {analytics.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
              No orders yet — chart will populate as orders are created.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}
                  allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v, 'Orders']} />
                <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
