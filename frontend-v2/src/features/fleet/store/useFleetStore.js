import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// O estado de dados (vehicles, assignments, maintenances) é gerido pelo React Query nos hooks.
// Este store gere apenas estado de UI: filtros de pesquisa.

const initialFilters = {
  search: '',
};

export const useFleetStore = create(
  devtools(
    (set) => ({
      filters: initialFilters,

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      resetFilters: () => set({ filters: initialFilters }),
    }),
    { name: 'FleetStore' }
  )
);
