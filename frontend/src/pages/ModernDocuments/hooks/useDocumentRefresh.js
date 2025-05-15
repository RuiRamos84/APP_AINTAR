// Criar um novo ficheiro: useDocumentRefresh.js
import { useCallback, useEffect } from 'react';
import { useDocumentsContext } from '../context/DocumentsContext';

export const useDocumentRefresh = (documentId) => {
    const { refreshSingleDocument, refreshDocuments } = useDocumentsContext();

    const handleDocumentUpdate = useCallback((event) => {
        if (event.detail) {
            const { documentId: updateId, type } = event.detail;

            if (updateId === documentId || updateId === String(documentId)) {
                console.log(`[DEBUG] Documento ${documentId} atualizado: ${type}`);
                refreshSingleDocument(documentId);
            }
        }
    }, [documentId, refreshSingleDocument]);

    useEffect(() => {
        window.addEventListener('document-updated', handleDocumentUpdate);

        return () => {
            window.removeEventListener('document-updated', handleDocumentUpdate);
        };
    }, [handleDocumentUpdate]);

    return {
        refreshDocument: () => refreshSingleDocument(documentId),
        refreshAll: refreshDocuments
    };
};