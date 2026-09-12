'use client';
import { useState, useEffect, useRef } from 'react';
import { Users, ShoppingBag, Wallet, AlertTriangle, TrendingUp, Activity, Clock, Undo2, Percent, KeyRound } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#131318',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    color: '#F9FAFB',
    fontSize: '12px',
  },
};

export default function AdminDashboard() {
  const [stats,     setStats]     = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  // ── Analytics date-range selector ────────────────────────────────────
  // Shared by all 3 charts below — one range control drives all of them
  // together, since they all come off the same /admin/analytics endpoint.
  type RangePreset = '7d' | '30d' | 'month' | 'year' | 'all';
  const [rangePreset,   setRangePreset]   = useState<RangePreset>('7d');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());   // 0-11
  const [selectedYear,  setSelectedYear]  = useState(new Date().getFullYear());
  const [rangeLoading,  setRangeLoading]  = useState(false);
  const isFirstAnalyticsFetch = useRef(true);

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const rangeLabel =
    rangePreset === '7d'    ? 'Last 7 Days' :
    rangePreset === '30d'   ? 'Last 30 Days' :
    rangePreset === 'month' ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}` :
    rangePreset === 'year'  ? `${selectedYear}` :
    'All Time';

  // Bounds the year dropdowns below so nobody can pick a year before the
  // platform's own earliest signup — see admin.routes.ts /stats
  // earliestDataDate. Falls back to just the current year until stats
  // has loaded.
  const earliestYear = stats?.earliestDataDate ? new Date(stats.earliestDataDate).getFullYear() : new Date().getFullYear();
  const yearOptions = Array.from({ length: new Date().getFullYear() - earliestYear + 1 }, (_, i) => earliestYear + i).reverse();

  function getRangeDates(preset: RangePreset, month: number, year: number): { from: string; to: string } {
    const toStr = (d: Date) => d.toISOString().split('T')[0];
    const now = new Date();

    if (preset === '30d') {
      const from = new Date(); from.setDate(from.getDate() - 29);
      return { from: toStr(from), to: toStr(now) };
    }
    if (preset === 'month') {
      return { from: toStr(new Date(year, month, 1)), to: toStr(new Date(year, month + 1, 0)) };
    }
    if (preset === 'year') {
      return { from: toStr(new Date(year, 0, 1)), to: toStr(new Date(year, 11, 31)) };
    }
    if (preset === 'all') {
      const from = stats?.earliestDataDate ? new Date(stats.earliestDataDate) : new Date(year, 0, 1);
      return { from: toStr(from), to: toStr(now) };
    }
    // '7d' — matches the backend's own default, sent explicitly anyway so
    // the frontend's picked range and what's actually charted never drift.
    const from = new Date(); from.setDate(from.getDate() - 6);
    return { from: toStr(from), to: toStr(now) };
  }

  const fetchAnalytics = async (preset: RangePreset, month: number, year: number) => {
    setRangeLoading(true);
    try {
      const { from, to } = getRangeDates(preset, month, year);
      const { data } = await api.get('/admin/analytics', { params: { from, to } });
      if (data.success) setAnalytics(data.data);
    } catch {
      toast.error('Failed to load analytics for this range.');
    } finally {
      setRangeLoading(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
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

  // Refetch analytics whenever the range selector changes — NOT on the
  // very first render, since fetchAll() above already loaded the default
  // 7-day view as part of the initial page load.
  useEffect(() => {
    if (isFirstAnalyticsFetch.current) { isFirstAnalyticsFetch.current = false; return; }
    fetchAnalytics(rangePreset, selectedMonth, selectedYear);
  }, [rangePreset, selectedMonth, selectedYear]);

  // Live "Workers Online" count — updates the instant a worker flips their
  // switch, or the instant their connection drops (app closed, lost
  // internet, etc.), with zero polling and no page refresh needed.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (payload: { onlineWorkers: number }) => {
      setStats((prev: any) => prev ? { ...prev, onlineWorkers: payload.onlineWorkers } : prev);
    };
    socket.on(SOCKET_EVENTS.WORKER_ONLINE_COUNT_CHANGED, handler);
    return () => { socket.off(SOCKET_EVENTS.WORKER_ONLINE_COUNT_CHANGED, handler); };
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
        <h1 className="text-2xl font-bold text-white tracking-tight">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Real-time platform overview</p>
      </div>

      {/* Revenue stats — NEW: gross revenue vs platform's actual commission earned */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Gross Revenue (Total)" value={formatCurrency(stats?.totalRevenue ?? 0)}    icon={TrendingUp} color="green"  />
        <StatCard title="Gross Revenue (Today)" value={formatCurrency(stats?.todayRevenue ?? 0)}    icon={Activity}   color="blue"   />
        <StatCard title="Commission Earned (Total)" value={formatCurrency(stats?.totalCommission ?? 0)} icon={Percent} color="purple" />
        <StatCard title="Commission Earned (Today)" value={formatCurrency(stats?.todayCommission ?? 0)} icon={Percent} color="yellow" />
      </div>

      {/* NEW: wrong-password penalty revenue — separate from commission,
          see backend wallet.service.ts settleOrderEarnings(). */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Penalty Earned (Total)" value={formatCurrency(stats?.totalPenalty ?? 0)} icon={KeyRound} color="purple" />
        <StatCard title="Penalty Earned (Today)" value={formatCurrency(stats?.todayPenalty ?? 0)} icon={KeyRound} color="yellow" />
      </div>

      {/* Order stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders"   value={stats?.totalOrders  ?? 0}    icon={ShoppingBag}  color="purple" />
        <StatCard title="Today Orders"   value={stats?.todayOrders  ?? 0}    icon={Clock}        color="yellow" />
        <StatCard title="Pending Orders" value={stats?.pendingOrders ?? 0}   icon={Clock}         color="yellow" />
        <StatCard title="Workers Online" value={stats?.onlineWorkers ?? 0}   icon={Activity}      color="green"  />
      </div>

      {/* User stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Customers"           value={stats?.totalCustomers    ?? 0} icon={Users}         color="purple" />
        <StatCard title="Workers"             value={stats?.totalWorkers      ?? 0} icon={Users}         color="blue"   />
        <StatCard title="Pending Withdrawals" value={stats?.pendingWithdrawals ?? 0} icon={Wallet}        color="yellow" />
        <StatCard title="Pending Refunds"     value={stats?.pendingRefunds     ?? 0} icon={Undo2}         color="yellow" />
      </div>

      {/* Alert stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Open Disputes" value={stats?.openDisputes ?? 0} icon={AlertTriangle} color="red" />
      </div>

      {/* Analytics date-range selector — drives all 3 charts below */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-2">
        {(['7d', '30d', 'month', 'year', 'all'] as const).map(preset => (
          <button
            key={preset}
            onClick={() => setRangePreset(preset)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              rangePreset === preset ? 'bg-purple-600 text-white' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
            }`}
          >
            {preset === '7d' ? '7D' : preset === '30d' ? '30D' : preset === 'month' ? 'Month' : preset === 'year' ? 'Year' : 'All Time'}
          </button>
        ))}

        {rangePreset === 'month' && (
          <>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-gray-200 px-2 py-1.5"
            >
              {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-gray-200 px-2 py-1.5"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
        {rangePreset === 'year' && (
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-gray-200 px-2 py-1.5"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {rangeLoading && <span className="text-xs text-gray-500 ml-auto">Loading…</span>}
      </div>

      {/* REAL-TIME CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Revenue vs Commission Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Revenue & Commission — {rangeLabel}</h2>
            <span className="text-xs text-gray-500">Live from DB</span>
          </div>
          {analytics.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
              No completed orders yet — chart will populate as orders complete.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="commissionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day"     tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`₹${v}`]} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="revenue"    name="Gross Revenue" stroke="#8B5CF6" strokeWidth={2} fill="url(#revenueGrad)" />
                <Area type="monotone" dataKey="commission" name="Commission"    stroke="#22C55E" strokeWidth={2} fill="url(#commissionGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Orders — {rangeLabel}</h2>
            <span className="text-xs text-gray-500">Live from DB</span>
          </div>
          {analytics.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
              No orders yet — chart will populate as orders are created.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}
                  allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Signups Chart — NEW. This is the "who's signing up" data Vercel
          Web Analytics can't show for free (custom events there need a
          $20/mo Pro plan — see docs.vercel.com/analytics/limits-and-pricing).
          Built here instead since every signup is already a User document
          with its own createdAt in this DB — no separate event-tracking
          system needed, this just groups data that already exists, same
          as the two charts above it. */}
      <div className="glass-card p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Signups — {rangeLabel}</h2>
          <span className="text-xs text-gray-500">Live from DB</span>
        </div>
        {analytics.length === 0 || analytics.every(d => d.customerSignups === 0 && d.workerSignups === 0) ? (
          <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
            No signups yet — chart will populate as people register.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}
                allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="customerSignups" name="Customers" stroke="#A855F7" strokeWidth={2}
                dot={{ fill: '#A855F7', r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="workerSignups" name="Workers" stroke="#F59E0B" strokeWidth={2}
                dot={{ fill: '#F59E0B', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
