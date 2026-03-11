import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { operationService } from '../services/operationService';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getInstallationName, getOperationActionName, getUserNameByPk } from '../utils/formatters';
import notification from '@/core/services/notification/notificationService';

/**
 * Hook para execuções operacionais com suporte a:
 * - Filtro por período (dateRange)
 * - Real-time: atualiza ao receber evento 'task-refresh' do SocketContext
 * - Índice de execuções por meta PK (O(n) lookup)
 * - Mutations: createDirect, createTask, validateExecution
 */
export const useOperacaoExecutions = (dateRange) => {
    const queryClient = useQueryClient();
    const { data: metaData } = useMetaData();

    const queryKey = ['operacao', dateRange.fromDate, dateRange.toDate];

    const { data: rawExecutions, isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const response = await operationService.getOperacao(dateRange);
            return response?.data || response || [];
        },
        staleTime: 1000 * 60 * 3,
    });

    // Real-time: o SocketContext dispara 'task-refresh' quando recebe TASK_NOTIFICATION
    useEffect(() => {
        const handleTaskRefresh = () => {
            queryClient.invalidateQueries({ queryKey });
            notification.info('Nova execução registada pelo operador');
        };
        window.addEventListener('task-refresh', handleTaskRefresh);
        return () => window.removeEventListener('task-refresh', handleTaskRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryClient, dateRange.fromDate, dateRange.toDate]);

    const executions = useMemo(() => Array.isArray(rawExecutions) ? rawExecutions : [], [rawExecutions]);

    // Enriquecer execuções com nomes resolvidos
    const enrichedExecutions = useMemo(() => {
        if (!metaData) return executions;
        return executions.map(exec => ({
            ...exec,
            operador_nome: exec.ts_operador1 || getUserNameByPk(exec.pk_operador1, metaData),
            instalacao_nome: exec.tb_instalacao || getInstallationName(exec.pk_instalacao, metaData),
            acao_nome: exec.tt_operacaoaccao || getOperationActionName(exec.pk_operacaoaccao, metaData),
        }));
    }, [executions, metaData]);

    // Índice execuções por meta PK — O(n) lookup
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

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] });
    };

    const createTask = useMutation({
        mutationFn: (data) => operationService.createOperacao(data),
        onSuccess: () => {
            invalidateAll();
            notification.success('Tarefa criada com sucesso');
        },
        onError: () => notification.error('Erro ao criar tarefa'),
    });

    const createDirect = useMutation({
        mutationFn: (data) => operationService.createOperacaoDirect(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            notification.success('Operação registada com sucesso!');
        },
        onError: (error) => {
            const msg = error?.response?.data?.error || error?.message || 'Erro ao registar a operação';
            notification.error(msg);
        },
    });

    const validateExecution = useMutation({
        mutationFn: (formData) => operationService.updateControl(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            notification.success('Validação registada com sucesso');
        },
        onError: () => notification.error('Erro ao validar execução'),
    });

    return {
        executions,
        enrichedExecutions,
        executionsByMeta,
        isLoading,
        error,
        createTask,
        createDirect,
        validateExecution,
    };
};
