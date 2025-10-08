import React, { useState, useCallback, useMemo } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Snackbar,
    Alert,
    useMediaQuery,
    useTheme,
    alpha,
} from '@mui/material';
import { Worker } from '@react-pdf-viewer/core';
import { AccessTime as AccessTimeIcon } from '@mui/icons-material';

// Components
import Header from './components/layout/Header';
import GridView from './views/GridView';
import ListView from './views/ListView';
import KanbanView from './views/KanbanView';
import PerformanceMonitor from './components/performance/PerformanceMonitor';
import AdvancedErrorBoundary from './components/errors/AdvancedErrorBoundary';
import KeyboardShortcuts from './components/keyboard/KeyboardShortcuts';

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
import { AdvancedDocumentsProvider, useAdvancedDocuments } from './context/AdvancedDocumentsContext';
// DocumentNotificationProvider agora está no App.js (global)
import TestNotificationButton from './components/notifications/TestNotificationButton';

// Utils
import DocumentFilters from './components/filters/DocumentFilters';
import DocumentSorting from './components/filters/DocumentSorting';
import * as XLSX from 'xlsx';
import { DocumentEventManager, DOCUMENT_EVENTS } from './utils/documentEventSystem';
import { uxAnalytics, trackingUtils } from './utils/uxAnalytics';
import { notifySuccess, notifyError, notifyWarning } from "../../components/common/Toaster/ThemedToaster.js";

// Importar funções existentes para utilizar
import { filterDocuments, sortDocuments, formatDate } from './utils/documentUtils';
import { getStatusName, getStatusColor } from './utils/statusUtils';
import { useTabPermissions } from './hooks/useTabPermissions';

