// frontend/src/pages/Operation/containers/DesktopView.js
import React from 'react';
import { Box } from '@mui/material';

import useOperationsStore from '../store/operationsStore';
import { useOperationsData } from '../hooks/useOperationsData';
import { useOperationsFilters } from '../hooks/useOperationsFilters';
import { useOperationsActions } from '../hooks/useOperationsActions';

import AssociateFilter from '../components/filters/AssociateFilter';
import ViewCards from '../components/cards/ViewCards';
import GroupedContent from '../components/layout/GroupedContent';

const DesktopView = () => {
    // Store
    const {
        filters,
        viewMode,
        setSelectedAssociate,
        setSelectedView,
        setViewMode
    } = useOperationsStore();

    // Dados
    const { operationsData, loading, error, associates } = useOperationsData();
    const { canExecuteActions, onItemClick, onNavigate, onCall } = useOperationsActions();

    // Filtros
    const { isFossaView, isRamaisView, filteredData, sortedViews } = useOperationsFilters(
        operationsData,
        filters.selectedAssociate
    );

    if (loading) return <Box>A carregar...</Box>;
    if (error) return <Box color="error.main">{error}</Box>;
    if (!Object.keys(operationsData).length) return <Box>Sem dados.</Box>;

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Filtros */}
            <Box sx={{ flexShrink: 0, p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <AssociateFilter
                    associates={associates}
                    selectedAssociate={filters.selectedAssociate}
                    onAssociateChange={setSelectedAssociate}
                />

                {filters.selectedAssociate && (
                    <ViewCards
                        views={sortedViews}
                        selectedView={filters.selectedView}
                        onViewClick={setSelectedView}
                    />
                )}
            </Box>

            {/* Conteúdo */}
            {filters.selectedView && filteredData[filters.selectedView]?.data?.length > 0 && (
                <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
                    <GroupedContent
                        data={filteredData[filters.selectedView].data}
                        viewName={filteredData[filters.selectedView].name}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        isRamaisView={isRamaisView}
                        selectedView={filters.selectedView}
                        canExecuteActions={canExecuteActions}
                        onItemClick={onItemClick}
                        onNavigate={onNavigate}
                        onCall={onCall}
                    />
                </Box>
            )}
        </Box>
    );
};

export default DesktopView;