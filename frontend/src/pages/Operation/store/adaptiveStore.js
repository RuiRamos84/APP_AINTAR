// store/adaptiveStore.js
import { create } from 'zustand';

const useAdaptiveStore = create((set, get) => ({
    // Estado dos dados
    operationsData: {},
    associates: [],
    loading: false,
    error: null,

    // Estado da UI
    selectedView: null,
    selectedAssociate: null,
    searchTerm: '',
    viewMode: 'cards', // 'cards' | 'list'

    // Estado dos modais
    selectedItem: null,
    detailsDrawer: false,
    completeDialogOpen: false,
    completionNote: '',
    completionLoading: false,

    // Ações para dados
    setOperationsData: (data) => set({ operationsData: data }),
    setAssociates: (associates) => set({ associates }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Ações para UI
    setSelectedView: (view) => set({ selectedView: view }),
    setSelectedAssociate: (associate) => set({ selectedAssociate: associate }),
    setSearchTerm: (term) => set({ searchTerm: term }),
    setViewMode: (mode) => set({ viewMode: mode }),

    // Ações para modais
    setSelectedItem: (item) => set({ selectedItem: item }),
    setDetailsDrawer: (open) => set({ detailsDrawer: open }),
    setCompleteDialogOpen: (open) => set({ completeDialogOpen: open }),
    setCompletionNote: (note) => set({ completionNote: note }),
    setCompletionLoading: (loading) => set({ completionLoading: loading }),

    // Ação para fechar todos os modais
    closeAllModals: () => set({
        selectedItem: null,
        detailsDrawer: false,
        completeDialogOpen: false,
        completionNote: '',
        completionLoading: false
    }),

    // Getters organizados
    getUI: () => {
        const state = get();
        return {
            selectedView: state.selectedView,
            selectedAssociate: state.selectedAssociate,
            searchTerm: state.searchTerm,
            viewMode: state.viewMode,
            selectedItem: state.selectedItem,
            detailsDrawer: state.detailsDrawer,
            completeDialogOpen: state.completeDialogOpen,
            completionNote: state.completionNote,
            completionLoading: state.completionLoading
        };
    },

    getFilters: () => {
        const state = get();
        return {
            selectedView: state.selectedView,
            selectedAssociate: state.selectedAssociate,
            searchTerm: state.searchTerm
        };
    },

    getData: () => {
        const state = get();
        return {
            operationsData: state.operationsData,
            associates: state.associates,
            loading: state.loading,
            error: state.error
        };
    }
}));

export default useAdaptiveStore;