'use client';
import { useState, useEffect } from 'react';
import { Trophy, Star, CheckCircle, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const LEVEL_COLORS: Record<string, string> = {
  bronze: 'text-amber-500',
  silver: 'text-gray-300',
  gold:   'text-yellow-400',
};

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function AdminLeaderboardPage() {
  const [workers, setWorkers]   = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [w, c] = await Promise.all([
          api.get('/admin/leaderboard'),
          api.get('/admin/leaderboard/customer'),
        ]);
        if (w.data.success) setWorkers(w.data.data);
        if (c.data.success) setCustomers(c.data.data);
      } catch { toast.error('Failed to load leaderboard.'); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-64" />
      <div className="space-y-2">{Array(8).fill(0).map((_,i) => <Skeleton key={i} className="h-16" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Full ranking — everyone with at least one completed order. Idle/never-active accounts are excluded.
        </p>
      </div>

      <Tabs defaultValue="workers">
        <TabsList className="w-fit">
          <TabsTrigger value="workers">Workers ({workers.length})</TabsTrigger>
          <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="workers">
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <h2 className="font-semibold text-white">All Ranked Workers</h2>
            </div>
            {workers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No worker has completed an order yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {workers.map((w: any, i: number) => (
                  <div key={w._id} className="flex items-center gap-4 p-4">
                    <div className="w-8 text-center shrink-0">
                      {RANK_MEDALS[i + 1] ? (
                        <span className="text-xl">{RANK_MEDALS[i + 1]}</span>
                      ) : (
                        <span className="text-gray-500 font-mono text-sm">#{i + 1}</span>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#1C1C24] flex items-center justify-center shrink-0 overflow-hidden">
                      {w.workerId?.profileImage ? (
                        <img src={w.workerId.profileImage} alt={w.workerId?.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-gray-300">
                          {w.workerId?.name?.charAt(0).toUpperCase() ?? '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{w.workerId?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{w.workerId?.email}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
                      <span className={cn('capitalize font-medium', LEVEL_COLORS[w.level ?? 'bronze'])}>
                        {w.level ?? 'bronze'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" /> {w.completedOrders}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> {w.averageRating?.toFixed(1) ?? '0.0'}
                      </span>
                      <span className="flex items-center gap-1 text-green-400 font-medium">
                        <TrendingUp className="w-3.5 h-3.5" /> {formatCurrency(w.totalEarnings ?? 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="customers">
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <h2 className="font-semibold text-white">All Ranked Customers</h2>
            </div>
            {customers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No customer has completed an order yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {customers.map((c: any, i: number) => (
                  <div key={c._id} className="flex items-center gap-4 p-4">
                    <div className="w-8 text-center shrink-0">
                      {RANK_MEDALS[i + 1] ? (
                        <span className="text-xl">{RANK_MEDALS[i + 1]}</span>
                      ) : (
                        <span className="text-gray-500 font-mono text-sm">#{i + 1}</span>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#1C1C24] flex items-center justify-center shrink-0 overflow-hidden">
                      {c.customer?.profileImage ? (
                        <img src={c.customer.profileImage} alt={c.customer?.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-gray-300">
                          {c.customer?.name?.charAt(0).toUpperCase() ?? '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.customer?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{c.customer?.email}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" /> {c.completedOrders}
                      </span>
                      <span className="flex items-center gap-1 text-green-400 font-medium">
                        <TrendingUp className="w-3.5 h-3.5" /> {formatCurrency(c.totalSpent ?? 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
