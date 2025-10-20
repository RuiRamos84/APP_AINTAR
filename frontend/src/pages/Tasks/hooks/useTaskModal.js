import { useState, useEffect, useCallback } from 'react';
import { notifyError, notifySuccess } from '../../../components/common/Toaster/ThemedToaster';
import {
  addTaskNote,
  closeTask,
  getTaskHistory,
  updateTask,
  updateTaskNotification,
  getTasks
} from '../../../services/TaskService';

/**
 * Hook personalizado para gerenciar a lógica do modal de tarefa
 * Extrai toda a lógica de negócio do componente visual
 */
export const useTaskModal = (task, user, markTaskNotificationAsRead) => {
  const [tabValue, setTabValue] = useState(1);
  const [newNote, setNewNote] = useState('');
  const [taskHistory, setTaskHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [localTask, setLocalTask] = useState(null);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Inicializar editedTask quando task muda
  useEffect(() => {
    if (task) {
      setLocalTask(task);
      setEditedTask({ ...task });
      loadHistory();

      // Verificar se a tarefa tem notificações
      const isOwner = task.owner === user?.user_id;
      const isClient = task.ts_client === user?.user_id;
      const hasNotification =
        (isOwner && task.notification_owner === 1) ||
        (isClient && task.notification_client === 1);

      if (hasNotification) {
        // Forçar atualização da lista de tarefas
        window.dispatchEvent(new CustomEvent('task-refresh'));

        // Chamar API para limpar notificação
        updateTaskNotification(task.pk).then(() => {
          if (markTaskNotificationAsRead) {
            markTaskNotificationAsRead(task.pk, true);
          }
          refreshTaskData(true);
        });
      }
    }
  }, [task?.pk]);

  // Listener para evento global de atualização de tarefas
  useEffect(() => {
    const handleTaskRefresh = () => {
      if (task?.pk) {
        refreshTaskData();
        loadHistory();
      }
    };

    window.addEventListener('task-refresh', handleTaskRefresh);
    return () => window.removeEventListener('task-refresh', handleTaskRefresh);
  }, [task?.pk]);

  // Atualizar notificações não lidas
  useEffect(() => {
    if (task) {
      setLocalTask(task);
      setEditedTask({ ...task });
      loadHistory();

      const hasUnreadNotification =
        task.notification_owner === 0 || task.notification_client === 0;

      if (hasUnreadNotification) {
        const timer = setTimeout(() => {
          updateTaskNotification(task.pk)
            .then(() => {
              if (markTaskNotificationAsRead) {
                markTaskNotificationAsRead(task.pk, false);
              }
              refreshTaskData();
            })
            .catch((err) => console.error('Erro ao atualizar notificação:', err));
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [task?.pk]);

  /**
   * Função para encontrar a tarefa atualizada
   */
  const refreshTaskData = useCallback(async () => {
    if (!task?.pk) return;

    try {
      const allTasks = await getTasks();
      const updatedTask = allTasks.find((t) => t.pk === task.pk);

      if (updatedTask) {
        setLocalTask((prev) => ({ ...prev, ...updatedTask }));
        if (!isEditing) {
          setEditedTask((prev) => ({ ...prev, ...updatedTask }));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados atualizados da tarefa:', error);
    }
  }, [task?.pk, isEditing]);

  /**
   * Carregar histórico da tarefa
   */
  const loadHistory = async () => {
    if (!task?.pk) return;

    try {
      const history = await getTaskHistory(task.pk);
      setTaskHistory(history);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      notifyError('Erro ao carregar histórico da tarefa');
    }
  };

  /**
   * Adicionar nova nota
   */
  const handleAddNote = async () => {
    if (!task?.pk || !newNote.trim()) return;

    setIsAddingNote(true);
    try {
      await addTaskNote(task.pk, newNote);
      await loadHistory();
      setNewNote('');
      notifySuccess('Nota adicionada com sucesso!');
      refreshTaskData();
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
      notifyError('Erro ao adicionar nota');
    } finally {
      setIsAddingNote(false);
    }
  };

  /**
   * Encerrar tarefa
   */
  const handleCloseTask = async (onRefresh, onClose) => {
    if (!task?.pk) return;

    try {
      await closeTask(task.pk);
      notifySuccess('Tarefa encerrada com sucesso!');
      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error('Erro ao encerrar tarefa:', error);
      notifyError('Erro ao encerrar tarefa');
    }
  };

  /**
   * Atualizar tarefa
   */
  const handleUpdateTask = async (onRefresh) => {
    if (!task?.pk || !editedTask) return;

    setIsUpdating(true);
    try {
      await updateTask(task.pk, editedTask);
      notifySuccess('Tarefa atualizada com sucesso!');

      // Atualizar dados locais imediatamente
      setLocalTask({ ...editedTask });

      // Disparar atualização global
      if (onRefresh) onRefresh();

      // Sair do modo de edição
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      notifyError('Erro ao atualizar tarefa');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Cancelar edição
   */
  const handleCancel = () => {
    setIsEditing(false);
    setEditedTask(localTask || task);
  };

  /**
   * Fechar modal (com verificação de edição)
   */
  const handleModalClose = (onClose) => {
    if (isEditing) {
      setShowExitConfirmation(true);
    } else {
      onClose();
    }
  };

  /**
   * Confirmar saída sem guardar
   */
  const handleConfirmExit = (onClose) => {
    setIsEditing(false);
    setEditedTask(localTask || task);
    onClose();
  };

  // Use a tarefa atualizada de localTask, ou a original de task
  const currentTask = localTask || task;

  // Verificações de permissões
  const canEdit = currentTask && !currentTask?.when_stop && currentTask?.owner === user?.user_id;
  const canClose = currentTask && !currentTask?.when_stop && currentTask?.owner === user?.user_id;
  const canAddNote =
    currentTask &&
    !currentTask?.when_stop &&
    (currentTask?.owner === user?.user_id || currentTask?.ts_client === user?.user_id);

  return {
    // Estado
    tabValue,
    newNote,
    taskHistory,
    isEditing,
    editedTask,
    isUpdating,
    isAddingNote,
    localTask,
    currentTask,
    showCloseConfirmation,
    showExitConfirmation,

    // Permissões
    canEdit,
    canClose,
    canAddNote,

    // Setters
    setTabValue,
    setNewNote,
    setIsEditing,
    setEditedTask,
    setShowCloseConfirmation,
    setShowExitConfirmation,

    // Handlers
    handleAddNote,
    handleCloseTask,
    handleUpdateTask,
    handleCancel,
    handleModalClose,
    handleConfirmExit
  };
};

export default useTaskModal;
