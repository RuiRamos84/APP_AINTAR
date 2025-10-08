import { Box, CircularProgress, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useMetaData } from '../../contexts/MetaDataContext';
import { useOperationsData, useOperationsFiltering, useOperationsTable } from "../../hooks/useOperations";
import { getColumnsForView, getRemainingDaysColor } from "./utils/operationsHelpers";
import { exportToExcel } from "./services/exportService";

// Componentes existentes
import AssociateFilter from "./components/AssociateFilter/AssociateFilter";
import OperationsTable from "./components/OperationsTable/OperationsTable";
import TabletOperations from "./containers/TabletOperationsContainer";
import ViewCards from "./components/ViewCards/ViewCards";
import { Button } from "@mui/material";
import { GetApp } from "@mui/icons-material";

const Operations = () => {
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('xl')); // 1536px

    const { metaData } = useMetaData();

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

    const handleExport = () => {
        if (selectedView && filteredData[selectedView]) {
            exportToExcel(filteredData, selectedView);
        }
    };

    // Render helper para células da tabela
    const renderCell = (column, row) => {
        if (column.format) {
            return column.format(row[column.id], metaData); // Passa metadados
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

    // Renderizar versão para tablet baseado no tamanho da tela
    return isTablet ? (
        <TabletOperations
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
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h5" gutterBottom>
                                Detalhes de {filteredData[selectedView].name}
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

export default Operations;