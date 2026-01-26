/**
 * useTasks - Hook para gestão de tarefas
 *
 * Integra Zustand store + API service
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
 *   deleteTask,
 * } = useTasks();
 */

import { useCallback, useEffect } from 'react';
import { useTaskStore } from '../store/taskStore';
import taskService from '../services/taskService';
import { toast } from 'sonner';

export const useTasks = (options = {}) => {
  const {
    autoFetch = true,
    fetchOnMount = true,
    onSuccess,
    onError,
  } = options;

  // Estado do store
  const {
    tasks,
    currentTask,
    loading,
    error,
    page,
    rowsPerPage,
    totalCount,
    orderBy,
    order,
    filters,
    selectedTasks,
    viewMode,

    // Actions
    setTasks,
    addTask,
    updateTask: updateTaskInStore,
    removeTask,
    setCurrentTask,
    clearCurrentTask,
    setLoading,
    setError,
    clearError,
    setPage,
    setRowsPerPage,
    setSort,
    setFilters,
    resetFilters,
    setSelectedTasks,
    clearSelection,
    setViewMode,
    isCacheValid,
    invalidateCache,

    // Selectors
    getFilteredTasks,
    getTaskStats,
    getTasksByStatus,
  } = useTaskStore();

  // ==================== FETCH TASKS ====================

  /**
   * Carregar tarefas da API
   */
  const fetchTasks = useCallback(
    async (forceRefresh = false) => {
      // Cache desativado - sempre buscar dados frescos
      if (!forceRefresh && isCacheValid()) {
        return;
      }

      setLoading(true);
      clearError();

      try {
        const params = {
          page,
          limit: rowsPerPage,
          orderBy,
          order,
          ...filters,
        };

        const result = await taskService.getTasks(params);
        setTasks(result.tasks, result.totalCount);
        onSuccess?.('Tarefas carregadas com sucesso');
      } catch (err) {
        const errorMsg = err.message || 'Erro ao carregar tarefas';
        setError({ message: errorMsg });
        toast.error(errorMsg);
        onError?.(err);
      }
    },
    [
      page,
      rowsPerPage,
      orderBy,
      order,
      filters,
      isCacheValid,
      setLoading,
      setError,
      clearError,
      setTasks,
      onSuccess,
      onError,
    ]
  );

  /**
   * Carregar minhas tarefas
   */
  const fetchMyTasks = useCallback(async () => {
    setLoading(true);
    clearError();

    try {
      const params = {
        page,
        limit: rowsPerPage,
        orderBy,
        order,
        assignedTo: 'me',
        ...filters,
      };

      const result = await taskService.getMyTasks(params);
      setTasks(result.tasks, result.totalCount);
    } catch (err) {
      const errorMsg = err.message || 'Erro ao carregar suas tarefas';
      setError({ message: errorMsg });
      toast.error(errorMsg);
    }
  }, [page, rowsPerPage, orderBy, order, filters, setLoading, setError, clearError, setTasks]);


  // ==================== CREATE ====================

  /**
   * Criar nova tarefa
   */
  const createTask = useCallback(
    async (taskData) => {
      setLoading(true);
      clearError();

      try {
        const newTask = await taskService.createTask(taskData);
        addTask(newTask);
        invalidateCache();

        toast.success('Tarefa criada com sucesso!');
        onSuccess?.('Tarefa criada');

        return newTask;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao criar tarefa';
        setError({ message: errorMsg });
        toast.error(errorMsg);
        onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, clearError, addTask, invalidateCache, onSuccess, onError]
  );

  // ==================== UPDATE ====================

  /**
   * Atualizar tarefa
   */
  const updateTask = useCallback(
    async (taskId, taskData) => {
      setLoading(true);
      clearError();

      try {
        const updatedTask = await taskService.updateTask(taskId, taskData);
        updateTaskInStore(taskId, updatedTask);
        invalidateCache();

        toast.success('Tarefa atualizada com sucesso!');
        onSuccess?.('Tarefa atualizada');

        return updatedTask;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao atualizar tarefa';
        setError({ message: errorMsg });
        toast.error(errorMsg);
        onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, clearError, updateTaskInStore, invalidateCache, onSuccess, onError]
  );

  /**
   * Atualizar status da tarefa
   */
  const updateStatus = useCallback(
    async (taskId, statusId) => {
      setLoading(true);
      clearError();

      try {
        const updatedTask = await taskService.updateTaskStatus(taskId, statusId);
        updateTaskInStore(taskId, updatedTask);
        invalidateCache();

        toast.success('Status atualizado com sucesso!');
        return updatedTask;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao atualizar status';
        toast.error(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, clearError, updateTaskInStore, invalidateCache]
  );

  /**
   * Fechar/completar tarefa
   */
  const closeTask = useCallback(
    async (taskId, note = null) => {
      setLoading(true);
      clearError();

      try {
        const updatedTask = await taskService.closeTask(taskId, note);
        updateTaskInStore(taskId, updatedTask);
        invalidateCache();

        toast.success('Tarefa concluída!');
        return updatedTask;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao concluir tarefa';
        toast.error(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, clearError, updateTaskInStore, invalidateCache]
  );

  /**
   * Reabrir tarefa
   */
  const reopenTask = useCallback(
    async (taskId, reason = null) => {
      setLoading(true);
      clearError();

      try {
        const updatedTask = await taskService.reopenTask(taskId, reason);
        updateTaskInStore(taskId, updatedTask);
        invalidateCache();

        toast.success('Tarefa reaberta!');
        return updatedTask;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao reabrir tarefa';
        toast.error(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, clearError, updateTaskInStore, invalidateCache]
  );


  // ==================== NOTES & HISTORY ====================

  /**
   * Adicionar nota
   */
  const addNote = useCallback(
    async (taskId, note) => {
      setLoading(true);
      clearError();

      try {
        await taskService.addTaskNote(taskId, note);
        toast.success('Nota adicionada!');
      } catch (err) {
        const errorMsg = err.message || 'Erro ao adicionar nota';
        toast.error(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, clearError]
  );

  /**
   * Carregar histórico
   */
  const fetchHistory = useCallback(
    async (taskId) => {
      try {
        const history = await taskService.getTaskHistory(taskId);
        return history;
      } catch (err) {
        toast.error('Erro ao carregar histórico');
        throw err;
      }
    },
    []
  );

  /**
   * Marcar notificação de tarefa como lida
   */
  const markNotificationAsRead = useCallback(
    async (taskId) => {
      try {
        await taskService.markTaskAsRead(taskId);
        // Atualizar tarefa local para remover notificação
        updateTaskInStore(taskId, {
          notification_owner: 0,
          notification_client: 0,
        });
      } catch (err) {
        console.error('Erro ao marcar notificação como lida:', err);
      }
    },
    [updateTaskInStore]
  );


  // ==================== EFFECTS ====================

  // Auto-fetch on mount
  useEffect(() => {
    if (fetchOnMount && autoFetch) {
      fetchTasks();
    }
  }, [fetchOnMount, autoFetch]);

  // Re-fetch quando paginação/ordenação/filtros mudam
  useEffect(() => {
    if (autoFetch && !fetchOnMount) {
      fetchTasks();
    }
  }, [page, rowsPerPage, orderBy, order, filters]); // Excluir fetchTasks

  // ==================== RETURN ====================

  return {
    // Estado
    tasks,
    currentTask,
    loading,
    error,
    page,
    rowsPerPage,
    totalCount,
    orderBy,
    order,
    filters,
    selectedTasks,
    viewMode,

    // CRUD
    fetchTasks,
    fetchMyTasks,
    createTask,
    updateTask,

    // Status
    updateStatus,
    closeTask,
    reopenTask,

    // Notes & History
    addNote,
    fetchHistory,

    // Notifications
    markNotificationAsRead,

    // Store actions
    setCurrentTask,
    clearCurrentTask,
    setPage,
    setRowsPerPage,
    setSort,
    setFilters,
    resetFilters,
    setSelectedTasks,
    clearSelection,
    setViewMode,
    clearError,
    invalidateCache,

    // Selectors
    getFilteredTasks,
    getTaskStats,
    getTasksByStatus,

    // Utilities
    refresh: () => fetchTasks(true),
    hasSelection: selectedTasks.length > 0,
    selectedCount: selectedTasks.length,
  };
};

export default useTasks;
