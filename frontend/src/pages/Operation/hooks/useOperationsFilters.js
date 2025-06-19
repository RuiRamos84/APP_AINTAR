// frontend/src/pages/Operation/hooks/useOperationsFilters.js
import { useMemo } from 'react';

const getTypeInfo = (viewKey) => {
    if (viewKey.includes('fossa')) {
        return { key: 'fossa', name: 'Limpezas de fossa' };
    }
    if (viewKey.includes('ramais')) {
        return { key: 'ramais', name: 'Ramais' };
    }
    if (viewKey.includes('pavimentacao')) {
        return { key: 'pavimentacao', name: 'Pavimentação' };
    }
    return { key: viewKey, name: viewKey };
};

export const useOperationsFilters = (operationsData, selectedAssociate) => {
    const filteredData = useMemo(() => {
        if (!operationsData || !selectedAssociate) return {};

        const grouped = {};

        Object.entries(operationsData).forEach(([viewKey, view]) => {
            if (!view?.data?.length) return;

            const { key: typeKey, name: typeName } = getTypeInfo(viewKey);

            // Filtrar dados por associado (se não for 'all')
            const data = selectedAssociate === 'all'
                ? view.data
                : view.data.filter(item => item.ts_associate === selectedAssociate);

            if (data.length === 0) return;

            // Agrupar por tipo
            if (!grouped[typeKey]) {
                grouped[typeKey] = {
                    name: typeName,
                    data: [],
                    dataSet: new Set(), // Track PKs to avoid duplicates
                    total: 0
                };
            }

            // Adicionar apenas dados únicos (por pk)
            data.forEach(item => {
                if (!grouped[typeKey].dataSet.has(item.pk)) {
                    grouped[typeKey].dataSet.add(item.pk);
                    grouped[typeKey].data.push(item);
                }
            });

            grouped[typeKey].total = grouped[typeKey].data.length;
        });

        // Remover dataSet antes de retornar
        Object.values(grouped).forEach(group => {
            delete group.dataSet;
        });

        return grouped;
    }, [operationsData, selectedAssociate]);

    const sortedViews = useMemo(() => {
        return Object.entries(filteredData);
    }, [filteredData]);

    const isFossaView = useMemo(() => {
        const firstViewKey = Object.keys(filteredData)[0];
        return firstViewKey === 'fossa';
    }, [filteredData]);

    const isRamaisView = useMemo(() => {
        const firstViewKey = Object.keys(filteredData)[0];
        return firstViewKey === 'ramais';
    }, [filteredData]);

    return {
        filteredData,
        sortedViews,
        isFossaView,
        isRamaisView
    };
};