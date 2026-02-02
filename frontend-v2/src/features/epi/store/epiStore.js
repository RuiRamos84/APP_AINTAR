/**
 * EPI Store - Zustand
 *
 * Gestão de estado global para EPIs e Fardamento
 * Inclui: colaboradores, entregas, preferências, filtros
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const initialState = {
  // Dados base
  employees: [],
  equipmentTypes: [], // Todos os tipos
  epiTypes: [], // Tipos EPI (what=1)
  uniformTypes: [], // Tipos Fardamento (what=2)
  shoeTypes: [],

  // Colaborador selecionado
  selectedEmployee: null,

  // Entregas
  deliveries: [],
  totalDeliveries: 0,

  // Secção ativa: 'preferences' | 'epis' | 'uniforms' | 'summary'
  activeSection: null,

  // Paginação
  page: 0,
  rowsPerPage: 10,

  // Filtros de entregas
  filters: {
    search: '',
    dateFrom: null,
    dateTo: null,
    type: 'all', // 'all' | 'epi' | 'uniform'
    returned: false, // Mostrar apenas não devolvidos
  },

  // Ordenação
  orderBy: 'data',
  order: 'desc',

  // Ano selecionado (para resumo)
  selectedYear: new Date().getFullYear(),

  // UI State
  loading: false,
  loadingDeliveries: false,
  error: null,

  // Cache
  lastFetch: null,
  cacheTimeout: 30 * 60 * 1000, // 30 minutos
};

export const useEpiStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ==================== DADOS BASE ====================

        /**
         * Carregar dados base (colaboradores e tipos)
         */
        setEpiData: (data) =>
          set((state) => {
            // Verificar se data é válido
            if (!data) {
              console.warn('[EpiStore] setEpiData: data is undefined');
              state.loading = false;
              return;
            }

            state.employees = data.epi_list || [];
            state.equipmentTypes = data.epi_what_types || [];
            state.shoeTypes = data.epi_shoe_types || [];

            // Separar tipos por categoria
            const whatTypes = data.epi_what_types || [];
            state.epiTypes = whatTypes.filter((t) => t.what === 1);
            state.uniformTypes = whatTypes.filter((t) => t.what === 2);

            state.lastFetch = Date.now();
            state.loading = false;
            state.error = null;
          }),

        /**
         * Atualizar lista de colaboradores
         */
        setEmployees: (employees) =>
          set((state) => {
            state.employees = employees;
          }),

        /**
         * Adicionar colaborador
         */
        addEmployee: (employee) =>
          set((state) => {
            state.employees.push(employee);
          }),

        /**
         * Atualizar preferências de um colaborador
         */
        updateEmployeePreferences: (employeeId, preferences) =>
          set((state) => {
            const index = state.employees.findIndex((e) => e.pk === employeeId);
            if (index !== -1) {
              state.employees[index] = { ...state.employees[index], ...preferences };
            }
            if (state.selectedEmployee?.pk === employeeId) {
              state.selectedEmployee = { ...state.selectedEmployee, ...preferences };
            }
          }),

        // ==================== COLABORADOR SELECIONADO ====================

        setSelectedEmployee: (employee) =>
          set((state) => {
            state.selectedEmployee = employee;
            state.page = 0; // Reset página ao mudar colaborador
          }),

        clearSelectedEmployee: () =>
          set((state) => {
            state.selectedEmployee = null;
            state.deliveries = [];
            state.totalDeliveries = 0;
          }),

        // ==================== SECÇÃO ATIVA ====================

        setActiveSection: (section) =>
          set((state) => {
            state.activeSection = section;
            state.page = 0;
          }),

        // ==================== ENTREGAS ====================

        setDeliveries: (deliveries, total = null) =>
          set((state) => {
            state.deliveries = deliveries;
            if (total !== null) {
              state.totalDeliveries = total;
            }
            state.loadingDeliveries = false;
          }),

        addDelivery: (delivery) =>
          set((state) => {
            state.deliveries.unshift(delivery);
            state.totalDeliveries += 1;
          }),

        updateDelivery: (pk, updates) =>
          set((state) => {
            const index = state.deliveries.findIndex((d) => d.pk === pk);
            if (index !== -1) {
              state.deliveries[index] = { ...state.deliveries[index], ...updates };
            }
          }),

        removeDelivery: (pk) =>
          set((state) => {
            state.deliveries = state.deliveries.filter((d) => d.pk !== pk);
            state.totalDeliveries -= 1;
          }),

        /**
         * Marcar entrega como devolvida
         */
        markDeliveryReturned: (pk, returnDate, memo) =>
          set((state) => {
            const index = state.deliveries.findIndex((d) => d.pk === pk);
            if (index !== -1) {
              state.deliveries[index].returned = returnDate;
              state.deliveries[index].memo = memo;
            }
          }),

        // ==================== PAGINAÇÃO ====================

        setPage: (page) =>
          set((state) => {
            state.page = page;
          }),

        setRowsPerPage: (rowsPerPage) =>
          set((state) => {
            state.rowsPerPage = rowsPerPage;
            state.page = 0;
          }),

        // ==================== ORDENAÇÃO ====================

        setSort: (orderBy, order) =>
          set((state) => {
            state.orderBy = orderBy;
            state.order = order;
            state.page = 0;
          }),

        // ==================== FILTROS ====================

        setFilters: (filters) =>
          set((state) => {
            state.filters = { ...state.filters, ...filters };
            state.page = 0;
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

        // ==================== ANO (RESUMO) ====================

        setSelectedYear: (year) =>
          set((state) => {
            state.selectedYear = year;
          }),

        // ==================== LOADING & ERROR ====================

        setLoading: (loading) =>
          set((state) => {
            state.loading = loading;
          }),

        setLoadingDeliveries: (loading) =>
          set((state) => {
            state.loadingDeliveries = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
            state.loading = false;
            state.loadingDeliveries = false;
          }),

        clearError: () =>
          set((state) => {
            state.error = null;
          }),

        // ==================== CACHE ====================

        isCacheValid: () => {
          const state = get();
          if (!state.lastFetch) return false;
          return Date.now() - state.lastFetch < state.cacheTimeout;
        },

        invalidateCache: () =>
          set((state) => {
            state.lastFetch = null;
          }),

        // ==================== RESET ====================

        resetStore: () =>
          set(() => ({
            ...initialState,
          })),

        // ==================== COMPUTED / SELECTORS ====================

        /**
         * Obter entregas filtradas
         */
        getFilteredDeliveries: () => {
          const state = get();
          let filtered = [...state.deliveries];

          // Filtrar por texto
          if (state.filters.search) {
            const search = state.filters.search.toLowerCase();
            filtered = filtered.filter(
              (d) =>
                d.tt_epiwhat?.toLowerCase().includes(search) ||
                d.dim?.toLowerCase().includes(search) ||
                d.memo?.toLowerCase().includes(search)
            );
          }

          // Filtrar por data
          if (state.filters.dateFrom) {
            filtered = filtered.filter((d) => new Date(d.data) >= new Date(state.filters.dateFrom));
          }
          if (state.filters.dateTo) {
            filtered = filtered.filter((d) => new Date(d.data) <= new Date(state.filters.dateTo));
          }

          // Filtrar por devolvidos
          if (!state.filters.returned) {
            filtered = filtered.filter((d) => !d.returned);
          }

          return filtered;
        },

        /**
         * Obter colaborador por ID
         */
        getEmployeeById: (id) => {
          const state = get();
          return state.employees.find((e) => e.pk === id);
        },

        /**
         * Obter tipo de equipamento por ID
         */
        getEquipmentTypeById: (id) => {
          const state = get();
          return state.equipmentTypes.find((t) => t.pk === id);
        },

        /**
         * Estatísticas de entregas do colaborador selecionado
         */
        getDeliveryStats: () => {
          const state = get();
          const deliveries = state.deliveries.filter((d) => !d.returned);

          return {
            total: deliveries.length,
            epis: deliveries.filter((d) => d.what === 1).length,
            uniforms: deliveries.filter((d) => d.what === 2).length,
            thisMonth: deliveries.filter((d) => {
              const date = new Date(d.data);
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length,
          };
        },
      })),
      {
        name: 'epi-store',
        partialize: (state) => ({
          // Persistir apenas preferências de UI
          rowsPerPage: state.rowsPerPage,
          orderBy: state.orderBy,
          order: state.order,
          selectedYear: state.selectedYear,
        }),
      }
    ),
    {
      name: 'EpiStore',
    }
  )
);

export default useEpiStore;
