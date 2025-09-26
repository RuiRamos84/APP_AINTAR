import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
    getDocuments,
    getDocumentsAssignedToMe,
    getDocumentsCreatedByMe,
    downloadComprovativo,
    getDocumentById,
    getDocumentsLate,
} from '../../../services/documentService';
import { useMetaData } from '../../../contexts/MetaDataContext';
import permissionService from '../../../services/permissionService';
import { documentsCache, metadataCache, cacheUtils } from '../utils/advancedCache';
import { notifySuccess, notifyError, notifyWarning, notifyInfo } from "../../../components/common/Toaster/ThemedToaster.js";

// Criar contexto
const DocumentsContext = createContext();

// Hook para usar o contexto
export const useDocumentsContext = () => useContext(DocumentsContext);

// Provider do contexto
export const DocumentsProvider = ({ children }) => {
    // Obter metadados do contexto global
    const { metaData } = useMetaData();

    // Estados
    const [allDocuments, setAllDocuments] = useState([]);
    const [assignedDocuments, setAssignedDocuments] = useState([]);
    const [createdDocuments, setCreatedDocuments] = useState([]);
    const [loadingAll, setLoadingAll] = useState(true);
    const [loadingAssigned, setLoadingAssigned] = useState(true);
    const [loadingCreated, setLoadingCreated] = useState(true);
    const [error, setError] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    // Função para determinar a tab inicial baseada nas permissões
    const getInitialActiveTab = useCallback(() => {
        // Verificar permissões na ordem de preferência
        if (permissionService.hasPermission(500)) return 0;  // docs.view.all - Todos
        if (permissionService.hasPermission(520)) return 1;  // docs.view.assigned - A meu cargo
        if (permissionService.hasPermission(510)) return 2;  // docs.view.owner - Por mim criados
        return 0; // fallback
    }, []);

    const [activeTab, setActiveTab] = useState(getInitialActiveTab);
    const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', ou 'kanban'
    const [lateDocuments, setLateDocuments] = useState([]);
    const [loadingLate, setLoadingLate] = useState(true);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

    // Funções para buscar documentos com cache
    const fetchAllDocuments = useCallback(async () => {
        // Verificar permissão antes de fazer a chamada
        if (!permissionService.hasPermission(500)) {
            setAllDocuments([]);
            setLoadingAll(false);
            return;
        }

        setLoadingAll(true);
        setError(null);

        try {
            // Tentar obter do cache primeiro
            const cacheKey = 'all_documents';
            let docs = documentsCache.get(cacheKey);

            if (!docs) {
                // Se não estiver em cache, fazer requisição
                docs = await getDocuments();
                // Armazenar em cache por 3 minutos
                documentsCache.set(cacheKey, docs);
            }

            setAllDocuments(docs || []);
        } catch (err) {
            console.error('Erro ao buscar todos os documentos:', err);
            setError('Erro ao carregar documentos. Por favor, tente novamente.');
            notifyError('Erro ao carregar documentos');
        } finally {
            setLoadingAll(false);
        }
    }, []);

    const fetchAssignedDocuments = useCallback(async () => {
        // Verificar permissão antes de fazer a chamada
        if (!permissionService.hasPermission(520)) {
            setAssignedDocuments([]);
            setLoadingAssigned(false);
            return;
        }

        setLoadingAssigned(true);
        setError(null);
        try {
            const docs = await getDocumentsAssignedToMe();
            // console.log('Documentos assignados:', docs);
            setAssignedDocuments(docs || []);
        } catch (err) {
            console.error('Erro ao buscar documentos assignados:', err);
            setError('Erro ao carregar documentos. Por favor, tente novamente.');
            notifyError('Erro ao carregar documentos atribuídos');
        } finally {
            setLoadingAssigned(false);
        }
    }, []);

    const fetchCreatedDocuments = useCallback(async () => {
        // Verificar permissão antes de fazer a chamada
        if (!permissionService.hasPermission(510)) {
            setCreatedDocuments([]);
            setLoadingCreated(false);
            return;
        }

        setLoadingCreated(true);
        setError(null);
        try {
            const docs = await getDocumentsCreatedByMe();
            // console.log('Documentos criados:', docs);
            setCreatedDocuments(docs || []);
        } catch (err) {
            console.error('Erro ao buscar documentos criados:', err);
            setError('Erro ao carregar documentos. Por favor, tente novamente.');
            notifyError('Erro ao carregar documentos criados');
        } finally {
            setLoadingCreated(false);
        }
    }, []);

    const fetchLateDocuments = useCallback(async () => {
        // Verificar permissão antes de fazer a chamada (usa mesma permissão que "Todos")
        if (!permissionService.hasPermission(500)) {
            setLateDocuments([]);
            setLoadingLate(false);
            return;
        }

        setLoadingLate(true);
        setError(null);
        try {
            const docs = await getDocumentsLate();
            // console.log('Documentos em atraso:', docs);
            setLateDocuments(docs || []);
        } catch (err) {
            console.error('Erro ao buscar documentos em atraso:', err);
            setError('Erro ao carregar documentos em atraso.');
            notifyError('Erro ao carregar documentos em atraso');
        } finally {
            setLoadingLate(false);
        }
    }, []);

    // Listener para documentos transferidos
    useEffect(() => {
        const handleDocumentTransferred = (event) => {
            if (event.detail && event.detail.documentId) {
                const documentId = event.detail.documentId;

                // Remover documento das listas (pois foi transferido)
                setAllDocuments(prev => prev.filter(doc => doc.pk !== documentId));
                setAssignedDocuments(prev => prev.filter(doc => doc.pk !== documentId));
                setCreatedDocuments(prev => prev.filter(doc => doc.pk !== documentId));
                setLateDocuments(prev => prev.filter(doc => doc.pk !== documentId));

                // Limpar cache
                cacheUtils.invalidateDocumentCache(documentId);

                console.log(`Documento ${documentId} removido das listas após transferência`);
            }
        };

        window.addEventListener('document-transferred', handleDocumentTransferred);

        return () => {
            window.removeEventListener('document-transferred', handleDocumentTransferred);
        };
    }, []);

    useEffect(() => {
        const loadData = async () => {
            await Promise.all([
                fetchAllDocuments(),
                fetchAssignedDocuments(),
                fetchCreatedDocuments(),
                fetchLateDocuments()  // ADICIONAR AQUI
            ]);
        };

        loadData();
    }, [fetchAllDocuments, fetchAssignedDocuments, fetchCreatedDocuments, fetchLateDocuments, refreshTrigger]);

    // Função para forçar atualização
    const refreshDocuments = () => {
        // Invalidar cache ao fazer refresh manual
        cacheUtils.invalidateDocumentCache();
        setRefreshTrigger(prev => prev + 1);
        notifySuccess('A actualizar dados...');
    };

    // DEPRECATED: Função mantida para compatibilidade (use ThemedToaster)
    const showNotification = (message, severity = 'info') => {
        // Redirecionar para ThemedToaster
        if (severity === 'error') notifyError(message);
        else if (severity === 'warning') notifyWarning(message);
        else if (severity === 'success') notifySuccess(message);
        else notifyInfo(message);
    };

    // Utilitários para manipulação de documentos - MOVED UP
    const updateDocumentInList = useCallback((document) => {
        if (document) {
            // Atualizar em todas as listas para manter consistência
            setAllDocuments(prev => prev.map(doc => doc.pk === document.pk ? document : doc));
            setAssignedDocuments(prev => prev.map(doc => doc.pk === document.pk ? document : doc));
            setCreatedDocuments(prev => prev.map(doc => doc.pk === document.pk ? document : doc));
        }
    }, []);

    const refreshDocumentSelective = useCallback(async (documentId, updateTypes = []) => {
        if (!documentId) return;

        try {
            const response = await getDocumentById(documentId);
            if (response?.document) {
                updateDocumentInList(response.document);

                // Disparar evento para atualizar componentes específicos
                window.dispatchEvent(new CustomEvent('document-refreshed', {
                    detail: {
                        documentId,
                        document: response.document,
                        updateTypes
                    }
                }));

                return response.document;
            }
        } catch (error) {
            console.error('Erro ao atualizar documento:', error);

            // Se for erro 404, documento foi removido - remover das listas
            if (error.response?.status === 404) {
                console.warn(`Documento ${documentId} não encontrado - remover das listas`);

                // Remover documento das listas locais
                setAllDocuments(prev => prev.filter(doc => doc.pk !== documentId));
                setAssignedDocuments(prev => prev.filter(doc => doc.pk !== documentId));
                setCreatedDocuments(prev => prev.filter(doc => doc.pk !== documentId));
                setLateDocuments(prev => prev.filter(doc => doc.pk !== documentId));

                // Invalidar cache
                cacheUtils.invalidateDocumentCache(documentId);

                notifyWarning('Documento não encontrado - removido da lista');
                return null;
            }

            // Para outros erros, mostrar notificação genérica
            if (error.response?.status >= 500) {
                notifyError('Erro do servidor ao atualizar documento');
            } else if (error.response?.status === 403) {
                notifyWarning('Sem permissão para aceder a este documento');
            }
        }
        return null;
    }, [updateDocumentInList]);

    // MELHORADO: Smart update com feedback visual e cache
    const smartUpdateDocument = useCallback(async (documentId, optimisticData, updatePromise) => {
        try {
            // 1. UPDATE IMEDIATO (Optimistic)
            if (optimisticData) {
                updateDocumentInList({ ...optimisticData, _optimistic: true });
                notifyInfo('A processar...');
            }

            // 2. REQUEST REAL
            const result = await updatePromise;

            // 3. CONFIRMAÇÃO com dados reais
            if (result?.document) {
                updateDocumentInList({ ...result.document, _optimistic: false });

                // Invalidar cache relacionado ao documento
                cacheUtils.invalidateDocumentCache(documentId);

                notifySuccess('Documento atualizado!');
            } else {
                // Fallback: refresh seletivo
                await refreshDocumentSelective(documentId);
                notifySuccess('Atualizado!');
            }

            return result;

        } catch (error) {
            console.error('Erro no smart update:', error);

            // Handling específico para diferentes tipos de erro
            if (error.response?.status === 404) {
                // Documento não existe mais - remover das listas
                setAllDocuments(prev => prev.filter(doc => doc.pk !== documentId));
                setAssignedDocuments(prev => prev.filter(doc => doc.pk !== documentId));
                setCreatedDocuments(prev => prev.filter(doc => doc.pk !== documentId));
                setLateDocuments(prev => prev.filter(doc => doc.pk !== documentId));

                cacheUtils.invalidateDocumentCache(documentId);
                notifyWarning('❌ Documento não encontrado - removido da lista.');
            } else {
                // 4. ROLLBACK - Reverter para outros tipos de erro
                await refreshDocumentSelective(documentId);
                cacheUtils.invalidateDocumentCache(documentId);
                notifyError('❌ Erro ao atualizar. Dados revertidos.');
            }

            throw error;
        }
    }, [updateDocumentInList, refreshDocumentSelective]);

    

    const handleCloseNotification = () => {
        setNotification(prev => ({
            ...prev,
            open: false
        }));
    };

    // Função para baixar comprovativo
    const handleDownloadComprovativo = async (doc) => {
        try {
            notifyInfo('A preparar download...');
            const pdfData = await downloadComprovativo(doc.pk);

            // Criar blob e link para download
            const blob = new Blob([pdfData], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            link.setAttribute('download', `comprovativo_${doc.regnumber}.pdf`);
            window.document.body.appendChild(link);
            link.click();
            link.remove();

            notifySuccess('Comprovativo baixado com sucesso');
        } catch (error) {
            console.error('Erro ao baixar comprovativo:', error);
            notifyError('Erro ao baixar comprovativo');
        }
    };

    // Funções auxiliares para obter documentos ativos
    const getActiveDocuments = () => {
        switch (activeTab) {
            case 0: return allDocuments;
            case 1: return assignedDocuments;
            case 2: return createdDocuments;
            case 3: return lateDocuments;
            default: return allDocuments;
        }
    };

    const getActiveLoading = () => {
        switch (activeTab) {
            case 0: return loadingAll;
            case 1: return loadingAssigned;
            case 2: return loadingCreated;
            case 3: return loadingLate;
            default: return false;
        }
    };


    const addDocumentToList = (document) => {
        if (document) {
            // Adicionar apenas à lista principal
            setAllDocuments(prev => [document, ...prev]);
        }
    };

    // Funções para contagem baseadas em status (metadados)
    const countByStatus = (statusId) => {
        return allDocuments.filter(doc => doc.what === statusId).length;
    };

    const countWithNotifications = () => {
        return assignedDocuments.filter(doc => doc.notification === 1).length;
    };

    // Objeto com todos os valores e funções para o contexto
    const contextValue = {
        // Dados
        allDocuments,
        assignedDocuments,
        createdDocuments,
        lateDocuments,
        metaData,
        loadingAll,
        loadingAssigned,
        loadingCreated,
        loadingLate,
        error,
        activeTab,
        viewMode,
        notification,

        // Métodos para busca de dados
        fetchAllDocuments,
        fetchAssignedDocuments,
        fetchCreatedDocuments,
        refreshDocuments,
        refreshDocumentSelective,

        // Métodos para visualização
        setActiveTab,
        setViewMode,
        getActiveDocuments,
        getActiveLoading,

        // Métodos para manipulação de documentos
        updateDocumentInList,
        addDocumentToList,
        handleDownloadComprovativo,
        smartUpdateDocument, // NOVO: Smart updates

        // Métodos para notificações (DEPRECATED: use ThemedToaster)
        showNotification, // Mantido para compatibilidade
        handleCloseNotification,

        // Métodos para contagem
        countByStatus,
        countWithNotifications
    };

    return (
        <DocumentsContext.Provider value={contextValue}>
            {children}
        </DocumentsContext.Provider>
    );
};

export default DocumentsContext;