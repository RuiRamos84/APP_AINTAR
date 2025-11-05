/**
 * Auth Store - Zustand
 * Gestão de estado de autenticação
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useAuthStore = create(
  persist(
    immer((set, get) => ({
      // Estado
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      permissions: [],
      roles: [],

      // Ações
      /**
       * Login - Guardar utilizador e token
       */
      login: (user, token, refreshToken = null) => set((state) => {
        state.user = user;
        state.token = token;
        state.refreshToken = refreshToken;
        state.isAuthenticated = true;
        state.permissions = user.permissions || [];
        state.roles = user.roles || [];
      }),

      /**
       * Logout - Limpar estado
       */
      logout: () => set((state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.permissions = [];
        state.roles = [];
      }),

      /**
       * Atualizar utilizador
       */
      updateUser: (updates) => set((state) => {
        if (state.user) {
          state.user = { ...state.user, ...updates };
        }
      }),

      /**
       * Atualizar token
       */
      setToken: (token, refreshToken = null) => set((state) => {
        state.token = token;
        if (refreshToken) {
          state.refreshToken = refreshToken;
        }
      }),

      /**
       * Set loading state
       */
      setLoading: (isLoading) => set({ isLoading }),

      // Seletores
      /**
       * Verificar se tem permissão específica
       */
      hasPermission: (permission) => {
        const { permissions } = get();
        return permissions.includes(permission);
      },

      /**
       * Verificar se tem qualquer uma das permissões
       */
      hasAnyPermission: (permissionList) => {
        const { permissions } = get();
        return permissionList.some((permission) => permissions.includes(permission));
      },

      /**
       * Verificar se tem todas as permissões
       */
      hasAllPermissions: (permissionList) => {
        const { permissions } = get();
        return permissionList.every((permission) => permissions.includes(permission));
      },

      /**
       * Verificar se tem role específica
       */
      hasRole: (role) => {
        const { roles } = get();
        return roles.includes(role);
      },

      /**
       * Obter nome do utilizador
       */
      getUserName: () => {
        const { user } = get();
        return user?.name || 'Utilizador';
      },

      /**
       * Obter email do utilizador
       */
      getUserEmail: () => {
        const { user } = get();
        return user?.email || '';
      },
    })),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Apenas persistir dados essenciais
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        roles: state.roles,
      }),
    }
  )
);
