'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { initSocket } from '@/lib/socket';
import { ApiResponse } from '@/types';
import { useAuthStore, AuthUser } from '@/store/authStore';

interface LoginPayload    { email: string; password: string; }
interface RegisterPayload { name: string; email: string; password: string; role: 'customer' | 'worker'; }
// NOTE: no `token` field anymore — the real session lives only in an
// httpOnly cookie set by the backend, never in the JSON response body.
interface AuthData        { user: AuthUser; }

export function useAuth() {
  const router      = useRouter();
  const { setAuth, clearAuth, user, isAuthenticated } = useAuthStore();

  const login = async (payload: LoginPayload): Promise<void> => {
    const { data } = await api.post<ApiResponse<AuthData>>('/auth/login', payload);
    if (!data.success || !data.data) throw new Error(data.message);

    const { user } = data.data;
    setAuth(user);

    // Start Socket.IO after login
    initSocket(user._id, user.role);

    // Redirect to role-specific dashboard
    router.push(`/${user.role}/dashboard`);
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    const { data } = await api.post<ApiResponse<AuthData>>('/auth/register', payload);
    if (!data.success || !data.data) throw new Error(data.message);

    const { user } = data.data;
    setAuth(user);

    initSocket(user._id, user.role);
    router.push(`/${user.role}/dashboard`);
  };

  const logout = async (): Promise<void> => {
    // Clears the httpOnly cookie server-side — clearAuth() alone can't touch
    // it since JS never has access to that cookie.
    await api.post('/auth/logout').catch(() => {});
    clearAuth();
    router.push('/login');
  };

  return { user, isAuthenticated, login, register, logout };
}
