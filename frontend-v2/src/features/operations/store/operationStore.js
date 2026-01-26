import { create } from 'zustand';
import { operationService } from '../services/operationService';

export const useOperationStore = create((set, get) => ({
  // State
  operations: [],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  },
  filters: {},
  currentOperation: null,
  loading: false,
  error: null,

  // Actions
  fetchOperations: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const { pageSize, filters } = get();
      let data;

      // If filters are active, use fetchFilteredOperations (adapting logic if needed)
      // or just standard fetchOperationsData if filters are handled there.
      // Assuming fetchOperationsData handles simple pagination and fetchFilteredOperations handles complex search.
      // For now, let's keep it simple:

      if (Object.keys(filters).length > 0) {
        data = await operationService.fetchFilteredOperations({ ...filters, page, page_size: pageSize });
      } else {
        data = await operationService.fetchOperationsData(page, pageSize);
      }

      set({
        operations: data.items || data.data || [], // Adapt based on actual API response structure
        pagination: {
          page: data.page || page,
          pageSize: data.page_size || pageSize,
          total: data.total || 0,
          totalPages: data.pages || 0
        },
        loading: false
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  setFilters: (newFilters) => {
    set({ filters: newFilters });
    get().fetchOperations(1); // Reset to page 1 on filter change
  },

  fetchOperationDetails: async (documentId) => {
    set({ loading: true, error: null });
    try {
      const data = await operationService.fetchOperationDetails(documentId);
      set({ currentOperation: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  completeOperationStep: async (documentId, stepData) => {
    set({ loading: true, error: null });
    try {
      const result = await operationService.completeOperation(documentId, stepData);
      // Refresh details or list if needed
      if (get().currentOperation?.id === documentId) {
        await get().fetchOperationDetails(documentId);
      }
      set({ loading: false });
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearCurrentOperation: () => set({ currentOperation: null })
}));
