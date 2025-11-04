import { useCallback, useMemo } from 'react';
import { useUI } from '../context/UIStateContext';
import { useDocumentsContext } from '../context/DocumentsContext';
import { normalizeText } from '../../../utils/textUtils';

/**
 * Hook para gerenciar filtros de documentos
 * Fornece funções para filtragem de documentos e controla o estado do filtro
 */
const useDocumentFilters = () => {
    // Obter estados e funções dos contextos
    const {
        filters,
        searchTerm,
        setFilter,
        setSearchTerm,
        resetFilters,
        toggleFilters,
        showFilters
    } = useUI();

    const { metaData } = useDocumentsContext();

    /**
     * Filtra uma lista de documentos com base nos filtros atuais
     * @param {Array} documents - Lista de documentos a serem filtrados
     * @returns {Array} - Lista filtrada de documentos
     */
    const filterDocuments = useCallback((documents) => {
        if (!documents || !Array.isArray(documents)) return [];

        // Filtrar por termo de busca
        let filteredDocs = documents;
        if (searchTerm) {
            const normalizedTerm = normalizeText(searchTerm);
            filteredDocs = documents.filter(doc => {
                return (
                    (doc.regnumber && normalizeText(doc.regnumber).includes(normalizedTerm)) ||
                    (doc.ts_entity && normalizeText(doc.ts_entity).includes(normalizedTerm)) ||
                    (doc.tt_type && normalizeText(doc.tt_type).includes(normalizedTerm)) ||
                    (doc.nipc && normalizeText(String(doc.nipc)).includes(normalizedTerm)) ||
                    (doc.memo && normalizeText(doc.memo).includes(normalizedTerm))
                );
            });
        }

        // Aplicar filtros adicionais
        return filteredDocs.filter(doc => {
            // Filtro de status
            if (filters.status && doc.what !== parseInt(filters.status)) {
                return false;
            }

            // Filtro de associado
            if (filters.associate && doc.ts_associate !== filters.associate) {
                return false;
            }

            // Filtro de tipo
            if (filters.type && doc.tt_type !== filters.type) {
                return false;
            }

            return true;
        });
    }, [filters, searchTerm]);

    /**
     * Determina se há filtros ativos
     * @returns {boolean}
     */
    const hasActiveFilters = useMemo(() => {
        return Object.values(filters).some(v => v !== '') || searchTerm !== '';
    }, [filters, searchTerm]);

    /**
     * Conta o número de filtros ativos
     * @returns {number}
     */
    const activeFilterCount = useMemo(() => {
        return Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0);
    }, [filters, searchTerm]);

    /**
     * Formata um resumo dos filtros ativos para exibição
     * @returns {string}
     */
    const getActiveFiltersDescription = useCallback(() => {
        if (!hasActiveFilters) return '';

        const parts = [];

        if (searchTerm) {
            parts.push(`Termo: "${searchTerm}"`);
        }

        if (filters.status) {
            const statusName = metaData?.what?.find(s => s.pk === parseInt(filters.status))?.step;
            if (statusName) parts.push(`Status: ${statusName}`);
        }

        if (filters.associate) {
            const associateName = metaData?.associates?.find(a => a.pk === filters.associate)?.name;
            if (associateName) parts.push(`Associado: ${associateName}`);
        }

        if (filters.type) {
            parts.push(`Tipo: ${filters.type}`);
        }

        return parts.join(' | ');
    }, [filters, searchTerm, hasActiveFilters, metaData]);

    /**
     * Handler para mudança de filtro
     * @param {string} name - Nome do filtro
     * @param {any} value - Valor do filtro
     */
    const handleFilterChange = useCallback((name, value) => {
        setFilter(name, value);
    }, [setFilter]);

    return {
        // Estado
        filters,
        searchTerm,
        showFilters,
        hasActiveFilters,
        activeFilterCount,

        // Funções
        filterDocuments,
        setFilter: handleFilterChange,
        setSearchTerm,
        resetFilters,
        toggleFilters,
        getActiveFiltersDescription
    };
};

export default useDocumentFilters;