import React from "react";
import { Box, CircularProgress, Typography, Button, Tooltip } from "@mui/material";
import { FileDownload } from "@mui/icons-material";
import AssociateFilter from "./AssociateFilter";
import ViewCards from "./ViewCards";
import OperationsTable from "./OperationsTable";
import { getColumnsForView, getRemainingDaysColor } from "./operationsHelpers";
import { exportToExcel } from "./exportService";
import { useOperationsData, useOperationsFiltering, useOperationsTable } from "../../hooks/useOperations";

const Operations = () => {
    // Dados principais
    const { operationsData, loading, error, associates } = useOperationsData();

    // Filtragem
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

    // Tabela
    const {
        orderBy,
        order,
        expandedRows,
        sortedData,
        handleRequestSort,
        toggleRowExpand,
        getAddressString
    } = useOperationsTable(filteredData, selectedView);

    const handleExportExcel = () => {
        if (isFossaView && selectedView && filteredData[selectedView]) {
            exportToExcel(filteredData, selectedView);
        }
    };

    const renderCell = (column, row) => {
        if (column.format) {
            return column.format(row[column.id]);
        }

        if (isRamaisView && column.id === 'restdays') {
            return (
                <Box sx={{
                    color: getRemainingDaysColor(row[column.id]),
                    fontWeight: 'bold'
                }}>
                    {Math.floor(row[column.id])} dias
                </Box>
            );
        }

        return row[column.id || column];
    };

    if (loading) return <CircularProgress />;
    if (error) return <Typography color="error">{error}</Typography>;
    if (Object.keys(operationsData).length === 0)
        return <Typography>Nenhum dado disponível no momento.</Typography>;

    return (
        <Box sx={{ height: "100dh", display: "flex", flexDirection: "column" }}>
            <Box sx={{ flexShrink: 0 }}>
                <AssociateFilter
                    associates={associates}
                    selectedAssociate={selectedAssociate}
                    onAssociateChange={handleAssociateChange}
                />

                <ViewCards
                    views={sortedViews}
                    selectedView={selectedView}
                    onViewClick={handleViewChange}
                />
            </Box>

            {selectedView &&
                filteredData[selectedView] &&
                filteredData[selectedView].data.length > 0 && (
                    <Box
                        mt={4}
                        sx={{
                            flexGrow: 1,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={2}
                        >
                            <Typography variant="h5" gutterBottom>
                                Detalhes de {filteredData[selectedView].name}
                            </Typography>
                            <Tooltip
                                title={
                                    isFossaView
                                        ? "Exportar dados para Excel"
                                        : "Exportação disponível apenas para limpezas de fossas"
                                }
                            >
                                <span>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<FileDownload />}
                                        onClick={handleExportExcel}
                                        disabled={!isFossaView}
                                        style={{ opacity: isFossaView ? 1 : 0.5 }}
                                    >
                                        Exportar para Excel
                                    </Button>
                                </span>
                            </Tooltip>
                        </Box>

                        <OperationsTable
                            data={sortedData}
                            columns={getColumnsForView(selectedView)}
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

export default Operations;