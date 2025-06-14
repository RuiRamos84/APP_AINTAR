import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { GetApp } from '@mui/icons-material';

// Hooks
import { useOperationsData } from '../hooks/useOperationsData';
import { useOperationsFilters } from '../hooks/useOperationsFilters';
import { useOperationsTable } from '../hooks/useOperationsTable';
import { useMetaData } from '../../../contexts/MetaDataContext';

// Componentes
import AssociateFilter from '../components/filters/AssociateFilter';
import ViewCards from '../components/cards/ViewCards';
import OperationsTable from '../components/table/OperationsTable';

// Utils
import { getColumnsForView, getRemainingDaysColor } from '../utils/helpers';
import { exportToExcel } from '../services/exportService';

const DesktopView = () => {
    const { metaData } = useMetaData();
    const { operationsData, loading, error, associates } = useOperationsData();

    const {
        selectedAssociate,
        selectedView,
        isFossaView,
        isRamaisView,
        filteredData,
        sortedViews,
        handleViewChange,
        handleAssociateChange
    } = useOperationsFilters(operationsData);

    const {
        orderBy,
        order,
        expandedRows,
        sortedData,
        handleRequestSort,
        toggleRowExpand,
        getAddressString
    } = useOperationsTable(filteredData, selectedView);

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

    // Estados de loading/erro
    if (loading) return <CircularProgress />;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!Object.keys(operationsData).length) {
        return <Typography>Sem dados disponíveis.</Typography>;
    }

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Filtros */}
            <Box sx={{ flexShrink: 0 }}>
                <AssociateFilter
                    associates={associates}
                    selectedAssociate={selectedAssociate}
                    onAssociateChange={handleAssociateChange}
                />
                {selectedAssociate && (
                    <ViewCards
                        views={sortedViews}
                        selectedView={selectedView}
                        onViewClick={handleViewChange}
                    />
                )}
            </Box>

            {/* Tabela */}
            {selectedView && filteredData[selectedView]?.data?.length > 0 && (
                <Box mt={4} sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">
                            {filteredData[selectedView].name}
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<GetApp />}
                            onClick={() => exportToExcel(filteredData, selectedView)}
                            disabled={!sortedData.length}
                        >
                            Exportar
                        </Button>
                    </Box>

                    <OperationsTable
                        data={sortedData}
                        columns={getColumnsForView(selectedView, metaData)}
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
                </Box>
            )}
        </Box>
    );
};

export default DesktopView;