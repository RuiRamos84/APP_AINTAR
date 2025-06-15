// frontend/src/pages/Operation/store/operationsStore.js
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
                    state.filters.selectedView = null; // Reset view quando muda associado
                }),

                setSelectedView: (view) => set((state) => {
                    state.filters.selectedView = view;
                }),

                // === OPERAÇÕES COMPLEXAS ===
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

                removeOperation: (viewKey, operationId) => set((state) => {
                    if (state.operations[viewKey]?.data) {
                        state.operations[viewKey].data = state.operations[viewKey].data.filter(
                            op => op.pk !== operationId
                        );
                        state.operations[viewKey].total = Math.max(0, (state.operations[viewKey].total || 1) - 1);
                    }
                }),

                // === RESET ACTIONS ===
                resetUI: () => set((state) => {
                    state.ui = {
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
                    };
                }),

                closeAllModals: () => set((state) => {
                    state.ui.detailsDrawer = false;
                    state.ui.actionDrawer = false;
                    state.ui.completeDialogOpen = false;
                    state.ui.paramsDialogOpen = false;
                    state.ui.selectedItem = null;
                }),

                // === SELECTORES ===
                getOperationById: (viewKey, operationId) => {
                    const state = get();
                    return state.operations[viewKey]?.data?.find(op => op.pk === operationId) || null;
                },

                getFilteredOperations: (currentUserId) => {
                    const state = get();
                    const { selectedView } = state.filters;
                    const { showOnlyMyTasks, searchTerm } = state.ui;

                    if (!selectedView || !state.operations[selectedView]?.data) {
                        return [];
                    }

                    let data = state.operations[selectedView].data;

                    // Filtrar por utilizador
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

                    // Ordenar urgentes primeiro
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
                    lastSync: state.lastSync,
                    filters: state.filters,
                    ui: {
                        viewMode: state.ui.viewMode,
                        showOnlyMyTasks: state.ui.showOnlyMyTasks
                    }
                })
            }
        )
    )
);

export default useOperationsStore;