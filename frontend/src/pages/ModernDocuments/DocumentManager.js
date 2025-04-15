import React, { useState, useCallback } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Snackbar,
    Alert,
    useMediaQuery,
    useTheme,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography
} from '@mui/material';

import {
    Dashboard as DashboardIcon,
    Description as DocumentIcon,
    Settings as SettingsIcon,
    Home as HomeIcon
} from '@mui/icons-material';

// Components
import Header from './components/layout/Header';
import Toolbar from './components/layout/Toolbar';
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

import DocumentFilters from './components/filters/DocumentFilters';


const DocumentManagerContent = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [currentDocument, setCurrentDocument] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Get document context data
    const {
        activeTab,
        setActiveTab,
        allDocuments,
        assignedDocuments,
        createdDocuments,
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
        sortBy,
        sortDirection,
        setSort,
        filters,
        setFilter,
        resetFilters,
    } = useUI();

    // Get document actions context data
    const {
        selectedDocument,
        modalState,
        handleViewDetails,
        handleViewOriginDetails, // Adicionar esta linha
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

    
    // Handle sort change
    const handleSortChange = (field) => {
        console.log(`Ordenação clicada: ${field}, atual: ${sortBy}/${sortDirection}`);
        setSort(field);
    };

    const handleUpdateDocument = (newDocument) => {
        setCurrentDocument(newDocument);
    };

    const toggleDrawer = (isOpen) => {
        setDrawerOpen(isOpen);
    };


    // Função para filtrar documentos com base no searchTerm
    const filterDocumentsBySearchTerm = useCallback((documents) => {
        if (!searchTerm) return documents;

        const searchTermLower = searchTerm.toLowerCase();
        return documents.filter(doc =>
            doc.regnumber?.toLowerCase().includes(searchTermLower) ||
            doc.ts_entity?.toLowerCase().includes(searchTermLower) ||
            doc.tt_type?.toLowerCase().includes(searchTermLower) ||
            doc.ts_associate?.toLowerCase().includes(searchTermLower) ||
            (doc.nipc && String(doc.nipc).toLowerCase().includes(searchTermLower)) ||
            (doc.creator && doc.creator.toLowerCase().includes(searchTermLower))
        );
    }, [searchTerm]);

    // Função modificada para obter documentos ativos com filtragem por searchTerm
    const getActiveDocuments = useCallback(() => {
        let docs;
        switch (activeTab) {
            case 0: docs = allDocuments; break;
            case 1: docs = assignedDocuments; break;
            case 2: docs = createdDocuments; break;
            default: docs = allDocuments;
        }

        console.log("Documentos antes de filtrar:", docs.length);
        console.log("Filtros aplicados:", filters);

        // Aplicar filtros - buscar correspondências baseadas em strings ou IDs
        if (filters.status !== '' && filters.status !== undefined) {
            const statusValue = Number(filters.status);
            docs = docs.filter(doc => {
                const docWhat = typeof doc.what === 'number' ? doc.what : Number(doc.what);
                return docWhat === statusValue;
            });
        }

        if (filters.associate !== '' && filters.associate !== undefined) {
            // Buscar informações do associado nos metadados para comparação por texto
            const selectedAssociate = metaData?.associates?.find(a => a.pk === Number(filters.associate));

            if (selectedAssociate) {
                docs = docs.filter(doc => {
                    // Comparar textos de nomes de associados (incluindo remoção do prefixo "Município de")
                    const docAssociateText = doc.ts_associate?.toString().trim().toLowerCase() || '';
                    const associateText = selectedAssociate.name?.toString().trim().toLowerCase() || '';

                    // Verificar se o texto do associado está contido no campo do documento
                    return docAssociateText.includes(associateText) ||
                        associateText.includes(docAssociateText) ||
                        docAssociateText.replace('município de ', '').includes(associateText) ||
                        associateText.includes(docAssociateText.replace('município de ', ''));
                });
            }
        }

        if (filters.type !== '' && filters.type !== undefined) {
            // Buscar informações do tipo nos metadados para comparação por texto
            const selectedType = metaData?.types?.find(t => t.pk === Number(filters.type));

            if (selectedType) {
                docs = docs.filter(doc => {
                    // Comparar textos de tipos
                    const docTypeText = doc.tt_type?.toString().trim().toLowerCase() || '';
                    const typeText = selectedType.tt_doctype_value?.toString().trim().toLowerCase() || '';

                    // Verificar correspondência exata ou parcial
                    return docTypeText === typeText ||
                        docTypeText.includes(typeText) ||
                        typeText.includes(docTypeText);
                });
            }
        }

        if (filters.notification !== '' && filters.notification !== undefined) {
            const notificationValue = Number(filters.notification);
            docs = docs.filter(doc => {
                // Comparar notification como número
                const docNotification = typeof doc.notification === 'number' ?
                    doc.notification : Number(doc.notification);
                return docNotification === notificationValue;
            });
        }

        console.log("Documentos após filtrar:", docs.length);
        docs = filterDocumentsBySearchTerm(docs);
        console.log("Documentos após busca:", docs.length);

        // DEPURAÇÃO: Mostrar alguns documentos antes da ordenação
        console.log("Antes da ordenação - Primeiros 3 docs:", docs.slice(0, 3).map(d => ({
            regnumber: d.regnumber,
            submission: d.submission,
            tt_type: d.tt_type,
            what: d.what
        })));

        // ORDENAÇÃO SIMPLIFICADA
        if (sortBy && sortDirection) {
            console.log(`Ordenando por "${sortBy}" em direção "${sortDirection}"`);

            const multiplier = sortDirection === 'asc' ? 1 : -1;

            // Fazer cópia para não modificar o array original
            docs = [...docs].sort((a, b) => {
                // Extrair valores, garantindo que não sejam undefined
                let valA = a[sortBy] === undefined ? '' : a[sortBy];
                let valB = b[sortBy] === undefined ? '' : b[sortBy];

                // Caso especial para datas
                if (sortBy === 'submission') {
                    const dateA = new Date(valA || 0);
                    const dateB = new Date(valB || 0);
                    return multiplier * (dateA - dateB);
                }

                // Números (incluindo números como strings)
                if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
                    return multiplier * (Number(valA) - Number(valB));
                }

                // Strings - converter para minúsculas para ordenação insensível a maiúsculas/minúsculas
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();

                if (valA < valB) return -1 * multiplier;
                if (valA > valB) return 1 * multiplier;
                return 0;
            });
        }

        // DEPURAÇÃO: Mostrar alguns documentos após a ordenação
        console.log("Após a ordenação - Primeiros 3 docs:", docs.slice(0, 3).map(d => ({
            regnumber: d.regnumber,
            submission: d.submission,
            tt_type: d.tt_type,
            what: d.what
        })));

        return docs;
    }, [
        activeTab,
        allDocuments,
        assignedDocuments,
        createdDocuments,
        filters,
        filterDocumentsBySearchTerm,
        sortBy,
        sortDirection,
        metaData // Importante: adicionei metaData como dependência
    ]);
    
    // Render content based on view mode
    const renderContent = () => {
        const documents = getActiveDocuments();
        const isLoading = getActiveLoading();
        const isAssignedTab = activeTab === 1;

        // Adicionar um key que inclui ordenação para forçar a atualização
        const renderKey = `${viewMode}-${sortBy}-${sortDirection}`;

        const viewProps = {
            documents,
            metaData,
            loading: isLoading,
            density,
            isAssignedToMe: isAssignedTab,
            showComprovativo: true,
            // Pass action handlers from context
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
    };
    

    // Renderizar os modais de documentos em cascata

    const renderDocumentModals = () => {
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
                tabType={tabType} // Adiciona a informação da tab atual
                style={{
                    zIndex: 1300 + index
                }}
            />
        ));
    };

    return (
        <Box sx={{ p: 2 }}>
            {/* Drawer Lateral */}
            {/* <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => toggleDrawer(false)}
            >
                <Box sx={{ width: 250 }}>
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6">Menu Principal</Typography>
                    </Box>
                    <Divider />
                    <List>
                        <ListItem button onClick={() => toggleDrawer(false)}>
                            <ListItemIcon><HomeIcon /></ListItemIcon>
                            <ListItemText primary="Início" />
                        </ListItem>
                        <ListItem button onClick={() => toggleDrawer(false)}>
                            <ListItemIcon><DocumentIcon /></ListItemIcon>
                            <ListItemText primary="Pedidos" />
                        </ListItem>
                        <ListItem button onClick={() => toggleDrawer(false)}>
                            <ListItemIcon><DashboardIcon /></ListItemIcon>
                            <ListItemText primary="Dashboard" />
                        </ListItem>
                        <ListItem button onClick={() => toggleDrawer(false)}>
                            <ListItemIcon><SettingsIcon /></ListItemIcon>
                            <ListItemText primary="Configurações" />
                        </ListItem>
                    </List>
                </Box>
            </Drawer> */}
            {/* Header with title and buttons */}
            <Header
                title="Gestão de Pedidos"
                isMobileView={isMobile}
                refreshDocuments={refreshDocuments}
                isLoading={getActiveLoading()}
                toggleDrawer={toggleDrawer}
                showFilters={showFilters}
                toggleFilters={(value) => toggleFilters(value)} // Garante que o valor seja passado
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
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    metaData={metaData}
                    onFilterChange={(e) => setFilter(e.target.name, e.target.value)}
                    onResetFilters={resetFilters}
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
                <Tab label={`Todos (${filterDocumentsBySearchTerm(allDocuments).length})`} />
                <Tab label={`Para tratamento (${filterDocumentsBySearchTerm(assignedDocuments).length})`} />
                <Tab label={`Criados por mim (${filterDocumentsBySearchTerm(createdDocuments).length})`} />
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