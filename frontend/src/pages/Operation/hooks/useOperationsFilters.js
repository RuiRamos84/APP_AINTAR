import { useState, useEffect, useMemo } from 'react';
import { sortViews } from '../utils/helpers';

export const useOperationsFilters = (operationsData) => {
    const [selectedAssociate, setSelectedAssociate] = useState(null);
    const [selectedView, setSelectedView] = useState(null);

    const filteredData = useMemo(() => {
        if (!selectedAssociate || !operationsData) return {};

        const filtered = {};

        if (selectedAssociate === 'all') {
            // Só views globais (terminam em '01')
            Object.keys(operationsData).forEach(viewKey => {
                if (viewKey.endsWith('01') && operationsData[viewKey]?.data?.length > 0) {
                    filtered[viewKey] = operationsData[viewKey];
                }
            });
        } else {
            // Só views específicas (NÃO terminam em '01')
            Object.keys(operationsData).forEach(viewKey => {
                if (viewKey.endsWith('01')) return; // Skip globais

                const viewData = operationsData[viewKey];
                if (!viewData?.data) return;

                const filteredItems = viewData.data.filter(
                    item => item.ts_associate === selectedAssociate
                );

                if (filteredItems.length > 0) {
                    filtered[viewKey] = {
                        ...viewData,
                        data: filteredItems,
                        total: filteredItems.length
                    };
                }
            });
        }

        return filtered;
    }, [selectedAssociate, operationsData]);

    const sortedViews = useMemo(() => sortViews(filteredData), [filteredData]);

    const isFossaView = selectedView?.startsWith('vbr_document_fossa');
    const isRamaisView = selectedView?.startsWith('vbr_document_ramais');

    useEffect(() => {
        if (!selectedView && Object.keys(filteredData).length > 0) {
            const fossaView = Object.keys(filteredData).find(key => key.includes('fossa'));
            setSelectedView(fossaView || Object.keys(filteredData)[0]);
        }
    }, [filteredData, selectedView]);

    const handleViewChange = (viewKey) => setSelectedView(viewKey);
    const handleAssociateChange = (associate) => {
        setSelectedAssociate(associate);
        setSelectedView(null);
    };

    return {
        selectedAssociate,
        selectedView,
        isFossaView,
        isRamaisView,
        filteredData,
        sortedViews,
        handleViewChange,
        handleAssociateChange
    };
};

export default useOperationsFilters;