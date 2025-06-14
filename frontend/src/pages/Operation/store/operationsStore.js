import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useOperationsStore = create(
    devtools(
        persist(
            (set, get) => ({
                // Estado
                operations: {},
                selectedOperation: null,
                loading: false,
                error: null,
                lastSync: null,

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
                clearError: () => set({ error: null }),

                updateLastSync: () => set({ lastSync: Date.now() }),

                // Selectores
                getOperationById: (viewKey, operationId) => {
                    const state = get();
                    const view = state.operations[viewKey];
                    if (!view) return null;
                    return view.data.find(op => op.pk === operationId);
                },

                getOperationsByAssociate: (associate) => {
                    const state = get();
                    const result = {};

                    Object.entries(state.operations).forEach(([key, view]) => {
                        if (!view.data) return;

                        const filtered = associate === 'all'
                            ? view.data
                            : view.data.filter(op => op.ts_associate === associate);

                        if (filtered.length > 0) {
                            result[key] = { ...view, data: filtered };
                        }
                    });

                    return result;
                }
            }),
            {
                name: 'operations-storage',
                partialize: (state) => ({
                    operations: state.operations,
                    lastSync: state.lastSync
                })
            }
        )
    )
);

export default useOperationsStore;