const DocumentManagerContent = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [currentDocument, setCurrentDocument] = useState(null);

    // UX Analytics tracking
    const { trackAction, trackError, trackFlow } = trackingUtils.useTracking('DocumentManager');

    // Hook de permissões para tabs
    const {
        tabPermissions,
        getVisibleTabs,
        getDefaultActiveTab,
        mapVisibleIndexToRealIndex,
        mapRealIndexToVisibleIndex,
        hasAnyPermission
    } = useTabPermissions();

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
        handleCloseNotification
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
        handleCloseStepModal: closeStepModal,
        handleCloseAnnexModal: closeAnnexModal,
        handleCloseReplicateModal,
        handleCloseCreateModal,
        openDocuments,
        modalInstanceKey,
    } = useDocumentActions();

    // Get advanced features context data
    const {
        advancedMode,
        keyboardMode,
        toggleAdvancedMode,
        toggleKeyboardMode,
        isFeatureEnabled
    } = useAdvancedDocuments();

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

    // Handler para os filtros
    const handleFilterChange = useCallback((e) => {
        setFilter(e.target.name, e.target.value);
    }, [setFilter]);

    // Reset de filtros
    const resetAllFilters = useCallback(() => {
        // Criar um novo objeto de data aqui não afeta as dependências
        resetFilters();
        setDateRange({ startDate: null, endDate: null });
    }, [resetFilters, setDateRange]); // Removido o objeto da dependência

    // Handlers para o Header (movidos para o local correto)
    const handleSetDensity = useCallback((newDensity) => setDensity(newDensity), []);
    const handleSetViewMode = useCallback((newViewMode) => setViewMode(newViewMode), []);

    // ===== HANDLERS CORRIGIDOS COM SISTEMA DE EVENTOS =====

    // Handler corrigido para fechar modal de passo
    const handleCloseStepModal = useCallback((success) => {
        closeStepModal();
        // Se success = true, o DocumentModal recebe o evento automaticamente
        if (success) {
            console.log('✅ Passo adicionado - modal principal será actualizado');
        }
    }, [closeStepModal]);

    // Handler corrigido para fechar modal de anexo
    const handleCloseAnnexModal = useCallback((success) => {
        closeAnnexModal();
        // Se success = true, o DocumentModal recebe o evento automaticamente
        if (success) {
            console.log('✅ Anexo adicionado - modal principal será actualizado');
        }
    }, [closeAnnexModal]);

    // Memoize o estado de loading para evitar recálculos e re-renderizações desnecessárias
    const isLoading = useMemo(() => {
        return getActiveLoading();
    }, [getActiveLoading, activeTab, allDocuments, assignedDocuments, createdDocuments, lateDocuments]);

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
        // Check specifically for null/undefined/empty string to avoid issues with filter value 0
        if (notificationFilter === null || notificationFilter === undefined || notificationFilter === '') return docs;
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

    // Handler para mudança de tabs com verificação de permissões
    const handleTabChange = useCallback((event, newVisibleIndex) => {
        const realIndex = mapVisibleIndexToRealIndex(newVisibleIndex);
        const tabNames = ['all', 'assigned', 'created', 'late'];

        // Analytics de mudança de tab
        trackFlow('tab_change', {
            fromTab: tabNames[activeTab] || 'unknown',
            toTab: tabNames[realIndex] || 'unknown'
        });

        setActiveTab(realIndex);
    }, [mapVisibleIndexToRealIndex, setActiveTab, activeTab, trackFlow]);

    // ===== FUNÇÃO PRINCIPAL PARA OBTER DOCUMENTOS ATIVOS =====
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

    // Function to export filtered data to Excel
    const handleExportToExcel = useCallback(async () => {
        const actionTracker = trackAction('export_excel', { documentCount: 0 });

        try {
            // Recriar a lógica de obtenção de documentos aqui para quebrar o ciclo de dependência
            let docs;
            switch (activeTab) {
                case 0: docs = allDocuments; break;
                case 1: docs = assignedDocuments; break;
                case 2: docs = createdDocuments; break;
                case 3: docs = lateDocuments; break;
                default: docs = allDocuments;
            }

            // Aplicar filtros
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
            docs = filterDocumentsByDateRange(docs, dateRange);
            if (searchTerm) {
                docs = filterDocuments(docs, searchTerm);
            }

            // Aplicar ordenação
            const documents = sortDocuments(docs, sortBy, sortDirection);

            if (documents.length === 0) {
                notifyWarning('Não existem documentos para exportar');
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
            notifySuccess('Exportação para Excel concluída com sucesso');

            // Analytics de sucesso
            actionTracker(true, { documentCount: documents.length, filename });

        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            notifyError('Erro ao exportar dados para Excel');

            // Analytics de erro
            actionTracker(false);
            trackError(error, { action: 'export_excel' });
        }
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
        // As funções de filtro são estáveis e podem ser incluídas
        filterDocumentsByStatus, filterDocumentsByAssociate, filterDocumentsByType,
        filterDocumentsByNotification, filterDocumentsByDateRange,
        trackAction, trackError
    ]);

    const renderContent = useCallback(() => {
        const documents = getActiveDocuments();
        // Usar a variável isLoading memoizada
        const isAssignedTab = activeTab === 1;
        const isCreatedTab = activeTab === 2;
        const isLateTab = activeTab === 3;

        const renderKey = `${viewMode}-${sortBy}-${sortDirection}`;

        const viewProps = {
            documents,
            metaData,
            loading: isLoading,
            density,
            isAssignedToMe: isAssignedTab,
            showComprovativo: isCreatedTab,
            isLateDocuments: isLateTab,
            onViewDetails: handleViewDetails,
            onAddStep: handleAddStep,
            onAddAnnex: handleAddAnnex,
            onReplicate: handleReplicate,
            onDownloadComprovativo: handleDownloadCompr,
            onRefresh: refreshDocuments,
            onCreateDocument: handleOpenCreateModal
        };

        switch (viewMode) {
            case 'grid': return <GridView key={renderKey} {...viewProps} />;
            case 'list': return <ListView key={renderKey} {...viewProps} />;
            case 'kanban': return <KanbanView key={renderKey} {...viewProps} />;
            default: return <GridView key={renderKey} {...viewProps} />;
        }
    }, [
        getActiveDocuments,
        isLoading, // Depender da variável memoizada
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
        handleDownloadCompr,
        refreshDocuments,
        handleOpenCreateModal
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

    // Verificação de permissões - se não tem acesso a nenhuma tab, mostrar aviso
    if (!hasAnyPermission) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Alert severity="warning">
                    Não tem permissões para aceder a nenhuma secção de documentos.
                    Contacte o administrador do sistema.
                </Alert>
            </Box>
        );
    }

    return (
        <AdvancedErrorBoundary context="DocumentManager">
            <KeyboardShortcuts
                onCreateDocument={handleOpenCreateModal}
                onRefresh={refreshDocuments}
                onToggleFilters={toggleFilters}
                onToggleSort={toggleSorting}
                onViewModeChange={handleSetViewMode}
                onSearch={() => {}} // SearchBar is handled internally
            >
                <Box sx={{ p: 2 }}>
                {/* Performance Monitor */}
                {isFeatureEnabled('performanceMonitoring') && advancedMode && (
                    <PerformanceMonitor compact={!isMobile} showRecommendations={true} />
                )}

                {/* Header with title and buttons */}
                <Header
                    title="Gestão de Pedidos"
                    isMobileView={isMobile}
                    refreshDocuments={refreshDocuments}
                    isLoading={isLoading}
                    showFilters={showFilters}
                    toggleFilters={toggleFilters}
                    showSorting={showSorting}
                    toggleSorting={toggleSorting}
                    handleExportToExcel={handleExportToExcel}
                    density={density}
                    setDensity={handleSetDensity}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    handleSortChange={handleSortChange}
                    viewMode={viewMode}
                    setViewMode={handleSetViewMode}
                    handleOpenCreateModal={handleOpenCreateModal}
                    // Advanced features
                    advancedMode={advancedMode}
                    keyboardMode={keyboardMode}
                    toggleAdvancedMode={toggleAdvancedMode}
                    toggleKeyboardMode={toggleKeyboardMode}
                />

            {/* Botão flutuante de notificações - teste simples */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 80,
                    right: 20,
                    zIndex: 1000,
                    bgcolor: 'background.paper',
                    borderRadius: '50%',
                    boxShadow: 3
                }}
            >
                <TestNotificationButton />
            </Box>

            <Box sx={{ mt: 2 }}>
                <DocumentFilters
                    open={showFilters}
                    filters={filters}
                    metaData={metaData}
                    onFilterChange={handleFilterChange}
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
                    onSortChange={handleSortChange}
                    density={density}
                />
            </Box>

            {/* Tabs with counts */}
            <Tabs
                value={mapRealIndexToVisibleIndex(activeTab)}
                onChange={handleTabChange}
                variant="fullWidth"
            >
                {getVisibleTabs.map((tab, index) => {
                    const count = tab.key === 'all' ? documentCounts.all :
                                  tab.key === 'assigned' ? documentCounts.assigned :
                                  tab.key === 'created' ? documentCounts.created :
                                  tab.key === 'late' ? documentCounts.late : 0;

                    // Tab especial para documentos em atraso com animação
                    if (tab.key === 'late') {
                        return (
                            <Tab
                                key={tab.key}
                                icon={count > 0 ? <AccessTimeIcon color="error" fontSize="small" /> : null}
                                label={`${tab.label} (${count})`}
                                sx={{
                                    color: count > 0 ? 'error.main' : 'inherit',
                                    fontWeight: count > 0 ? 'bold' : 'normal',
                                    animation: count > 50 ? 'tabPulseCritical 1.5s ease-in-out infinite' :
                                               count > 10 ? 'tabPulseHigh 2s ease-in-out infinite' :
                                               count > 0 ? 'tabPulse 3s ease-in-out infinite' : 'none',
                                    position: 'relative',
                                    overflow: 'visible',
                                    '& .MuiTab-iconWrapper': {
                                        marginBottom: 0,
                                        marginRight: 0.5,
                                        animation: count > 0 ? 'iconSpin 3s ease-in-out infinite' : 'none',
                                    },
                                    '@keyframes tabPulse': {
                                        '0%': {
                                            backgroundColor: 'transparent',
                                            transform: 'scale(1)',
                                            boxShadow: 'none'
                                        },
                                        '50%': {
                                            backgroundColor: alpha(theme.palette.warning.main, 0.08),
                                            transform: 'scale(1.01)',
                                            boxShadow: `0 0 8px ${alpha(theme.palette.warning.main, 0.3)}`
                                        },
                                        '100%': {
                                            backgroundColor: 'transparent',
                                            transform: 'scale(1)',
                                            boxShadow: 'none'
                                        }
                                    },
                                    '@keyframes tabPulseHigh': {
                                        '0%': {
                                            backgroundColor: 'transparent',
                                            transform: 'scale(1)',
                                            boxShadow: 'none'
                                        },
                                        '50%': {
                                            backgroundColor: alpha(theme.palette.error.main, 0.1),
                                            transform: 'scale(1.02)',
                                            boxShadow: `0 0 12px ${alpha(theme.palette.error.main, 0.4)}`
                                        },
                                        '100%': {
                                            backgroundColor: 'transparent',
                                            transform: 'scale(1)',
                                            boxShadow: 'none'
                                        }
                                    },
                                    '@keyframes tabPulseCritical': {
                                        '0%': {
                                            backgroundColor: 'transparent',
                                            transform: 'scale(1)',
                                            boxShadow: 'none'
                                        },
                                        '50%': {
                                            backgroundColor: alpha(theme.palette.error.main, 0.15),
                                            transform: 'scale(1.03)',
                                            boxShadow: `0 0 16px ${alpha(theme.palette.error.main, 0.6)}`
                                        },
                                        '100%': {
                                            backgroundColor: 'transparent',
                                            transform: 'scale(1)',
                                            boxShadow: 'none'
                                        }
                                    },
                                    '@keyframes iconSpin': {
                                        '0%': { transform: 'rotate(0deg)' },
                                        '25%': { transform: 'rotate(-10deg)' },
                                        '75%': { transform: 'rotate(10deg)' },
                                        '100%': { transform: 'rotate(0deg)' }
                                    },
                                    '&::before': count > 0 ? {
                                        content: '""',
                                        position: 'absolute',
                                        top: -2,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: count > 50 ? '80%' : count > 10 ? '60%' : '40%',
                                        height: '3px',
                                        background: count > 50 ? theme.palette.error.dark :
                                                   count > 10 ? theme.palette.error.main :
                                                   theme.palette.warning.main,
                                        borderRadius: '2px',
                                        animation: 'indicatorPulse 2s ease-in-out infinite'
                                    } : {},
                                    '@keyframes indicatorPulse': {
                                        '0%': { opacity: 0.7 },
                                        '50%': { opacity: 1 },
                                        '100%': { opacity: 0.7 }
                                    },
                                    '&::after': count > 0 ? {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.error.main, 0.1)}, transparent)`,
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmerTab 4s ease-in-out infinite',
                                        zIndex: -1,
                                        borderRadius: 'inherit'
                                    } : {},
                                    '@keyframes shimmerTab': {
                                        '0%': { backgroundPosition: '200% 0' },
                                        '100%': { backgroundPosition: '-200% 0' }
                                    }
                                }}
                            />
                        );
                    }

                    // Tabs normais
                    return (
                        <Tab
                            key={tab.key}
                            label={`${tab.label} (${count})`}
                        />
                    );
                })}
            </Tabs>

            {/* Content area */}
            <Box sx={{ mt: 2 }}>
                {renderContent()}
            </Box>

            {/* Modais em cascata para os documentos */}
            {renderDocumentModals()}

            {/* Outros modais com callbacks corrigidos */}
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
            </KeyboardShortcuts>
        </AdvancedErrorBoundary>
    );
};

// App component with providers
const DocumentManager = () => (
    // Configurar o worker do pdf.js globalmente para a versão correta
    <Worker workerUrl="/pdf.worker.min.js">
        <UIProvider>
            <DocumentsProvider>
                <AdvancedDocumentsProvider>
                    <DocumentActionsProvider>
                        <DocumentManagerContent />
                    </DocumentActionsProvider>
                </AdvancedDocumentsProvider>
            </DocumentsProvider>
        </UIProvider>
    </Worker>
);

export default DocumentManager;