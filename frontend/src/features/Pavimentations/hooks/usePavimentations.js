// frontend/src/features/Pavimentations/hooks/usePavimentations.js

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { pavimentationService } from '../services/pavimentationService';
import { StatusUtils } from '../constants/pavimentationTypes';
import { notifyError } from '../../../components/common/Toaster/ThemedToaster';

/**
 * Hook principal para gerenciar dados de pavimentações
 * @param {string} status - Status das pavimentações (pending, executed, completed)
 * @param {Object} options - Opções de configuração
 * @returns {Object} Estado e funções para gerenciar pavimentações
 */
export const usePavimentations = (status, options = {}) => {
    // Estados principais
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);

    // Estados de filtros
    const [filters, setFilters] = useState({
        search: '',
        groupBy: '',
        sortBy: 'regnumber',
        sortOrder: 'asc',
        page: 0,
        rowsPerPage: 10
    });

    // Estados de UI
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [selectedRows, setSelectedRows] = useState(new Set());

    // Refs para controle
    const abortControllerRef = useRef(null);
    const retryCountRef = useRef(0);

    // Configurações do hook
    const config = {
        autoRefresh: true,
        refreshInterval: 5 * 60 * 1000, // 5 minutos
        maxRetries: 3,
        retryDelay: 1000,
        ...options
    };

    /**
     * Buscar dados do servidor
     */
    const fetchData = useCallback(async (forceRefresh = false) => {
        // Validar status
        const statusConfig = StatusUtils.getStatusConfig(status);
        if (!statusConfig) {
            setError(`Status inválido: ${status}`);
            setLoading(false);
            return;
        }

        // Cancelar requisição anterior se existir
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Criar novo controller para cancelamento
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            setError(null);

            console.log(`🔄 Buscando pavimentações: ${status}${forceRefresh ? ' (forçado)' : ''}`);

            const result = await pavimentationService.getPavimentations(status, {
                forceRefresh,
                signal: abortControllerRef.current.signal
            });

            setData(result);
            setLastFetch(new Date());
            retryCountRef.current = 0;

            console.log(`✅ ${result.length} pavimentações carregadas`);

        } catch (err) {
            // Ignorar erros de cancelamento
            if (err.name === 'AbortError') {
                console.log('Requisição cancelada');
                return;
            }

            console.error('Erro ao carregar pavimentações:', err);

            // Tentar novamente se não excedeu o limite
            if (retryCountRef.current < config.maxRetries) {
                retryCountRef.current++;
                console.log(`Tentativa ${retryCountRef.current}/${config.maxRetries}`);

                setTimeout(() => {
                    fetchData(forceRefresh);
                }, config.retryDelay * retryCountRef.current);

                return;
            }

            setError(err.message);
            notifyError(`Erro ao carregar pavimentações: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [status, config.maxRetries, config.retryDelay]);

    /**
     * Efeito para busca inicial e auto-refresh
     */
    useEffect(() => {
        fetchData();

        // Configurar auto-refresh se habilitado
        let refreshInterval;
        if (config.autoRefresh && config.refreshInterval > 0) {
            refreshInterval = setInterval(() => {
                fetchData(true);
            }, config.refreshInterval);
        }

        // Cleanup
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [fetchData, config.autoRefresh, config.refreshInterval]);

    /**
     * Dados processados com filtros e paginação
     */
    const processedData = useMemo(() => {
        let result = [...data];

        // Aplicar filtro de pesquisa
        if (filters.search?.trim()) {
            result = pavimentationService.applySearchFilter(result, filters.search);
        }

        // Aplicar ordenação
        if (filters.sortBy) {
            result = pavimentationService.sortData(result, filters.sortBy, filters.sortOrder);
        }

        return result;
    }, [data, filters.search, filters.sortBy, filters.sortOrder]);

    /**
     * Dados agrupados
     */
    const groupedData = useMemo(() => {
        if (!filters.groupBy) return null;

        const grouped = pavimentationService.groupData(processedData, filters.groupBy);

        // Ordenar chaves dos grupos
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (filters.groupBy === 'submission_month') {
                return b.localeCompare(a); // Mais recentes primeiro
            }
            return a.localeCompare(b, 'pt-PT');
        });

        return sortedKeys.reduce((acc, key) => {
            acc[key] = grouped[key];
            return acc;
        }, {});
    }, [processedData, filters.groupBy]);

    /**
     * Dados paginados
     */
    const paginatedData = useMemo(() => {
        const startIndex = filters.page * filters.rowsPerPage;
        const endIndex = startIndex + filters.rowsPerPage;
        return processedData.slice(startIndex, endIndex);
    }, [processedData, filters.page, filters.rowsPerPage]);

    /**
     * Estatísticas dos dados
     */
    const statistics = useMemo(() => {
        return pavimentationService.getStatistics(processedData);
    }, [processedData]);

    /**
     * Funções para manipular filtros
     */
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters,
            // Reset page quando filtros mudam
            page: newFilters.search !== prev.search ||
                newFilters.groupBy !== prev.groupBy ||
                newFilters.sortBy !== prev.sortBy ||
                newFilters.sortOrder !== prev.sortOrder ? 0 : newFilters.page ?? prev.page
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            search: '',
            groupBy: '',
            sortBy: 'regnumber',
            sortOrder: 'asc',
            page: 0,
            rowsPerPage: 10
        });
    }, []);

    /**
     * Funções para manipular seleção e expansão de linhas
     */
    const toggleRowExpansion = useCallback((id) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const toggleRowSelection = useCallback((id) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const selectAllRows = useCallback((selectAll = true) => {
        if (selectAll) {
            setSelectedRows(new Set(paginatedData.map(item => item.pk)));
        } else {
            setSelectedRows(new Set());
        }
    }, [paginatedData]);

    /**
     * Função para atualizar item específico na lista
     */
    const updateItem = useCallback((id, updates) => {
        setData(prev => prev.map(item =>
            item.pk === id ? { ...item, ...updates } : item
        ));
    }, []);

    /**
     * Função para remover item da lista
     */
    const removeItem = useCallback((id) => {
        setData(prev => prev.filter(item => item.pk !== id));
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    }, []);

    /**
     * Função para refresh manual
     */
    const refresh = useCallback(() => {
        fetchData(true);
    }, [fetchData]);

    /**
     * Função para buscar item específico
     */
    const findItem = useCallback((id) => {
        return data.find(item => item.pk === id);
    }, [data]);

    /**
     * Informações de debug/desenvolvimento
     */
    const debugInfo = useMemo(() => {
        if (process.env.NODE_ENV !== 'development') return null;

        return {
            status,
            totalItems: data.length,
            filteredItems: processedData.length,
            paginatedItems: paginatedData.length,
            selectedItems: selectedRows.size,
            expandedItems: expandedRows.size,
            lastFetch,
            retryCount: retryCountRef.current,
            filters,
            statistics
        };
    }, [
        status, data.length, processedData.length, paginatedData.length,
        selectedRows.size, expandedRows.size, lastFetch, filters, statistics
    ]);

    return {
        // Dados
        data: processedData,
        originalData: data,
        paginatedData,
        groupedData,
        statistics,

        // Estados
        loading,
        error,
        lastFetch,

        // Filtros
        filters,
        updateFilters,
        resetFilters,

        // Seleção e expansão
        expandedRows,
        selectedRows,
        toggleRowExpansion,
        toggleRowSelection,
        selectAllRows,

        // Ações
        refresh,
        updateItem,
        removeItem,
        findItem,

        // Utilitários
        hasData: data.length > 0,
        hasFilteredData: processedData.length > 0,
        isFiltered: filters.search || filters.groupBy,
        totalCount: data.length,
        filteredCount: processedData.length,

        // Debug (apenas em desenvolvimento)
        ...(process.env.NODE_ENV === 'development' && { debugInfo })
    };
};

export default usePavimentations;