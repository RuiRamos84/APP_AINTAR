// frontend/src/pages/ModernDocuments/hooks/useDocumentListener.js
import { useEffect, useCallback } from 'react';

export const useDocumentListener = (documentId, onUpdate, dependencies = []) => {
    const handleDocumentUpdate = useCallback((event) => {
        if (event.detail && (
            event.detail.documentId === documentId ||
            event.detail.documentId === String(documentId)
        )) {
            onUpdate(event.detail);
        }
    }, [documentId, onUpdate]);

    useEffect(() => {
        window.addEventListener('document-updated', handleDocumentUpdate);
        window.addEventListener('document-refreshed', handleDocumentUpdate);

        return () => {
            window.removeEventListener('document-updated', handleDocumentUpdate);
            window.removeEventListener('document-refreshed', handleDocumentUpdate);
        };
    }, [handleDocumentUpdate, ...dependencies]);
};