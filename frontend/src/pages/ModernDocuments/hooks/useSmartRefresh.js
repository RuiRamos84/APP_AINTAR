// frontend/src/pages/ModernDocuments/hooks/useSmartRefresh.js
import { useCallback, useRef } from 'react';
import { useDocumentsContext } from '../context/DocumentsContext';

export const useSmartRefresh = () => {
    const refreshQueue = useRef(new Set());
    const {
        fetchAllDocuments,
        fetchAssignedDocuments,
        fetchCreatedDocuments,
        updateDocumentInList,
        refreshDocument
    } = useDocumentsContext();

    const enqueueRefresh = useCallback((refreshType, documentId = null) => {
        refreshQueue.current.add({ type: refreshType, documentId });
    }, []);

    const processRefreshQueue = useCallback(async () => {
        const queue = Array.from(refreshQueue.current);
        refreshQueue.current.clear();

        // Agrupar atualizações por tipo
        const hasListUpdate = queue.some(item =>
            ['all', 'assigned', 'created'].includes(item.type)
        );

        const documentUpdates = queue
            .filter(item => item.type === 'document')
            .map(item => item.documentId);

        // Executar atualizações otimizadas
        const promises = [];

        if (hasListUpdate) {
            if (queue.some(item => item.type === 'all')) promises.push(fetchAllDocuments());
            if (queue.some(item => item.type === 'assigned')) promises.push(fetchAssignedDocuments());
            if (queue.some(item => item.type === 'created')) promises.push(fetchCreatedDocuments());
        }

        // Atualizar documentos individuais
        documentUpdates.forEach(docId => {
            promises.push(refreshDocument(docId));
        });

        await Promise.all(promises);
    }, [fetchAllDocuments, fetchAssignedDocuments, fetchCreatedDocuments, refreshDocument]);

    const smartRefresh = useCallback((action, context = {}) => {
        const { documentId, tabType, statusChanged, ownerChanged } = context;

        switch (action) {
            case 'ADD_STEP':
                // Atualizar sempre o documento e lista "para tratamento"
                enqueueRefresh('document', documentId);
                if (statusChanged) {
                    enqueueRefresh('assigned');
                    enqueueRefresh('all');
                }
                break;

            case 'ADD_ANNEX':
                // Só atualizar o documento
                enqueueRefresh('document', documentId);
                break;

            case 'REPLICATE':
                // Atualizar todas as listas
                enqueueRefresh('all');
                enqueueRefresh('created');
                break;

            case 'UPDATE_PARAMS':
                // Só atualizar o documento
                enqueueRefresh('document', documentId);
                break;

            case 'CREATE_DOCUMENT':
                // Atualizar todas as listas
                enqueueRefresh('all');
                enqueueRefresh('created');
                break;

            case 'UPDATE_STATUS':
                // Atualizar documento e listas afetadas
                enqueueRefresh('document', documentId);
                enqueueRefresh('all');
                if (statusChanged) enqueueRefresh('assigned');
                break;

            default:
                // Refresh completo como fallback
                enqueueRefresh('all');
                enqueueRefresh('assigned');
                enqueueRefresh('created');
        }

        // Processar queue com debounce
        setTimeout(processRefreshQueue, 100);
    }, [enqueueRefresh, processRefreshQueue]);

    return { smartRefresh };
};