import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { textIncludes } from '../utils/textUtils';

/**
 * STORE CONSOLIDADO DE OPERAÇÕES
 *
 * Substitui:
 * - useState local em múltiplos componentes
 * - Hooks customizados fragmentados
 * - Cache manual em useOperationsUnified
 *
 * Benefícios:
 * - Single source of truth
 * - Performance otimizada (seletores)
 * - Debugging com Redux DevTools
 * - Persistência automática
 */

const useOperationsStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // ============================================================
        // ESTADO
        // ============================================================

        // Dados principais
        operations: [],
        metas: [],
        userTasks: [],
        analytics: null,

        // UI State
        ui: {
          selectedTask: null,
          selectedMeta: null,
          isCreatingTask: false,
          isEditingTask: false,
          drawerOpen: false,
          filterDrawerOpen: false,
          currentView: null, // 'operator-mobile' | 'supervisor-desktop' | 'unified'
        },

        // Loading states (granulares)
        loading: {
          operations: false,
          metas: false,
          userTasks: false,
          analytics: false,
          action: false, // Para ações como completar/deletar
        },

        // Erros
        errors: {
          operations: null,
          metas: null,
          userTasks: null,
          analytics: null,
        },

        // Filtros
        filters: {
          searchTerm: '',
          installationType: null, // 'ETAR' | 'EE' | null
          operatorId: null,
          dateRange: { start: null, end: null },
          completed: null, // true | false | null (mostrar todos)
          priority: null, // 'high' | 'normal' | 'low' | null
        },

        // Metadata do sistema
        metadata: {
          lastUpdate: null,
          lastSync: null,
        },

        // ============================================================
        // ACTIONS - Operações
        // ============================================================

        setOperations: (operations) => set((state) => {
          state.operations = operations;
          state.metadata.lastUpdate = new Date().toISOString();
        }),

        // ============================================================
        // ACTIONS - Metas
        // ============================================================

        setMetas: (metas) => set((state) => {
          state.metas = metas;
          state.metadata.lastUpdate = new Date().toISOString();
        }),

        addMeta: (meta) => set((state) => {
          state.metas.push(meta);
        }),

        updateMeta: (id, updates) => set((state) => {
          const index = state.metas.findIndex(m => m.pk === id);
          if (index !== -1) {
            state.metas[index] = { ...state.metas[index], ...updates };
          }
        }),

        deleteMeta: (id) => set((state) => {
          state.metas = state.metas.filter(m => m.pk !== id);
        }),

        // ============================================================
        // ACTIONS - Tarefas do Utilizador
        // ============================================================

        setUserTasks: (tasks) => set((state) => {
          state.userTasks = tasks;
          state.metadata.lastUpdate = new Date().toISOString();
        }),

        completeTask: (taskId) => set((state) => {
          const task = state.userTasks.find(t => t.pk === taskId || t.id === taskId);
          if (task) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
          }
        }),

        // Reverter se falhar
        uncompleteTask: (taskId) => set((state) => {
          const task = state.userTasks.find(t => t.pk === taskId || t.id === taskId);
          if (task) {
            task.completed = false;
            task.completedAt = null;
          }
        }),

        // ============================================================
        // ACTIONS - UI
        // ============================================================

        selectTask: (task) => set((state) => {
          state.ui.selectedTask = task;
        }),

        selectMeta: (meta) => set((state) => {
          state.ui.selectedMeta = meta;
        }),

        setDrawerOpen: (open) => set((state) => {
          state.ui.drawerOpen = open;
        }),

        setFilterDrawerOpen: (open) => set((state) => {
          state.ui.filterDrawerOpen = open;
        }),

        setCurrentView: (view) => set((state) => {
          state.ui.currentView = view;
        }),

        toggleCreatingTask: () => set((state) => {
          state.ui.isCreatingTask = !state.ui.isCreatingTask;
        }),

        setEditingTask: (editing) => set((state) => {
          state.ui.isEditingTask = editing;
        }),

        // ============================================================
        // ACTIONS - Loading States
        // ============================================================

        setLoading: (key, value) => set((state) => {
          state.loading[key] = value;
        }),

        setError: (key, error) => set((state) => {
          state.errors[key] = error;
        }),

        clearError: (key) => set((state) => {
          state.errors[key] = null;
        }),

        // ============================================================
        // ACTIONS - Filtros
        // ============================================================

        setFilter: (filterName, value) => set((state) => {
          state.filters[filterName] = value;
        }),

        setFilters: (filters) => set((state) => {
          state.filters = { ...state.filters, ...filters };
        }),

        clearFilters: () => set((state) => {
          state.filters = {
            searchTerm: '',
            installationType: null,
            operatorId: null,
            dateRange: { start: null, end: null },
            completed: null,
            priority: null,
          };
        }),

        // ============================================================
        // ACTIONS - Reset
        // ============================================================

        reset: () => set({
          operations: [],
          metas: [],
          userTasks: [],
          analytics: null,
          ui: {
            selectedTask: null,
            selectedMeta: null,
            isCreatingTask: false,
            isEditingTask: false,
            drawerOpen: false,
            filterDrawerOpen: false,
            currentView: null,
          },
          loading: {
            operations: false,
            metas: false,
            userTasks: false,
            analytics: false,
            action: false,
          },
          errors: {
            operations: null,
            metas: null,
            userTasks: null,
            analytics: null,
          },
        }),

        // ============================================================
        // SELECTORS COMPUTADOS
        // ============================================================

        // Usar como: const urgentTasks = useOperationsStore(state => state.getUrgentTasks())
        getUrgentTasks: () => {
          const { userTasks } = get();
          return userTasks.filter(t =>
            t.priority === 'high' || t.isOverdue
          );
        },

        getCompletedTasks: () => {
          const { userTasks } = get();
          return userTasks.filter(t => t.completed);
        },

        getPendingTasks: () => {
          const { userTasks } = get();
          return userTasks.filter(t => !t.completed);
        },

        getFilteredMetas: () => {
          const { metas, filters } = get();
          let filtered = [...metas];

          // Pesquisa com suporte a acentos e caracteres especiais
          if (filters.searchTerm) {
            filtered = filtered.filter(m =>
              textIncludes(m.tb_instalacao, filters.searchTerm) ||
              textIncludes(m.tt_operacaoaccao, filters.searchTerm) ||
              textIncludes(m.ts_operador1, filters.searchTerm) ||
              textIncludes(m.ts_operador2, filters.searchTerm)
            );
          }

          if (filters.installationType) {
            filtered = filtered.filter(m =>
              m.instalacao_tipo === filters.installationType
            );
          }

          return filtered;
        },

        // Estatísticas
        getStats: () => {
          const { userTasks } = get();
          return {
            total: userTasks.length,
            completed: userTasks.filter(t => t.completed).length,
            pending: userTasks.filter(t => !t.completed).length,
            urgent: userTasks.filter(t => t.priority === 'high' || t.isOverdue).length,
          };
        },
      })),
      {
        name: 'operations-storage',
        // Apenas persistir filtros e preferências de UI
        partialize: (state) => ({
          filters: state.filters,
          ui: {
            currentView: state.ui.currentView,
          },
        }),
      }
    ),
    { name: 'Operations Store' }
  )
);

// ============================================================
// HOOKS DE SELEÇÃO OTIMIZADOS
// ============================================================

/**
 * Hook para selecionar apenas loading states
 * Evita re-renders quando outros dados mudam
 */
export const useOperationsLoading = () =>
  useOperationsStore(state => state.loading);

/**
 * Hook para selecionar apenas UI state
 */
export const useOperationsUI = () =>
  useOperationsStore(state => state.ui);

/**
 * Hook para selecionar apenas filtros
 */
export const useOperationsFilters = () =>
  useOperationsStore(state => state.filters);

/**
 * Hook para selecionar apenas tarefas do utilizador
 */
export const useUserTasks = () =>
  useOperationsStore(state => state.userTasks);

/**
 * Hook para selecionar apenas metas
 */
export const useMetas = () =>
  useOperationsStore(state => state.metas);

/**
 * Hook para selecionar estatísticas computadas
 */
export const useOperationsStats = () =>
  useOperationsStore(state => state.getStats());

export default useOperationsStore;
