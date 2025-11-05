/**
 * UI Store - Zustand
 * Gestão de estado da interface do utilizador
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useUIStore = create(
  persist(
    immer((set, get) => ({
      // Estado do Tema
      theme: 'light', // 'light' | 'dark'

      /**
       * Toggle tema claro/escuro
       */
      toggleTheme: () => set((state) => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
      }),

      /**
       * Set tema específico
       */
      setTheme: (theme) => set({ theme }),

      // Estado da Sidebar
      sidebarOpen: true,
      sidebarCollapsed: false,

      /**
       * Toggle sidebar aberta/fechada
       */
      toggleSidebar: () => set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }),

      /**
       * Set sidebar state
       */
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      /**
       * Toggle sidebar collapsed/expanded
       */
      toggleSidebarCollapsed: () => set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
      }),

      /**
       * Set sidebar collapsed
       */
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Notificações (não persistidas)
      notifications: [],

      /**
       * Adicionar notificação
       */
      addNotification: (notification) => set((state) => {
        const id = notification.id || Date.now().toString();
        state.notifications.push({
          id,
          type: 'info', // 'success' | 'error' | 'warning' | 'info'
          duration: 5000,
          ...notification,
        });
      }),

      /**
       * Remover notificação
       */
      removeNotification: (id) => set((state) => {
        state.notifications = state.notifications.filter((n) => n.id !== id);
      }),

      /**
       * Limpar todas as notificações
       */
      clearNotifications: () => set({ notifications: [] }),

      // Modal Global (não persistido)
      modal: null,

      /**
       * Abrir modal
       */
      openModal: (modal) => set({ modal }),

      /**
       * Fechar modal
       */
      closeModal: () => set({ modal: null }),

      // Loading Global
      isLoading: false,
      loadingMessage: '',

      /**
       * Set loading state
       */
      setLoading: (isLoading, message = '') => set({
        isLoading,
        loadingMessage: message,
      }),

      // Preferências de utilizador
      preferences: {
        compactMode: false,
        showAvatars: true,
        pageSize: 25,
        language: 'pt-PT',
      },

      /**
       * Atualizar preferências
       */
      updatePreferences: (updates) => set((state) => {
        state.preferences = { ...state.preferences, ...updates };
      }),

      // Breadcrumbs (não persistido)
      breadcrumbs: [],

      /**
       * Set breadcrumbs
       */
      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

      /**
       * Add breadcrumb
       */
      addBreadcrumb: (breadcrumb) => set((state) => {
        state.breadcrumbs.push(breadcrumb);
      }),

      /**
       * Clear breadcrumbs
       */
      clearBreadcrumbs: () => set({ breadcrumbs: [] }),
    })),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Apenas persistir preferências
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
        preferences: state.preferences,
      }),
    }
  )
);
