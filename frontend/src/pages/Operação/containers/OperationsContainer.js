import React from 'react';
import { Box, CircularProgress, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useOperationsData } from '../hooks/useOperationsData';
import { useOperationsFiltering } from '../hooks/useOperationsFiltering';
import { useOperationsTable } from '../hooks/useOperationsTable';
import { getColumnsForView, getRemainingDaysColor } from '../utils/operationsHelpers';
import { useMetaData } from '../../../contexts/MetaDataContext';
import AssociateFilter from '../components/AssociateFilter/AssociateFilter';
import ViewCards from '../components/ViewCards/ViewCards';
import OperationsTable from '../components/OperationsTable/OperationsTable';
import TabletOperationsContainer from './TabletOperationsContainer';

const OperationsContainer = () => {
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('xl'));
    const { metaData } = useMetaData();

    // Hooks de dados
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
    } = useOperationsFiltering(operationsData);

    const {
        orderBy,
        order,
        expandedRows,
        sortedData,
        handleRequestSort,
        toggleRowExpand,
        getAddressString
    } = useOperationsTable(filteredData, selectedView);

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

    if (loading) return <CircularProgress />;
    if (error) return <Typography color="error">{error}</Typography>;
    if (Object.keys(operationsData).length === 0) {
        return <Typography>Nenhum dado disponível no momento.</Typography>;
    }

    return isTablet ? (
        <TabletOperationsContainer
            operationsData={operationsData}
            associates={associates}
            selectedAssociate={selectedAssociate}
            selectedView={selectedView}
            isFossaView={isFossaView}
            isRamaisView={isRamaisView}
            filteredData={filteredData}
            sortedViews={sortedViews}
            orderBy={orderBy}
            order={order}
            expandedRows={expandedRows}
            sortedData={sortedData}
            handleViewChange={handleViewChange}
            handleAssociateChange={handleAssociateChange}
            handleRequestSort={handleRequestSort}
            toggleRowExpand={toggleRowExpand}
            getAddressString={getAddressString}
        />
    ) : (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <Box sx={{ flexShrink: 0 }}>
                <AssociateFilter
                    associates={associates}
                    selectedAssociate={selectedAssociate}
                    onAssociateChange={handleAssociateChange}
                />
                {selectedAssociate && filteredData && Object.keys(filteredData).length > 0 && (
                    <ViewCards
                        views={sortedViews}
                        selectedView={selectedView}
                        onViewClick={handleViewChange}
                    />
                )}
            </Box>

            {selectedView && filteredData[selectedView] && filteredData[selectedView].data.length > 0 && (
                <Box mt={4} sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5" gutterBottom>
                            Detalhes de {filteredData[selectedView].name}
                        </Typography>
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

export default OperationsContainer;