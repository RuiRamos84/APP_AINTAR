/**
 * Task Service - Serviço para gestão de tarefas
 * Alinhado com o backend real
 *
 * @module taskService
 */

import apiClient from '@/services/api/client';

// ==================== HELPER FUNCTIONS ====================

/**
 * Mapeamento Status: Backend ID → Frontend String
 */
const STATUS_MAP = {
  0: 'pending',
  1: 'pending',
  2: 'in_progress',
  3: 'completed',
  4: 'cancelled',
};

/**
 * Mapeamento Status: Frontend String → Backend ID
 */
const STATUS_REVERSE_MAP = {
  pending: 1,
  in_progress: 2,
  completed: 3,
  cancelled: 4,
};

/**
 * Mapeamento Prioridade: Backend ID → Frontend String
 */
const PRIORITY_MAP = {
  1: 'baixa',
  2: 'media',
  3: 'alta',
  4: 'urgente',
};

/**
 * Mapeamento Prioridade: Frontend String → Backend ID
 */
const PRIORITY_REVERSE_MAP = {
  baixa: 1,
  media: 2,
  alta: 3,
  urgente: 4,
};

/**
 * Trata a resposta da API
 */
const handleResponse = (response) => {
  if (response?.tasks) {
    return response.tasks;
  }
  if (response?.history) {
    return response.history;
  }
  return response || [];
};

/**
 * Mapeia campos do backend para o frontend
 */
const mapTaskFromBackend = (task) => ({
  ...task,
  // IDs
  id: task.pk,

  // Campos básicos
  title: task.name,
  description: task.memo || '',

  // Status e Prioridade (converter ID para string)
  status: STATUS_MAP[task.ts_notestatus] || 'pending',
  priority: PRIORITY_MAP[task.ts_priority] || 'media',

  // Utilizadores
  owner: task.owner,
  owner_name: task.owner_name,
  client: task.ts_client,
  client_name: task.ts_client_name,

  // Datas
  when_start: task.when_start,
  when_stop: task.when_stop,
  startDate: task.when_start
    ? new Date(task.when_start).toLocaleDateString('pt-PT')
    : '',
  endDate: task.when_stop ? new Date(task.when_stop).toLocaleDateString('pt-PT') : '',

  // Notificações
  notification_owner: task.notification_owner,
  notification_client: task.notification_client,
});

/**
 * Mapeia campos do frontend para o backend (create/update)
 * Backend requer: name, ts_client, ts_priority, memo
 */
const mapTaskToBackend = (taskData) => {
  const payload = {
    // Nome/título (obrigatório)
    name: taskData.title || taskData.name || '',

    // Cliente (obrigatório)
    ts_client: taskData.client || taskData.ts_client,

    // Prioridade (obrigatório) - default para média (2) se não fornecida
    ts_priority:
      taskData.ts_priority !== undefined
        ? taskData.ts_priority
        : taskData.priority !== undefined
          ? typeof taskData.priority === 'string'
            ? PRIORITY_REVERSE_MAP[taskData.priority] || 2
            : taskData.priority
          : 2,

    // Descrição/memo (obrigatório, pode ser vazio)
    memo: taskData.description ?? taskData.memo ?? '',
  };

  // Status (opcional - usado em updates)
  if (taskData.ts_notestatus !== undefined) {
    payload.ts_notestatus = taskData.ts_notestatus;
  } else if (taskData.status !== undefined) {
    payload.ts_notestatus =
      typeof taskData.status === 'string'
        ? STATUS_REVERSE_MAP[taskData.status]
        : taskData.status;
  }

  return payload;
};

/**
 * Mapeia lista de tarefas
 */
const mapTasks = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(mapTaskFromBackend);
};

// ==================== CRUD OPERATIONS ====================

/**
 * Obter todas as tarefas
 * Nota: Backend não suporta filtros/paginação - filtros aplicados client-side
 */
