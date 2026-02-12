import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import DocumentsLayout from './DocumentsLayout';
import DocumentList from '../components/list/DocumentList';
import DocumentGrid from '../components/card/DocumentGrid';
import DocumentKanban from '../components/kanban/DocumentKanban';
import { useDocumentsStore } from '../store/documentsStore';
import { useDocuments, useClearNotification } from '../hooks/useDocuments';
import { filterDocuments, sortDocuments } from '../utils/documentUtils';
import LateDocumentsAlert from '../components/alerts/LateDocumentsAlert';
import { exportDocumentsToExcel } from '../utils/excelExport';
import { useMetaData } from '@/core/hooks/useMetaData';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from '../components/keyboard/KeyboardShortcutsHelp';
import AddStepModal from '../components/modals/AddStepModal';

// Lazy-loaded modals (only loaded when opened)
const CreateDocumentModal = lazy(() => import('../components/forms/CreateDocumentModal'));
const DocumentDetailsModal = lazy(() => import('../components/details/DocumentDetailsModal'));

/**
 * Main Documents Page
 */
const DocumentsPage = () => {
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
  const [kanbanStepDoc, setKanbanStepDoc] = useState(null);

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

  // Client-side Filter & Sort
  const processedDocuments = useMemo(() => {
    let result = filterDocuments(documents, filters, searchTerm, dateRange);
    result = sortDocuments(result, sortConfig);
    return result;
  }, [documents, filters, searchTerm, dateRange, sortConfig]);

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

  const TAB_NAMES = ['Todos', 'A_Meu_Cargo', 'Criados_por_Mim', 'Em_Atraso'];

  const handleExport = useCallback(() => {
    exportDocumentsToExcel(processedDocuments, metaData, TAB_NAMES[activeTab] || 'Pedidos');
  }, [processedDocuments, metaData, activeTab]);

  const handleStatusChange = useCallback((docId, newStatus, document) => {
    setKanbanStepDoc({ document, targetStep: newStatus });
  }, []);

  // Keyboard Shortcuts
  const { showHelp, setShowHelp, shortcuts } = useKeyboardShortcuts({
    onCreate: handleOpenCreate,
    onViewModeChange: setViewMode,
  });

  return (
    <>
      <DocumentsLayout onOpenCreate={handleOpenCreate} onExport={handleExport}>
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

              {viewMode === 'list' ? (
                  <DocumentList 
                      documents={processedDocuments} 
                      loading={isLoading}
                      onViewDetails={handleViewDetails}
                  />
              ) : viewMode === 'kanban' ? (
                  <DocumentKanban
                      documents={processedDocuments}
                      onViewDetails={handleViewDetails}
                      onStatusChange={handleStatusChange}
                  />
              ) : (
                  <DocumentGrid 
                      documents={processedDocuments} 
                      loading={isLoading}
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
          />
        )}
      </Suspense>

      <KeyboardShortcutsHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={shortcuts}
      />

      {kanbanStepDoc && (
        <AddStepModal
          open={!!kanbanStepDoc}
          onClose={() => setKanbanStepDoc(null)}
          documentId={kanbanStepDoc.document.pk}
          document={kanbanStepDoc.document}
          initialStep={kanbanStepDoc.targetStep}
        />
      )}
    </>
  );
};

export default DocumentsPage;
