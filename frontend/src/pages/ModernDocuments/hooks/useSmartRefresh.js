// frontend/src/pages/ModernDocuments/hooks/useSmartRefresh.js
import { useCallback, useRef, useEffect } from 'react';
import { useDocumentsContext } from '../context/DocumentsContext';

export const useSmartRefresh = () => {
    const refreshQueue = useRef(new Set());
    const queueProcessingTimeout = useRef(null);
    const {
        fetchAllDocuments,
        fetchAssignedDocuments,
        fetchCreatedDocuments,
        refreshDocument
    } = useDocumentsContext();

    // Limpar timeout ao desmontar componente
    useEffect(() => {
        return () => {
            if (queueProcessingTimeout.current) {
                clearTimeout(queueProcessingTimeout.current);
            }
        };
    }, []);

    const enqueueRefresh = useCallback((refreshType, context = {}) => {
        refreshQueue.current.add({ type: refreshType, ...context });
    }, []);

    const processRefreshQueue = useCallback(async () => {
        if (refreshQueue.current.size === 0) return;

        const queue = Array.from(refreshQueue.current);
        refreshQueue.current.clear();

        console.log('[SmartRefresh] Processando fila:', queue);

        // Agrupar operações por tipo
        const needsAllRefresh = queue.some(item => item.type === 'all');
        const needsAssignedRefresh = queue.some(item => item.type === 'assigned');
        const needsCreatedRefresh = queue.some(item => item.type === 'created');

        // Documentos individuais para atualizar
        const documentIds = queue
            .filter(item => item.type === 'document' && item.documentId)
            .map(item => item.documentId);

        // Executar atualizações em paralelo
        const promises = [];

        if (needsAllRefresh) promises.push(fetchAllDocuments());
        if (needsAssignedRefresh) promises.push(fetchAssignedDocuments());
        if (needsCreatedRefresh) promises.push(fetchCreatedDocuments());

        // Atualizar documentos individuais
        const uniqueDocumentIds = [...new Set(documentIds)];
        uniqueDocumentIds.forEach(docId => {
            promises.push(refreshDocument(docId));
        });

        // Disparar eventos para notificar componentes
        if (uniqueDocumentIds.length > 0) {
            uniqueDocumentIds.forEach(docId => {
                window.dispatchEvent(new CustomEvent('document-refreshed', {
                    detail: { documentId: docId }
                }));
            });
        }

        try {
            await Promise.all(promises);
            console.log('[SmartRefresh] Atualização concluída');
        } catch (error) {
            console.error('[SmartRefresh] Erro ao atualizar dados:', error);
        }
    }, [fetchAllDocuments, fetchAssignedDocuments, fetchCreatedDocuments, refreshDocument]);

    const smartRefresh = useCallback((action, context = {}) => {
        const { documentId, statusChanged, documentTypeChanged, ownerChanged } = context;

        console.log(`[SmartRefresh] Ação: ${action}, Contexto:`, context);

        switch (action) {
            case 'ADD_STEP':
                // Sempre atualiza o documento específico
                enqueueRefresh('document', { documentId });

                // Se o status mudou, também atualiza as listas
                if (statusChanged) {
                    enqueueRefresh('assigned');
                    enqueueRefresh('all');
                }
                break;

            case 'ADD_ANNEX':
                // Apenas atualiza o documento específico
                enqueueRefresh('document', { documentId });
                break;

            case 'REPLICATE':
                // Sempre atualiza todas as listas pois um novo documento foi criado
                enqueueRefresh('all');
                enqueueRefresh('created');
                break;

            case 'CREATE_DOCUMENT':
                // Atualiza todas as listas
                enqueueRefresh('all');
                enqueueRefresh('created');
                break;

            case 'UPDATE_PARAMS':
                // Apenas atualiza o documento específico
                enqueueRefresh('document', { documentId });
                break;

            case 'UPDATE_STATUS':
                // Atualiza documento e possivelmente listas
                enqueueRefresh('document', { documentId });

                if (statusChanged) {
                    enqueueRefresh('all');
                    enqueueRefresh('assigned');
                }
                break;

            case 'UPDATE_PAYMENT':
                // Atualiza apenas o documento específico
                enqueueRefresh('document', { documentId });
                break;

            default:
                // Fallback para atualização completa
                enqueueRefresh('all');
                enqueueRefresh('assigned');
                enqueueRefresh('created');
        }

        // Debounce o processamento da fila para colapsar múltiplas atualizações
        if (queueProcessingTimeout.current) {
            clearTimeout(queueProcessingTimeout.current);
        }
        queueProcessingTimeout.current = setTimeout(processRefreshQueue, 300);
    }, [enqueueRefresh, processRefreshQueue]);

    return { smartRefresh };
};