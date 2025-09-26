import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import { useDocumentsContext } from './DocumentsContext';
import { useSocket } from '../../../contexts/SocketContext';
import { notifySuccess, notifyError, notifyWarning, notifyInfo } from "../../../components/common/Toaster/ThemedToaster.js";

// Action types para o reducer
const ACTIONS = {
    // Document actions
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
    SET_SUCCESS: 'SET_SUCCESS',

    // Batch operations
    START_BATCH_OPERATION: 'START_BATCH_OPERATION',
    COMPLETE_BATCH_OPERATION: 'COMPLETE_BATCH_OPERATION',

    // Performance tracking
    TRACK_OPERATION: 'TRACK_OPERATION',
    UPDATE_METRICS: 'UPDATE_METRICS',

    // UI state
    SET_KEYBOARD_MODE: 'SET_KEYBOARD_MODE',
    SET_BULK_SELECT: 'SET_BULK_SELECT',
    TOGGLE_ADVANCED_MODE: 'TOGGLE_ADVANCED_MODE',

    // Real-time updates
    DOCUMENT_UPDATED_REALTIME: 'DOCUMENT_UPDATED_REALTIME',
    CONNECTION_STATE_CHANGED: 'CONNECTION_STATE_CHANGED'
};

// Initial state
const initialState = {
    // Performance metrics
    metrics: {
        operationsCount: 0,
        averageResponseTime: 0,
        successRate: 100,
        lastOperationTime: null,
        operationHistory: []
    },

    // UI enhancements
    keyboardMode: false,
    advancedMode: false,
    bulkSelectMode: false,
    selectedDocuments: new Set(),

    // Batch operations
    batchOperations: new Map(),

    // Real-time state
    connectionStatus: 'disconnected',
    realTimeUpdates: true,

    // Loading states
    loadingStates: new Map(),
    errorStates: new Map(),

    // Feature flags
    features: {
        keyboardShortcuts: true,
        batchOperations: true,
        realTimeSync: true,
        performanceMonitoring: true,
        advancedFiltering: true
    }
};

// Reducer para gestão de estado complexo
function advancedDocumentsReducer(state, action) {
    switch (action.type) {
        case ACTIONS.SET_LOADING:
            return {
                ...state,
                loadingStates: new Map(state.loadingStates).set(action.payload.key, action.payload.loading)
            };

        case ACTIONS.SET_ERROR:
            return {
                ...state,
                errorStates: new Map(state.errorStates).set(action.payload.key, action.payload.error)
            };

        case ACTIONS.TRACK_OPERATION:
            const newOperation = {
                type: action.payload.type,
                timestamp: Date.now(),
                duration: action.payload.duration,
                success: action.payload.success
            };

            const newHistory = [newOperation, ...state.metrics.operationHistory].slice(0, 100);
            const totalOperations = state.metrics.operationsCount + 1;
            const successfulOps = newHistory.filter(op => op.success).length;
            const avgResponseTime = newHistory.reduce((acc, op) => acc + op.duration, 0) / newHistory.length;

            return {
                ...state,
                metrics: {
                    ...state.metrics,
                    operationsCount: totalOperations,
                    averageResponseTime: Math.round(avgResponseTime),
                    successRate: Math.round((successfulOps / newHistory.length) * 100),
                    lastOperationTime: Date.now(),
                    operationHistory: newHistory
                }
            };

        case ACTIONS.SET_KEYBOARD_MODE:
            return {
                ...state,
                keyboardMode: action.payload
            };

        case ACTIONS.SET_BULK_SELECT:
            return {
                ...state,
                bulkSelectMode: action.payload.enabled,
                selectedDocuments: action.payload.enabled ? state.selectedDocuments : new Set()
            };

        case ACTIONS.TOGGLE_ADVANCED_MODE:
            return {
                ...state,
                advancedMode: !state.advancedMode
            };

        case ACTIONS.START_BATCH_OPERATION:
            return {
                ...state,
                batchOperations: new Map(state.batchOperations).set(action.payload.id, {
                    ...action.payload,
                    startTime: Date.now(),
                    status: 'running'
                })
            };

        case ACTIONS.COMPLETE_BATCH_OPERATION:
            const updatedBatch = new Map(state.batchOperations);
            const operation = updatedBatch.get(action.payload.id);
            if (operation) {
                updatedBatch.set(action.payload.id, {
                    ...operation,
                    status: action.payload.success ? 'completed' : 'failed',
                    endTime: Date.now(),
                    result: action.payload.result
                });
            }

            return {
                ...state,
                batchOperations: updatedBatch
            };

        case ACTIONS.CONNECTION_STATE_CHANGED:
            return {
                ...state,
                connectionStatus: action.payload
            };

        default:
            return state;
    }
}

