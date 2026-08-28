import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { disconnectSocket } from '@/lib/socket';
import { setAuthToken, clearAuthToken } from '@/lib/authToken';

export interface AuthUser {
  _id:         string;
  name:        string;
  email:       string;
  emailVerificationStatus?: 'valid' | 'invalid' | 'unknown';
  role:        'customer' | 'worker' | 'admin';
  isApproved:  boolean;
  isOnline?:   boolean;
  level?:      'bronze' | 'silver' | 'gold';
  profileImage?: string;
  // NEW: required by Cashfree at order-creation time. Once saved, the
  // customer never has to re-enter it — order.service.ts on the backend
  // reuses whatever's on file.
  phone?:      string;
  phoneVerified?: boolean;
  // Dispute-strike penalty system — see backend user.service.ts applyStrike().
  strikeCount?:  number;
  lockedUntil?:  string; // ISO date string once serialized over JSON
  // NEW — distinguishes "never approved yet" (still held, e.g. auto-
  // approval pending on an inherited lock) from "was approved, then
  // suspended/banned" — both show isApproved:false, only this tells them
  // apart. See backend User.model.ts wasEverApproved comment.
  wasEverApproved?: boolean;
  // Set only for accounts that have a linked Telegram identity — used to
  // gate the "autofill from Telegram" phone button (see ProfilePage.tsx /
  // lib/telegram.ts requestTelegramPhoneNumber()) to accounts that
  // actually have a Telegram identity to pull it from.
  telegramId?: string;
}

interface AuthState {
  user:            AuthUser | null;
  isAuthenticated: boolean;
  _hasHydrated:    boolean;

  setAuth:     (user: AuthUser, token?: string) => void;
  clearAuth:   () => void;
  updateUser:  (updates: Partial<AuthUser>) => void;
  setHydrated: () => void;
}

// NOTE (httpOnly cookie migration): there is no `token` field STORED here —
// the real session token still lives primarily in an httpOnly cookie set
// by the backend (see utils/cookies.ts on the backend), never readable by
// JavaScript. setAuth() below optionally also stashes a FALLBACK copy via
// lib/authToken.ts (sessionStorage, not this Zustand/localStorage store —
// see that file for exactly why, and the tradeoff involved) for browsers
// that block the cookie outright as third-party (Safari/Firefox/Brave).
// `mp_role` below is a separate, non-sensitive cookie used only by
// middleware.ts to decide route access (Next.js Edge middleware can't read
// localStorage, so it needs *some* cookie to check) — it carries no
// secret, just which dashboard to route to.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      isAuthenticated: false,
      _hasHydrated:    false,

      setHydrated: () => set({ _hasHydrated: true }),

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          const maxAge = 7 * 24 * 60 * 60;
          document.cookie = `mp_role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }
        if (token) setAuthToken(token);
        set({ user, isAuthenticated: true });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          document.cookie = 'mp_role=; path=/; max-age=0';
        }
        clearAuthToken();
        disconnectSocket();
        set({ user: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name:    'mp_auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : {
              getItem:    () => null,
              setItem:    () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
