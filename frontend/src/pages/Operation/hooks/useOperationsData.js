import { useEffect, useCallback } from 'react';
import { fetchOperationsData } from '../services/operationsService';
import useOperationsStore from '../store/operationsStore';
import { notification } from '../services/notificationService';
import { Logger } from '../utils/logger';

/**
 * @deprecated Este hook está deprecado e será removido em breve.
 * Use `useOperationsUnifiedV2` em vez deste.
 *
 * Exemplo:
 * ```js
 * import { useOperationsUnifiedV2 } from '../hooks/useOperationsUnifiedV2';
 *
 * const MyComponent = () => {
 *   const { userTasks, loading, refresh } = useOperationsUnifiedV2({
 *     autoLoad: true,
 *     includeUserTasks: true
 *   });
 *   // ...
 * }
 * ```
 */
export const useOperationsData = () => {
    // Warning de deprecação (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
        console.warn(
            '⚠️ DEPRECADO: useOperationsData será removido. Use useOperationsUnifiedV2 em vez deste hook.'
        );
    }
    const {
        operations, loading, error,
        setOperations, setLoading, setError, clearError
    } = useOperationsStore();

    const loadData = useCallback(async () => {
        setLoading(true);
        clearError();

        // Logger.info('Carregando operações', { timestamp: Date.now() });

        try {
            const response = await fetchOperationsData();
            setOperations(response);

            // Logger.info('Operações carregadas', {
            //     count: Object.keys(response).length,
            //     views: Object.keys(response)
            // });

        } catch (err) {
            Logger.error('Erro carregar operações', {
                error: err.message,
                status: err.response?.status,
                stack: err.stack
            });

            const message = err.response?.status === 401
                ? 'Sessão expirada'
                : 'Erro carregar operações';

            setError(message);
            notification.error(message);

        } finally {
            setLoading(false);
        }
    }, [setOperations, setLoading, setError, clearError]);

    const extractAssociates = useCallback((data) => {
        const associateSet = new Set(['all']);

        Object.values(data).forEach(view => {
            view?.data?.forEach(item => {
                if (item.ts_associate) {
                    associateSet.add(item.ts_associate);
                }
            });
        });

        const associates = Array.from(associateSet);
        // Logger.debug('Associados extraídos', { count: associates.length, associates });

        return associates;
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        operationsData: operations,
        loading,
        error,
        associates: extractAssociates(operations),
        refetchOperations: loadData
    };
};
