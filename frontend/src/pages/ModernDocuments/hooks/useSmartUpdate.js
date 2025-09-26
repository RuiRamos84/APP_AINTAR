import { useCallback, useRef } from 'react';
import { useDocumentsContext } from '../context/DocumentsContext';
import { notifySuccess, notifyError, notifyWarning, notifyInfo } from "../../../components/common/Toaster/ThemedToaster.js";

/**
 * Hook para atualizações inteligentes com feedback visual imediato
 * Implementa optimistic updates e fallback para melhor UX
 */
export const useSmartUpdate = () => {
    const {
        updateDocumentInList,
        refreshDocumentSelective,
        allDocuments,
        assignedDocuments,
        createdDocuments
    } = useDocumentsContext();

    const updateQueueRef = useRef(new Map());

    /**
     * Update otimista com fallback
     * 1. Atualiza UI imediatamente (optimistic)
     * 2. Faz request real
     * 3. Confirma ou reverte se erro
     */
    const optimisticUpdate = useCallback(async (documentId, optimisticData, updatePromise) => {
        const updateId = `${documentId}_${Date.now()}`;

        try {
            // 1. FEEDBACK IMEDIATO - Atualizar UI
            updateDocumentInList({ ...optimisticData, _optimistic: true });

            // Visual feedback
            notifyInfo('A processar...');

            // 2. REQUEST REAL
            const result = await updatePromise;

            // 3. CONFIRMAÇÃO - Atualizar com dados reais
            if (result?.document) {
                updateDocumentInList({ ...result.document, _optimistic: false });
                notifySuccess('✅ Atualizado com sucesso!');
            } else {
                // Fallback: refresh do servidor
                await refreshDocumentSelective(documentId);
                notifySuccess('✅ Atualizado!');
            }

            return result;

        } catch (error) {
            console.error('Erro no update otimista:', error);

            // 4. ROLLBACK - Reverter para estado anterior
            await refreshDocumentSelective(documentId);
            notifyError('❌ Erro ao atualizar. Dados revertidos.');

            throw error;
        }
    }, [updateDocumentInList, refreshDocumentSelective]);

    /**
     * Update de passo com feedback visual completo
     */
    const updateDocumentStep = useCallback(async (documentId, newStepData, stepPromise) => {
        // Encontrar documento atual
        const currentDoc = [...allDocuments, ...assignedDocuments, ...createdDocuments]
            .find(doc => doc.pk === documentId);

        if (!currentDoc) {
            notifyError('Documento não encontrado');
            return;
        }

        // Dados otimistas
        const optimisticDoc = {
            ...currentDoc,
            what: newStepData.what,
            who: newStepData.who,
            memo: newStepData.memo,
            last_update: new Date().toISOString(),
            _updating: true // Flag para mostrar loading
        };

        return optimisticUpdate(documentId, optimisticDoc, stepPromise);
    }, [allDocuments, assignedDocuments, createdDocuments, optimisticUpdate]);

    /**
     * Update em lote para múltiplos documentos
     */
    const batchUpdate = useCallback(async (updates) => {
        const results = [];

        notifyInfo(`A processar ${updates.length} actualizações...`);

        for (const update of updates) {
            try {
                const result = await optimisticUpdate(
                    update.documentId,
                    update.optimisticData,
                    update.promise
                );
                results.push(result);
            } catch (error) {
                results.push({ error, documentId: update.documentId });
            }
        }

        const successful = results.filter(r => !r.error).length;
        const failed = results.length - successful;

        if (failed === 0) {
            notifySuccess(`✅ ${successful} documentos atualizados!`);
        } else {
            notifyWarning(`⚠️ ${successful} ok, ${failed} com erro`);
        }

        return results;
    }, [optimisticUpdate]);

    return {
        optimisticUpdate,
        updateDocumentStep,
        batchUpdate
    };
};