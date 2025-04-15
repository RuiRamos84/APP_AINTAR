import React, { useMemo } from 'react';
import { Box, CircularProgress, Alert, Button, Paper } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

// Componentes de visualização
import GridView from './GridView';
import ListView from './ListView';
import KanbanView from './KanbanView';

// Hooks e contextos
import { useDocumentsContext } from '../../ModernDocuments/context/DocumentsContext';
import { useDocumentActions } from '../context/DocumentActionsContext';
import { useUI } from '../context/UIStateContext';

/**
 * Componente unificado para gerenciar todas as visualizações de documentos
 * Responsável por renderizar a visualização correta com base no viewMode
 */
const DocumentView = () => {
    // Contextos
    const {
        getActiveDocuments,
        getActiveLoading,
        refreshDocuments,
        metaData,
        error,
        activeTab
    } = useDocumentsContext();

    const {
        handleViewDetails,
        handleAddStep,
        handleAddAnnex,
        handleReplicate,
        handleDownloadCompr,
        handleOpenCreateModal,
        canAddStep,
        canAddAnnex,
        canReplicate,
        canDownloadComprovativo
    } = useDocumentActions();

    const {
        viewMode,
        searchTerm,
        filters,
        sortBy,
        sortDirection,
        density,
        page,
        itemsPerPage,
        setSearchTerm,
        setPage,
        setItemsPerPage,
        setSort
    } = useUI();

    // Obter documentos e estado de carregamento
    const documents = getActiveDocuments();
    const isLoading = getActiveLoading();

    // Filtrar documentos com base nos critérios
    const filteredAndSortedDocs = useMemo(() => {
        // Aplicar filtragem textual
        let filtered = documents;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = documents.filter(doc => {
                return (
                    (doc.regnumber?.toLowerCase().includes(term)) ||
                    (doc.ts_entity?.toLowerCase().includes(term)) ||
                    (doc.tt_type?.toLowerCase().includes(term)) ||
                    (doc.nipc && String(doc.nipc).includes(term))
                );
            });
        }

        // Aplicar filtros adicionais
        filtered = filtered.filter(doc => {
            // Filtro de status
            if (filters.status && doc.what !== parseInt(filters.status)) {
                return false;
            }

            // Filtro de associado
            if (filters.associate && doc.ts_associate !== filters.associate) {
                return false;
            }

            // Filtro de tipo
            if (filters.type && doc.tt_type !== filters.type) {
                return false;
            }

            return true;
        });

        // Ordenar documentos
        return [...filtered].sort((a, b) => {
            let valueA = a[sortBy];
            let valueB = b[sortBy];

            // Tratamento para datas
            if (sortBy === 'submission') {
                valueA = new Date(valueA || 0).getTime();
                valueB = new Date(valueB || 0).getTime();
            }

            // Comparação
            if (sortDirection === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });
    }, [documents, searchTerm, filters, sortBy, sortDirection]);

    // Documentos paginados para Grid e List
    const paginatedDocs = useMemo(() => {
        if (viewMode === 'kanban') return filteredAndSortedDocs;

        const start = page * itemsPerPage;
        return filteredAndSortedDocs.slice(start, start + itemsPerPage);
    }, [filteredAndSortedDocs, page, itemsPerPage, viewMode]);

    // Helper: Verificar se tem documentos após filtragem
    const hasDocuments = filteredAndSortedDocs.length > 0;

    // Handlers para paginação
    const handlePageChange = (_, newPage) => setPage(newPage);
    const handleItemsPerPageChange = (event) => setItemsPerPage(parseInt(event.target.value, 10));

    // Handler para ordenação 
    const handleSortChange = (field) => setSort(field);

    // Estado de loading
    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    // Estado de erro
    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Alert
                    severity="error"
                    variant="filled"
                    sx={{ maxWidth: 500 }}
                    action={
                        <Button color="inherit" size="small" onClick={refreshDocuments}>
                            <RefreshIcon sx={{ mr: 0.5 }} />
                            Tentar novamente
                        </Button>
                    }
                >
                    {error}
                </Alert>
            </Box>
        );
    }

    // Estado vazio: sem documentos
    if (!hasDocuments) {
        return (
            <EmptyState
                searchTerm={searchTerm}
                onCreateDocument={handleOpenCreateModal}
            />
        );
    }

    // Renderizar visualização apropriada
    const viewProps = {
        documents: paginatedDocs,
        allDocuments: filteredAndSortedDocs, // Para o KanbanView
        metaData,
        searchTerm,
        onSearchChange: setSearchTerm,
        onRefresh: refreshDocuments,
        onCreateDocument: handleOpenCreateModal,
        isAssignedToMe: activeTab === 1,
        showComprovativo: canDownloadComprovativo,
        onViewDetails: handleViewDetails,
        onAddStep: canAddStep ? handleAddStep : null,
        onAddAnnex: canAddAnnex ? handleAddAnnex : null,
        onReplicate: canReplicate ? handleReplicate : null,
        onDownloadComprovativo: handleDownloadCompr,
        density,
        page,
        itemsPerPage,
        totalItems: filteredAndSortedDocs.length,
        onPageChange: handlePageChange,
        onItemsPerPageChange: handleItemsPerPageChange,
        sortBy,
        sortDirection,
        onSort: handleSortChange
    };

    switch (viewMode) {
        case 'grid':
            return <GridView {...viewProps} />;
        case 'list':
            return <ListView {...viewProps} />;
        case 'kanban':
            return <KanbanView {...viewProps} />;
        default:
            return <GridView {...viewProps} />;
    }
};

// Componente para estado vazio
const EmptyState = ({ searchTerm, onCreateDocument }) => {
    return (
        <Paper
            sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300
            }}
        >
            <Box sx={{ textAlign: 'center', mb: 3, mt: 2 }}>
                <img
                    src="/static/images/empty-folder.svg"
                    alt="Sem documentos"
                    style={{ width: 120, height: 120, opacity: 0.5 }}
                />
                <Box sx={{ mt: 2 }}>
                    <Alert severity="info">
                        {searchTerm
                            ? 'Nenhum pedido corresponde aos critérios de pesquisa ou filtros.'
                            : 'Não há pedidos disponíveis nesta seção.'}
                    </Alert>
                </Box>
            </Box>

            <Button
                variant="contained"
                color="primary"
                onClick={onCreateDocument}
            >
                Criar Novo Pedido
            </Button>
        </Paper>
    );
};

export default DocumentView;