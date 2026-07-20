'use client';
import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, IndianRupee, Clock, Timer, Percent } from 'lucide-react';
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
};

const KNOWN_KEYS = Object.keys(SETTING_META);

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingDoc[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [edited,   setEdited]   = useState<Record<string, string>>({});
  const [saving,   setSaving]   = useState<string | null>(null);

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
                  <div className="w-9 h-9 rounded-xl bg-[#374151] flex items-center justify-center shrink-0">
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
    </div>
  );
}
