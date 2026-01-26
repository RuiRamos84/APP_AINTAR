/**
 * Task Schemas - Validação com Zod
 * Alinhado com estrutura real do backend
 *
 * Backend espera:
 * - name (string)
 * - ts_client (int - ID do cliente)
 * - ts_priority (int - 1-4)
 * - memo (string - descrição opcional)
 */

import { z } from 'zod';

// ==================== ENUMS & CONSTANTS ====================

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const TASK_PRIORITY = {
  BAIXA: 'baixa',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
};

export const TASK_PRIORITY_IDS = {
  baixa: 1,
  media: 2,
  alta: 3,
  urgente: 4,
};

// ==================== BASE SCHEMAS ====================

/**
 * Schema para título/nome da tarefa (campo: name)
 */
const nameSchema = z
  .string()
  .min(3, 'O título deve ter pelo menos 3 caracteres')
  .max(255, 'O título não pode ter mais de 255 caracteres')
  .trim();

/**
 * Schema para descrição (campo: memo)
 */
const memoSchema = z
  .string()
  .max(5000, 'A descrição não pode ter mais de 5000 caracteres')
  .trim()
  .optional()
  .default('');

/**
 * Schema para prioridade (aceita string ou número)
 */
const prioritySchema = z
  .union([
    z.enum(['baixa', 'media', 'alta', 'urgente']),
    z.number().int().min(1).max(4),
  ])
  .default('media');

/**
 * Schema para status (aceita string ou número)
 */
const statusSchema = z
  .union([
    z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
    z.number().int().min(0).max(4),
  ])
  .optional();

/**
 * Schema para ID de cliente (ts_client)
 */
const clientIdSchema = z.number().int().positive('Selecione um cliente válido');

// ==================== MAIN SCHEMAS ====================

/**
 * Schema para criar tarefa
 * Backend: { name, ts_client, ts_priority, memo }
 */
export const createTaskSchema = z.object({
  // Campo obrigatório: título
  title: nameSchema,
  // ou aceitar 'name' diretamente
  name: nameSchema.optional(),

  // Cliente (obrigatório)
  client: clientIdSchema,
  // ou aceitar 'ts_client' diretamente
  ts_client: clientIdSchema.optional(),

  // Prioridade (default: 'media'/2)
  priority: prioritySchema,
  // ou aceitar 'ts_priority' diretamente
  ts_priority: z.number().int().min(1).max(4).optional(),

  // Descrição (opcional)
  description: memoSchema,
  // ou aceitar 'memo' diretamente
  memo: memoSchema,
});

/**
 * Schema para atualizar tarefa
 * Backend: { name, ts_client, ts_priority, memo }
 */
export const updateTaskSchema = z.object({
  title: nameSchema.optional(),
  name: nameSchema.optional(),
  client: clientIdSchema.optional(),
  ts_client: clientIdSchema.optional(),
  priority: prioritySchema.optional(),
  ts_priority: z.number().int().min(1).max(4).optional(),
  description: memoSchema,
  memo: memoSchema,
});

/**
 * Schema para adicionar nota
 * Backend: { memo }
 */
export const addNoteSchema = z.object({
  memo: z
    .string()
    .min(1, 'A nota não pode estar vazia')
    .max(5000, 'A nota não pode ter mais de 5000 caracteres')
    .trim(),
});

/**
 * Schema para atualizar status
 * Backend: { status_id }
 */
export const updateStatusSchema = z.object({
  status_id: z
    .union([z.number().int().positive(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        const statusMap = { pending: 1, in_progress: 2, completed: 3, cancelled: 4 };
        return statusMap[val] || parseInt(val, 10);
      }
      return val;
    }),
});

/**
 * Schema para fechar tarefa
 * Backend: { memo } (opcional)
 */
export const closeTaskSchema = z.object({
  memo: z
    .string()
    .max(5000, 'A nota de conclusão não pode ter mais de 5000 caracteres')
    .trim()
    .optional(),
});

/**
 * Schema para reabrir tarefa
 * Backend: { reason } (opcional)
 */
export const reopenTaskSchema = z.object({
  reason: z
    .string()
    .min(3, 'O motivo deve ter pelo menos 3 caracteres')
    .max(500, 'O motivo não pode ter mais de 500 caracteres')
    .trim()
    .optional(),
});

/**
 * Schema para filtros de tarefas (client-side)
 */
export const taskFiltersSchema = z.object({
  status: z
    .enum(['all', 'pending', 'in_progress', 'completed', 'cancelled'])
    .optional()
    .default('all'),

  priority: z
    .enum(['all', 'baixa', 'media', 'alta', 'urgente'])
    .optional()
    .default('all'),

  search: z.string().max(200).trim().optional().default(''),

  assignedTo: z
    .union([z.literal('all'), z.literal('me'), z.number()])
    .optional()
    .default('all'),
});

/**
 * Schema para paginação (client-side)
 */
export const paginationSchema = z.object({
  page: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(10),
  orderBy: z.string().optional().default('when_start'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Valida dados de criação de tarefa
 */
export const validateCreateTask = (data) => {
  try {
    return createTaskSchema.parse(data);
  } catch (error) {
    if (error.errors) {
      const messages = error.errors.map((e) => e.message).join(', ');
      throw new Error(messages);
    }
    throw error;
  }
};

/**
 * Valida dados de atualização de tarefa
 */
export const validateUpdateTask = (data) => {
  try {
    return updateTaskSchema.parse(data);
  } catch (error) {
    if (error.errors) {
      const messages = error.errors.map((e) => e.message).join(', ');
      throw new Error(messages);
    }
    throw error;
  }
};

/**
 * Valida nota
 */
export const validateNote = (memo) => {
  try {
    return addNoteSchema.parse({ memo });
  } catch (error) {
    if (error.errors) {
      const messages = error.errors.map((e) => e.message).join(', ');
      throw new Error(messages);
    }
    throw error;
  }
};

/**
 * Valida filtros de forma segura
 */
export const validateFilters = (filters) => {
  try {
    return taskFiltersSchema.parse(filters);
  } catch (error) {
    console.warn('Filtros inválidos, usando defaults:', error);
    return taskFiltersSchema.parse({});
  }
};

/**
 * Valida paginação de forma segura
 */
export const validatePagination = (pagination) => {
  try {
    return paginationSchema.parse(pagination);
  } catch (error) {
    console.warn('Paginação inválida, usando defaults:', error);
    return paginationSchema.parse({});
  }
};

/**
 * Valida se a tarefa pode mudar de status
 */
export const validateStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    pending: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'pending', 'cancelled'],
    completed: ['in_progress'], // Pode reabrir
    cancelled: ['pending'], // Pode reativar
  };

  const allowed = validTransitions[currentStatus];

  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(
      `Transição de status inválida: ${currentStatus} → ${newStatus}`
    );
  }

  return true;
};

// ==================== DEFAULT EXPORT ====================

const taskSchemas = {
  createTaskSchema,
  updateTaskSchema,
  addNoteSchema,
  updateStatusSchema,
  closeTaskSchema,
  reopenTaskSchema,
  taskFiltersSchema,
  paginationSchema,

  // Helpers
  validateCreateTask,
  validateUpdateTask,
  validateNote,
  validateFilters,
  validatePagination,
  validateStatusTransition,

  // Constants
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_PRIORITY_IDS,
};

export default taskSchemas;
