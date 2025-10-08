// hooks/useAdaptiveOperations.js
import { useEffect, useCallback } from 'react';
import { fetchOperationsData, fetchAssociates } from '../services/mockOperationsService';
import useAdaptiveStore from '../store/adaptiveStore';

export const useAdaptiveOperations = () => {
    const {
        operationsData,
        associates,
        loading,
        error,
        setOperationsData,
        setAssociates,
        setLoading,
        setError,
        clearError
    } = useAdaptiveStore();

    const loadData = useCallback(async () => {
        setLoading(true);
        clearError();

        try {
            const [operationsRes, associatesRes] = await Promise.all([
                fetchOperationsData(),
                fetchAssociates()
            ]);

            setOperationsData(operationsRes);
            setAssociates(associatesRes);
        } catch (err) {
            setError(err.message || 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, [setOperationsData, setAssociates, setLoading, setError, clearError]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const refetchOperations = useCallback(() => {
        loadData();
    }, [loadData]);

    return {
        operationsData,
        associates,
        loading,
        error,
        refetchOperations
    };
};

// Hook para filtros simplificado
export const useAdaptiveFilters = (operationsData, selectedAssociate, selectedView) => {
    const filteredData = operationsData || {};

    // Para demonstração, vamos simular que temos diferentes views
    const isFossaView = selectedView?.includes('fossa');
    const isRamaisView = selectedView?.includes('ramais');

    // Simular dados ordenados por view
    const sortedViews = Object.entries(filteredData).map(([key, value]) => [key, value]);

    return {
        isFossaView,
        isRamaisView,
        filteredData,
        sortedViews
    };
};