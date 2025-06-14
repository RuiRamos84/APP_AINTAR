import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useFiltersStore = create(
    devtools(
        persist(
            (set, get) => ({
                // Estado dos filtros
                filters: {
                    associate: 'all',
                    view: null,
                    showOnlyMyTasks: false,
                    searchTerm: '',
                    dateRange: {
                        start: null,
                        end: null
                    }
                },

                // Acções
                setAssociateFilter: (associate) => set((state) => ({
                    filters: { ...state.filters, associate }
                })),

                setViewFilter: (view) => set((state) => ({
                    filters: { ...state.filters, view }
                })),

                setShowOnlyMyTasks: (show) => set((state) => ({
                    filters: { ...state.filters, showOnlyMyTasks: show }
                })),

                setSearchTerm: (term) => set((state) => ({
                    filters: { ...state.filters, searchTerm: term }
                })),

                setDateRange: (start, end) => set((state) => ({
                    filters: {
                        ...state.filters,
                        dateRange: { start, end }
                    }
                })),

                resetFilters: () => set({
                    filters: {
                        associate: 'all',
                        view: null,
                        showOnlyMyTasks: false,
                        searchTerm: '',
                        dateRange: {
                            start: null,
                            end: null
                        }
                    }
                }),

                // Selectores
                getActiveFiltersCount: () => {
                    const { filters } = get();
                    let count = 0;

                    if (filters.associate !== 'all') count++;
                    if (filters.showOnlyMyTasks) count++;
                    if (filters.searchTerm) count++;
                    if (filters.dateRange.start || filters.dateRange.end) count++;

                    return count;
                }
            }),
            {
                name: 'filters-storage',
                partialize: (state) => ({ filters: state.filters })
            }
        )
    )
);

export default useFiltersStore;