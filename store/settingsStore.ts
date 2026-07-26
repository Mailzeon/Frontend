import { create } from 'zustand';
import { api } from '@/lib/api';

interface PublicSettings {
  minimumOrderAmount: number;
  platformCommissionRate: number;
  orderTimerMinutes: number;
  autoCompleteHours: number;
}

interface SettingsState extends PublicSettings {
  loaded: boolean;
  fetchSettings: (force?: boolean) => Promise<void>;
}

// Sane fallback defaults — used only until the real /settings/public response
// arrives (or if that request ever fails), so the UI never shows a blank
// state. These match Settings.model.ts's seeded defaults.
const DEFAULTS: PublicSettings = {
  minimumOrderAmount: 15,
  platformCommissionRate: 15,
  orderTimerMinutes: 10,
  autoCompleteHours: 24,
};

/**
 * Single source of truth for platform settings that admins configure from
 * /admin/settings (min order amount, commission %, credential timer,
 * auto-complete window). Every page that displays or validates against one
 * of these values should read from this store instead of hardcoding a
 * number — that hardcoding is exactly why admin changes previously didn't
 * show up anywhere except the Settings page itself.
 *
 * Fetched once per session (`loaded` guards re-fetching on every mount);
 * call fetchSettings(true) to force a refresh if ever needed.
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  fetchSettings: async (force = false) => {
    if (get().loaded && !force) return;
    try {
      const { data } = await api.get('/settings/public');
      if (data.success) {
        set({ ...data.data, loaded: true });
      }
    } catch {
      // Keep defaults on failure — better to show a sensible fallback than
      // block the page or throw a visible error for a non-critical fetch.
      set({ loaded: true });
    }
  },
}));
