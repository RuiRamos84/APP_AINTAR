import React, { createContext, useContext, useState, useCallback } from 'react';
import { useDocumentsContext } from '../../ModernDocuments/context/DocumentsContext';
import { isFeatureAvailable } from '../utils/featureUtils';
import { updateDocumentNotification } from '../../../services/documentService';
import { useSmartRefresh } from '../hooks/useSmartRefresh';

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
    const [documentParams, setDocumentParams] = useState({});
    const { smartRefresh } = useSmartRefresh();

    // Acessar contexto principal de documentos
    const { refreshDocuments, handleDownloadComprovativo, showNotification, activeTab } = useDocumentsContext();

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
            // Verificar se o documento tem notificação E se estamos na tab "Para tratamento" (activeTab === 1)
            if (document.notification === 1 && activeTab === 1) {
                try {
                    await updateDocumentNotification(document.pk);

                    // Atualizar o documento em todos os contextos relevantes
                    const updatedDocument = { ...document, notification: 0 };

                    // Usar a função de atualização do documento no contexto de documentos
                    if (typeof refreshDocuments === 'function') {
                        refreshDocuments();
                    }

                    document = updatedDocument; // Usar a versão atualizada para o modal
                } catch (error) {
                    console.error('Erro ao atualizar notificação:', error);
                    // Continuar mesmo se houver erro na atualização da notificação
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
            showNotification('Erro ao abrir detalhes do documento', 'error');
        }
    }, [openModal, refreshDocuments, showNotification, updateDocumentNotification, activeTab]);

    // Ver detalhes em cascata (para documentos de origem)
    const handleViewOriginDetails = useCallback(async (originDocument) => {
        if (!originDocument) return;

        try {
            // Atualizar notificação apenas se estiver na tab "Para tratamento"
            if (originDocument.notification === 1 && activeTab === 1) {
                try {
                    await updateDocumentNotification(originDocument.pk);

                    // Atualizar o documento em todos os contextos relevantes
                    if (typeof refreshDocuments === 'function') {
                        refreshDocuments();
                    }

                    // Atualizar a versão local
                    originDocument = {
                        ...originDocument,
                        notification: 0
                    };
                } catch (error) {
                    console.error('Erro ao atualizar notificação:', error);
                    // Continuar mesmo se houver erro na atualização da notificação
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
            showNotification('Erro ao abrir detalhes do documento', 'error');
        }
    }, [refreshDocuments, showNotification, updateDocumentNotification, activeTab]);

    // Adicionar passo
    const handleAddStep = useCallback((document) => {
        const targetDoc = document || selectedDocument;

        if (!targetDoc) {
            showNotification('Selecione um documento primeiro', 'warning');
            return;
        }

        if (!checkFeatureAvailability('addStep')) {
            showNotification('Sem permissão para adicionar passos', 'error');
            return;
        }

        setSelectedDocument(targetDoc);
        openModal('step');
    }, [selectedDocument, openModal, showNotification, checkFeatureAvailability]);

    // Atualizar parâmetros de um documento específico
    const updateDocumentParams = useCallback((documentId, params) => {
        setDocumentParams(prev => ({
            ...prev,
            [documentId]: params
        }));
    }, []);

    // Adicionar anexo
    const handleAddAnnex = useCallback((document) => {
        const targetDoc = document || selectedDocument;

        if (!targetDoc) {
            showNotification('Selecione um documento primeiro', 'warning');
            return;
        }

        if (!checkFeatureAvailability('addAnnex')) {
            showNotification('Sem permissão para adicionar anexos', 'error');
            return;
        }

        setSelectedDocument(targetDoc);
        openModal('annex');
    }, [selectedDocument, openModal, showNotification, checkFeatureAvailability]);

    // Replicar documento
    const handleReplicate = useCallback((document) => {
        const targetDoc = document || selectedDocument;

        if (!targetDoc) {
            showNotification('Selecione um documento primeiro', 'warning');
            return;
        }

        if (!checkFeatureAvailability('replicate')) {
            showNotification('Sem permissão para replicar este documento', 'error');
            return;
        }

        setSelectedDocument(targetDoc);
        openModal('replicate');
    }, [selectedDocument, openModal, showNotification, checkFeatureAvailability]);

    // Download de comprovativo
    const handleDownloadCompr = useCallback(async (document, event) => {
        if (event) {
            event.stopPropagation();
        }

        const targetDoc = document || selectedDocument;

        if (!targetDoc) {
            showNotification('Selecione um documento primeiro', 'warning');
            return;
        }

        if (!checkFeatureAvailability('downloadComprovativo')) {
            showNotification('Sem permissão para baixar comprovativo', 'error');
            return;
        }

        try {
            await handleDownloadComprovativo(targetDoc);
            showNotification('Download iniciado', 'success');
        } catch (error) {
            console.error('Erro ao baixar comprovativo:', error);
            showNotification('Erro ao baixar comprovativo', 'error');
        }
    }, [selectedDocument, handleDownloadComprovativo, showNotification, checkFeatureAvailability]);

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

    // Atualizar o handler de closeStepModal
    const handleCloseStepModal = useCallback((success) => {
        const result = closeModal('step', success);
        if (result) {
            smartRefresh('ADD_STEP', {
                documentId: selectedDocument?.pk,
                statusChanged: true // Isto deve ser determinado com base nas mudanças reais
            });
            showNotification('Passo adicionado com sucesso', 'success');
        }
    }, [closeModal, selectedDocument, smartRefresh, showNotification]);

    // Atualizar o handler de closeAnnexModal
    const handleCloseAnnexModal = useCallback((success) => {
        const result = closeModal('annex', success);
        if (result) {
            smartRefresh('ADD_ANNEX', {
                documentId: selectedDocument?.pk
            });
            showNotification('Anexo adicionado com sucesso', 'success');
        }
    }, [closeModal, selectedDocument, smartRefresh, showNotification]);

    // Atualizar o handler de closeReplicateModal
    const handleCloseReplicateModal = useCallback((success) => {
        const result = closeModal('replicate', success);
        if (result) {
            smartRefresh('REPLICATE');
            showNotification('Documento replicado com sucesso', 'success');
        }
    }, [closeModal, smartRefresh, showNotification]);

    // Atualizar o handler de closeCreateModal
    const handleCloseCreateModal = useCallback((success) => {
        const result = closeModal('create', success);
        if (result) {
            smartRefresh('CREATE_DOCUMENT');
            showNotification('Pedido criado com sucesso', 'success');
        }
    }, [closeModal, smartRefresh, showNotification]);

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
        documentParams,

        // Ações de documento
        handleViewDetails,
        handleViewOriginDetails,
        handleAddStep,
        handleAddAnnex,
        handleReplicate,
        handleDownloadCompr,
        handleOpenCreateModal,
        updateDocumentParams,

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