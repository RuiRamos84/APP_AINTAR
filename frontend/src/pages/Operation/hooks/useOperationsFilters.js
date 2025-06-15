// frontend/src/pages/Operation/hooks/useOperationsFilters.js
import { useMemo } from 'react';

export const useOperationsFilters = (operationsData, selectedAssociate) => {
    // 1. Se não há associado seleccionado → sem dados
    // 2. Se "all" → todos os dados
    // 3. Se associado específico → só dados desse associado

    const filteredData = useMemo(() => {
        if (!operationsData || typeof operationsData !== 'object') return {};

        // Sem associado seleccionado → vazio
        if (!selectedAssociate) return {};

        // Todos → dados completos
        if (selectedAssociate === 'all') return operationsData;

        // Associado específico → filtra
        const filtered = {};
        Object.entries(operationsData).forEach(([key, view]) => {
            if (view?.data) {
                const associateData = view.data.filter(item =>
                    item.ts_associate === selectedAssociate
                );

                // Só adiciona se tiver dados
                if (associateData.length > 0) {
                    filtered[key] = {
                        ...view,
                        data: associateData,
                        total: associateData.length
                    };
                }
            }
        });

        return filtered;
    }, [operationsData, selectedAssociate]);

    const sortedViews = useMemo(() => {
        return Object.entries(filteredData);
    }, [filteredData]);

    const isFossaView = useMemo(() => {
        const firstViewKey = Object.keys(filteredData)[0];
        return firstViewKey?.includes('fossa') || false;
    }, [filteredData]);

    const isRamaisView = useMemo(() => {
        const firstViewKey = Object.keys(filteredData)[0];
        return firstViewKey?.includes('ramais') || false;
    }, [filteredData]);

    return {
        filteredData,
        sortedViews,
        isFossaView,
        isRamaisView
    };
};