import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { tokenStorage } from '@/services/api/apiClient';
import { AuthUser } from '@/services/auth/authService';

// ─── Keys ────────────────────────────────────────────────────────────────────
const KEYS = {
  myTasks:      ['tasks', 'my']      as const,
  createdTasks: ['tasks', 'created'] as const,
  users:        ['tasks', 'users']   as const,
};

// ─── Types ───────────────────────────────────────────────────────────────────
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type TaskStatus   = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  pk: number;
  name: string;
  memo?: string;
  status: TaskStatus;
  ts_priority: TaskPriority;
  owner: number;
  owner_name: string;
  ts_client: number;
  ts_client_name: string;
  when_start: string;
  when_stop?: string | null;
  notification_owner?: number;
  notification_client?: number;
}

export interface TaskNote {
  pk: number;
  memo: string;
  when_submit: string;
  isadmin: number; // 0 = cliente, 1 = responsável/admin
}

export interface WhoUser {
  pk: number;
  name: string;
  username?: string;
}

export interface CreateTaskPayload {
  name: string;
  ts_client: number;
  ts_priority: TaskPriority;
  memo?: string;
}

// ─── Priority metadata ───────────────────────────────────────────────────────
export const PRIORITIES: { value: TaskPriority; label: string; color: string; bg: string }[] = [
  { value: 'baixa',   label: 'Baixa',   color: '#2e7d32', bg: '#E8F5E9' },
  { value: 'media',   label: 'Média',   color: '#ed6c02', bg: '#FFF3E0' },
  { value: 'alta',    label: 'Alta',    color: '#e65100', bg: '#FBE9E7' },
  { value: 'urgente', label: 'Urgente', color: '#d32f2f', bg: '#FFEBEE' },
];

// ─── Status metadata ─────────────────────────────────────────────────────────
export const STATUSES: { value: TaskStatus; label: string; color: string; bg: string }[] = [
  { value: 'pending',     label: 'Pendente',     color: '#ed6c02', bg: '#FFF3E0' },
  { value: 'in_progress', label: 'Em Progresso', color: '#1B5E8E', bg: '#E8F1FA' },
  { value: 'completed',   label: 'Concluída',    color: '#2e7d32', bg: '#E8F5E9' },
  { value: 'cancelled',   label: 'Cancelada',    color: '#9E9E9E', bg: '#F5F5F5' },
];

export const getStatusMeta   = (s: TaskStatus)   => STATUSES.find(x => x.value === s)   ?? STATUSES[0];
export const getPriorityMeta = (p: TaskPriority) => PRIORITIES.find(x => x.value === p) ?? PRIORITIES[0];

// ─── Status transitions ──────────────────────────────────────────────────────
export const STATUS_TRANSITIONS: Record<TaskStatus, { action: string; next: TaskStatus; color: string }[]> = {
  pending:     [
    { action: 'Iniciar',  next: 'in_progress', color: '#1B5E8E' },
    { action: 'Cancelar', next: 'cancelled',   color: '#9E9E9E' },
  ],
  in_progress: [
    { action: 'Concluir', next: 'completed',   color: '#2e7d32' },
    { action: 'Pausar',   next: 'pending',     color: '#ed6c02' },
    { action: 'Cancelar', next: 'cancelled',   color: '#9E9E9E' },
  ],
  completed:   [{ action: 'Reabrir',  next: 'in_progress', color: '#1B5E8E' }],
  cancelled:   [{ action: 'Reativar', next: 'pending',     color: '#ed6c02' }],
};

// ─── useCurrentUser ───────────────────────────────────────────────────────────
export const useCurrentUser = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => { tokenStorage.getUser().then(setUser); }, []);
  return user;
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useMyTasks = () =>
  useQuery<Task[]>({
    queryKey: KEYS.myTasks,
    queryFn: async () => {
      const { data } = await apiClient.get('/tasks/my');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

export const useCreatedTasks = () =>
  useQuery<Task[]>({
    queryKey: KEYS.createdTasks,
    queryFn: async () => {
      const { data } = await apiClient.get('/tasks/created');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

export const useWhoList = () =>
  useQuery<WhoUser[]>({
    queryKey: KEYS.users,
    queryFn: async () => {
      const { data } = await apiClient.get('/who');
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

export const useTaskHistory = (taskPk: number | null) =>
  useQuery<TaskNote[]>({
    queryKey: ['tasks', 'history', taskPk],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tasks/${taskPk}/history`);
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    enabled: taskPk != null,
    staleTime: 30 * 1000,
  });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => apiClient.post('/tasks', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.myTasks });
      qc.invalidateQueries({ queryKey: KEYS.createdTasks });
    },
  });
};

export const useUpdateTaskStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskPk, status }: { taskPk: number; status: TaskStatus }) =>
      apiClient.put(`/tasks/${taskPk}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.myTasks });
      qc.invalidateQueries({ queryKey: KEYS.createdTasks });
    },
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskPk, payload }: {
      taskPk: number;
      payload: { name?: string; memo?: string; ts_priority?: TaskPriority; ts_client?: number };
    }) => apiClient.put(`/tasks/${taskPk}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.myTasks });
      qc.invalidateQueries({ queryKey: KEYS.createdTasks });
    },
  });
};

export const useCloseTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskPk: number) => apiClient.post(`/tasks/${taskPk}/close`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.myTasks });
      qc.invalidateQueries({ queryKey: KEYS.createdTasks });
    },
  });
};

export const useReopenTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskPk: number) => apiClient.post(`/tasks/${taskPk}/reopen`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.myTasks });
      qc.invalidateQueries({ queryKey: KEYS.createdTasks });
    },
  });
};

export const useAddNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskPk, memo }: { taskPk: number; memo: string }) =>
      apiClient.post(`/tasks/${taskPk}/notes`, { memo }),
    onSuccess: (_, { taskPk }) => {
      qc.invalidateQueries({ queryKey: ['tasks', 'history', taskPk] });
      qc.invalidateQueries({ queryKey: KEYS.myTasks });
      qc.invalidateQueries({ queryKey: KEYS.createdTasks });
    },
  });
};

export const useMarkTaskRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskPk: number) => apiClient.put(`/tasks/${taskPk}/notification`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.myTasks });
      qc.invalidateQueries({ queryKey: KEYS.createdTasks });
    },
  });
};
