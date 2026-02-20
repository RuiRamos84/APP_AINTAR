import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operationService } from '../services/operationService';
import { notification } from '@/core/services/notification';

/**
 * Mapear campos da view para nomes usados nos componentes.
 */
const mapTask = (raw, completed = false) => ({
    ...raw,
    instalacao_nome: raw.tb_instalacao || '',
    acao_operacao: raw.tt_operacaoaccao || '',
    modo_operacao: raw.tt_operacaomodo || '',
    dia_operacao: raw.data || '',
    operacao_tipo: raw.tt_operacaoaccao_type,
    operador1_nome: raw.ts_operador1 || '',
    operador2_nome: raw.ts_operador2 || '',
    requer_foto: raw.photo,
    caminho_foto: raw.photo_path || '',
    completed,
    description: raw.tt_operacaoaccao
        ? `${raw.tt_operacaoaccao}${raw.tb_instalacao ? ' - ' + raw.tb_instalacao : ''}`
        : '',
});

/**
 * Hook para tarefas operacionais do operador autenticado.
 *
 * O backend retorna:
 * - data: tarefas pendentes (vbl_operacao$self)
 * - completed: tarefas concluídas (vbl_operacao filtrada)
 * - stats: { total_assigned, total_completed }
 */
export const useOperationTasks = (options = {}) => {
    const { enabled = true } = options;
    const queryClient = useQueryClient();

    const {
        data: queryData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['operacaoSelf'],
        queryFn: async () => {
            const response = await operationService.getOperacaoSelf();
            const pending = response?.data || response || [];
            const completed = response?.completed || [];
            const stats = response?.stats || { total_assigned: 0, total_completed: 0 };

            return {
                pending: Array.isArray(pending) ? pending : [],
                completed: Array.isArray(completed) ? completed : [],
                stats,
            };
        },
        enabled,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: true,
    });

    // Tarefas pendentes
    const pendingTasks = useMemo(
        () => (queryData?.pending || []).map(t => mapTask(t, false)),
        [queryData?.pending]
    );

    // Tarefas concluídas (do servidor)
    const completedTasks = useMemo(
        () => (queryData?.completed || []).map(t => mapTask(t, true)),
        [queryData?.completed]
    );

    // Stats do servidor
    const stats = useMemo(() => {
        const serverStats = queryData?.stats || {};
        const total = serverStats.total_assigned || (pendingTasks.length + completedTasks.length);
        const completed = serverStats.total_completed || completedTasks.length;
        const pending = pendingTasks.length;

        return {
            total,
            completed,
            pending,
            completionRate: total > 0
                ? Math.round((completed / total) * 100)
                : 0,
        };
    }, [queryData?.stats, pendingTasks, completedTasks]);

    /** Agrupar tarefas pendentes por instalação */
    const tasksByInstallation = useMemo(() => {
        const grouped = {};
        pendingTasks.forEach(task => {
            const instalacao = task.instalacao_nome || 'Sem Instalação';
            if (!grouped[instalacao]) {
                grouped[instalacao] = {
                    tasks: [],
                    licenseStatus: task.tt_instalacaolicenciamento
                };
            }
            grouped[instalacao].tasks.push(task);
        });
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [pendingTasks]);

    /** Agrupar tarefas concluídas por instalação */
    const completedByInstallation = useMemo(() => {
        const grouped = {};
        completedTasks.forEach(task => {
            const instalacao = task.instalacao_nome || 'Sem Instalação';
            if (!grouped[instalacao]) {
                grouped[instalacao] = { tasks: [] };
            }
            grouped[instalacao].tasks.push(task);
        });
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [completedTasks]);

    // Mutation para completar tarefa
    const completeTaskMutation = useMutation({
        mutationFn: ({ taskId, completionData }) =>
            operationService.completeTask(taskId, completionData),
        onMutate: async ({ taskId }) => {
            await queryClient.cancelQueries({ queryKey: ['operacaoSelf'] });
            const previous = queryClient.getQueryData(['operacaoSelf']);

            // Optimistic: mover tarefa de pending para completed
            queryClient.setQueryData(['operacaoSelf'], (old) => {
                if (!old) return old;
                const task = (old.pending || []).find(t => t.pk === taskId);
                return {
                    ...old,
                    pending: (old.pending || []).filter(t => t.pk !== taskId),
                    completed: task ? [task, ...(old.completed || [])] : old.completed,
                    stats: {
                        ...old.stats,
                        total_completed: (old.stats?.total_completed || 0) + (task ? 1 : 0),
                    },
                };
            });

            return { previous };
        },
        onSuccess: () => {
            notification.success('Tarefa concluída com sucesso');
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['operacaoSelf'], context.previous);
            }
            notification.error('Erro ao concluir tarefa');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['operacaoSelf'] });
        },
    });

    const completeTask = useCallback(async (taskId, completionData) => {
        return completeTaskMutation.mutateAsync({ taskId, completionData });
    }, [completeTaskMutation]);

    return {
        tasks: pendingTasks,
        pendingTasks,
        completedTasks,
        todayTasks: pendingTasks,
        todayCompletedTasks: completedTasks,
        tasksByInstallation,
        completedByInstallation,
        stats,
        isLoading,
        error,
        refetch,
        completeTask,
        isCompleting: completeTaskMutation.isPending,
        completeError: completeTaskMutation.error,
    };
};