// Context
const AdvancedDocumentsContext = createContext();

// Hook para usar o context
export const useAdvancedDocuments = () => {
    const context = useContext(AdvancedDocumentsContext);
    if (!context) {
        throw new Error('useAdvancedDocuments must be used within AdvancedDocumentsProvider');
    }
    return context;
};

/**
 * Provider avançado com funcionalidades enterprise
 * - Performance monitoring
 * - Batch operations
 * - Keyboard shortcuts
 * - Real-time updates
 * - Advanced error handling
 */
export const AdvancedDocumentsProvider = ({ children }) => {
    const [state, dispatch] = useReducer(advancedDocumentsReducer, initialState);
    const { smartUpdateDocument } = useDocumentsContext();
    const { isConnected } = useSocket();

    // Performance monitoring
    const trackOperation = useCallback((type, duration, success) => {
        dispatch({
            type: ACTIONS.TRACK_OPERATION,
            payload: { type, duration, success }
        });
    }, []);

    // Batch operations com progress tracking
    const executeBatchOperation = useCallback(async (operation) => {
        const batchId = `batch_${Date.now()}`;

        dispatch({
            type: ACTIONS.START_BATCH_OPERATION,
            payload: {
                id: batchId,
                type: operation.type,
                items: operation.items,
                total: operation.items.length
            }
        });

        let successCount = 0;
        const results = [];

        notifyInfo(`🔄 Executando ${operation.items.length} operações em lote...`);

        for (let i = 0; i < operation.items.length; i++) {
            const item = operation.items[i];

            try {
                const startTime = Date.now();
                const result = await operation.executor(item);
                const duration = Date.now() - startTime;

                results.push({ item, result, success: true });
                successCount++;

                trackOperation(operation.type, duration, true);

                // Progress notification
                const progress = Math.round(((i + 1) / operation.items.length) * 100);
                notifyInfo(`📊 Progresso: ${progress}% (${successCount}/${operation.items.length})`);

            } catch (error) {
                results.push({ item, error, success: false });
                trackOperation(operation.type, 0, false);
            }
        }

        const success = successCount === operation.items.length;

        dispatch({
            type: ACTIONS.COMPLETE_BATCH_OPERATION,
            payload: {
                id: batchId,
                success,
                result: { successCount, totalCount: operation.items.length, results }
            }
        });

        if (success) {
            notifySuccess(`✅ ${successCount} operações concluídas com sucesso!`);
        } else {
            const failedCount = operation.items.length - successCount;
            notifyWarning(`⚠️ ${successCount} sucessos, ${failedCount} falhas`);
        }

        return results;
    }, [trackOperation]);

    // Enhanced document update com metrics
    const enhancedUpdateDocument = useCallback(async (documentId, optimisticData, updatePromise) => {
        const startTime = Date.now();

        dispatch({
            type: ACTIONS.SET_LOADING,
            payload: { key: documentId, loading: true }
        });

        try {
            const result = await smartUpdateDocument(documentId, optimisticData, updatePromise);
            const duration = Date.now() - startTime;

            trackOperation('document_update', duration, true);

            dispatch({
                type: ACTIONS.SET_LOADING,
                payload: { key: documentId, loading: false }
            });

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            trackOperation('document_update', duration, false);

            // Error handling específico
            let errorMessage = error.message;
            if (error.response?.status === 404) {
                errorMessage = 'Documento não encontrado';
            } else if (error.response?.status === 403) {
                errorMessage = 'Sem permissões para este documento';
            } else if (error.response?.status >= 500) {
                errorMessage = 'Erro do servidor - tente novamente';
            }

            dispatch({
                type: ACTIONS.SET_ERROR,
                payload: { key: documentId, error: errorMessage }
            });

            dispatch({
                type: ACTIONS.SET_LOADING,
                payload: { key: documentId, loading: false }
            });

            throw error;
        }
    }, [smartUpdateDocument, trackOperation]);

    // Keyboard shortcuts handler
    const toggleKeyboardMode = useCallback(() => {
        dispatch({ type: ACTIONS.SET_KEYBOARD_MODE, payload: !state.keyboardMode });

        if (!state.keyboardMode) {
            notifyInfo('⌨️ Modo teclado activado! Use ? para ver atalhos');
        } else {
            notifyInfo('🖱️ Modo teclado desactivado');
        }
    }, [state.keyboardMode]);

    // Bulk selection
    const toggleBulkSelect = useCallback(() => {
        const enabled = !state.bulkSelectMode;
        dispatch({
            type: ACTIONS.SET_BULK_SELECT,
            payload: { enabled }
        });

        if (enabled) {
            notifyInfo('📋 Selecção múltipla activada');
        }
    }, [state.bulkSelectMode]);

    // Advanced mode
    const toggleAdvancedMode = useCallback(() => {
        dispatch({ type: ACTIONS.TOGGLE_ADVANCED_MODE });

        if (!state.advancedMode) {
            notifyInfo('🔧 Modo avançado activado!');
        }
    }, [state.advancedMode]);

    // Connection status monitoring
    useEffect(() => {
        const status = isConnected ? 'connected' : 'disconnected';
        dispatch({
            type: ACTIONS.CONNECTION_STATE_CHANGED,
            payload: status
        });
    }, [isConnected]);

    // Performance report
    const getPerformanceReport = useCallback(() => {
        const { metrics } = state;
        const recentOps = metrics.operationHistory.slice(0, 10);

        return {
            totalOperations: metrics.operationsCount,
            averageResponseTime: metrics.averageResponseTime,
            successRate: metrics.successRate,
            recentOperations: recentOps,
            recommendations: generatePerformanceRecommendations(metrics)
        };
    }, [state.metrics]);

    // Memoized context value
    const contextValue = useMemo(() => ({
        // State
        ...state,

        // Actions
        trackOperation,
        executeBatchOperation,
        enhancedUpdateDocument,

        // UI controls
        toggleKeyboardMode,
        toggleBulkSelect,
        toggleAdvancedMode,

        // Analytics
        getPerformanceReport,

        // Utilities
        isLoading: (key) => state.loadingStates.get(key) || false,
        getError: (key) => state.errorStates.get(key) || null,
        isFeatureEnabled: (feature) => state.features[feature] || false
    }), [
        state,
        trackOperation,
        executeBatchOperation,
        enhancedUpdateDocument,
        toggleKeyboardMode,
        toggleBulkSelect,
        toggleAdvancedMode,
        getPerformanceReport
    ]);

    return (
        <AdvancedDocumentsContext.Provider value={contextValue}>
            {children}
        </AdvancedDocumentsContext.Provider>
    );
};

// Utility function
function generatePerformanceRecommendations(metrics) {
    const recommendations = [];

    if (metrics.averageResponseTime > 2000) {
        recommendations.push({
            type: 'performance',
            message: 'Tempo de resposta alto. Considerar otimização de queries.',
            priority: 'high'
        });
    }

    if (metrics.successRate < 95) {
        recommendations.push({
            type: 'reliability',
            message: 'Taxa de sucesso baixa. Verificar conectividade e tratamento de erros.',
            priority: 'high'
        });
    }

    if (metrics.operationsCount > 1000) {
        recommendations.push({
            type: 'usage',
            message: 'Alto volume de operações. Considerar cache e batching.',
            priority: 'medium'
        });
    }

    return recommendations;
}

export default AdvancedDocumentsContext;