import React, { useState, useCallback, useMemo } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Snackbar,
    Alert,
    useMediaQuery,
    useTheme
} from '@mui/material';

// Components
import Header from './components/layout/Header';
import GridView from './views/GridView';
import ListView from './views/ListView';
import KanbanView from './views/KanbanView';

// Modals
import CreateDocumentModal from './modals/create/CreateDocumentModal';
import DocumentModal from './modals/details/DocumentModal';
import AddStepModal from './modals/AddStepModal';
import AddAnnexModal from './modals/AddAnnexModal';
import ReplicateDocumentModal from './modals/ReplicateDocumentModal';

// Contexts
import { UIProvider, useUI } from './context/UIStateContext';
import { DocumentsProvider, useDocumentsContext } from './context/DocumentsContext';
import { DocumentActionsProvider, useDocumentActions } from './context/DocumentActionsContext';

// Utils
import DocumentFilters from './components/filters/DocumentFilters';
import DocumentSorting from './components/filters/DocumentSorting';
import * as XLSX from 'xlsx';

// Importar funções existentes para utilizar
import { filterDocuments, sortDocuments, formatDate } from './utils/documentUtils';
import { getStatusName, getStatusColor } from './utils/statusUtils';

const DocumentManagerContent = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [currentDocument, setCurrentDocument] = useState(null);

    // Get document context data
    const {
        activeTab,
        setActiveTab,
        allDocuments,
        assignedDocuments,
        createdDocuments,
        lateDocuments,
        getActiveLoading,
        refreshDocuments,
        metaData,
        notification,
        handleCloseNotification,
        showNotification
    } = useDocumentsContext();

    // Get UI context data
    const {
        viewMode,
        density,
        setViewMode,
        setDensity,
        searchTerm,
        setSearchTerm,
        toggleFilters,
        showFilters,
        toggleSorting,
        showSorting,
        sortBy,
        sortDirection,
        setSort,
        filters,
        dateRange,
        setDateRange,
        setFilter,
        resetFilters,
    } = useUI();

    // Get document actions context data
    const {
        selectedDocument,
        modalState,
        handleViewDetails,
        handleViewOriginDetails,
        handleAddStep,
        handleAddAnnex,
        handleReplicate,
        handleDownloadCompr,
        handleOpenCreateModal,
        handleCloseDocumentModal,
        handleCloseStepModal,
        handleCloseAnnexModal,
        handleCloseReplicateModal,
        handleCloseCreateModal,
        openDocuments,
        modalInstanceKey,
    } = useDocumentActions();

    // Handler simples
    const handleUpdateDocument = useCallback((newDocument) => {
        setCurrentDocument(newDocument);
    }, []);

    // Handler para o sort
    const handleSortChange = useCallback((field) => {
        setSort(field);
    }, [setSort]);

    // Handler para dateRange
    const handleDateRangeChange = useCallback((newDateRange) => {
        setDateRange(newDateRange);
    }, [setDateRange]);

    // Reset de filtros
    const resetAllFilters = useCallback(() => {
        resetFilters();
        setDateRange({ startDate: null, endDate: null });
    }, [resetFilters, setDateRange]);

    // ===== FUNÇÕES DE FILTRO =====

    // Função para filtrar por status
    const filterDocumentsByStatus = useCallback((docs, statusFilter) => {
        if (!statusFilter || statusFilter === '') return docs;

        const statusValue = Number(statusFilter);
        return docs.filter(doc => {
            const docWhat = typeof doc.what === 'number' ? doc.what : Number(doc.what);
            return docWhat === statusValue;
        });
    }, []);

    // Função para filtrar por associado
    const filterDocumentsByAssociate = useCallback((docs, associateFilter, metaData) => {
        if (!associateFilter || associateFilter === '') return docs;

        const selectedAssociate = metaData?.associates?.find(a => a.pk === Number(associateFilter));
        if (!selectedAssociate) return docs;

        return docs.filter(doc => {
            const docAssociateText = doc.ts_associate?.toString().trim().toLowerCase() || '';
            const associateText = selectedAssociate.name?.toString().trim().toLowerCase() || '';

            return docAssociateText.includes(associateText) ||
                associateText.includes(docAssociateText) ||
                docAssociateText.replace('município de ', '').includes(associateText) ||
                associateText.includes(docAssociateText.replace('município de ', ''));
        });
    }, []);

    // Função para filtrar por tipo
    const filterDocumentsByType = useCallback((docs, typeFilter, metaData) => {
        if (!typeFilter || typeFilter === '') return docs;

        const selectedType = metaData?.types?.find(t => t.pk === Number(typeFilter));
        if (!selectedType) return docs;

        return docs.filter(doc => {
            const docTypeText = doc.tt_type?.toString().trim().toLowerCase() || '';
            const typeText = selectedType.tt_doctype_value?.toString().trim().toLowerCase() || '';

            return docTypeText === typeText ||
                docTypeText.includes(typeText) ||
                typeText.includes(docTypeText);
        });
    }, []);

    // Função para filtrar por notificação
    const filterDocumentsByNotification = useCallback((docs, notificationFilter) => {
        if (!notificationFilter || notificationFilter === '') return docs;

        const notificationValue = Number(notificationFilter);
        return docs.filter(doc => {
            const docNotification = typeof doc.notification === 'number' ?
                doc.notification : Number(doc.notification);
            return docNotification === notificationValue;
        });
    }, []);

    // Função para filtrar por datas
    const filterDocumentsByDateRange = useCallback((docs, dateRange) => {
        if (!dateRange.startDate && !dateRange.endDate) return docs;

        return docs.filter(doc => {
            if (!doc.submission) return true;

            try {
                // Extrair apenas a parte da data (antes de "às")
                const datePartStr = doc.submission.split(' às ')[0];
                if (!datePartStr) return true;

                const dateParts = datePartStr.split('-');
                if (dateParts.length !== 3) return true;

                const docYear = parseInt(dateParts[0], 10);
                const docMonth = parseInt(dateParts[1], 10);
                const docDay = parseInt(dateParts[2], 10);

                // Comparação com a data inicial
                if (dateRange.startDate) {
                    const startParts = dateRange.startDate.split('-');
                    if (startParts.length === 3) {
                        const startYear = parseInt(startParts[0], 10);
                        const startMonth = parseInt(startParts[1], 10);
                        const startDay = parseInt(startParts[2], 10);

                        if (docYear < startYear) return false;
                        if (docYear === startYear && docMonth < startMonth) return false;
                        if (docYear === startYear && docMonth === startMonth && docDay < startDay) return false;
                    }
                }

                // Comparação com a data final
                if (dateRange.endDate) {
                    const endParts = dateRange.endDate.split('-');
                    if (endParts.length === 3) {
                        const endYear = parseInt(endParts[0], 10);
                        const endMonth = parseInt(endParts[1], 10);
                        const endDay = parseInt(endParts[2], 10);

                        if (docYear > endYear) return false;
                        if (docYear === endYear && docMonth > endMonth) return false;
                        if (docYear === endYear && docMonth === endMonth && docDay > endDay) return false;
                    }
                }

                return true;
            } catch (error) {
                console.error(`Erro ao processar data: ${doc.submission}`, error);
                return true;
            }
        });
    }, []);

    // ===== FUNÇÃO PRINCIPAL PARA OBTER DOCUMENTOS ATIVOS =====
    // IMPORTANTE: Esta função deve estar definida ANTES de qualquer função que a utilize
    const getActiveDocuments = useCallback(() => {
        // 1. Selecionar documentos base conforme a tab ativa
        let docs;
        switch (activeTab) {
            case 0: docs = allDocuments; break;
            case 1: docs = assignedDocuments; break;
            case 2: docs = createdDocuments; break;
            case 3: docs = lateDocuments; break;
            default: docs = allDocuments;
        }

        // 2. Aplicar filtros em sequência
        if (filters.status) {
            docs = filterDocumentsByStatus(docs, filters.status);
        }

        if (filters.associate) {
            docs = filterDocumentsByAssociate(docs, filters.associate, metaData);
        }

        if (filters.type) {
            docs = filterDocumentsByType(docs, filters.type, metaData);
        }

        if (filters.notification !== undefined && filters.notification !== '') {
            docs = filterDocumentsByNotification(docs, filters.notification);
        }

        // Aplicar filtro de datas
        docs = filterDocumentsByDateRange(docs, dateRange);

        // Aplicar filtro de busca textual
        if (searchTerm) {
            docs = filterDocuments(docs, searchTerm);
        }

        // 3. Aplicar ordenação
        if (sortBy && sortDirection) {
            docs = sortDocuments(docs, sortBy, sortDirection);
        }

        return docs;
    }, [
        activeTab,
        allDocuments,
        assignedDocuments,
        createdDocuments,
        lateDocuments,
        filters,
        dateRange,
        searchTerm,
        sortBy,
        sortDirection,
        metaData,
        filterDocumentsByStatus,
        filterDocumentsByAssociate,
        filterDocumentsByType,
        filterDocumentsByNotification,
        filterDocumentsByDateRange
    ]);

    // Function to export filtered data to Excel - AGORA definida APÓS getActiveDocuments
    const handleExportToExcel = useCallback(() => {
        try {
            // Obter documentos filtrados atuais
            const documents = getActiveDocuments();

            if (documents.length === 0) {
                showNotification('Não existem documentos para exportar', 'warning');
                return;
            }

            // Formatar documentos para Excel
            const excelData = documents.map(doc => ({
                'Número': doc.regnumber || '',
                'Data': doc.submission || '',
                'Entidade': doc.ts_entity || '',
                'Associado': doc.ts_associate || '',
                'Status': getStatusName(doc.what, metaData?.what) || '',
                'Tipo': doc.tt_type || '',
                'Criador': doc.creator || ''
            }));

            // Criar planilha
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            worksheet['!cols'] = [
                { wch: 15 }, // Número
                { wch: 15 }, // Data
                { wch: 25 }, // Entidade
                { wch: 25 }, // Associado
                { wch: 20 }, // Status
                { wch: 25 }, // Tipo
                { wch: 20 }  // Criador
            ];

            // Criar workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');

            // Nome de ficheiro com data atual
            const date = new Date().toISOString().split('T')[0];
            const tabName = activeTab === 0 ? 'Todos' : activeTab === 1 ? 'Tratamento' : 'CriadosPorMim';
            const filename = `Pedidos_${tabName}_${date}.xlsx`;

            // Exportar ficheiro
            XLSX.writeFile(workbook, filename);
            showNotification('Exportação para Excel concluída com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            showNotification('Erro ao exportar dados para Excel', 'error');
        }
    }, [activeTab, getActiveDocuments, metaData, showNotification]);

    // Render content based on view mode
    const renderContent = useCallback(() => {
        const documents = getActiveDocuments();
        const isLoading = getActiveLoading();
        const isAssignedTab = activeTab === 1;
        const isCreatedTab = activeTab === 2;
        const isLateTab = activeTab === 3;

        // Adicionar um key que inclui ordenação para forçar a atualização
        const renderKey = `${viewMode}-${sortBy}-${sortDirection}`;

        const viewProps = {
            documents,
            metaData,
            loading: isLoading,
            density,
            isAssignedToMe: isAssignedTab,
            showComprovativo: isCreatedTab, 
            showLateDocuments: isLateTab,
            isLateDocuments: isLateTab,
            onViewDetails: handleViewDetails,
            onAddStep: handleAddStep,
            onAddAnnex: handleAddAnnex,
            onReplicate: handleReplicate,
            onDownloadComprovativo: handleDownloadCompr
        };

        switch (viewMode) {
            case 'grid': return <GridView key={renderKey} {...viewProps} />;
            case 'list': return <ListView key={renderKey} {...viewProps} />;
            case 'kanban': return <KanbanView key={renderKey} {...viewProps} />;
            default: return <GridView key={renderKey} {...viewProps} />;
        }
    }, [
        getActiveDocuments,
        getActiveLoading,
        activeTab,
        viewMode,
        sortBy,
        sortDirection,
        density,
        metaData,
        handleViewDetails,
        handleAddStep,
        handleAddAnnex,
        handleReplicate,
        handleDownloadCompr
    ]);

    // Renderizar os modais de documentos em cascata
    const renderDocumentModals = useCallback(() => {
        if (!openDocuments || openDocuments.length === 0) {
            return null;
        }

        // Determina o tipo de tab baseado no activeTab
        const tabType = activeTab === 0 ? 'all' : activeTab === 1 ? 'assigned' : 'created';

        return openDocuments.map((docData, index) => (
            <DocumentModal
                key={`modal_${docData.document?.pk || 'unknown'}_${docData.modalInstanceKey}`}
                open={true}
                onClose={() => handleCloseDocumentModal(docData.modalInstanceKey)}
                document={docData.document}
                metaData={metaData}
                onAddStep={handleAddStep}
                onAddAnnex={handleAddAnnex}
                onReplicate={handleReplicate}
                onDownloadComprovativo={handleDownloadCompr}
                modalKey={docData.modalInstanceKey}
                onUpdateDocument={handleUpdateDocument}
                onViewOriginDocument={handleViewOriginDetails}
                tabType={tabType}
                style={{
                    zIndex: 1300 + index
                }}
            />
        ));
    }, [
        openDocuments,
        activeTab,
        metaData,
        handleCloseDocumentModal,
        handleAddStep,
        handleAddAnnex,
        handleReplicate,
        handleDownloadCompr,
        handleUpdateDocument,
        handleViewOriginDetails
    ]);

    // Memoize the filtered document counts
    const documentCounts = useMemo(() => {
        const filterBySearch = (docs) => filterDocuments(docs, searchTerm);

        return {
            all: filterBySearch(allDocuments).length,
            assigned: filterBySearch(assignedDocuments).length,
            created: filterBySearch(createdDocuments).length,
            late: filterBySearch(lateDocuments).length
        };
    }, [allDocuments, assignedDocuments, createdDocuments, lateDocuments, searchTerm]);

    return (
        <Box sx={{ p: 2 }}>
            {/* Header with title and buttons */}
            <Header
                title="Gestão de Pedidos"
                isMobileView={isMobile}
                refreshDocuments={refreshDocuments}
                isLoading={getActiveLoading()}
                showFilters={showFilters}
                toggleFilters={toggleFilters}
                showSorting={showSorting}
                toggleSorting={toggleSorting}
                handleExportToExcel={handleExportToExcel}
                density={density}
                setDensity={setDensity}
                sortBy={sortBy}
                sortDirection={sortDirection}
                handleSortChange={handleSortChange}
                viewMode={viewMode}
                setViewMode={setViewMode}
                handleOpenCreateModal={handleOpenCreateModal}
            />
            <Box sx={{ mt: 2 }}>
                <DocumentFilters
                    open={showFilters}
                    filters={filters}
                    metaData={metaData}
                    onFilterChange={(e) => setFilter(e.target.name, e.target.value)}
                    onResetFilters={resetAllFilters}
                    onExportExcel={handleExportToExcel}
                    dateRange={dateRange}
                    onDateRangeChange={handleDateRangeChange}
                    density={density}
                />
            </Box>
            <Box sx={{ mt: 2 }}>
                <DocumentSorting
                    open={showSorting}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    onSortChange={(field) => setSort(field)}
                    density={density}
                />
            </Box>

            {/* Tabs with counts */}
            <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="fullWidth"
            >
                <Tab label={`Todos (${documentCounts.all})`} />
                <Tab label={`Para tratamento (${documentCounts.assigned})`} />
                <Tab label={`Criados por mim (${documentCounts.created})`} />
                <Tab
                    label={`Em atraso (${documentCounts.late})`}
                    sx={{
                        color: documentCounts.late > 0 ? 'error.main' : 'inherit',
                        fontWeight: documentCounts.late > 0 ? 'bold' : 'normal'
                    }}
                />
            </Tabs>

            {/* Content area */}
            <Box sx={{ mt: 2 }}>
                {renderContent()}
            </Box>

            {/* Modais em cascata para os documentos */}
            {renderDocumentModals()}

            {/* Outros modais */}
            <AddStepModal
                open={modalState.step}
                onClose={handleCloseStepModal}
                document={selectedDocument}
                metaData={metaData}
            />

            <AddAnnexModal
                open={modalState.annex}
                onClose={handleCloseAnnexModal}
                document={selectedDocument}
            />

            <ReplicateDocumentModal
                open={modalState.replicate}
                onClose={handleCloseReplicateModal}
                document={selectedDocument}
                metaData={metaData}
            />

            <CreateDocumentModal
                open={modalState.create}
                onClose={handleCloseCreateModal}
            />

            {/* Notifications */}
            <Snackbar
                open={notification.open}
                autoHideDuration={3000}
                onClose={handleCloseNotification}
            >
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification.severity}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

// App component with providers
const DocumentManager = () => (
    <UIProvider>
        <DocumentsProvider>
            <DocumentActionsProvider>
                <DocumentManagerContent />
            </DocumentActionsProvider>
        </DocumentsProvider>
    </UIProvider>
);

export default DocumentManager;