import { useState, useEffect, useCallback } from 'react';
import {
    getDocuments,
    getDocumentsAssignedToMe,
    getDocumentsCreatedByMe
} from '../services/documentService';

/**
 * Hook para gerenciar a lista de documentos
 * @param {string} type - Tipo de documentos ('all', 'assigned', 'created')
 * @returns {Object} Estado e funções para manipular documentos
 */
const useDocuments = (type = 'all') => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let result;

            switch (type) {
                case 'assigned':
                    result = await getDocumentsAssignedToMe();
                    break;
                case 'created':
                    result = await getDocumentsCreatedByMe();
                    break;
                case 'all':
                default:
                    result = await getDocuments();
                    break;
            }

            setDocuments(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error(`Erro ao buscar documentos (${type}):`, err);
            setError('Erro ao carregar documentos. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [type]);

    // Efeito para carregar documentos quando o componente montar ou quando refreshTrigger mudar
    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments, refreshTrigger]);

    // Função para forçar uma atualização da lista
    const refreshDocuments = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // Funções para manipular a lista localmente
    const addDocument = (document) => {
        setDocuments(prev => [document, ...prev]);
    };

    const updateDocument = (updatedDocument) => {
        setDocuments(prev =>
            prev.map(doc => doc.pk === updatedDocument.pk ? updatedDocument : doc)
        );
    };

    const removeDocument = (documentId) => {
        setDocuments(prev => prev.filter(doc => doc.pk !== documentId));
    };

    // Funções para filtrar e ordenar documentos
    const getFilteredDocuments = (filterFn) => {
        return documents.filter(filterFn);
    };

    const getSortedDocuments = (sortFn) => {
        return [...documents].sort(sortFn);
    };

    return {
        documents,
        loading,
        error,
        fetchDocuments,
        refreshDocuments,
        addDocument,
        updateDocument,
        removeDocument,
        getFilteredDocuments,
        getSortedDocuments
    };
};

export default useDocuments;