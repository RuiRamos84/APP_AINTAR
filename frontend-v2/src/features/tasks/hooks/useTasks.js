/**
 * useTasks - Hook para gestão de tarefas
 *
 * Integra React Query (dados do servidor) + Zustand (filtros/seleção)
 * Facilita o uso de tarefas em qualquer componente
 *
 * @example
 * const {
 *   tasks,
 *   loading,
 *   error,
 *   fetchTasks,
 *   createTask,
 *   updateTask,
 * } = useTasks();
 *
 * // "Minhas tarefas":
 * const { tasks } = useTasks({ scope: 'mine', autoFetch: false, fetchOnMount: false });
 */

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTaskStore } from '../store/taskStore';
import taskService from '../services/taskService';
import notification from '@/core/services/notification';
import {
  TASK_KEYS,
  useTasksQuery,
  useMyTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useCloseTaskMutation,
  useReopenTaskMutation,
  useAddTaskNoteMutation,
  useBulkTaskActionMutation,
} from './taskQueries';

export const useTasks = (options = {}) => {
  const { scope = 'all', autoFetch = true, fetchOnMount = true, onSuccess, onError } = options;
  const qc = useQueryClient();

  // Estado de UI (Zustand)
  const {
    filters,
    selectedTasks,
    setFilters,
    selectTask,
    deselectTask,
    selectAllVisible,
    clearSelection,
  } = useTaskStore();

  // ==================== DADOS DO SERVIDOR (React Query) ====================

  const tasksQuery = useTasksQuery({ enabled: scope === 'all' && autoFetch && fetchOnMount });
  const myTasksQuery = useMyTasksQuery({ enabled: scope === 'mine' && autoFetch && fetchOnMount });

  const activeQuery = scope === 'mine' ? myTasksQuery : tasksQuery;
  const tasks = useMemo(() => activeQuery.data ?? [], [activeQuery.data]);
  const loading = activeQuery.isLoading || activeQuery.isFetching;
  const error = activeQuery.error
    ? { message: activeQuery.error.message || 'Erro ao carregar tarefas' }
    : null;
  const totalCount = tasks.length;

  const fetchTasks = useCallback(async () => {
    try {
      await tasksQuery.refetch();
      onSuccess?.('Tarefas carregadas com sucesso');
    } catch (err) {
      notification.error(err.message || 'Erro ao carregar tarefas');
      onError?.(err);
    }
  }, [tasksQuery, onSuccess, onError]);

  const fetchMyTasks = useCallback(async () => {
    try {
      await myTasksQuery.refetch();
    } catch (err) {
      notification.error(err.message || 'Erro ao carregar suas tarefas');
    }
  }, [myTasksQuery]);

  const refresh = useCallback(() => activeQuery.refetch(), [activeQuery]);

  // ==================== MUTAÇÕES ====================

  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation();
  const statusMutation = useUpdateTaskStatusMutation();
  const closeMutation = useCloseTaskMutation();
  const reopenMutation = useReopenTaskMutation();
  const noteMutation = useAddTaskNoteMutation();
  const bulkMutation = useBulkTaskActionMutation();

  const bulkLoading = bulkMutation.isPending;

  const createTask = useCallback(
    async (taskData) => {
      try {
        const newTask = await createMutation.mutateAsync(taskData);
        notification.success('Tarefa criada com sucesso!');
        onSuccess?.('Tarefa criada');
        return newTask;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao criar tarefa';
        notification.error(errorMsg);
        onError?.(err);
        throw err;
      }
    },
    [createMutation, onSuccess, onError]
  );

  const updateTask = useCallback(
    async (taskId, taskData) => {
      try {
        const updatedTask = await updateMutation.mutateAsync({ taskId, taskData });
        notification.success('Tarefa atualizada com sucesso!');
        onSuccess?.('Tarefa atualizada');
        return updatedTask;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao atualizar tarefa';
        notification.error(errorMsg);
        onError?.(err);
        throw err;
      }
    },
    [updateMutation, onSuccess, onError]
  );

  const updateStatus = useCallback(
    async (taskId, statusId) => {
      try {
        const updatedTask = await statusMutation.mutateAsync({ taskId, statusId });
        notification.success('Status atualizado com sucesso!');
        return updatedTask;
      } catch (err) {
        notification.error(err.message || 'Erro ao atualizar status');
        throw err;
      }
    },
    [statusMutation]
  );

  const closeTask = useCallback(
    async (taskId, note = null) => {
      try {
        const updatedTask = await closeMutation.mutateAsync({ taskId, note });
        notification.success('Tarefa concluída!');
        return updatedTask;
      } catch (err) {
        notification.error(err.message || 'Erro ao concluir tarefa');
        throw err;
      }
    },
    [closeMutation]
  );

  const reopenTask = useCallback(
    async (taskId, reason = null) => {
      try {
        const updatedTask = await reopenMutation.mutateAsync({ taskId, reason });
        notification.success('Tarefa reaberta!');
        return updatedTask;
      } catch (err) {
        notification.error(err.message || 'Erro ao reabrir tarefa');
        throw err;
      }
    },
    [reopenMutation]
  );

  // ==================== NOTAS & HISTÓRICO ====================

  const addNote = useCallback(
    async (taskId, note) => {
      try {
        await noteMutation.mutateAsync({ taskId, note });
        window.dispatchEvent(new CustomEvent('task-refresh'));
      } catch (err) {
        notification.error(err.message || 'Erro ao adicionar nota');
        throw err;
      }
    },
    [noteMutation]
  );

  const fetchHistory = useCallback(async (taskId) => {
    try {
      return await taskService.getTaskHistory(taskId);
    } catch (err) {
      notification.error('Erro ao carregar histórico');
      throw err;
    }
  }, []);

  const markNotificationAsRead = useCallback(
    async (taskId) => {
      try {
        await taskService.markTaskAsRead(taskId);
        const clearNotifications = (prev) =>
          prev?.map((t) =>
            t.id === taskId ? { ...t, notification_owner: 0, notification_client: 0 } : t
          );
        qc.setQueryData(TASK_KEYS.list, clearNotifications);
        qc.setQueryData(TASK_KEYS.my, clearNotifications);
      } catch (err) {
        console.error('Erro ao marcar notificação como lida:', err);
      }
    },
    [qc]
  );

  // ==================== AÇÕES EM MASSA ====================

  /**
   * Executar ação em massa sobre as tarefas selecionadas
   * @param {'close'|'reopen'|'status'|'priority'} action
   * @param {{ statusId?: number, priorityId?: number }} options
   */
  const bulkAction = useCallback(
    async (action, options = {}) => {
      if (selectedTasks.length === 0) return;

      try {
        const result = await bulkMutation.mutateAsync({ taskIds: selectedTasks, action, options });
        const count = result.succeeded?.length ?? selectedTasks.length;
        const failedCount = result.failed?.length ?? 0;

        if (failedCount > 0) {
          notification.warning(`${count} tarefa(s) processada(s), ${failedCount} com erro.`);
        } else {
          const labels = {
            close: 'encerradas',
            reopen: 'reabertas',
            status: 'atualizadas',
            priority: 'atualizadas',
          };
          notification.success(
            `${count} tarefa(s) ${labels[action] ?? 'processadas'} com sucesso.`
          );
        }

        clearSelection();
      } catch (err) {
        notification.error(err.message || 'Erro na ação em massa');
      }
    },
    [selectedTasks, bulkMutation, clearSelection]
  );

  // ==================== SELECTORS ====================

  const getFilteredTasks = useCallback(() => {
    let filtered = [...tasks];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title?.toLowerCase().includes(search) ||
          task.description?.toLowerCase().includes(search)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter((task) => task.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    if (filters.client !== 'all') {
      const clientId = parseInt(filters.client, 10);
      filtered = filtered.filter((task) => task.client === clientId || task.ts_client === clientId);
    }

    return filtered;
  }, [tasks, filters]);

  const getTaskStats = useCallback(
    () => ({
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
      high_priority: tasks.filter((t) => t.priority === 'alta' || t.priority === 'urgente').length,
    }),
    [tasks]
  );

  const getTasksByStatus = useCallback(() => {
    const filtered = getFilteredTasks();
    return {
      pending: filtered.filter((t) => t.status === 'pending'),
      in_progress: filtered.filter((t) => t.status === 'in_progress'),
      completed: filtered.filter((t) => t.status === 'completed'),
      cancelled: filtered.filter((t) => t.status === 'cancelled'),
    };
  }, [getFilteredTasks]);

  // ==================== RETURN ====================

  return {
    // Estado
    tasks,
    loading,
    error,
    totalCount,
    filters,
    selectedTasks,

    // CRUD
    fetchTasks,
    fetchMyTasks,
    createTask,
    updateTask,

    // Status
    updateStatus,
    closeTask,
    reopenTask,

    // Notas & Histórico
    addNote,
    fetchHistory,

    // Notificações
    markNotificationAsRead,

    // Filtros & seleção (UI)
    setFilters,
    selectTask,
    deselectTask,
    selectAllVisible,
    clearSelection,

    // Selectors
    getFilteredTasks,
    getTaskStats,
    getTasksByStatus,

    // Ações em massa
    bulkAction,
    bulkLoading,

    // Utilitários
    refresh,
    hasSelection: selectedTasks.length > 0,
    selectedCount: selectedTasks.length,
  };
};

export default useTasks;
