import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { disconnectSocket } from '@/lib/socket';

export interface AuthUser {
  _id:         string;
  name:        string;
  email:       string;
  role:        'customer' | 'worker' | 'admin';
  isApproved:  boolean;
  isOnline?:   boolean;
  level?:      'bronze' | 'silver' | 'gold';
  profileImage?: string;
  // NEW: required by Cashfree at order-creation time. Once saved, the
  // customer never has to re-enter it — order.service.ts on the backend
  // reuses whatever's on file.
  phone?:      string;
  // Dispute-strike penalty system — see backend user.service.ts applyStrike().
  strikeCount?:  number;
  lockedUntil?:  string; // ISO date string once serialized over JSON
}

interface AuthState {
  user:            AuthUser | null;
  isAuthenticated: boolean;
  _hasHydrated:    boolean;

  setAuth:     (user: AuthUser) => void;
  clearAuth:   () => void;
  updateUser:  (updates: Partial<AuthUser>) => void;
  setHydrated: () => void;
}

// NOTE (httpOnly cookie migration): there is no `token` field here anymore.
// The real session token now lives ONLY in an httpOnly cookie set by the
// backend on login/register (see utils/cookies.ts on the backend) — it is
// never readable by JavaScript, so it can't be stored here even if we
// wanted to. `mp_role` below is a separate, non-sensitive cookie used only
// by middleware.ts to decide route access (Next.js Edge middleware can't
// read localStorage, so it needs *some* cookie to check) — it carries no
// secret, just which dashboard to route to.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      isAuthenticated: false,
      _hasHydrated:    false,

      setHydrated: () => set({ _hasHydrated: true }),

      setAuth: (user) => {
        if (typeof window !== 'undefined') {
          const maxAge = 7 * 24 * 60 * 60;
          document.cookie = `mp_role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }
        set({ user, isAuthenticated: true });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          document.cookie = 'mp_role=; path=/; max-age=0';
        }
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
