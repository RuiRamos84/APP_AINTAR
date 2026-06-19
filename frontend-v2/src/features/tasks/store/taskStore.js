/**
 * Task Store - Zustand
 *
 * Estado de UI client-side para tarefas: filtros e seleção.
 * Dados do servidor (tasks, loading, error) vivem em React Query — ver taskQueries.js.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const initialState = {
  filters: {
    status: 'all', // 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'
    priority: 'all', // 'all' | 'baixa' | 'media' | 'alta' | 'urgente'
    assignedTo: 'all', // 'all' | 'me' | userId
    search: '',
    client: 'all', // 'all' | clientId - Filtrar por cliente (só admin)
  },
  selectedTasks: [],
};

export const useTaskStore = create(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        // ==================== FILTROS ====================

        setFilters: (filters) =>
          set((state) => {
            state.filters = { ...state.filters, ...filters };
          }),

        // ==================== SELEÇÃO ====================

        setSelectedTasks: (taskIds) =>
          set((state) => {
            state.selectedTasks = taskIds;
          }),

        selectTask: (taskId) =>
          set((state) => {
            if (!state.selectedTasks.includes(taskId)) {
              state.selectedTasks.push(taskId);
            }
          }),

        deselectTask: (taskId) =>
          set((state) => {
            state.selectedTasks = state.selectedTasks.filter((id) => id !== taskId);
          }),

        // Selecionar apenas as tarefas visíveis na vista atual (tab + filtros)
        selectAllVisible: (visibleTaskIds) =>
          set((state) => {
            const existing = new Set(state.selectedTasks);
            visibleTaskIds.forEach((id) => existing.add(id));
            state.selectedTasks = Array.from(existing);
          }),

        clearSelection: () =>
          set((state) => {
            state.selectedTasks = [];
          }),
      })),
      {
        name: 'task-store',
        partialize: (state) => ({
          filters: state.filters,
        }),
      }
    ),
    {
      name: 'TaskStore',
    }
  )
);

export default useTaskStore;
