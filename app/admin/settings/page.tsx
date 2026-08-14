'use client';
import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, IndianRupee, Clock, Timer, Percent, AlertTriangle, Trash2, PlayCircle, ShieldAlert, Gift, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface SettingDoc {
  _id: string;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

// REWORKED: 'orderPrice' and 'workerEarning' are gone (customer now sets
// their own order amount). Replaced with 'minimumOrderAmount' and
// 'platformCommissionRate'. Only keys listed here are ever displayed —
// this also means any old orphaned 'orderPrice'/'workerEarning' documents
// still sitting in the database (from before this change) are simply
// hidden from view rather than confusingly shown as editable.
const SETTING_META: Record<string, { label: string; icon: React.ElementType; suffix: string; order: number; max?: number }> = {
  minimumOrderAmount:     { label: 'Minimum Order Amount',   icon: IndianRupee, suffix: '₹',       order: 1 },
  platformCommissionRate: { label: 'Platform Commission',    icon: Percent,     suffix: '%',       order: 2, max: 100 },
  orderTimerMinutes:      { label: 'Credential Timer',       icon: Timer,       suffix: 'minutes', order: 3 },
  autoCompleteHours:      { label: 'Auto-Complete Window',   icon: Clock,       suffix: 'hours',   order: 4 },
  strikeLockHours1:       { label: 'Strike 1 — Lock Duration', icon: ShieldAlert, suffix: 'hours', order: 5 },
  strikeLockHours2:       { label: 'Strike 2 — Lock Duration', icon: ShieldAlert, suffix: 'hours', order: 6 },
  strikeLockHours3:       { label: 'Strike 3 — Lock Duration', icon: ShieldAlert, suffix: 'hours', order: 7 },
  strikeLockHours4Plus:   { label: 'Strike 4+ — Lock Duration', icon: ShieldAlert, suffix: 'hours', order: 8 },
  referralTaxRate:        { label: 'Referral Fee', icon: Gift, suffix: '%', order: 9, max: 100 },
  wrongPasswordGraceMinutes: { label: 'Wrong-Password Grace Window', icon: KeyRound, suffix: 'minutes', order: 10 },
  wrongPasswordPenaltyRate:  { label: 'Wrong-Password Penalty',      icon: KeyRound, suffix: '%',       order: 11, max: 100 },
};

const KNOWN_KEYS = Object.keys(SETTING_META);

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingDoc[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [edited,   setEdited]   = useState<Record<string, string>>({});
  const [saving,   setSaving]   = useState<string | null>(null);

  // ── Danger zone: reset test data ──────────────────────────────────────────
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting]     = useState(false);
  const [resetDone, setResetDone]     = useState(false);

  const handleReset = async () => {
    if (confirmText !== 'RESET') {
      toast.error('Type RESET exactly (all caps) to confirm.');
      return;
    }
    setResetting(true);
    try {
      const { data } = await api.post('/admin/reset-test-data', { confirm: confirmText });
      if (data.success) {
        toast.success('All test data cleared! Accounts were left untouched.');
        setResetDone(true);
        setConfirmText('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset data.');
    } finally {
      setResetting(false);
    }
  };

  // ── Run the auto-complete/auto-cancel sweep immediately ───────────────────
  const [runningAutoComplete, setRunningAutoComplete] = useState(false);
  const handleRunAutoComplete = async () => {
    setRunningAutoComplete(true);
    try {
      const { data } = await api.post('/admin/run-auto-complete', {});
      if (data.success) toast.success('Sweep finished — check Orders to confirm any stuck ones cleared.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to run sweep.');
    } finally {
      setRunningAutoComplete(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/admin/settings');
      if (data.success) {
        // Only show settings we actively use — hides orphaned legacy keys
        const known = data.data.filter((s: SettingDoc) => KNOWN_KEYS.includes(s.key));
        const sorted = known.sort((a: SettingDoc, b: SettingDoc) =>
          SETTING_META[a.key].order - SETTING_META[b.key].order
        );
        setSettings(sorted);
      }
    } catch {
      toast.error('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleChange = (key: string, value: string) => {
    setEdited(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    const newValue = edited[key];
    if (newValue === undefined || newValue.trim() === '') {
      toast.error('Value cannot be empty.');
      return;
    }
    const numValue = Number(newValue);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Value must be a positive number.');
      return;
    }
    const max = SETTING_META[key]?.max;
    if (max !== undefined && numValue > max) {
      toast.error(`Value cannot exceed ${max}.`);
      return;
    }

    setSaving(key);
    try {
      const { data } = await api.put(`/admin/settings/${key}`, { value: newValue.trim() });
      if (data.success) {
        toast.success('Setting updated. Takes effect immediately for new orders.');
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue.trim(), updatedAt: new Date().toISOString() } : s));
        setEdited(prev => { const p = { ...prev }; delete p[key]; return p; });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to update setting.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
          <SettingsIcon className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
          <p className="text-gray-400 text-sm mt-0.5">Changes apply immediately to new orders</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : settings.length === 0 ? (
        <div className="glass-card text-center py-16 text-gray-500">
          <SettingsIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No settings found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map(s => {
            const meta = SETTING_META[s.key];
            const Icon = meta.icon;
            const currentValue = edited[s.key] ?? s.value;
            const hasChanged   = edited[s.key] !== undefined && edited[s.key] !== s.value;

            return (
              <div key={s.key} className="glass-card p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1C1C24] flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5 text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{meta.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label>Current value ({meta.suffix})</Label>
                    <Input
                      type="number"
                      min="1"
                      max={meta.max}
                      value={currentValue}
                      onChange={e => handleChange(s.key, e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => handleSave(s.key)}
                    disabled={!hasChanged}
                    loading={saving === s.key}
                  >
                    <Save className="w-4 h-4 mr-2" /> Save
                  </Button>
                </div>

                <p className="text-xs text-gray-600 mt-2">Last updated: {formatDate(s.updatedAt)}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
        <p className="text-sm text-blue-400">
          ℹ️ Customers now set their own order amount (minimum enforced here). The commission rate is
          locked in per-order at creation time — changing it here only affects orders placed afterward.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
        <p className="text-sm text-red-400">
          🔒 Strike durations control the dispute-penalty system: every time a dispute is resolved
          against a worker (or they go silent on a live verification request), they're locked out of
          accepting new orders for the duration below — escalating with each repeat offense. They still
          see every order in the marketplace during the lock, just can't accept any. At 4+ strikes,
          every admin gets notified so someone can decide whether to permanently suspend them from
          their profile page.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
        <p className="text-sm text-purple-400">
          🎁 Referral Fee is the percentage a referred worker's earning is reduced by on every order
          they complete — paid straight to whoever referred them. Comes entirely out of the worker's
          own cut, never the platform's commission, so raising or lowering it never affects platform
          revenue either way.
        </p>
      </div>

      {/* Auto-complete runs automatically every 5 minutes — this lets an
          admin force it right now, e.g. to confirm a fix cleared already-
          stuck orders instead of waiting for the next interval. */}
      <div className="glass-card p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#1C1C24] flex items-center justify-center shrink-0">
            <PlayCircle className="w-4.5 h-4.5 text-gray-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">Run Auto-Complete Now</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Manually triggers the sweep that auto-completes/auto-cancels orders past their
              Credential Timer / Auto-Complete Window, instead of waiting for the next scheduled run.
            </p>
          </div>
        </div>
        <Button onClick={handleRunAutoComplete} loading={runningAutoComplete} variant="outline">
          <PlayCircle className="w-4 h-4 mr-2" /> Run Sweep Now
        </Button>
      </div>

      {/* ── Danger zone ──────────────────────────────────────────────────── */}
      <div className="glass-card p-5 border-red-500/20">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Danger Zone</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Permanently deletes every order, dispute, refund/withdraw request, transaction, notification,
              and rating, and resets every wallet + worker level back to zero — as if each account had just
              signed up. User accounts, Settings, and push subscriptions are left untouched.
              <strong className="text-red-400"> This cannot be undone.</strong>
            </p>
          </div>
        </div>

        {resetDone ? (
          <p className="text-sm text-green-400">✅ Data reset complete. Refresh any open dashboard pages to see zeroed-out stats.</p>
        ) : (
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <Label>Type <span className="font-mono text-red-400">RESET</span> to confirm</Label>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="RESET"
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={confirmText !== 'RESET'}
              loading={resetting}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Clear All Test Data
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
