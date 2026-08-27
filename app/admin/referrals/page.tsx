'use client';
import { useState, useEffect } from 'react';
import { Gift, Users, IndianRupee } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ReferralGroup {
  referrer: { _id: string; name: string; email: string; role: 'worker' | 'customer'; referralCode: string };
  referredCount: number;
  referred: { name: string; role: 'worker' | 'customer'; createdAt: string }[];
  totalPaid: number;
}

export default function AdminReferralsPage() {
  const [groups, setGroups]   = useState<ReferralGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/admin/referrals');
        if (data.success) setGroups(data.data);
      } catch { toast.error('Failed to load referrals.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const totalPaidOut = groups.reduce((sum, g) => sum + g.totalPaid, 0);
  const totalReferred = groups.reduce((sum, g) => sum + g.referredCount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Referrals</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Every worker or customer who's referred someone, and what's been paid out so far — covers both independent referral programs, now cross-role (a worker can refer a customer and vice versa)
        </p>
      </div>

      {!loading && groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Referrers</p>
            <p className="text-xl font-bold text-white mt-1">{groups.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Referred</p>
            <p className="text-xl font-bold text-white mt-1">{totalReferred}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Paid Out</p>
            <p className="text-xl font-bold text-green-400 mt-1">{formatCurrency(totalPaidOut)}</p>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Gift className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No referrals yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {groups.map(g => (
              <div key={g.referrer._id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{g.referrer.name}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                        g.referrer.role === 'worker'
                          ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                          : 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                      }`}>
                        {g.referrer.role === 'worker' ? 'Worker' : 'Customer'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{g.referrer.email} · code {g.referrer.referralCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">{formatCurrency(g.totalPaid)}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                      <Users className="w-3 h-3" /> {g.referredCount} referred
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.referred.map((r, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg bg-white/[0.04] text-gray-400 flex items-center gap-1.5">
                      {r.name}
                      <span className={`text-[9px] font-semibold px-1 py-0.5 rounded border ${
                        r.role === 'worker'
                          ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                          : 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                      }`}>
                        {r.role === 'worker' ? 'Worker' : 'Customer'}
                      </span>
                      · {formatDate(r.createdAt)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
