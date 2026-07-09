'use client';
import { useState, useEffect } from 'react';
import { Trophy, Star, CheckCircle, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const LEVEL_COLORS: Record<string, string> = {
  bronze: 'text-amber-500',
  silver: 'text-gray-300',
  gold:   'text-yellow-400',
};

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function WorkerLeaderboardPage() {
  const { user } = useAuthStore();
  const [top, setTop]         = useState<any[]>([]);
  const [myRank, setMyRank]   = useState<number | null>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/leaderboard');
        if (data.success) {
          setTop(data.data.top);
          setMyRank(data.data.myRank);
          setMyStats(data.data.myStats);
        }
      } catch { toast.error('Failed to load leaderboard.'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const isInTop10 = myStats && top.some((t: any) => t.workerId?._id === myStats.workerId);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24" />
      <div className="space-y-2">{Array(6).fill(0).map((_,i) => <Skeleton key={i} className="h-16" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Top workers ranked by completed orders and rating</p>
      </div>

      {/* Your rank card */}
      {myStats && (
        <div className="glass-card p-5 border border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center shrink-0">
                <span className="font-bold text-purple-300">{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-white">Your Rank</p>
                <p className={cn('text-xs font-medium capitalize', LEVEL_COLORS[myStats.level ?? 'bronze'])}>
                  {myStats.level ?? 'bronze'} Worker
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-400">
                {myRank ? `#${myRank}` : '—'}
              </p>
              {!isInTop10 && myRank && (
                <p className="text-xs text-gray-500">Keep completing orders to reach the top 10!</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#374151]">
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="font-semibold text-white">{myStats.completedOrders ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Success Rate</p>
              <p className="font-semibold text-white">{myStats.successRate ?? 100}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Rating</p>
              <p className="font-semibold text-white flex items-center gap-1">
                {myStats.averageRating ?? 0} <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top 10 list */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-[#374151] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h2 className="font-semibold text-white">Top 10 Workers</h2>
        </div>
        {top.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No workers ranked yet — complete some orders to be the first!</p>
          </div>
        ) : (
          <div className="divide-y divide-[#374151]/50">
            {top.map((w: any, i: number) => (
              <div key={w._id} className="flex items-center gap-4 p-4">
                <div className="w-8 text-center shrink-0">
                  {RANK_MEDALS[i + 1] ? (
                    <span className="text-xl">{RANK_MEDALS[i + 1]}</span>
                  ) : (
                    <span className="text-gray-500 font-mono text-sm">#{i + 1}</span>
                  )}
                </div>
                <div className="w-9 h-9 rounded-full bg-[#374151] flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-gray-300">
                    {w.workerId?.name?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{w.workerId?.name ?? 'Unknown'}</p>
                  <p className={cn('text-xs capitalize', LEVEL_COLORS[w.level ?? 'bronze'])}>{w.level ?? 'bronze'}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
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
    </div>
  );
}
