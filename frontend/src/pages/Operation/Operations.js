// frontend/src/pages/Operation/Operations.js
// Componente principal para operation-legacy - VERSÃO COMPATÍVEL

import React from 'react';
import { Box, CircularProgress, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useMetaData } from '../../contexts/MetaDataContext';
import { useOperationsData, useOperationsFiltering, useOperationsTable } from '../../hooks/useOperations';
import { useQueryClient } from "@tanstack/react-query";
import TabletViewLegacy from './containers/TabletViewLegacy';

const Operations = () => {
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('xl')); // 1536px
    const queryClient = useQueryClient();
    const { metaData } = useMetaData();

    // Dados principais (usa hooks globais)
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

    // Callback quando tarefa é concluída
    const handleTaskCompleted = (documentId) => {
        console.log('✅ Tarefa concluída, a invalidar cache...', documentId);
        queryClient.invalidateQueries({ queryKey: ['operationsData'] });
    };

    if (loading) return <CircularProgress />;
    if (error) return <Typography color="error">{error}</Typography>;
    if (Object.keys(operationsData).length === 0)
        return <Typography>Nenhum dado disponível no momento.</Typography>;

    // Renderizar TabletViewLegacy (compatível, sem store.getUI)
    return (
        <TabletViewLegacy
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
            onTaskCompleted={handleTaskCompleted}
        />
    );
};

export default Operations;
