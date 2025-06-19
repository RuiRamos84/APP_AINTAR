// frontend/src/pages/Operation/store/operationsStore.js - ÚNICO
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
                    showOnlyMyTasks: false,
                    searchTerm: '',
                    completionNote: '',
                    completionLoading: false
                },

                // === FILTROS ===
                filters: {
                    selectedAssociate: null,
                    selectedView: null
                },

                // === ACÇÕES DADOS ===
                setOperations: (operations) => set((state) => {
                    state.operations = operations;
                }),
                setLoading: (loading) => set((state) => {
                    state.loading = loading;
                }),
                setError: (error) => set((state) => {
                    state.error = error;
                }),

                // === ACÇÕES UI ===
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
                setShowOnlyMyTasks: (show) => set((state) => {
                    state.ui.showOnlyMyTasks = show;
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

                // === ACÇÕES FILTROS ===
                setSelectedAssociate: (associate) => set((state) => {
                    state.filters.selectedAssociate = associate;
                    state.filters.selectedView = null; // Reset
                }),
                setSelectedView: (view) => set((state) => {
                    state.filters.selectedView = view;
                }),

                // === RESET ===
                closeAllModals: () => set((state) => {
                    state.ui.detailsDrawer = false;
                    state.ui.completeDialogOpen = false;
                    state.ui.paramsDialogOpen = false;
                    state.ui.selectedItem = null;
                }),

                // === SELECTORES ===
                getFilteredOperations: (currentUserId) => {
                    const state = get();
                    const { selectedView } = state.filters;
                    const { showOnlyMyTasks, searchTerm } = state.ui;

                    if (!selectedView || !state.operations[selectedView]?.data) return [];

                    let data = state.operations[selectedView].data;

                    // Filtrar por user
                    if (showOnlyMyTasks && currentUserId) {
                        data = data.filter(item => Number(item.who) === Number(currentUserId));
                    }

                    // Filtrar por pesquisa
                    if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        data = data.filter(item =>
                            item.regnumber?.toLowerCase().includes(term) ||
                            item.ts_entity?.toLowerCase().includes(term) ||
                            item.phone?.includes(searchTerm) ||
                            item.address?.toLowerCase().includes(term)
                        );
                    }

                    // Urgentes primeiro
                    return data.sort((a, b) => {
                        if (a.urgency === "1" && b.urgency !== "1") return -1;
                        if (b.urgency === "1" && a.urgency !== "1") return 1;
                        return 0;
                    });
                }
            })),
            {
                name: 'operations-storage',
                partialize: (state) => ({
                    operations: state.operations,
                    filters: state.filters,
                    ui: {
                        showOnlyMyTasks: state.ui.showOnlyMyTasks
                    }
                })
            }
        )
    )
);

export default useOperationsStore;