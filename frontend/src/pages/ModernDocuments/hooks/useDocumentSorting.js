import { useCallback, useMemo } from 'react';
import { useUI } from '../context/UIStateContext';

/**
 * Hook para gerenciar ordenação de documentos
 * Fornece funções para ordenar documentos e controlar o estado da ordenação
 */
const useDocumentSorting = () => {
    // Obter estados e funções do contexto
    const {
        sortBy,
        sortDirection,
        setSort
    } = useUI();

    /**
     * Opções de ordenação disponíveis
     * @type {Array}
     */
    const sortOptions = useMemo(() => [
        { field: 'regnumber', label: 'Número' },
        { field: 'submission', label: 'Data' },
        { field: 'ts_entity', label: 'Entidade' },
        { field: 'what', label: 'Status' },
        { field: 'nipc', label: 'NIPC' }
    ], []);

    /**
     * Ordenar lista de documentos com base nos critérios atuais
     * @param {Array} documents - Lista de documentos a serem ordenados
     * @returns {Array} - Lista ordenada de documentos
     */
    const sortDocuments = useCallback((documents) => {
        if (!documents || !Array.isArray(documents)) return [];

        return [...documents].sort((a, b) => {
            let valueA = a[sortBy];
            let valueB = b[sortBy];

            // Tratamento para valores nulos ou indefinidos
            if (valueA === null || valueA === undefined) valueA = '';
            if (valueB === null || valueB === undefined) valueB = '';

            // Tratamento especial para datas
            if (sortBy === 'submission') {
                valueA = new Date(valueA || 0).getTime();
                valueB = new Date(valueB || 0).getTime();
            }

            // Comparação baseada no tipo de dado
            let comparison;
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                comparison = valueA.localeCompare(valueB);
            } else {
                comparison = valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            }

            // Aplicar direção da ordenação
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [sortBy, sortDirection]);

    /**
     * Obter texto descritivo da ordenação atual
     * @returns {string}
     */
    const getSortDescription = useCallback(() => {
        const option = sortOptions.find(opt => opt.field === sortBy);
        if (!option) return '';

        return `Ordenado por ${option.label} em ordem ${sortDirection === 'asc' ? 'crescente' : 'decrescente'}`;
    }, [sortBy, sortDirection, sortOptions]);

    /**
     * Alternar a ordenação para um determinado campo
     * @param {string} field - Campo para ordenar
     */
    const toggleSort = useCallback((field) => {
        if (sortBy === field) {
            // Alternar direção se já estiver ordenando por este campo
            setSort(field, sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Definir novo campo e direção padrão (asc)
            setSort(field, 'asc');
        }
    }, [sortBy, sortDirection, setSort]);

    return {
        // Estado
        sortBy,
        sortDirection,
        sortOptions,

        // Funções
        sortDocuments,
        getSortDescription,
        toggleSort,
        setSort
    };
};

export default useDocumentSorting;