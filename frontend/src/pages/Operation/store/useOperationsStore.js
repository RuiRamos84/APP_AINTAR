// frontend/src/pages/Operation/store/operationsStore.js - CORRIGIDO
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
                lastSync: null,

                // === UI STATE ===
                ui: {
                    selectedItem: null,
                    detailsDrawer: false,
                    actionDrawer: false,
                    completeDialogOpen: false,
                    paramsDialogOpen: false,
                    viewMode: 'grid',
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

                // === GETTERS COM DEFAULTS ===
                getFilters: () => get().filters || { selectedAssociate: null, selectedView: null },
                getUI: () => get().ui || {
                    selectedItem: null,
                    detailsDrawer: false,
                    actionDrawer: false,
                    completeDialogOpen: false,
                    paramsDialogOpen: false,
                    viewMode: 'grid',
                    showOnlyMyTasks: false,
                    searchTerm: '',
                    completionNote: '',
                    completionLoading: false
                },

                // === ACÇÕES ===
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

                // === UI ACTIONS ===
                setSelectedItem: (item) => set((state) => {
                    state.ui.selectedItem = item;
                }),

                setDetailsDrawer: (open) => set((state) => {
                    state.ui.detailsDrawer = open;
                }),

                setActionDrawer: (open) => set((state) => {
                    state.ui.actionDrawer = open;
                }),

                setCompleteDialogOpen: (open) => set((state) => {
                    state.ui.completeDialogOpen = open;
                }),

                setParamsDialogOpen: (open) => set((state) => {
                    state.ui.paramsDialogOpen = open;
                }),

                setViewMode: (mode) => set((state) => {
                    state.ui.viewMode = mode;
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

                // === FILTROS ACTIONS ===
                setSelectedAssociate: (associate) => set((state) => {
                    state.filters.selectedAssociate = associate;
                    state.filters.selectedView = null;
                }),

                setSelectedView: (view) => set((state) => {
                    state.filters.selectedView = view;
                }),

                // === OPERAÇÕES ===
                updateOperation: (viewKey, operationId, updates) => set((state) => {
                    if (state.operations[viewKey]?.data) {
                        const operationIndex = state.operations[viewKey].data.findIndex(
                            op => op.pk === operationId
                        );
                        if (operationIndex !== -1) {
                            Object.assign(state.operations[viewKey].data[operationIndex], updates);
                        }
                    }
                }),

                closeAllModals: () => set((state) => {
                    state.ui.detailsDrawer = false;
                    state.ui.actionDrawer = false;
                    state.ui.completeDialogOpen = false;
                    state.ui.paramsDialogOpen = false;
                    state.ui.selectedItem = null;
                }),

                // === SELECTORES ===
                getFilteredOperations: (currentUserId) => {
                    const state = get();
                    const filters = state.filters || {};
                    const ui = state.ui || {};

                    const { selectedView } = filters;
                    const { showOnlyMyTasks, searchTerm } = ui;

                    if (!selectedView || !state.operations[selectedView]?.data) {
                        return [];
                    }

                    let data = state.operations[selectedView].data;

                    if (showOnlyMyTasks && currentUserId) {
                        data = data.filter(item => Number(item.who) === Number(currentUserId));
                    }

                    if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        data = data.filter(item =>
                            item.regnumber?.toLowerCase().includes(term) ||
                            item.ts_entity?.toLowerCase().includes(term) ||
                            item.phone?.includes(searchTerm) ||
                            item.address?.toLowerCase().includes(term)
                        );
                    }

                    return [...data].sort((a, b) => {
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
                        viewMode: state.ui?.viewMode || 'grid',
                        showOnlyMyTasks: state.ui?.showOnlyMyTasks || false
                    }
                })
            }
        )
    )
);

export default useOperationsStore;