import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useOperationsStore = create(
    persist(
        (set, get) => ({
            // Estado
            operations: {},
            selectedOperation: null,
            loading: false,
            error: null,

            // Acções
            setOperations: (operations) => set({ operations }),

            updateOperation: (viewKey, operationId, updates) => set((state) => ({
                operations: {
                    ...state.operations,
                    [viewKey]: {
                        ...state.operations[viewKey],
                        data: state.operations[viewKey].data.map(op =>
                            op.pk === operationId ? { ...op, ...updates } : op
                        )
                    }
                }
            })),

            removeOperation: (viewKey, operationId) => set((state) => ({
                operations: {
                    ...state.operations,
                    [viewKey]: {
                        ...state.operations[viewKey],
                        data: state.operations[viewKey].data.filter(op => op.pk !== operationId),
                        total: (state.operations[viewKey].total || 0) - 1
                    }
                }
            })),

            selectOperation: (operation) => set({ selectedOperation: operation }),
            clearSelection: () => set({ selectedOperation: null }),
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),

            // Selectores
            getOperationById: (viewKey, operationId) => {
                const state = get();
                return state.operations[viewKey]?.data?.find(op => op.pk === operationId);
            }
        }),
        {
            name: 'operations-storage',
            partialize: (state) => ({ operations: state.operations })
        }
    )
);

export default useOperationsStore;