export const getTasks = async (params = {}) => {
  try {
    const response = await apiClient.get('/tasks');
    const rawTasks = handleResponse(response);
    const tasks = mapTasks(rawTasks);

    return {
      tasks,
      totalCount: tasks.length,
      page: 0,
      rowsPerPage: tasks.length,
    };
  } catch (error) {
    throw new Error(error.message || 'Erro ao carregar tarefas');
  }
};

/**
 * Obter tarefas atribuídas ao utilizador atual (filtro client-side)
 */
export const getMyTasks = async (params = {}) => {
  try {
    const { tasks } = await getTasks(params);
    // TODO: Filtrar por utilizador atual (necessita info do AuthContext)
    return { tasks, totalCount: tasks.length };
  } catch (error) {
    console.error('Erro ao buscar minhas tarefas:', error);
    throw error;
  }
};

/**
 * Criar uma nova tarefa
 *
 * @param {Object} taskData
 * @param {string} taskData.title - Título (name no backend)
 * @param {number} taskData.client - ID do cliente (ts_client)
 * @param {number|string} taskData.priority - Prioridade (1-4 ou string)
 * @param {string} taskData.description - Descrição (memo)
 * @returns {Promise<Object>}
 */
export const createTask = async (taskData) => {
  try {
    const payload = mapTaskToBackend(taskData);
    const response = await apiClient.post('/tasks', payload);

    // Backend retorna { message, task_id }
    if (response.task_id) {
      // Fetch novamente para obter dados completos
      const { tasks } = await getTasks();
      const newTask = tasks.find((t) => t.id === response.task_id);
      return newTask || response;
    }

    return response;
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    throw new Error(error.message || 'Erro ao criar tarefa');
  }
};

/**
 * Atualizar uma tarefa existente
 *
 * @param {number} taskId - ID da tarefa (pk)
 * @param {Object} taskData - Dados a atualizar
 * @returns {Promise<Object>}
 */
export const updateTask = async (taskId, taskData) => {
  try {
    const payload = mapTaskToBackend(taskData);
    const response = await apiClient.put(`/tasks/${taskId}`, payload);

    // Backend retorna { message, task_id }
    if (response.task_id || response.message) {
      // Fetch novamente para obter dados atualizados
      const { tasks } = await getTasks();
      const updatedTask = tasks.find((t) => t.id === taskId);
      return updatedTask || response;
    }

    return response;
  } catch (error) {
    console.error(`Erro ao atualizar tarefa ${taskId}:`, error);
    throw new Error(error.message || 'Erro ao atualizar tarefa');
  }
};

// ==================== STATUS MANAGEMENT ====================

/**
 * Atualizar o status de uma tarefa
 *
 * @param {number} taskId - ID da tarefa
 * @param {string|number} status - Status (string ou ID)
 * @returns {Promise<Object>}
 */
