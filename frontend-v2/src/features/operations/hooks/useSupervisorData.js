import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification/notificationService';
import { operationService } from '../services/operationService';
import { useMetaData } from '@/core/hooks/useMetaData';
import {
    getInstallationName, getOperationActionName,
    getOperationModeName, getOperationDayName, getUserNameByPk
} from '../utils/formatters';

const WEEK_MAP = { W1: 1, W2: 2, W3: 3, W4: 4 };
const DAYS_PT = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

/** Helpers de data */
const toISODate = (d) => d.toISOString().split('T')[0];
const getDefaultDateRange = () => {
    const now = new Date();
    return {
        fromDate: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
        toDate: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
};

/**
 * Hook centralizado para dados do supervisor
 * Combina metas (tarefas programadas) com execuções reais
 * @param {number} activeTab - tab ativo na página (0=Dashboard, 1=Controlo, 2=Equipa, 3=Analytics, 4=Pedidos)
 * @param {boolean} pedidosVisited - true quando o tab Pedidos já foi visitado
 */
export const useSupervisorData = ({ activeTab = 0, pedidosVisited = false } = {}) => {
    const queryClient = useQueryClient();
    const { data: metaData } = useMetaData();

    const [weekFilter, setWeekFilter] = useState('all');
    const [dayFilter, setDayFilter] = useState('all');
    const [operatorFilter, setOperatorFilter] = useState('all');
    const [dateRange, setDateRange] = useState(getDefaultDateRange);

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

    // Buscar execuções (operações realizadas) — filtradas por período
    const {
        data: rawExecutions,
        isLoading: execLoading,
        error: execError,
    } = useQuery({
        queryKey: ['operacao', dateRange.fromDate, dateRange.toDate],
        queryFn: async () => {
            const response = await operationService.getOperacao(dateRange);
            return response?.data || response || [];
        },
        staleTime: 1000 * 60 * 3,
    });

    // Enriquecer metas com nomes
    // NOTA: vbl_operacaometa já resolve nomes — tb_instalacao, tt_operacaoaccao, tt_operacaomodo,
    // tt_operacaodia, ts_operador1/2 são strings de texto prontas a usar.
    // pk_instalacao, pk_operacaoaccao, pk_operacaomodo, pk_operacaodia são os PKs inteiros.
    // tt_operacaodia = "W1 Segunda", "W2 Terça" — codifica semana + dia num só campo.
    const enrichedMetas = useMemo(() => {
        if (!rawMetas || !metaData) return [];
        return (Array.isArray(rawMetas) ? rawMetas : []).map(meta => ({
            ...meta,
            instalacao_nome: meta.tb_instalacao || getInstallationName(meta.pk_instalacao, metaData),
            acao_nome: meta.tt_operacaoaccao || getOperationActionName(meta.pk_operacaoaccao, metaData),
            modo_nome: meta.tt_operacaomodo || getOperationModeName(meta.pk_operacaomodo, metaData),
            dia_nome: meta.tt_operacaodia || getOperationDayName(meta.pk_operacaodia, metaData),
            operador1_nome: meta.ts_operador1 || getUserNameByPk(meta.pk_operador1, metaData),
            operador2_nome: meta.ts_operador2 || getUserNameByPk(meta.pk_operador2, metaData),
        }));
    }, [rawMetas, metaData]);

    const executions = useMemo(() => {
        return Array.isArray(rawExecutions) ? rawExecutions : [];
    }, [rawExecutions]);

    // Filtrar metas por semana, dia e operador
    // tt_operacaodia = "W1 Segunda", "W2 Terça" — semana codificada no prefixo
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

    // Índice de execuções por meta PK — O(n) em vez de O(n×m) no join
    const executionsByMeta = useMemo(() => {
        const map = new Map();
        executions.forEach(e => {
            const key = e.tb_operacaometa ?? e.operacao_meta;
            if (key == null) return;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(e);
        });
        return map;
    }, [executions]);

    // Correlacionar metas com execuções — O(n+m) via índice
    const operations = useMemo(() => {
        return filteredMetas.map(meta => {
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
    }, [filteredMetas, executionsByMeta]);

    // Analytics computados
    // updt_time IS NOT NULL = tarefa concluída; IS NULL = pendente (aguarda registo de resultado)
    // tb_operacaometa != null = programada (associada a meta); null = pontual (ad-hoc)
    const analytics = useMemo(() => {
        const totalOperations = filteredMetas.length;

        const completedExecutions = executions.filter(e => e.updt_time != null);
        const pendingExecutions = executions.filter(e => e.updt_time == null);
        const totalExecutions = executions.length;

        // Programadas (tt_operacaomodo preenchido) vs Pontuais (null = criadas via fbo_operacao$createdirect)
        const scheduledExecutions = executions.filter(e => e.tt_operacaomodo != null);
        const punctualExecutions = executions.filter(e => e.tt_operacaomodo == null);

        // Operadores ativos: com pelo menos 1 execução registada
        const operatorSet = new Set();
        executions.forEach(e => { if (e.pk_operador1) operatorSet.add(e.pk_operador1); });

        // Execuções sem validação de controlo de qualidade
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
    // updt_time IS NOT NULL = concluída; IS NULL = pendente
    // scheduledTasks = metas programadas atribuídas (plano mensal, dimensão separada)
    const operatorStats = useMemo(() => {
        const opMap = {};

        const emptyOp = (pk, name) => ({
            pk, name,
            scheduledTasks: 0,         // metas programadas atribuídas (plano)
            scheduledCompleted: 0,     // execuções programadas concluídas
            scheduledPending: 0,       // execuções programadas pendentes
            punctualCompleted: 0,      // execuções pontuais concluídas
            punctualPending: 0,        // execuções pontuais pendentes
        });

        // 1. Metas programadas atribuídas → scheduledTasks
        filteredMetas.forEach(meta => {
            [[meta.pk_operador1, meta.ts_operador1], [meta.pk_operador2, meta.ts_operador2]].forEach(([whoPk, whoName]) => {
                if (!whoPk) return;
                const pk = Number(whoPk);
                if (!pk || isNaN(pk)) return;
                if (!opMap[pk]) opMap[pk] = emptyOp(pk, whoName || getUserNameByPk(pk, metaData));
                opMap[pk].scheduledTasks++;
            });
        });

        // 2. Execuções → breakdown por tipo (programada/pontual) × estado (concluída/pendente)
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
                    efficiency: totalTasks > 0
                        ? Math.round((completedTasks / totalTasks) * 100)
                        : 0,
                };
            })
            .sort((a, b) => b.completedTasks - a.completedTasks || b.pendingTasks - a.pendingTasks);
    }, [filteredMetas, executions, metaData]);

    // Distribuição por semana — extrai prefixo W# de tt_operacaodia ("W1 Segunda" → "W1")
    const weekDistribution = useMemo(() => {
        const dist = { W1: 0, W2: 0, W3: 0, W4: 0 };
        enrichedMetas.forEach(m => {
            const match = (m.tt_operacaodia || '').match(/^(W\d)/);
            if (match && dist[match[1]] !== undefined) dist[match[1]]++;
        });
        return dist;
    }, [enrichedMetas]);

    // Distribuição por dia — extrai nome do dia de tt_operacaodia ("W1 Segunda" → "Segunda")
    const dayDistribution = useMemo(() => {
        const dist = {};
        DAYS_PT.forEach(d => { dist[d] = 0; });
        enrichedMetas.forEach(m => {
            const dayPart = (m.tt_operacaodia || '').replace(/^W\d+\s+/, '');
            if (dist[dayPart] !== undefined) dist[dayPart]++;
        });
        return dist;
    }, [enrichedMetas]);

    // Info do filtro
    const filterInfo = useMemo(() => ({
        weekFilter,
        dayFilter,
        operatorFilter,
        totalInDatabase: enrichedMetas.length,
        showing: filteredMetas.length,
        totalExecutions: executions.length,
    }), [weekFilter, dayFilter, operatorFilter, enrichedMetas.length, filteredMetas.length, executions.length]);

    // Semanas e dias disponíveis
    const availableWeeks = ['W1', 'W2', 'W3', 'W4'];
    const availableDays = DAYS_PT;

    // Mutations
    const createMeta = useMutation({
        mutationFn: (data) => operationService.createOperacaoMeta(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] }),
    });

    const createTask = useMutation({
        mutationFn: (data) => operationService.createOperacao(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operacao'] });
            queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] });
            notification.success('Tarefa criada com sucesso');
        },
        onError: (error) => {
            console.error('[createTask]', error);
            notification.error('Erro ao criar tarefa');
        },
    });

    const createDirect = useMutation({
        mutationFn: (data) => operationService.createOperacaoDirect(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operacao'] });
            notification.success('Operação registada com sucesso!');
        },
        onError: (error) => {
            console.error('[createDirect]', error);
            notification.error('Erro ao registar a operação');
        },
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
            notification.success('Validação registada com sucesso');
        },
        onError: (error) => {
            console.error('[validateExecution] onError:', error);
            notification.error('Erro ao validar execução');
        },
    });

    // Buscar pedidos (vbr_document_* views) — lazy: só carrega quando tab Pedidos for visitado
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
        weekFilter,
        setWeekFilter,
        dayFilter,
        setDayFilter,
        operatorFilter,
        setOperatorFilter,
        availableWeeks,
        availableDays,
        filterInfo,

        // Date range (período das execuções)
        dateRange,
        setDateRange,

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
