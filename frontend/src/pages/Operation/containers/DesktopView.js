import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { GetApp } from '@mui/icons-material';
import { useOperationsData } from '../hooks/useOperationsData';
import { useOperationsFilters } from '../hooks/useOperationsFilters';
import { useOperationsTable } from '../../Operação/hooks/useOperationsTable';
import { getColumnsForView, getRemainingDaysColor } from '../utils/helpers';
import { exportToExcel } from '../services/operationsService';
import { useMetaData } from '../../../contexts/MetaDataContext';
import AssociateFilter from '../components/filters/AssociateFilter';
import ViewCards from '../components/cards/ViewCards';
import OperationsTable from '../components/table/OperationsTable';

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

    const handleExport = () => {
        if (selectedView && filteredData[selectedView]) {
            exportToExcel(filteredData, selectedView);
        }
    };

    const renderCell = (column, row) => {
        if (column.format) {
            return column.format(row[column.id], metaData);
        }

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
    if (error) return <Box>Erro: {error}</Box>;

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
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

            {selectedView && filteredData[selectedView]?.data?.length > 0 && (
                <Box mt={4} sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">
                            {filteredData[selectedView].name}
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<GetApp />}
                            onClick={handleExport}
                            disabled={!sortedData.length}
                        >
                            Exportar Excel
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