export const updateTaskStatus = async (taskId, status) => {
  try {
    const statusId =
      typeof status === 'string' ? STATUS_REVERSE_MAP[status] : status;

    const response = await apiClient.put(`/tasks/${taskId}/status`, {
      status_id: statusId,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Fetch novamente para obter dados atualizados
    const { tasks } = await getTasks();
    const updatedTask = tasks.find((t) => t.id === taskId);
    return updatedTask || response;
  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error('Sem permissão para atualizar o status');
    }
    console.error(`Erro ao atualizar status da tarefa ${taskId}:`, error);
    throw new Error(error.message || 'Erro ao atualizar status');
  }
};

/**
 * Fechar/completar uma tarefa
 *
 * @param {number} taskId - ID da tarefa
 * @param {string} note - Nota de conclusão (opcional)
 * @returns {Promise<Object>}
 */
export const closeTask = async (taskId, note = null) => {
  try {
    const payload = note ? { memo: note } : {};
    const response = await apiClient.post(`/tasks/${taskId}/close`, payload);

    // Fetch novamente para obter dados atualizados
    const { tasks } = await getTasks();
    const closedTask = tasks.find((t) => t.id === taskId);
    return closedTask || response;
  } catch (error) {
    console.error(`Erro ao fechar tarefa ${taskId}:`, error);
    throw new Error(error.message || 'Erro ao fechar tarefa');
  }
};

/**
 * Reabrir uma tarefa fechada
 *
 * @param {number} taskId - ID da tarefa
 * @param {string} reason - Motivo da reabertura (opcional)
 * @returns {Promise<Object>}
 */
export const reopenTask = async (taskId, reason = null) => {
  try {
    const payload = reason ? { reason } : {};
    const response = await apiClient.post(`/tasks/${taskId}/reopen`, payload);

    // Fetch novamente para obter dados atualizados
    const { tasks } = await getTasks();
    const reopenedTask = tasks.find((t) => t.id === taskId);
    return reopenedTask || response;
  } catch (error) {
    console.error(`Erro ao reabrir tarefa ${taskId}:`, error);
    throw new Error(error.message || 'Erro ao reabrir tarefa');
  }
};

// ==================== NOTES & HISTORY ====================

/**
 * Adicionar uma nota a uma tarefa
 *
 * @param {number} taskId - ID da tarefa
 * @param {string} note - Conteúdo da nota
 * @returns {Promise<Object>}
 */
export const addTaskNote = async (taskId, note) => {
  try {
    const response = await apiClient.post(`/tasks/${taskId}/notes`, {
      memo: note,
    });
    return response;
  } catch (error) {
    console.error(`Erro ao adicionar nota à tarefa ${taskId}:`, error);
    throw new Error(error.message || 'Erro ao adicionar nota');
  }
};

/**
 * Obter o histórico de uma tarefa
 *
 * @param {number} taskId - ID da tarefa
 * @returns {Promise<Array>}
 */
export const getTaskHistory = async (taskId) => {
  try {
    const response = await apiClient.get(`/tasks/${taskId}/history`);
    return handleResponse(response);
  } catch (error) {
    console.error(`Erro ao buscar histórico da tarefa ${taskId}:`, error);
    throw new Error(error.message || 'Erro ao carregar histórico');
  }
};

// ==================== NOTIFICATIONS ====================

/**
 * Marcar notificação de tarefa como lida
 *
 * @param {number} taskId - ID da tarefa
 * @returns {Promise<void>}
 */
export const markTaskAsRead = async (taskId) => {
  try {
    await apiClient.put(`/tasks/${taskId}/notification`);
  } catch (error) {
    console.error(`Erro ao marcar tarefa ${taskId} como lida:`, error);
    throw new Error(error.message || 'Erro ao marcar como lida');
  }
};

/**
 * Obter contagem de notificações
 */
export const getNotificationCount = async () => {
  try {
    const response = await apiClient.get('/notifications');
    return response.count || 0;
  } catch (error) {
    console.error('Erro ao buscar contagem de notificações:', error);
    return 0;
  }
};

// ==================== HELPERS ====================

/**
 * Obter estatísticas das tarefas (calculadas client-side)
 */
export const getTaskStats = (tasks) => {
  if (!Array.isArray(tasks)) {
    return {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
  }

  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    cancelled: tasks.filter((t) => t.status === 'cancelled').length,
  };
};

/**
 * Filtrar tarefas client-side
 */
export const filterTasks = (tasks, filters = {}) => {
  let filtered = [...tasks];

  // Search
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (task) =>
        task.title?.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search)
    );
  }

  // Status
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter((task) => task.status === filters.status);
  }

  // Priority
  if (filters.priority && filters.priority !== 'all') {
    filtered = filtered.filter((task) => task.priority === filters.priority);
  }

  return filtered;
};

// ==================== DEFAULT EXPORT ====================

const taskService = {
  // CRUD
  getTasks,
  getMyTasks,
  createTask,
  updateTask,

  // Status
  updateTaskStatus,
  closeTask,
  reopenTask,

  // Notes & History
  addTaskNote,
  getTaskHistory,

  // Notifications
  markTaskAsRead,
  getNotificationCount,

  // Helpers
  getTaskStats,
  filterTasks,

  // Constants
  STATUS_MAP,
  STATUS_REVERSE_MAP,
  PRIORITY_MAP,
  PRIORITY_REVERSE_MAP,
};

export default taskService;
