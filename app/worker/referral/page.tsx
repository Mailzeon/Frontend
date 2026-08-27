'use client';
import { useState, useEffect } from 'react';
import { Gift, Copy, Users, IndianRupee, CheckCircle2, Info } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';

export default function WorkerReferralPage() {
  const { referralTaxRate, customerReferralBonusRate, fetchSettings } = useSettingsStore();
  const [data, setData] = useState<{
    referralCode: string;
    totalEarned: number;
    referred: { name: string; role: 'worker' | 'customer'; joinedAt: string; completedOrders: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSettings(); }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/users/me/referral');
        if (data.success) setData(data.data);
      } catch { toast.error('Failed to load referral info.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const link = data?.referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${data.referralCode}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const activeCount = data?.referred.filter(r => r.completedOrders > 0).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Refer & Earn</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Invite anyone to Mailzeon — earn on every order they complete or place, whether they join as a worker or a customer
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <>
          {/* Plain-language explainer so a worker can see exactly how the
              money works before they bother sharing their link — the
              number itself always comes from the live setting, never
              hardcoded, so this stays correct if the admin ever tunes it. */}
          <div className="glass-card p-5 border border-purple-500/20 bg-purple-500/5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4 text-purple-400" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-white">How you earn from this</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Share your link below with anyone. If they sign up as a <span className="text-purple-300 font-semibold">worker</span>, you're
                  connected for good — every single order they complete, you automatically get{' '}
                  <span className="text-purple-300 font-semibold">{referralTaxRate}% of what they earn</span> credited
                  straight to your wallet, <span className="underline decoration-purple-400/50">every order, for as long as they keep working</span>.
                  If they sign up as a <span className="text-purple-300 font-semibold">customer</span> instead, you get{' '}
                  <span className="text-purple-300 font-semibold">{customerReferralBonusRate}% of what the worker earns</span> on
                  every order that customer places — same idea, either way round.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-400" />
              <h2 className="font-semibold text-white">Your Referral Link</h2>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-gray-300 font-mono truncate">
                {link}
              </div>
              <button
                onClick={copyLink}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium flex items-center gap-2 shrink-0 transition-colors"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Your code: <span className="font-mono text-gray-300">{data?.referralCode}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total Referred"   value={data?.referred.length ?? 0} icon={Users}       color="purple" />
            <StatCard title="Active Referrals" value={activeCount}                icon={CheckCircle2} color="green"  />
            <StatCard title="Earned From Referrals" value={formatCurrency(data?.totalEarned ?? 0)} icon={IndianRupee} color="green" />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <h2 className="font-semibold text-white">People You've Referred</h2>
            </div>
            {!data?.referred.length ? (
              <div className="text-center py-12 text-gray-500">
                <Gift className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nobody yet — share your link above to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {data.referred.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-white">{r.name}</p>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                          r.role === 'worker'
                            ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                            : 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                        }`}>
                          {r.role === 'worker' ? 'Worker' : 'Customer'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Joined {formatDate(r.joinedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${r.completedOrders > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {r.completedOrders > 0 ? 'Active' : 'No orders yet'}
                      </p>
                      <p className="text-xs text-gray-500">{r.completedOrders} order{r.completedOrders !== 1 ? 's' : ''} completed</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
