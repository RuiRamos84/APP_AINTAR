import React, { createContext, useContext, useState, useCallback } from 'react';
import { useDocumentsContext } from '../../ModernDocuments/context/DocumentsContext';
import { isFeatureAvailable } from '../utils/featureUtils';
import { updateDocumentNotification } from '../../../services/documentService';
import { notifySuccess, notifyError, notifyWarning } from "../../../components/common/Toaster/ThemedToaster.js";

// Criar o contexto
const DocumentActionsContext = createContext();

// Hook para usar o contexto
export const useDocumentActions = () => useContext(DocumentActionsContext);

/**
 * Provider para gerenciar ações relacionadas a documentos
 * Centraliza toda a lógica de interações entre componentes e documentos
 */
export const DocumentActionsProvider = ({ children }) => {

    const [modalInstanceKey, setModalInstanceKey] = useState(Date.now());

    // Acessar contexto principal de documentos
    const { refreshDocuments, handleDownloadComprovativo, activeTab, smartUpdateDocument } = useDocumentsContext();

    // Lista de documentos abertos em modais em cascata
    const [openDocuments, setOpenDocuments] = useState([]);

    // Estados locais
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [modalState, setModalState] = useState({
        document: false,
        step: false,
        annex: false,
        replicate: false,
        create: false
    });

    // Verificar disponibilidade de funcionalidade
    const checkFeatureAvailability = useCallback((feature) => {
        const userInfo = {
            id: localStorage.getItem('userId') || '1',
            isAdmin: localStorage.getItem('isAdmin') === 'true'
        };

        const context = {
            activeTab,
            document: selectedDocument,
            user: userInfo
        };

        return isFeatureAvailable(feature, context);
    }, [activeTab, selectedDocument]);

    // Função para fechar todos os modais
    const closeAllModals = useCallback(() => {
        setOpenDocuments([]);
        setModalState({
            document: false,
            step: false,
            annex: false,
            replicate: false,
            create: false
        });
    }, []);

    // Abrir/fechar modais
    const openModal = useCallback((modalName) => {
        // console.log(`[DEBUG] Abrindo modal: ${modalName}`);
        // Primeiro fecha todos os modais e depois abre o específico
        setModalState(prev => {
            // console.log('[DEBUG] Estado anterior do modal:', prev);
            const newState = {
                document: false,
                step: false,
                annex: false,
                replicate: false,
                create: false,
                [modalName]: true
            };
            // console.log('[DEBUG] Novo estado do modal:', newState);
            return newState;
        });
    }, []);

    const closeModal = useCallback((modalName, success = false) => {
        // console.log(`[DEBUG] Fechando modal: ${modalName}`);
        setModalState(prev => {
            const newState = {
                ...prev,
                [modalName]: false
            };
            // console.log('[DEBUG] Novo estado após fechar:', newState);
            return newState;
        });

        if (success) {
            refreshDocuments();
        }

        return success;
    }, [refreshDocuments]);

    // ===== AÇÕES DE DOCUMENTOS =====

    // Ver detalhes (versão normal - substitui documento atual)
    const handleViewDetails = useCallback(async (document) => {
        if (!document) return;

        try {
            // MELHORADO: Smart update para notificações
            if (document.notification === 1 && activeTab === 1) {
                try {
                    // Dados otimistas
                    const optimisticDoc = { ...document, notification: 0, _optimistic: true };

                    // Promise de atualização
                    const updatePromise = updateDocumentNotification(document.pk);

                    // Smart update com feedback imediato
                    await smartUpdateDocument(document.pk, optimisticDoc, updatePromise);

                    document = optimisticDoc; // Usar a versão otimizada para o modal
                } catch (error) {
                    console.error('Erro ao atualizar notificação:', error);
                    // Continuar mesmo se houver erro
                }
            }

            // Definir o documento selecionado
            setSelectedDocument(document);

            // Limpar lista de documentos em cascata
            setOpenDocuments([{
                document,
                modalInstanceKey: Date.now()
            }]);

            // Abrir o modal diretamente
            openModal('document');
        } catch (error) {
            console.error('Erro ao abrir detalhes do documento:', error);
            notifyError('Erro ao abrir detalhes do documento');
        }
    }, [openModal, refreshDocuments, updateDocumentNotification, activeTab]);

    // Ver detalhes em cascata (para documentos de origem)
    const handleViewOriginDetails = useCallback(async (originDocument) => {
        if (!originDocument) return;

        try {
            // MELHORADO: Smart update para notificações
            if (originDocument.notification === 1 && activeTab === 1) {
                try {
                    // Dados otimistas
                    const optimisticDoc = { ...originDocument, notification: 0, _optimistic: true };

                    // Promise de atualização
                    const updatePromise = updateDocumentNotification(originDocument.pk);

                    // Smart update com feedback imediato
                    await smartUpdateDocument(originDocument.pk, optimisticDoc, updatePromise);

                    originDocument = optimisticDoc; // Usar a versão otimizada
                } catch (error) {
                    console.error('Erro ao atualizar notificação:', error);
                    // Continuar mesmo se houver erro
                }
            }

            // Marcar o documento como sendo de origem para referência
            const documentWithMeta = {
                ...originDocument,
                _isOriginDocument: true
            };

            // Adicionar à lista de documentos abertos
            setOpenDocuments(prev => [
                ...prev,
                {
                    document: documentWithMeta,
                    modalInstanceKey: Date.now()
                }
            ]);
        } catch (error) {
            console.error('Erro ao abrir detalhes do documento de origem:', error);
            notifyError('Erro ao abrir detalhes do documento');
        }
    }, [refreshDocuments, updateDocumentNotification, activeTab]);

    // Adicionar passo
    const handleAddStep = useCallback((document) => {
        const targetDoc = document || selectedDocument;

        if (!targetDoc) {
            notifyWarning('Selecione um documento primeiro');
            return;
        }

        if (!checkFeatureAvailability('addStep')) {
            notifyError('Sem permissão para adicionar passos');
            return;
        }

        setSelectedDocument(targetDoc);
        openModal('step');
    }, [selectedDocument, openModal, checkFeatureAvailability]);

    // Adicionar anexo
    const handleAddAnnex = useCallback((document) => {
        const targetDoc = document || selectedDocument;

        if (!targetDoc) {
            notifyWarning('Selecione um documento primeiro');
            return;
        }

        if (!checkFeatureAvailability('addAnnex')) {
            notifyError('Sem permissão para adicionar anexos');
            return;
        }

        setSelectedDocument(targetDoc);
        openModal('annex');
    }, [selectedDocument, openModal, checkFeatureAvailability]);

    // Replicar documento
    const handleReplicate = useCallback((document) => {
        const targetDoc = document || selectedDocument;

        if (!targetDoc) {
            notifyWarning('Selecione um documento primeiro');
            return;
        }

        if (!checkFeatureAvailability('replicate')) {
            notifyError('Sem permissão para replicar este documento');
            return;
        }

        setSelectedDocument(targetDoc);
        openModal('replicate');
    }, [selectedDocument, openModal, checkFeatureAvailability]);

    // Download de comprovativo
    const handleDownloadCompr = useCallback(async (document, event) => {
        if (event) {
            event.stopPropagation();
        }

        const targetDoc = document || selectedDocument;

        if (!targetDoc) {
            notifyWarning('Selecione um documento primeiro');
            return;
        }

        if (!checkFeatureAvailability('downloadComprovativo')) {
            notifyError('Sem permissão para baixar comprovativo');
            return;
        }

        try {
            await handleDownloadComprovativo(targetDoc);
            notifySuccess('Download iniciado');
        } catch (error) {
            console.error('Erro ao baixar comprovativo:', error);
            notifyError('Erro ao baixar comprovativo');
        }
    }, [selectedDocument, handleDownloadComprovativo, checkFeatureAvailability]);

    // Criar documento
    const handleOpenCreateModal = useCallback(() => {
        openModal('create');
    }, [openModal]);

    // Handlers para fechar modais com feedback
    const handleCloseDocumentModal = useCallback((modalKey) => {
        // console.log('[DEBUG] Fechando modal com key:', modalKey);
        // Remove apenas o modal específico pelo modalInstanceKey
        setOpenDocuments(prev => prev.filter(item => String(item.modalInstanceKey) !== String(modalKey)));
    }, []);

    const handleCloseStepModal = useCallback((success) => {
        const result = closeModal('step', success);
        if (result) {
            notifySuccess('Passo adicionado com sucesso');
        }
    }, [closeModal]);

    const handleCloseAnnexModal = useCallback((success) => {
        const result = closeModal('annex', success);
        if (result) {
            notifySuccess('Anexo adicionado com sucesso');
        }
    }, [closeModal]);

    const handleCloseReplicateModal = useCallback((success) => {
        const result = closeModal('replicate', success);
        if (result) {
            notifySuccess('Documento replicado com sucesso');
        }
    }, [closeModal]);

    const handleCloseCreateModal = useCallback((success) => {
        const result = closeModal('create', success);
        if (result) {
            notifySuccess('Pedido criado com sucesso');
        }
    }, [closeModal]);

    // Verificação de disponibilidade de features
    const canAddStep = checkFeatureAvailability('addStep');
    const canAddAnnex = checkFeatureAvailability('addAnnex');
    const canReplicate = checkFeatureAvailability('replicate');
    const canDownloadComprovativo = checkFeatureAvailability('downloadComprovativo');

    // Valor do contexto
    const contextValue = {
        // Estado
        modalState,
        selectedDocument,
        openDocuments,
        modalInstanceKey,

        // Disponibilidade de funcionalidades
        canAddStep,
        canAddAnnex,
        canReplicate,
        canDownloadComprovativo,

        // Ações de documento
        handleViewDetails,
        handleViewOriginDetails,
        handleAddStep,
        handleAddAnnex,
        handleReplicate,
        handleDownloadCompr,
        handleOpenCreateModal,

        // Handlers de modais
        handleCloseDocumentModal,
        handleCloseStepModal,
        handleCloseAnnexModal,
        handleCloseReplicateModal,
        handleCloseCreateModal,

        // Utilitários
        setSelectedDocument,
        openModal,
        closeModal,
        closeAllModals,
        checkFeatureAvailability
    };

    return (
        <DocumentActionsContext.Provider value={contextValue}>
            {children}
        </DocumentActionsContext.Provider>
    );
};

export default DocumentActionsContext;