// frontend/src/pages/Operation/containers/DesktopView.js
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { GetApp } from '@mui/icons-material';

import useOperationsStore from '../store/operationsStore';
import { useOperationsData } from '../hooks/useOperationsData';
import { useOperationsFilters } from '../hooks/useOperationsFilters';
import { useOperationsTable } from '../hooks/useOperationsTable';
import { useMetaData } from '../../../contexts/MetaDataContext';

import AssociateFilter from '../components/filters/AssociateFilter';
import ViewCards from '../components/cards/ViewCards';
import OperationsTable from '../components/table/OperationsTable';
import VirtualizedOperationsTable from '../components/table/VirtualizedOperationsTable';

import { getColumnsForView, getRemainingDaysColor } from '../utils/helpers';
import { exportToExcel } from '../services/exportService';

const DesktopView = () => {
    const { metaData } = useMetaData();

    // Store centralizado
    const { filters, setSelectedAssociate, setSelectedView } = useOperationsStore();

    // Dados
    const { operationsData, loading, error, associates } = useOperationsData();

    // Filtros
    const { isFossaView, isRamaisView, filteredData, sortedViews } = useOperationsFilters(
        operationsData,
        filters.selectedAssociate
    );

    // Tabela
    const {
        orderBy, order, expandedRows, sortedData,
        handleRequestSort, toggleRowExpand, getAddressString
    } = useOperationsTable(filteredData, filters.selectedView);

    // Render cell
    const renderCell = (column, row) => {
        if (column.format) return column.format(row[column.id], metaData);

        if (isRamaisView && column.id === 'restdays') {
            return (
                <Box sx={{ color: getRemainingDaysColor(row[column.id]), fontWeight: 'bold' }}>
                    {Math.floor(row[column.id])} dias
                </Box>
            );
        }

        return row[column.id || column];
    };

    if (loading) return <Box>A carregar...</Box>;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!Object.keys(operationsData).length) return <Typography>Sem dados.</Typography>;

    const useVirtualization = sortedData.length > 100;

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Filtros */}
            <Box sx={{ flexShrink: 0, p: 2 }}>
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

            {/* Tabela */}
            {filters.selectedView && filteredData[filters.selectedView]?.data?.length > 0 && (
                <Box sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column", p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">
                            {filteredData[filters.selectedView].name} ({sortedData.length})
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<GetApp />}
                            onClick={() => exportToExcel(filteredData, filters.selectedView)}
                            disabled={!sortedData.length}
                        >
                            Exportar
                        </Button>
                    </Box>

                    {useVirtualization ? (
                        <VirtualizedOperationsTable
                            data={sortedData}
                            columns={getColumnsForView(filters.selectedView, metaData)}
                            renderCell={renderCell}
                        />
                    ) : (
                        <OperationsTable
                            data={sortedData}
                            columns={getColumnsForView(filters.selectedView, metaData)}
                            orderBy={orderBy}
                            order={order}
                            onRequestSort={handleRequestSort}
                            expandedRows={expandedRows}
                            toggleRowExpand={toggleRowExpand}
                            isRamaisView={isRamaisView}
                            getRemainingDaysColor={getRemainingDaysColor}
                            getAddressString={getAddressString}
                            renderCell={renderCell}
                        />
                    )}
                </Box>
            )}
        </Box>
    );
};

export default DesktopView;