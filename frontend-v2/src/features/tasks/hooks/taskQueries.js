/**
 * Task Queries - React Query
 *
 * Camada de dados do servidor para tarefas (substitui o estado de
 * tasks/loading/error que estava no Zustand taskStore).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import taskService from '../services/taskService';

export const TASK_KEYS = {
  all: ['tasks'],
  list: ['tasks', 'list'],
  my: ['tasks', 'my'],
};

export function useTasksQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: TASK_KEYS.list,
    queryFn: async () => {
      const result = await taskService.getTasks();
      return result.tasks;
    },
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useMyTasksQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: TASK_KEYS.my,
    queryFn: async () => {
      const result = await taskService.getMyTasks();
      return result.tasks;
    },
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useCreateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskData) => taskService.createTask(taskData),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_KEYS.all }),
  });
}

export function useUpdateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, taskData }) => taskService.updateTask(taskId, taskData),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_KEYS.all }),
  });
}

export function useUpdateTaskStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, statusId }) => taskService.updateTaskStatus(taskId, statusId),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_KEYS.all }),
  });
}

export function useCloseTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, note }) => taskService.closeTask(taskId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_KEYS.all }),
  });
}

export function useReopenTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, reason }) => taskService.reopenTask(taskId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_KEYS.all }),
  });
}

export function useAddTaskNoteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, note }) => taskService.addTaskNote(taskId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_KEYS.all }),
  });
}

export function useBulkTaskActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskIds, action, options }) =>
      taskService.bulkTaskAction(taskIds, action, options),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_KEYS.all }),
  });
}
