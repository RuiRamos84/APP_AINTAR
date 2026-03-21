import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const initialFilters = {
  search: '',
  tipoId: null,
};

export const useEquipamentoStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // ─── Data ───────────────────────────────────────────────────────────
        equipamentos: [],
        selectedEquipamento: null,
        meta: null, // { tipos, alocTipos, localizacoes, specs, instalacoes, alocInstalacaoPk }

        // ─── UI ─────────────────────────────────────────────────────────────
        loading: false,
        error: null,
        detailOpen: false,

        // ─── Filters ────────────────────────────────────────────────────────
        filters: { ...initialFilters },

        // ─── Actions: data ───────────────────────────────────────────────────
        setEquipamentos: (equipamentos) =>
          set((state) => {
            state.equipamentos = equipamentos;
            state.loading = false;
            state.error = null;
          }),

        setMeta: (meta) =>
          set((state) => {
            state.meta = meta;
          }),

        setSelectedEquipamento: (eq) =>
          set((state) => {
            state.selectedEquipamento = eq;
            state.detailOpen = !!eq;
          }),

        closeDetail: () =>
          set((state) => {
            state.detailOpen = false;
            state.selectedEquipamento = null;
          }),

        addEquipamento: (eq) =>
          set((state) => {
            state.equipamentos.unshift(eq);
          }),

        updateEquipamentoInList: (updated) =>
          set((state) => {
            const idx = state.equipamentos.findIndex((e) => e.id === updated.id);
            if (idx !== -1) state.equipamentos[idx] = updated;
            if (state.selectedEquipamento?.id === updated.id) {
              state.selectedEquipamento = updated;
            }
          }),

        removeEquipamento: (id) =>
          set((state) => {
            state.equipamentos = state.equipamentos.filter((e) => e.id !== id);
            if (state.selectedEquipamento?.id === id) {
              state.selectedEquipamento = null;
              state.detailOpen = false;
            }
          }),

        // ─── Actions: UI ─────────────────────────────────────────────────────
        setLoading: (loading) =>
          set((state) => {
            state.loading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
            state.loading = false;
          }),

        // ─── Actions: filters ────────────────────────────────────────────────
        setFilter: (key, value) =>
          set((state) => {
            state.filters[key] = value;
          }),

        resetFilters: () =>
          set((state) => {
            state.filters = { ...initialFilters };
          }),

        // ─── Selectors ───────────────────────────────────────────────────────
        getFilteredEquipamentos: () => {
          const { equipamentos, filters } = get();
          let result = [...equipamentos];

          if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(
              (e) =>
                e.marca?.toLowerCase().includes(q) ||
                e.modelo?.toLowerCase().includes(q) ||
                e.serial?.toLowerCase().includes(q) ||
                e.tipo?.toLowerCase().includes(q)
            );
          }

          if (filters.tipoId) {
            result = result.filter((e) => e.tipoId === filters.tipoId);
          }

          return result;
        },
      })),
      {
        name: 'equipamento-store',
        partialize: (state) => ({ filters: state.filters }),
      }
    ),
    { name: 'EquipamentoStore' }
  )
);
