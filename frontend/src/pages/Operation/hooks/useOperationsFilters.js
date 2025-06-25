// hooks/useOperationsFilters.js - FINAL
import { useMemo } from 'react';

export const useOperationsFilters = (operationsData, selectedAssociate, selectedView) => {
    const filteredData = useMemo(() => {
        if (!operationsData || !selectedAssociate) return {};

        const grouped = {};

        Object.entries(operationsData).forEach(([viewKey, view]) => {
            if (!view?.data?.length) return;

            const data = selectedAssociate === 'all'
                ? view.data
                : view.data.filter(item => item.ts_associate === selectedAssociate);

            if (data.length === 0) return;

            // Separar ramais por viewKey
            if (viewKey.includes('ramais')) {
                let groupKey, groupName;

                if (viewKey.includes('ramais01')) {
                    groupKey = 'ramais_execucao';
                    groupName = 'Ramais - Execução';
                } else if (viewKey.includes('ramais02')) {
                    groupKey = 'ramais_pavimentacao';
                    groupName = 'Ramais - Pavimentação';
                } else {
                    groupKey = 'ramais';
                    groupName = 'Ramais';
                }

                if (!grouped[groupKey]) {
                    grouped[groupKey] = {
                        name: groupName,
                        data: [],
                        dataSet: new Set(),
                        total: 0
                    };
                }

                data.forEach(item => {
                    if (!grouped[groupKey].dataSet.has(item.pk)) {
                        grouped[groupKey].dataSet.add(item.pk);
                        grouped[groupKey].data.push(item);
                    }
                });
            } else {
                // Outros tipos
                let typeKey = 'outros';
                let typeName = view.name || viewKey;

                if (viewKey.includes('fossa')) {
                    typeKey = 'fossa';
                    typeName = 'Limpezas de fossa';
                } else if (viewKey.includes('pavimentacao')) {
                    typeKey = 'pavimentacao';
                    typeName = 'Pavimentação';
                } else if (viewKey.includes('desobstrucao')) {
                    typeKey = 'desobstrucao';
                    typeName = 'Desobstrução';
                }

                if (!grouped[typeKey]) {
                    grouped[typeKey] = {
                        name: typeName,
                        data: [],
                        dataSet: new Set(),
                        total: 0
                    };
                }

                data.forEach(item => {
                    if (!grouped[typeKey].dataSet.has(item.pk)) {
                        grouped[typeKey].dataSet.add(item.pk);
                        grouped[typeKey].data.push(item);
                    }
                });
            }
        });

        // Limpar dataSet
        Object.values(grouped).forEach(group => {
            group.total = group.data.length;
            delete group.dataSet;
        });

        return grouped;
    }, [operationsData, selectedAssociate]);

    const sortedViews = useMemo(() => {
        return Object.entries(filteredData);
    }, [filteredData]);

    const isFossaView = useMemo(() => {
        return selectedView === 'fossa';
    }, [selectedView]);

    const isRamaisView = useMemo(() => {
        if (!selectedView || !filteredData[selectedView]) return false;
        return filteredData[selectedView].data?.some(item => item.restdays !== undefined) || false;
    }, [selectedView, filteredData]);

    return {
        filteredData,
        sortedViews,
        isFossaView,
        isRamaisView
    };
};