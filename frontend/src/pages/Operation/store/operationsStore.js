// frontend/src/pages/Operation/store/operationsStore.js - ÚNICO STORE
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useOperationsStore = create(
    devtools(
        persist(
            immer((set, get) => ({
                // === DADOS ===
                operations: {},
                loading: false,
                error: null,

                // === UI ===
                ui: {
                    selectedItem: null,
                    detailsDrawer: false,
                    completeDialogOpen: false,
                    paramsDialogOpen: false,
                    searchTerm: '',
                    completionNote: '',
                    completionLoading: false,
                    viewMode: 'cards' // 'cards' ou 'list'
                },

                // === FILTROS ===
                filters: {
                    selectedAssociate: null,
                    selectedView: null
                },

                // === GETTERS ===
                getUI: () => get().ui,
                getFilters: () => get().filters,

                // === ACTIONS ===
                setOperations: (operations) => set((state) => {
                    state.operations = operations;
                }),

                setLoading: (loading) => set((state) => {
                    state.loading = loading;
                }),

                setError: (error) => set((state) => {
                    state.error = error;
                }),

                clearError: () => set((state) => {
                    state.error = null;
                }),

                // UI Actions
                setSelectedItem: (item) => set((state) => {
                    state.ui.selectedItem = item;
                }),

                setDetailsDrawer: (open) => set((state) => {
                    state.ui.detailsDrawer = open;
                }),

                setCompleteDialogOpen: (open) => set((state) => {
                    state.ui.completeDialogOpen = open;
                }),

                setParamsDialogOpen: (open) => set((state) => {
                    state.ui.paramsDialogOpen = open;
                }),

                setSearchTerm: (term) => set((state) => {
                    state.ui.searchTerm = term;
                }),

                setCompletionNote: (note) => set((state) => {
                    state.ui.completionNote = note;
                }),

                setCompletionLoading: (loading) => set((state) => {
                    state.ui.completionLoading = loading;
                }),

                setViewMode: (mode) => set((state) => {
                    state.ui.viewMode = mode;
                }),

                // Filter Actions
                setSelectedAssociate: (associate) => set((state) => {
                    state.filters.selectedAssociate = associate;
                    state.filters.selectedView = null; // Reset view
                }),

                setSelectedView: (view) => set((state) => {
                    state.filters.selectedView = view;
                }),

                // Utils
                closeAllModals: () => set((state) => {
                    state.ui.detailsDrawer = false;
                    state.ui.completeDialogOpen = false;
                    state.ui.paramsDialogOpen = false;
                    state.ui.selectedItem = null;
                })
            })),
            {
                name: 'operations-storage',
                partialize: (state) => ({
                    operations: state.operations,
                    filters: state.filters,
                    ui: {
                        viewMode: state.ui.viewMode
                    }
                })
            }
        )
    )
);

export default useOperationsStore;