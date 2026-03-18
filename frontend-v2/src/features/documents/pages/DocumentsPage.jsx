import React, { lazy, Suspense, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import DocumentsLayout from './DocumentsLayout';
import DocumentList from '../components/list/DocumentList';
import DocumentGroupedList from '../components/list/DocumentGroupedList';
import DocumentGrid from '../components/card/DocumentGrid';
import { useDocumentsStore } from '../store/documentsStore';
import { useDocuments, useClearNotification, documentKeys } from '../hooks/useDocuments';
import { filterDocuments, sortDocuments } from '../utils/documentUtils';
import LateDocumentsAlert from '../components/alerts/LateDocumentsAlert';
import { exportDocumentsToExcel } from '../utils/excelExport';
import { useMetaData } from '@/core/hooks/useMetaData';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from '../components/keyboard/KeyboardShortcutsHelp';


// Lazy-loaded modals (only loaded when opened)
const CreateDocumentModal = lazy(() => import('../components/forms/CreateDocumentModal'));
const DocumentDetailsModal = lazy(() => import('../components/details/DocumentDetailsModal'));

/**
 * Main Documents Page
 */
const DocumentsPage = () => {
  const queryClient = useQueryClient();
  const isRefreshing = useIsFetching({ queryKey: ['documents'] }) > 0;
  const {
    activeTab,
    filters,
    dateRange,
    searchTerm,
    sortConfig,
    viewMode,
    setViewMode
  } = useDocumentsStore();

  const { data: metaData } = useMetaData();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Defer search input to avoid blocking render on every keystroke
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Determine which API to call based on activeTab
  const queryType = useMemo(() => {
    switch (activeTab) {
      case 1: return 'assigned';
      case 2: return 'created';
      case 3: return 'late';
      default: return 'all';
    }
  }, [activeTab]);

  // Fetch Data
  const { data: documents, isLoading, error } = useDocuments(queryType);

  // Client-side Filter & Sort (deferredSearchTerm avoids blocking on every keystroke)
  const processedDocuments = useMemo(() => {
    let result = filterDocuments(documents, filters, deferredSearchTerm, dateRange);
    result = sortDocuments(result, sortConfig);
    return result;
  }, [documents, filters, deferredSearchTerm, dateRange, sortConfig]);

  const clearNotificationMutation = useClearNotification();

  // Handlers
  const handleOpenCreate = () => setIsCreateOpen(true);
  const handleCloseCreate = () => setIsCreateOpen(false);

  const handleViewDetails = (doc) => {
     if (doc.notification === 1 || doc.notification === true) {
        clearNotificationMutation.mutate(doc.pk);
     }
     setSelectedDocument(doc);
  };

  const handleCloseDetails = () => {
    setSelectedDocument(null);
  };

  const handleActionSuccess = () => {
    setSelectedDocument(null);
    queryClient.refetchQueries({ queryKey: documentKeys.lists() });
  };

  const handleRefresh = useCallback(() => {
    queryClient.refetchQueries({ queryKey: ['documents'] });
  }, [queryClient]);

  const TAB_NAMES = ['Todos', 'A_Meu_Cargo', 'Criados_por_Mim', 'Em_Atraso'];

  const handleExport = useCallback(() => {
    exportDocumentsToExcel(processedDocuments, metaData, TAB_NAMES[activeTab] || 'Pedidos');
  }, [processedDocuments, metaData, activeTab]);



  // Keyboard Shortcuts
  const { showHelp, setShowHelp, shortcuts } = useKeyboardShortcuts({
    onCreate: handleOpenCreate,
    onViewModeChange: setViewMode,
  });

  return (
    <>
      <DocumentsLayout
        onOpenCreate={handleOpenCreate}
        onExport={handleExport}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      >
        {error ? (
          <Alert severity="error">Erro ao carregar documentos: {error.message}</Alert>
        ) : isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Late Documents Alert — only on "Em Atraso" tab */}
            {activeTab === 3 && queryType === 'late' && (
              <LateDocumentsAlert documents={documents} />
            )}

            {/* Tab "A Meu Cargo" em modo lista → agrupado por estado */}
            {activeTab === 1 && viewMode === 'list' ? (
              <DocumentGroupedList
                documents={processedDocuments}
                loading={isLoading}
                metaData={metaData}
                onViewDetails={handleViewDetails}
              />
            ) : viewMode === 'list' ? (
              <DocumentList
                documents={processedDocuments}
                loading={isLoading}
                metaData={metaData}
                onViewDetails={handleViewDetails}
              />
            ) : (
              <DocumentGrid
                documents={processedDocuments}
                loading={isLoading}
                metaData={metaData}
                onViewDetails={handleViewDetails}
              />
            )}
          </>
        )}
      </DocumentsLayout>

      <Suspense fallback={null}>
        {isCreateOpen && (
          <CreateDocumentModal
            open={isCreateOpen}
            onClose={handleCloseCreate}
          />
        )}

        {selectedDocument && (
          <DocumentDetailsModal
            open={!!selectedDocument}
            onClose={handleCloseDetails}
            documentData={selectedDocument}
            isOwner={activeTab === 1}
            isCreator={activeTab === 2}
            onActionSuccess={handleActionSuccess}
          />
        )}
      </Suspense>

      <KeyboardShortcutsHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={shortcuts}
      />


    </>
  );
};

export default DocumentsPage;
