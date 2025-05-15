import { useState, useEffect } from 'react';
import { sortViews } from '../utils/operationsHelpers';

export const useOperationsFiltering = (operationsData) => {
    const [selectedAssociate, setSelectedAssociate] = useState(null);
    const [selectedView, setSelectedView] = useState(null);
    const [filteredData, setFilteredData] = useState({});

    const sortedViews = selectedAssociate ? sortViews(filteredData) : [];
    const isFossaView = selectedView?.startsWith('vbr_document_fossa');
    const isRamaisView = selectedView?.startsWith('vbr_document_ramais');

    useEffect(() => {
        if (!selectedAssociate || !operationsData) {
            setFilteredData({});
            return;
        }

        const filtered = {};

        if (selectedAssociate === 'all') {
            // Agrupa apenas views globais (terminadas em 01)
            Object.keys(operationsData).forEach(viewKey => {
                if (viewKey.endsWith('01')) {
                    const viewData = operationsData[viewKey];
                    if (viewData?.data && viewData.data.length > 0) {
                        filtered[viewKey] = viewData;
                    }
                }
            });

        } else {
            // Para associado específico, usa views específicas
            Object.keys(operationsData).forEach(viewKey => {
                const viewData = operationsData[viewKey];
                if (!viewData?.data) return;

                // Filtrar dados pelo associado
                const filteredItems = viewData.data.filter(
                    item => item.ts_associate === selectedAssociate
                );

                if (filteredItems.length > 0) {
                    // Usa view específica se disponível
                    const specificView = viewData.name.includes(selectedAssociate);

                    if (specificView || viewKey.endsWith('01')) {
                        // Se é view global, adiciona o nome do associado
                        const displayName = viewKey.endsWith('01')
                            ? `${viewData.name.replace(' global', '')} - ${selectedAssociate}`
                            : viewData.name;

                        filtered[viewKey] = {
                            ...viewData,
                            name: displayName,
                            data: filteredItems,
                            total: filteredItems.length
                        };
                    }
                }
            });
        }

        setFilteredData(filtered);

        // Se não há vista selecionada e há dados filtrados, seleciona preferencialmente fossas
        if (!selectedView && Object.keys(filtered).length > 0) {
            const fossaView = Object.keys(filtered).find(key => key.includes('fossa'));
            const firstView = fossaView || Object.keys(filtered)[0];
            setSelectedView(firstView);
        }
    }, [selectedAssociate, operationsData]);

    const handleViewChange = (viewKey) => {
        setSelectedView(viewKey);
    };

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

export default useOperationsFiltering;