import React, { createContext, useContext, useState, useCallback } from 'react';
import { useDocumentsContext } from './DocumentsContext';
import { useSmartUpdate } from '../hooks/useSmartUpdate';
import { addDocumentStep, updateDocumentNotification } from '../../../services/documentService';
import { useSocket } from '../../../contexts/SocketContext';
import { notifySuccess, notifyError, notifyWarning } from "../../../components/common/Toaster/ThemedToaster.js";

const EnhancedDocumentActionsContext = createContext();

export const useEnhancedDocumentActions = () => useContext(EnhancedDocumentActionsContext);

/**
 * Context melhorado com UX otimizada e feedback visual
 * Implementa padrões modernos de gestão de estado
 */
export const EnhancedDocumentActionsProvider = ({ children }) => {
    const { activeTab } = useDocumentsContext();
    const { updateDocumentStep, optimisticUpdate } = useSmartUpdate();
    const { emit, isConnected, refreshNotifications } = useSocket();

    const [processingSteps, setProcessingSteps] = useState(new Set());
    const [modalStates, setModalStates] = useState({
        document: new Map(), // documentId -> modalState
        step: false,
        annex: false,
        create: false
    });

    /**
     * MELHORADO: Adicionar passo com UX otimizada
     */
    const handleAddStepEnhanced = useCallback(async (document, stepData) => {
        const stepId = `${document.pk}_${Date.now()}`;

        try {
            // 1. PREVENT DOUBLE SUBMISSION
            if (processingSteps.has(document.pk)) {
                notifyWarning('Já existe um passo em processamento para este documento');
                return;
            }

            setProcessingSteps(prev => new Set(prev).add(document.pk));

            // 2. OPTIMISTIC UPDATE com feedback visual imediato
            const stepPromise = addDocumentStep(document.pk, {
                tb_document: document.pk,
                what: stepData.what,
                who: stepData.who,
                memo: stepData.memo
            });

            // 3. UPDATE UI IMEDIATAMENTE
            const result = await updateDocumentStep(document.pk, stepData, stepPromise);

            // 4. REAL-TIME NOTIFICATIONS
            if (isConnected) {
                emit("new_step_added", {
                    orderId: document.regnumber,
                    userId: stepData.who,
                    documentId: document.pk,
                    stepData
                });
                refreshNotifications();
            }

            // 5. BROADCAST EVENT para outros componentes
            window.dispatchEvent(new CustomEvent('document-step-added', {
                detail: {
                    documentId: document.pk,
                    stepData,
                    result,
                    timestamp: Date.now()
                }
            }));

            // 6. SUCCESS FEEDBACK
            notifySuccess('✅ Passo adicionado! Lista atualizada.');

            return result;

        } catch (error) {
            console.error('Erro ao adicionar passo:', error);

            let errorMessage = 'Erro ao adicionar passo';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }

            notifyError(`❌ ${errorMessage}`);
            throw error;

        } finally {
            // 7. CLEANUP
            setProcessingSteps(prev => {
                const newSet = new Set(prev);
                newSet.delete(document.pk);
                return newSet;
            });
        }
    }, [processingSteps, updateDocumentStep, emit, isConnected, refreshNotifications]);

    /**
     * MELHORADO: View details com notification handling otimizado
     */
    const handleViewDetailsEnhanced = useCallback(async (document) => {
        try {
            // 1. OPTIMISTIC NOTIFICATION UPDATE
            if (document.notification === 1 && activeTab === 1) {

                // Update UI imediatamente
                const optimisticDoc = { ...document, notification: 0 };

                // Request real
                const notificationPromise = updateDocumentNotification(document.pk);

                await optimisticUpdate(document.pk, optimisticDoc, notificationPromise);
            }

            // 2. OPEN MODAL com estado melhorado
            setModalStates(prev => ({
                ...prev,
                document: new Map(prev.document).set(document.pk, {
                    open: true,
                    document: document,
                    timestamp: Date.now()
                })
            }));

        } catch (error) {
            console.error('Erro ao abrir detalhes:', error);
            notifyError('Erro ao abrir detalhes do documento');
        }
    }, [activeTab, optimisticUpdate]);

    /**
     * Close modal com cleanup
     */
    const handleCloseModal = useCallback((documentId, modalType = 'document') => {
        setModalStates(prev => {
            const newStates = { ...prev };

            if (modalType === 'document') {
                const newDocMap = new Map(prev.document);
                newDocMap.delete(documentId);
                newStates.document = newDocMap;
            } else {
                newStates[modalType] = false;
            }

            return newStates;
        });
    }, []);

    /**
     * Get modal state
     */
    const getModalState = useCallback((documentId, modalType = 'document') => {
        if (modalType === 'document') {
            return modalStates.document.get(documentId) || { open: false };
        }
        return modalStates[modalType] || false;
    }, [modalStates]);

    /**
     * Check if document is being processed
     */
    const isProcessing = useCallback((documentId) => {
        return processingSteps.has(documentId);
    }, [processingSteps]);

    const contextValue = {
        // Enhanced actions
        handleAddStepEnhanced,
        handleViewDetailsEnhanced,

        // Modal management
        handleCloseModal,
        getModalState,

        // State queries
        isProcessing,
        processingSteps: Array.from(processingSteps),

        // Raw modal states (for debugging)
        modalStates
    };

    return (
        <EnhancedDocumentActionsContext.Provider value={contextValue}>
            {children}
        </EnhancedDocumentActionsContext.Provider>
    );
};

export default EnhancedDocumentActionsContext;