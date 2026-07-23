import { create } from 'zustand';
import type { AuthUser } from '@/services/auth/authService';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permission: string) => boolean;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: true }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
  setLoading: (isLoading) => set({ isLoading }),
  hasPermission: (permission) => {
    const user = get().user;
    if (!user) return false;
    // Super admin (profil 0) tem acesso a tudo — mesma regra do permissionService.js (frontend-v2)
    if (String(user.profile_pk) === '0') return true;
    return user.permissions?.includes(permission) ?? false;
  },
}));

export default useAuthStore;
