import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operationService } from '../services/operationService';
import { useMetaData } from '@/core/hooks/useMetaData';
import {
    getInstallationName, getOperationActionName,
    getOperationModeName, getOperationDayName, getUserNameByPk
} from '../utils/formatters';

const WEEK_MAP = { W1: 1, W2: 2, W3: 3, W4: 4 };
const DAYS_PT = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

/**
 * Hook centralizado para dados do supervisor
 * Combina metas (tarefas programadas) com execuções reais
 */
export const useSupervisorData = () => {
    const queryClient = useQueryClient();
    const { data: metaData } = useMetaData();

    const [weekFilter, setWeekFilter] = useState('all');
    const [dayFilter, setDayFilter] = useState('all');

    // Buscar metas (tarefas programadas)
    const {
        data: rawMetas,
        isLoading: metasLoading,
        error: metasError,
    } = useQuery({
        queryKey: ['operacaoMeta'],
        queryFn: async () => {
            const response = await operationService.getOperacaoMeta();
            return response?.data || response || [];
        },
        staleTime: 1000 * 60 * 3,
    });

    // Buscar execuções (operações realizadas)
    const {
        data: rawExecutions,
        isLoading: execLoading,
        error: execError,
    } = useQuery({
        queryKey: ['operacao'],
        queryFn: async () => {
            const response = await operationService.getOperacao();
            return response?.data || response || [];
        },
        staleTime: 1000 * 60 * 3,
    });

    // Enriquecer metas com nomes
    const enrichedMetas = useMemo(() => {
        if (!rawMetas || !metaData) return [];
        return (Array.isArray(rawMetas) ? rawMetas : []).map(meta => ({
            ...meta,
            instalacao_nome: meta.instalacao_nome || getInstallationName(meta.tb_instalacao, metaData),
            acao_nome: meta.acao_nome || getOperationActionName(meta.tt_operacaoaccao, metaData),
            modo_nome: meta.modo_nome || getOperationModeName(meta.tt_operacaomodo, metaData),
            dia_nome: meta.dia_nome || getOperationDayName(meta.tt_operacaodia, metaData),
            operador1_nome: getUserNameByPk(meta.who1, metaData),
            operador2_nome: getUserNameByPk(meta.who2, metaData),
        }));
    }, [rawMetas, metaData]);

    const executions = useMemo(() => {
        return Array.isArray(rawExecutions) ? rawExecutions : [];
    }, [rawExecutions]);

    // Filtrar metas por semana e dia
    const filteredMetas = useMemo(() => {
        let result = enrichedMetas;
        if (weekFilter !== 'all') {
            const weekNum = WEEK_MAP[weekFilter];
            result = result.filter(m => m.tt_operacaosemana === weekNum || m.semana === weekNum);
        }
        if (dayFilter !== 'all') {
            const dayIdx = DAYS_PT.indexOf(dayFilter);
            if (dayIdx >= 0) {
                result = result.filter(m => {
                    const diaNome = (m.dia_nome || '').toLowerCase();
                    return diaNome.includes(dayFilter.toLowerCase());
                });
            }
        }
        return result;
    }, [enrichedMetas, weekFilter, dayFilter]);

    // Correlacionar metas com execuções
    const operations = useMemo(() => {
        return filteredMetas.map(meta => {
            const metaExecs = executions.filter(e =>
                e.tb_operacaometa === meta.pk || e.operacao_meta === meta.pk
            );
            return {
                ...meta,
                executions: metaExecs,
                executionCount: metaExecs.length,
                lastExecution: metaExecs.length > 0
                    ? metaExecs.sort((a, b) => new Date(b.ts_exec || b.data_execucao) - new Date(a.ts_exec || a.data_execucao))[0]
                    : null,
                hasExecutions: metaExecs.length > 0,
            };
        });
    }, [filteredMetas, executions]);

    // Analytics computados
    const analytics = useMemo(() => {
        const totalOperations = filteredMetas.length;
        const operationsWithExec = operations.filter(o => o.hasExecutions);
        const completedTasks = operationsWithExec.length;
        const pendingTasks = totalOperations - completedTasks;
        const completionRate = totalOperations > 0 ? Math.round((completedTasks / totalOperations) * 100) : 0;

        const operatorSet = new Set();
        executions.forEach(e => {
            if (e.who_exec || e.ts_who) operatorSet.add(e.who_exec || e.ts_who);
        });

        return {
            overview: {
                totalOperations,
                completedTasks,
                pendingTasks,
                completionRate,
                activeOperators: operatorSet.size,
                totalExecutions: executions.length,
            }
        };
    }, [filteredMetas, operations, executions]);

    // Atividade recente (últimas 20 execuções)
    const recentActivity = useMemo(() => {
        return [...executions]
            .sort((a, b) => new Date(b.ts_exec || b.data_execucao || 0) - new Date(a.ts_exec || a.data_execucao || 0))
            .slice(0, 20)
            .map(exec => ({
                ...exec,
                operador_nome: getUserNameByPk(exec.who_exec || exec.ts_who, metaData),
                instalacao_nome: exec.instalacao_nome || getInstallationName(exec.tb_instalacao, metaData),
                acao_nome: exec.acao_operacao || getOperationActionName(exec.tt_operacaoaccao, metaData),
            }));
    }, [executions, metaData]);

    // Stats por operador
    const operatorStats = useMemo(() => {
        const opMap = {};

        filteredMetas.forEach(meta => {
            [meta.who1, meta.who2].forEach(whoPk => {
                if (!whoPk) return;
                if (!opMap[whoPk]) {
                    opMap[whoPk] = {
                        pk: whoPk,
                        name: getUserNameByPk(whoPk, metaData),
                        totalTasks: 0,
                        completedTasks: 0,
                    };
                }
                opMap[whoPk].totalTasks++;
            });
        });

        operations.forEach(op => {
            if (op.hasExecutions) {
                [op.who1, op.who2].forEach(whoPk => {
                    if (whoPk && opMap[whoPk]) {
                        opMap[whoPk].completedTasks++;
                    }
                });
            }
        });

        return Object.values(opMap)
            .map(op => ({
                ...op,
                pendingTasks: Math.max(0, op.totalTasks - op.completedTasks),
                efficiency: op.totalTasks > 0 ? Math.round((op.completedTasks / op.totalTasks) * 100) : 0,
            }))
            .sort((a, b) => b.efficiency - a.efficiency);
    }, [filteredMetas, operations, metaData]);

    // Distribuição por semana
    const weekDistribution = useMemo(() => {
        const dist = { W1: 0, W2: 0, W3: 0, W4: 0 };
        enrichedMetas.forEach(m => {
            const week = m.tt_operacaosemana || m.semana;
            const key = `W${week}`;
            if (dist[key] !== undefined) dist[key]++;
        });
        return dist;
    }, [enrichedMetas]);

    // Distribuição por dia
    const dayDistribution = useMemo(() => {
        const dist = {};
        DAYS_PT.forEach(d => { dist[d] = 0; });
        enrichedMetas.forEach(m => {
            const diaNome = m.dia_nome || '';
            DAYS_PT.forEach(d => {
                if (diaNome.toLowerCase().includes(d.toLowerCase())) dist[d]++;
            });
        });
        return dist;
    }, [enrichedMetas]);

    // Info do filtro
    const filterInfo = useMemo(() => ({
        weekFilter,
        dayFilter,
        totalInDatabase: enrichedMetas.length,
        showing: filteredMetas.length,
        totalExecutions: executions.length,
    }), [weekFilter, dayFilter, enrichedMetas.length, filteredMetas.length, executions.length]);

    // Semanas e dias disponíveis
    const availableWeeks = ['W1', 'W2', 'W3', 'W4'];
    const availableDays = DAYS_PT;

    // Mutations
    const createMeta = useMutation({
        mutationFn: (data) => operationService.createOperacaoMeta(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] }),
    });

    const updateMeta = useMutation({
        mutationFn: ({ id, data }) => operationService.updateOperacaoMeta(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] }),
    });

    const deleteMeta = useMutation({
        mutationFn: (id) => operationService.deleteOperacaoMeta(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] }),
    });

    // Validação de tarefa (controlo operacional)
    const validateExecution = useMutation({
        mutationFn: (formData) => operationService.updateControl(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operacao'] });
            queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] });
        },
    });

    const refresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] });
        queryClient.invalidateQueries({ queryKey: ['operacao'] });
    }, [queryClient]);

    return {
        // Data
        analytics,
        recentActivity,
        operatorStats,
        metas: filteredMetas,
        operations,
        executions,
        weekDistribution,
        dayDistribution,
        metaData,

        // Filters
        weekFilter,
        setWeekFilter,
        dayFilter,
        setDayFilter,
        availableWeeks,
        availableDays,
        filterInfo,

        // State
        isLoading: metasLoading || execLoading,
        hasError: !!metasError || !!execError,
        error: metasError || execError,

        // Actions
        refresh,
        createMeta,
        updateMeta,
        deleteMeta,
        validateExecution,
    };
};
