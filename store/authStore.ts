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
}

interface AuthState {
  user:            AuthUser | null;
  token:           string | null;
  isAuthenticated: boolean;
  _hasHydrated:    boolean;

  setAuth:     (user: AuthUser, token: string) => void;
  clearAuth:   () => void;
  updateUser:  (updates: Partial<AuthUser>) => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,
      _hasHydrated:    false,

      setHydrated: () => set({ _hasHydrated: true }),

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('mp_token', token);
          const maxAge = 7 * 24 * 60 * 60;
          document.cookie = `mp_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
          document.cookie = `mp_role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }
        set({ user, token, isAuthenticated: true });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mp_token');
          document.cookie = 'mp_token=; path=/; max-age=0';
          document.cookie = 'mp_role=; path=/; max-age=0';
        }
        disconnectSocket();
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name:    'mp_auth-storage',
      storage: createJSONStorage(() =>
        // Safe fallback for SSR — Zustand hydrates on client only
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
        token:           state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
