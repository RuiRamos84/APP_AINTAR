/**
 * Task Store - Zustand
 *
 * Gestão de estado global para tarefas
 * Inclui: CRUD, filtros, ordenação, paginação, cache
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const initialState = {
  // Dados
  tasks: [],
  currentTask: null,

  // Paginação
  page: 0,
  rowsPerPage: 10,
  totalCount: 0,

  // Ordenação
  orderBy: 'when_start',
  order: 'desc',

  // Filtros
  filters: {
    status: 'all', // 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'
    priority: 'all', // 'all' | 'baixa' | 'media' | 'alta' | 'urgente'
    assignedTo: 'all', // 'all' | 'me' | userId
    search: '',
  },

  // UI State
  loading: false,
  error: null,
  selectedTasks: [],
  viewMode: 'list', // 'list' | 'kanban' | 'calendar'

  // Cache
  lastFetch: null,
  cacheTimeout: 5 * 60 * 1000, // 5 minutos
};

export const useTaskStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ==================== ACTIONS ====================

        /**
         * Carregar tarefas (com paginação e filtros)
         */
        setTasks: (tasks, totalCount = null) =>
          set((state) => {
            state.tasks = tasks;
            if (totalCount !== null) {
              state.totalCount = totalCount;
            }
            state.lastFetch = Date.now();
            state.loading = false;
            state.error = null;
          }),

        /**
         * Adicionar tarefa
         */
        addTask: (task) =>
          set((state) => {
            state.tasks.unshift(task);
            state.totalCount += 1;
          }),

        /**
         * Atualizar tarefa
         */
        updateTask: (taskId, updates) =>
          set((state) => {
            const index = state.tasks.findIndex((t) => t.id === taskId);
            if (index !== -1) {
              state.tasks[index] = { ...state.tasks[index], ...updates };
            }
            if (state.currentTask?.id === taskId) {
              state.currentTask = { ...state.currentTask, ...updates };
            }
          }),

        /**
         * Remover tarefa
         */
        removeTask: (taskId) =>
          set((state) => {
            state.tasks = state.tasks.filter((t) => t.id !== taskId);
            state.totalCount -= 1;
            if (state.currentTask?.id === taskId) {
              state.currentTask = null;
            }
          }),

        /**
         * Definir tarefa atual (para edição/visualização)
         */
        setCurrentTask: (task) =>
          set((state) => {
            state.currentTask = task;
          }),

        /**
         * Limpar tarefa atual
         */
        clearCurrentTask: () =>
          set((state) => {
            state.currentTask = null;
          }),

        // ==================== PAGINAÇÃO ====================

        setPage: (page) =>
          set((state) => {
            state.page = page;
          }),

        setRowsPerPage: (rowsPerPage) =>
          set((state) => {
            state.rowsPerPage = rowsPerPage;
            state.page = 0; // Reset page on rows per page change
          }),

        // ==================== ORDENAÇÃO ====================

        setSort: (orderBy, order) =>
          set((state) => {
            state.orderBy = orderBy;
            state.order = order;
            state.page = 0; // Reset page on sort change
          }),

        // ==================== FILTROS ====================

        setFilters: (filters) =>
          set((state) => {
            state.filters = { ...state.filters, ...filters };
            state.page = 0; // Reset page on filter change
          }),

        setFilter: (key, value) =>
          set((state) => {
            state.filters[key] = value;
            state.page = 0;
          }),

        resetFilters: () =>
          set((state) => {
            state.filters = initialState.filters;
            state.page = 0;
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

        selectAllTasks: () =>
          set((state) => {
            state.selectedTasks = state.tasks.map((t) => t.id);
          }),

        clearSelection: () =>
          set((state) => {
            state.selectedTasks = [];
          }),

        // ==================== VIEW MODE ====================

        setViewMode: (mode) =>
          set((state) => {
            state.viewMode = mode;
          }),

        // ==================== LOADING & ERROR ====================

        setLoading: (loading) =>
          set((state) => {
            state.loading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
            state.loading = false;
          }),

        clearError: () =>
          set((state) => {
            state.error = null;
          }),

        // ==================== CACHE ====================

        // Cache desativado - sempre buscar dados frescos da API
        isCacheValid: () => false,

        invalidateCache: () =>
          set((state) => {
            state.lastFetch = null;
          }),

        // ==================== RESET ====================

        resetTaskStore: () =>
          set(() => ({
            ...initialState,
          })),

        // ==================== COMPUTED / SELECTORS ====================

        /**
         * Obter tarefas filtradas (client-side filtering se necessário)
         */
        getFilteredTasks: () => {
          const state = get();
          let filtered = [...state.tasks];

          // Search
          if (state.filters.search) {
            const search = state.filters.search.toLowerCase();
            filtered = filtered.filter(
              (task) =>
                task.title?.toLowerCase().includes(search) ||
                task.description?.toLowerCase().includes(search)
            );
          }

          // Status
          if (state.filters.status !== 'all') {
            filtered = filtered.filter((task) => task.status === state.filters.status);
          }

          // Priority
          if (state.filters.priority !== 'all') {
            filtered = filtered.filter((task) => task.priority === state.filters.priority);
          }

          return filtered;
        },

        /**
         * Estatísticas das tarefas
         */
        getTaskStats: () => {
          const state = get();
          const tasks = state.tasks;

          return {
            total: tasks.length,
            pending: tasks.filter((t) => t.status === 'pending').length,
            in_progress: tasks.filter((t) => t.status === 'in_progress').length,
            completed: tasks.filter((t) => t.status === 'completed').length,
            cancelled: tasks.filter((t) => t.status === 'cancelled').length,
            high_priority: tasks.filter((t) => t.priority === 'alta' || t.priority === 'urgente')
              .length,
          };
        },

        /**
         * Tarefas agrupadas por status (para Kanban)
         */
        getTasksByStatus: () => {
          const state = get();
          const tasks = state.getFilteredTasks();

          return {
            pending: tasks.filter((t) => t.status === 'pending'),
            in_progress: tasks.filter((t) => t.status === 'in_progress'),
            completed: tasks.filter((t) => t.status === 'completed'),
            cancelled: tasks.filter((t) => t.status === 'cancelled'),
          };
        },
      })),
      {
        name: 'task-store',
        partialize: (state) => ({
          // Persist apenas filtros e preferências de UI
          filters: state.filters,
          viewMode: state.viewMode,
          rowsPerPage: state.rowsPerPage,
          orderBy: state.orderBy,
          order: state.order,
        }),
      }
    ),
    {
      name: 'TaskStore',
    }
  )
);

export default useTaskStore;
