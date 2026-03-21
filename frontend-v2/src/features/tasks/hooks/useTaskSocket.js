/**
 * useTaskSocket - Hook para atualizações em tempo real de tarefas via Socket.IO
 *
 * Subscreve o evento `task_notification` e:
 * - Atualiza o store em tempo real (updates in-place para status/close/reopen)
 * - Faz full refresh quando necessário (nova tarefa, edição)
 * - Mostra toast quando a mudança vem de outro utilizador
 * - Sinaliza o modal aberto quando a tarefa visualizada foi alterada
 *
 * @param {{ selectedTaskId: number|null, currentUserId: number|null, onTaskUpdated: Function }}
 */

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { onEvent, offEvent, SOCKET_EVENTS } from '@/services/websocket/socketService';
import { useTaskStore } from '../store/taskStore';

// Mapeamento status_id → string (idêntico ao taskService.js)
const STATUS_MAP = {
  0: 'pending',
  1: 'pending',
  2: 'in_progress',
  3: 'completed',
  4: 'cancelled',
};

const TOAST_MESSAGES = {
  new_task: (name) => `Nova tarefa atribuída: ${name}`,
  new_note: (name) => `Nova nota em: ${name}`,
  status_update: (name) => `Estado alterado em: ${name}`,
  task_update: (name) => `Tarefa editada: ${name}`,
  task_closed: (name) => `Tarefa encerrada: ${name}`,
  task_reopened: (name) => `Tarefa reaberta: ${name}`,
};

export const useTaskSocket = ({ selectedTaskId = null, currentUserId = null, onTaskUpdated } = {}) => {
  // Proteção anti-duplicados (mesmo que SocketContext)
  const lastRef = useRef({ taskId: null, timestamp: 0 });

  const handleNotification = useCallback(
    (data) => {
      const now = Date.now();
      const taskId = data.taskId || data.task_id;
      const notificationType = data.notification_type;
      const taskName = data.taskName || data.task_name || '';
      const senderId = data.sender_id;

      // Ignorar duplicados (mesmo taskId em < 3s)
      if (
        taskId &&
        lastRef.current.taskId === taskId &&
        now - lastRef.current.timestamp < 3000
      ) {
        return;
      }
      lastRef.current = { taskId, timestamp: now };

      const store = useTaskStore.getState();
      const isSelf = senderId != null && String(senderId) === String(currentUserId);

      // --- Atualização in-place vs full refresh ---
      switch (notificationType) {
        case 'status_update': {
          // Atualização in-place: só o status mudou
          if (taskId && data.status_id != null) {
            store.updateTask(taskId, { status: STATUS_MAP[data.status_id] ?? 'pending' });
          } else {
            // Sem status_id no payload — fazer full refresh
            store.invalidateCache();
            window.dispatchEvent(new CustomEvent('task-refresh'));
          }
          break;
        }

        case 'task_closed': {
          store.updateTask(taskId, { when_stop: new Date().toISOString() });
          break;
        }

        case 'task_reopened': {
          store.updateTask(taskId, { when_stop: null });
          break;
        }

        case 'new_task':
        case 'task_update':
        default: {
          // Full refresh para novos itens ou edições que alteram vários campos
          store.invalidateCache();
          window.dispatchEvent(new CustomEvent('task-refresh'));
          break;
        }
      }

      // --- Notificar modal aberto ---
      if (taskId && selectedTaskId && taskId === selectedTaskId) {
        onTaskUpdated?.(taskId);
      }

      // --- Toast apenas quando veio de outro utilizador ---
      if (!isSelf) {
        const msgFn = TOAST_MESSAGES[notificationType];
        if (msgFn) {
          toast.info(msgFn(taskName), { duration: 4000 });
        }
      }
    },
    [selectedTaskId, currentUserId, onTaskUpdated]
  );

  useEffect(() => {
    onEvent(SOCKET_EVENTS.TASK_NOTIFICATION, handleNotification);
    return () => {
      offEvent(SOCKET_EVENTS.TASK_NOTIFICATION, handleNotification);
    };
  }, [handleNotification]);
};

export default useTaskSocket;
