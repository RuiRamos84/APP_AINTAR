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
        refreshDocument,
        refreshDocumentSelective
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
        const needsAssignedRefresh = queue.some(item =>
            item.type === 'assigned' ||
            (item.affectsAssigned && !needsAllRefresh)
        );
        const needsCreatedRefresh = queue.some(item =>
            item.type === 'created' ||
            (item.affectsCreated && !needsAllRefresh)
        );

        // Documentos individuais para atualizar
        const documentUpdates = queue
            .filter(item => item.type === 'document' && item.documentId)
            .reduce((acc, item) => {
                if (!acc[item.documentId]) {
                    acc[item.documentId] = {
                        id: item.documentId,
                        sections: new Set(),
                        shouldRefreshDetails: false
                    };
                }

                // Adicionar seções específicas a atualizar
                if (item.sections && Array.isArray(item.sections)) {
                    item.sections.forEach(section => acc[item.documentId].sections.add(section));
                }

                // Marcar para atualização completa se necessário
                if (item.fullRefresh) {
                    acc[item.documentId].shouldRefreshDetails = true;
                }

                return acc;
            }, {});

        // Executar atualizações em paralelo
        const promises = [];

        if (needsAllRefresh) promises.push(fetchAllDocuments());
        if (needsAssignedRefresh) promises.push(fetchAssignedDocuments());
        if (needsCreatedRefresh) promises.push(fetchCreatedDocuments());

        // Atualizar documentos individuais
        Object.values(documentUpdates).forEach(docUpdate => {
            if (docUpdate.shouldRefreshDetails || docUpdate.sections.size === 0) {
                // Atualização completa do documento
                promises.push(refreshDocument(docUpdate.id));
            } else {
                // Atualização seletiva apenas das seções necessárias
                promises.push(refreshDocumentSelective(
                    docUpdate.id,
                    Array.from(docUpdate.sections)
                ));
            }

            // Disparar evento com informações detalhadas sobre o que foi atualizado
            window.dispatchEvent(new CustomEvent('document-refreshed', {
                detail: {
                    documentId: docUpdate.id,
                    updatedSections: Array.from(docUpdate.sections),
                    isFullUpdate: docUpdate.shouldRefreshDetails
                }
            }));
        });

        try {
            await Promise.all(promises);
            console.log('[SmartRefresh] Atualização concluída');
        } catch (error) {
            console.error('[SmartRefresh] Erro ao atualizar dados:', error);
        }
    }, [fetchAllDocuments, fetchAssignedDocuments, fetchCreatedDocuments, refreshDocument, refreshDocumentSelective]);

    const smartRefresh = useCallback((action, context = {}) => {
        const {
            documentId,
            statusChanged,
            documentTypeChanged,
            ownerChanged,
            affectsAssigned = false,
            affectsCreated = false
        } = context;

        console.log(`[SmartRefresh] Ação: ${action}, Contexto:`, context);

        switch (action) {
            case 'ADD_STEP':
                // Atualiza o documento específico
                enqueueRefresh('document', {
                    documentId,
                    sections: ['steps'],
                    affectsAssigned,
                    affectsCreated
                });

                // Se o status mudou, atualizar listas apenas se necessário
                if (statusChanged) {
                    if (affectsAssigned) enqueueRefresh('assigned');
                    enqueueRefresh('all');
                }
                break;

            case 'ADD_ANNEX':
                // Apenas atualiza os anexos do documento específico
                enqueueRefresh('document', {
                    documentId,
                    sections: ['annexes']
                });
                break;

            case 'REPLICATE':
                // Um novo documento foi criado, atualizar listas relevantes
                enqueueRefresh('all');
                enqueueRefresh('created');
                break;

            case 'CREATE_DOCUMENT':
                // Novo documento criado
                enqueueRefresh('all');
                enqueueRefresh('created');
                break;

            case 'UPDATE_PARAMS':
                // Apenas atualiza os parâmetros do documento
                enqueueRefresh('document', {
                    documentId,
                    sections: ['params']
                });
                break;

            case 'UPDATE_STATUS':
                // Atualiza documento e possivelmente listas
                enqueueRefresh('document', {
                    documentId,
                    sections: ['details', 'steps'],
                    affectsAssigned,
                    affectsCreated
                });

                if (statusChanged) {
                    enqueueRefresh('all');
                    if (affectsAssigned) enqueueRefresh('assigned');
                }
                break;

            case 'UPDATE_PAYMENT':
                // Atualiza apenas informações de pagamento
                enqueueRefresh('document', {
                    documentId,
                    sections: ['payment']
                });
                break;

            case 'FULL_DOCUMENT_UPDATE':
                // Atualização completa de um documento
                enqueueRefresh('document', {
                    documentId,
                    fullRefresh: true
                });
                break;

            default:
                // Fallback mais inteligente baseado no contexto
                if (documentId) {
                    // Se temos ID do documento, priorizar atualização específica
                    enqueueRefresh('document', {
                        documentId,
                        fullRefresh: true,
                        affectsAssigned,
                        affectsCreated
                    });

                    // Atualizar listas apenas se necessário
                    if (statusChanged || documentTypeChanged || ownerChanged) {
                        enqueueRefresh('all');
                        if (affectsAssigned) enqueueRefresh('assigned');
                        if (affectsCreated) enqueueRefresh('created');
                    }
                } else {
                    // Sem ID específico, atualizar tudo
                    enqueueRefresh('all');
                    enqueueRefresh('assigned');
                    enqueueRefresh('created');
                }
        }

        // Debounce o processamento da fila para colapsar múltiplas atualizações
        if (queueProcessingTimeout.current) {
            clearTimeout(queueProcessingTimeout.current);
        }
        queueProcessingTimeout.current = setTimeout(processRefreshQueue, 300);
    }, [enqueueRefresh, processRefreshQueue]);

    return { smartRefresh };
};