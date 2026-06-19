'use client';
import { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

const LEVEL_COLOR: Record<string, string> = { bronze: 'text-amber-500', silver: 'text-gray-300', gold: 'text-yellow-400' };

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'worker' | 'customer'>('worker');
  const [search, setSearch]   = useState('');
  const [acting, setActing]   = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users?role=${tab}`);
      if (data.success) setUsers(data.data);
    } catch { toast.error('Failed to load users.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [tab]);

  const toggleApproval = async (userId: string, isApproved: boolean) => {
    setActing(userId);
    try {
      const { data } = await api.patch(`/admin/users/${userId}/approve`, { isApproved });
      if (data.success) {
        toast.success(isApproved ? 'Worker approved!' : 'Worker suspended.');
        setUsers(p => p.map(u => u._id === userId ? { ...u, isApproved } : u));
      }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActing(null); }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage customers and workers</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-[#1F2937] border border-[#374151] rounded-xl p-1 gap-1">
          {(['worker','customer'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
                tab === t ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}>
              {t}s
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array(5).fill(0).map((_,i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No users found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#374151]">
                {['Name','Email', tab === 'worker' ? 'Level' : 'Joined', 'Status', tab === 'worker' ? 'Actions' : ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151]/50">
              {filtered.map(u => (
                <tr key={u._id} className="hover:bg-[#374151]/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center text-xs font-semibold text-purple-300 shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    {tab === 'worker'
                      ? <span className={`font-semibold capitalize ${LEVEL_COLOR[u.level ?? 'bronze']}`}>{u.level ?? 'bronze'}</span>
                      : <span className="text-gray-400">{formatDate(u.createdAt)}</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {tab === 'worker' ? (
                      <div className="flex items-center gap-1.5">
                        {u.isOnline && <span className="w-2 h-2 rounded-full bg-green-400" title="Online" />}
                        <span className={u.isApproved ? 'text-green-400 text-xs' : 'text-yellow-400 text-xs'}>
                          {u.isApproved ? '✓ Approved' : '⏳ Pending'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-green-400 text-xs">Active</span>
                    )}
                  </td>
                  {tab === 'worker' && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!u.isApproved ? (
                          <Button size="sm" variant="success" loading={acting === u._id}
                            onClick={() => toggleApproval(u._id, true)}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" loading={acting === u._id}
                            onClick={() => toggleApproval(u._id, false)}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Suspend
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                  {tab === 'customer' && <td className="px-4 py-3" />}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
