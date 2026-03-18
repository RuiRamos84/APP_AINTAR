import { useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { operationService } from '../services/operationService';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getInstallationName, getOperationActionName, getUserNameByPk } from '../utils/formatters';
import { useOperacaoMetas } from './useOperacaoMetas';
import { useOperacaoExecutions } from './useOperacaoExecutions';

const DAYS_PT = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const toISODate = (d) => d.toISOString().split('T')[0];
const getDefaultDateRange = () => {
    const now = new Date();
    return {
        fromDate: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
        toDate: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
};

/**
 * Hook agregador para o supervisor — combina metas + execuções + filtros + analytics.
 * A lógica de fetching e mutations está nos sub-hooks useOperacaoMetas e useOperacaoExecutions.
 */
export const useSupervisorData = ({ activeTab = 0, pedidosVisited = false } = {}) => {
    const queryClient = useQueryClient();
    const { data: metaData } = useMetaData();

    const [weekFilter, setWeekFilter] = useState('all');
    const [dayFilter, setDayFilter] = useState('all');
    const [operatorFilter, setOperatorFilter] = useState('all');
    const [dateRange, setDateRange] = useState(getDefaultDateRange);

    // Sub-hooks: fetching, enrichment, mutations
    const {
        metas: enrichedMetas,
        isLoading: metasLoading,
        error: metasError,
        weekDistribution,
        dayDistribution,
        createMeta,
        updateMeta,
        deleteMeta,
    } = useOperacaoMetas();

    const {
        executions,
        executionsByMeta,
        isLoading: execLoading,
        error: execError,
        createTask,
        createDirect,
        validateExecution,
    } = useOperacaoExecutions(dateRange);

    // Filtrar metas por semana, dia e operador
    const filteredMetas = useMemo(() => {
        let result = enrichedMetas;
        if (weekFilter !== 'all') {
            result = result.filter(m => (m.tt_operacaodia || '').startsWith(weekFilter));
        }
        if (dayFilter !== 'all') {
            result = result.filter(m => {
                const dayPart = (m.tt_operacaodia || '').replace(/^W\d+\s+/, '').toLowerCase();
                return dayPart === dayFilter.toLowerCase();
            });
        }
        if (operatorFilter !== 'all') {
            const opPk = Number(operatorFilter);
            result = result.filter(m => Number(m.pk_operador1) === opPk || Number(m.pk_operador2) === opPk);
        }
        return result;
    }, [enrichedMetas, weekFilter, dayFilter, operatorFilter]);

    // Correlacionar metas com execuções
    const operations = useMemo(() => {
        const metaOps = filteredMetas.map(meta => {
            const metaExecs = executionsByMeta.get(meta.pk) || [];
            const lastExecution = metaExecs.length > 0
                ? [...metaExecs].sort((a, b) => new Date(b.ts_exec || b.data_execucao) - new Date(a.ts_exec || a.data_execucao))[0]
                : null;
            return {
                ...meta,
                executions: metaExecs,
                executionCount: metaExecs.length,
                lastExecution,
                hasExecutions: metaExecs.length > 0,
            };
        });

        // Tarefas pontuais (sem meta) — cada execução é autónoma
        const pontualOps = executions
            .filter(e => e.tb_operacaometa == null && e.operacao_meta == null)
            .map(e => ({
                pk: `pontual_${e.pk}`,
                instalacao_nome: e.tb_instalacao || '',
                acao_nome: e.tt_operacaoaccao || '',
                modo_nome: 'Pontual',
                dia_nome: '—',
                operador1_nome: e.ts_operador1 || '',
                operador2_nome: e.ts_operador2 || '',
                executions: [e],
                executionCount: 1,
                lastExecution: e,
                hasExecutions: true,
                isPontual: true,
            }));

        return [...metaOps, ...pontualOps];
    }, [filteredMetas, executionsByMeta, executions]);

    // Analytics computados
    const analytics = useMemo(() => {
        const totalOperations = filteredMetas.length;
        const completedExecutions = executions.filter(e => e.updt_time != null);
        const pendingExecutions = executions.filter(e => e.updt_time == null);
        const totalExecutions = executions.length;
        const scheduledExecutions = executions.filter(e => e.tt_operacaomodo != null);
        const punctualExecutions = executions.filter(e => e.tt_operacaomodo == null);

        const operatorSet = new Set();
        executions.forEach(e => { if (e.pk_operador1) operatorSet.add(e.pk_operador1); });

        const unvalidatedCount = executions.filter(
            e => e.updt_time != null && (!e.control_tt_operacaocontrolo || e.control_tt_operacaocontrolo === 0)
        ).length;

        const completionRate = totalExecutions > 0
            ? Math.round((completedExecutions.length / totalExecutions) * 100)
            : 0;
        const activityRate = totalOperations > 0
            ? Math.min(100, Math.round((completedExecutions.length / totalOperations) * 100))
            : 0;

        return {
            overview: {
                totalOperations,
                totalExecutions,
                completedTasks: completedExecutions.length,
                pendingTasks: pendingExecutions.length,
                scheduledExecutions: scheduledExecutions.length,
                punctualExecutions: punctualExecutions.length,
                activeOperators: operatorSet.size,
                unvalidatedCount,
                completionRate,
                activityRate,
            }
        };
    }, [filteredMetas, executions]);

    // Atividade recente (últimas 20 execuções concluídas)
    const recentActivity = useMemo(() => {
        return [...executions]
            .filter(e => e.updt_time != null)
            .sort((a, b) => new Date(b.updt_time) - new Date(a.updt_time))
            .slice(0, 20)
            .map(exec => ({
                ...exec,
                operador_nome: exec.ts_operador1 || getUserNameByPk(exec.pk_operador1, metaData),
                instalacao_nome: exec.tb_instalacao || getInstallationName(exec.pk_instalacao, metaData),
                acao_nome: exec.tt_operacaoaccao || getOperationActionName(exec.pk_operacaoaccao, metaData),
            }));
    }, [executions, metaData]);

    // Stats por operador
    const operatorStats = useMemo(() => {
        const opMap = {};
        const emptyOp = (pk, name) => ({
            pk, name,
            scheduledTasks: 0,
            scheduledCompleted: 0,
            scheduledPending: 0,
            punctualCompleted: 0,
            punctualPending: 0,
        });

        filteredMetas.forEach(meta => {
            [[meta.pk_operador1, meta.ts_operador1], [meta.pk_operador2, meta.ts_operador2]].forEach(([whoPk, whoName]) => {
                if (!whoPk) return;
                const pk = Number(whoPk);
                if (!pk || isNaN(pk)) return;
                if (!opMap[pk]) opMap[pk] = emptyOp(pk, whoName || getUserNameByPk(pk, metaData));
                opMap[pk].scheduledTasks++;
            });
        });

        executions.forEach(exec => {
            const pk = Number(exec.pk_operador1);
            if (!pk) return;
            if (!opMap[pk]) opMap[pk] = emptyOp(pk, exec.ts_operador1 || getUserNameByPk(pk, metaData));
            const isPunctual = exec.tt_operacaomodo == null;
            const isDone = exec.updt_time != null;
            if (isPunctual) {
                if (isDone) opMap[pk].punctualCompleted++; else opMap[pk].punctualPending++;
            } else {
                if (isDone) opMap[pk].scheduledCompleted++; else opMap[pk].scheduledPending++;
            }
        });

        return Object.values(opMap)
            .filter(op => op.scheduledTasks > 0 || op.scheduledCompleted > 0 || op.scheduledPending > 0 || op.punctualCompleted > 0 || op.punctualPending > 0)
            .map(op => {
                const completedTasks = op.scheduledCompleted + op.punctualCompleted;
                const pendingTasks = op.scheduledPending + op.punctualPending;
                const totalTasks = completedTasks + pendingTasks;
                return {
                    ...op,
                    completedTasks,
                    pendingTasks,
                    punctualTasks: op.punctualCompleted + op.punctualPending,
                    totalTasks,
                    efficiency: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                };
            })
            .sort((a, b) => b.completedTasks - a.completedTasks || b.pendingTasks - a.pendingTasks);
    }, [filteredMetas, executions, metaData]);

    // Info do filtro
    const filterInfo = useMemo(() => ({
        weekFilter, dayFilter, operatorFilter,
        totalInDatabase: enrichedMetas.length,
        showing: filteredMetas.length,
        totalExecutions: executions.length,
    }), [weekFilter, dayFilter, operatorFilter, enrichedMetas.length, filteredMetas.length, executions.length]);

    // Pedidos (lazy: só carrega quando tab Pedidos for visitado)
    const {
        data: rawPedidos,
        isLoading: pedidosLoading,
        error: pedidosError,
    } = useQuery({
        queryKey: ['pedidos'],
        queryFn: async () => {
            const response = await operationService.fetchPedidosData();
            return response || {};
        },
        staleTime: 1000 * 60 * 5,
        enabled: pedidosVisited,
    });

    const refresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] });
        queryClient.invalidateQueries({ queryKey: ['operacao', dateRange.fromDate, dateRange.toDate] });
        if (pedidosVisited) {
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        }
    }, [queryClient, dateRange, pedidosVisited]);

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
        weekFilter, setWeekFilter,
        dayFilter, setDayFilter,
        operatorFilter, setOperatorFilter,
        availableWeeks: ['W1', 'W2', 'W3', 'W4'],
        availableDays: DAYS_PT,
        filterInfo,

        // Date range
        dateRange, setDateRange,

        // Pedidos
        pedidos: rawPedidos || {},

        // State
        isLoading: metasLoading || execLoading,
        hasError: !!metasError || !!execError,
        error: metasError || execError,
        pedidosLoading,
        pedidosError,

        // Actions
        refresh,
        createTask,
        createDirect,
        createMeta,
        updateMeta,
        deleteMeta,
        validateExecution,
    };
};
