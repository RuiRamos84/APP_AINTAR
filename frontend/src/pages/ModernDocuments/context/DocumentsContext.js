import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
    getDocuments,
    getDocumentsAssignedToMe,
    getDocumentsCreatedByMe,
    downloadComprovativo
} from '../../../services/documentService';
import { useMetaData } from '../../../contexts/MetaDataContext';

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
    const [activeTab, setActiveTab] = useState(0);
    const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', ou 'kanban'
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

    // Funções para buscar documentos
    const fetchAllDocuments = useCallback(async () => {
        setLoadingAll(true);
        setError(null);
        try {
            const docs = await getDocuments();
            // console.log('Todos os documentos:', docs);
            setAllDocuments(docs || []);
        } catch (err) {
            console.error('Erro ao buscar todos os documentos:', err);
            setError('Erro ao carregar documentos. Por favor, tente novamente.');
            showNotification('Erro ao carregar documentos', 'error');
        } finally {
            setLoadingAll(false);
        }
    }, []);

    const fetchAssignedDocuments = useCallback(async () => {
        setLoadingAssigned(true);
        setError(null);
        try {
            const docs = await getDocumentsAssignedToMe();
            // console.log('Documentos assignados:', docs);
            setAssignedDocuments(docs || []);
        } catch (err) {
            console.error('Erro ao buscar documentos assignados:', err);
            setError('Erro ao carregar documentos. Por favor, tente novamente.');
            showNotification('Erro ao carregar documentos assignados', 'error');
        } finally {
            setLoadingAssigned(false);
        }
    }, []);

    const fetchCreatedDocuments = useCallback(async () => {
        setLoadingCreated(true);
        setError(null);
        try {
            const docs = await getDocumentsCreatedByMe();
            // console.log('Documentos criados:', docs);
            setCreatedDocuments(docs || []);
        } catch (err) {
            console.error('Erro ao buscar documentos criados:', err);
            setError('Erro ao carregar documentos. Por favor, tente novamente.');
            showNotification('Erro ao carregar documentos criados', 'error');
        } finally {
            setLoadingCreated(false);
        }
    }, []);

    // Efeito para buscar documentos
    useEffect(() => {
        const loadData = async () => {
            await Promise.all([
                fetchAllDocuments(),
                fetchAssignedDocuments(),
                fetchCreatedDocuments()
            ]);
        };

        loadData();
    }, [fetchAllDocuments, fetchAssignedDocuments, fetchCreatedDocuments, refreshTrigger]);

    // Função para forçar atualização
    const refreshDocuments = () => {
        setRefreshTrigger(prev => prev + 1);
        showNotification('Atualizando dados...', 'info');
    };

    // Função para mostrar notificação
    const showNotification = (message, severity = 'info') => {
        setNotification({
            open: true,
            message,
            severity
        });
    };

    const handleCloseNotification = () => {
        setNotification(prev => ({
            ...prev,
            open: false
        }));
    };

    // Função para baixar comprovativo
    const handleDownloadComprovativo = async (doc) => {
        try {
            showNotification('Preparando download...', 'info');
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

            showNotification('Comprovativo baixado com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao baixar comprovativo:', error);
            showNotification('Erro ao baixar comprovativo', 'error');
        }
    };

    // Funções auxiliares para obter documentos ativos
    const getActiveDocuments = () => {
        switch (activeTab) {
            case 0: return allDocuments;
            case 1: return assignedDocuments;
            case 2: return createdDocuments;
            default: return allDocuments;
        }
    };

    const getActiveLoading = () => {
        switch (activeTab) {
            case 0: return loadingAll;
            case 1: return loadingAssigned;
            case 2: return loadingCreated;
            default: return false;
        }
    };

    // Utilitários para manipulação de documentos
    const updateDocumentInList = (document) => {
        if (document) {
            // Atualizar em todas as listas para manter consistência
            setAllDocuments(prev => prev.map(doc => doc.pk === document.pk ? document : doc));
            setAssignedDocuments(prev => prev.map(doc => doc.pk === document.pk ? document : doc));
            setCreatedDocuments(prev => prev.map(doc => doc.pk === document.pk ? document : doc));
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
        metaData, // Disponibilizar metadados no contexto
        loadingAll,
        loadingAssigned,
        loadingCreated,
        error,
        activeTab,
        viewMode,
        notification,

        // Métodos para busca de dados
        fetchAllDocuments,
        fetchAssignedDocuments,
        fetchCreatedDocuments,
        refreshDocuments,

        // Métodos para visualização
        setActiveTab,
        setViewMode,
        getActiveDocuments,
        getActiveLoading,

        // Métodos para manipulação de documentos
        updateDocumentInList,
        addDocumentToList,
        handleDownloadComprovativo,

        // Métodos para notificações
        showNotification,
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