'use client';
import { useState, useEffect } from 'react';
import { Users, ShoppingBag, Wallet, AlertTriangle, TrendingUp, Activity, CheckCircle, Clock } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const CHART_STYLE = {
  tooltip: { contentStyle: { background: '#1F2937', border: '1px solid #374151', borderRadius: '12px', color: '#F9FAFB' } }
};

export default function AdminDashboard() {
  const [stats, setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/admin/stats');
        if (data.success) setStats(data.data);
      } catch { toast.error('Failed to load stats.'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  // Placeholder chart data — in production, add a /admin/analytics endpoint
  const revenueData = [
    { day: 'Mon', revenue: 450 }, { day: 'Tue', revenue: 700 },
    { day: 'Wed', revenue: 580 }, { day: 'Thu', revenue: 920 },
    { day: 'Fri', revenue: 1100 },{ day: 'Sat', revenue: 860 },
    { day: 'Sun', revenue: stats ? stats.todayRevenue : 0 },
  ];

  const ordersData = [
    { day: 'Mon', orders: 9 }, { day: 'Tue', orders: 14 },
    { day: 'Wed', orders: 11 },{ day: 'Thu', orders: 18 },
    { day: 'Fri', orders: 22 },{ day: 'Sat', orders: 17 },
    { day: 'Sun', orders: stats ? stats.todayOrders : 0 },
  ];

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_,i) => <Skeleton key={i} className="h-28" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Platform overview and analytics</p>
      </div>

      {/* Revenue stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue"   value={formatCurrency(stats?.totalRevenue ?? 0)}  icon={TrendingUp}  color="green"  />
        <StatCard title="Today Revenue"   value={formatCurrency(stats?.todayRevenue ?? 0)}   icon={Activity}    color="blue"   />
        <StatCard title="Total Orders"    value={stats?.totalOrders ?? 0}    icon={ShoppingBag}  color="purple" />
        <StatCard title="Today Orders"    value={stats?.todayOrders ?? 0}    icon={Clock}        color="yellow" />
      </div>

      {/* User stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Customers"          value={stats?.totalCustomers ?? 0}  icon={Users}         color="purple" />
        <StatCard title="Workers"            value={stats?.totalWorkers ?? 0}    icon={Users}         color="blue"   />
        <StatCard title="Online Now"         value={stats?.onlineWorkers ?? 0}   icon={Activity}      color="green"  />
        <StatCard title="Pending Orders"     value={stats?.pendingOrders ?? 0}   icon={Clock}         color="yellow" />
      </div>

      {/* Alert stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Pending Withdrawals" value={stats?.pendingWithdrawals ?? 0} icon={Wallet}        color="yellow" />
        <StatCard title="Open Disputes"       value={stats?.openDisputes ?? 0}       icon={AlertTriangle} color="red"    />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Revenue (This Week)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip {...CHART_STYLE.tooltip} formatter={(v: number) => [`₹${v}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2} fill="url(#revenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Orders (This Week)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ordersData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_STYLE.tooltip} />
              <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
