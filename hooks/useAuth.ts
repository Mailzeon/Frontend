'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { initSocket } from '@/lib/socket';
import { ApiResponse } from '@/types';
import { useAuthStore, AuthUser } from '@/store/authStore';

interface LoginPayload    { email: string; password: string; }
interface RegisterPayload { name: string; email: string; password: string; role: 'customer' | 'worker'; }
interface AuthData        { user: AuthUser; token: string; }

export function useAuth() {
  const router      = useRouter();
  const { setAuth, clearAuth, user, isAuthenticated } = useAuthStore();

  const login = async (payload: LoginPayload): Promise<void> => {
    const { data } = await api.post<ApiResponse<AuthData>>('/auth/login', payload);
    if (!data.success || !data.data) throw new Error(data.message);

    const { user, token } = data.data;
    setAuth(user, token);

    // Start Socket.IO after login
    initSocket(user._id, user.role);

    // Redirect to role-specific dashboard
    router.push(`/${user.role}/dashboard`);
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    const { data } = await api.post<ApiResponse<AuthData>>('/auth/register', payload);
    if (!data.success || !data.data) throw new Error(data.message);

    const { user, token } = data.data;
    setAuth(user, token);

    initSocket(user._id, user.role);
    router.push(`/${user.role}/dashboard`);
  };

  const logout = (): void => {
    clearAuth();
    router.push('/login');
  };

  return { user, isAuthenticated, login, register, logout };
}
