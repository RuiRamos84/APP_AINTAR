import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const initialFilters = { search: '' };

export const useObrasStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // ─── Data ────────────────────────────────────────────────────────────
        obras: [],

        // ─── UI ──────────────────────────────────────────────────────────────
        loading: false,
        error: null,
        filters: { ...initialFilters },

        // ─── Actions: data ───────────────────────────────────────────────────
        setObras: (obras) =>
          set((state) => {
            state.obras = obras;
            state.loading = false;
            state.error = null;
          }),

        addObra: (obra) =>
          set((state) => {
            state.obras.unshift(obra);
          }),

        updateObraInList: (updated) =>
          set((state) => {
            const idx = state.obras.findIndex((o) => o.id === updated.id);
            if (idx !== -1) state.obras[idx] = updated;
          }),

        removeObra: (id) =>
          set((state) => {
            state.obras = state.obras.filter((o) => o.id !== id);
          }),

        // ─── Actions: UI ─────────────────────────────────────────────────────
        setLoading: (loading) =>
          set((state) => { state.loading = loading; }),

        setError: (error) =>
          set((state) => {
            state.error = error;
            state.loading = false;
          }),

        // ─── Filters ─────────────────────────────────────────────────────────
        setFilter: (key, value) =>
          set((state) => { state.filters[key] = value; }),

        resetFilters: () =>
          set((state) => { state.filters = { ...initialFilters }; }),

        // ─── Selectors ───────────────────────────────────────────────────────
        getFilteredObras: () => {
          const { obras, filters } = get();
          if (!filters.search) return obras;
          const q = filters.search.toLowerCase();
          return obras.filter(
            (o) =>
              o.nome?.toLowerCase().includes(q) ||
              o.tipoObraLabel?.toLowerCase().includes(q) ||
              o.instalacaoNome?.toLowerCase().includes(q) ||
              o.associadoNome?.toLowerCase().includes(q)
          );
        },
      })),
      {
        name: 'obras-store',
        partialize: (state) => ({ filters: state.filters }),
      }
    ),
    { name: 'ObrasStore' }
  )
);
