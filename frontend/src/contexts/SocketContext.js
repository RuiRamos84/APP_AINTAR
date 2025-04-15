import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { connectSocket, disconnectSocket } from '../services/socketService';
import { useAuth } from './AuthContext';
import notificacaoService from "../services/NotificacaoService";
import api from '../services/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  // Estados do utilizador e conexão
  const { user, isLoggingOut } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Estados de notificações
  const [notificationCount, setNotificationCount] = useState(0);
  const [taskNotifications, setTaskNotifications] = useState([]);
  const [unreadTaskCount, setUnreadTaskCount] = useState(0);
  const [taskNotificationCount, setTaskNotificationCount] = useState(0);

  // Para compatibilidade com componentes legados
  const [globalNotificationCount, setGlobalNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // Carregar a contagem inicial de notificações via REST API
  const fetchInitialCount = useCallback(async () => {
    if (user) {
      try {
        const response = await api.get("/notifications");
        const count = response.data.count || 0;

        setNotificationCount(count);
        setGlobalNotificationCount(count);
      } catch (error) {
        console.error("Erro ao buscar contagem inicial de notificações:", error);
      }
    }
  }, [user]);

  // =========================================================================
  // HANDLERS PARA EVENTOS DE NOTIFICAÇÃO
  // =========================================================================

  // Handler para notification_update socket event
  const handleNotificationUpdate = useCallback((data) => {
    const novoContador = data.count || 0;

    setNotificationCount(novoContador);
    setGlobalNotificationCount(novoContador);

    // Se o servidor enviar dados de notificação, atualiza
    if (data.notifications) {
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    }

    // Adicionar notificação na aba e som quando receber uma atualização
    if (novoContador > notificationCount) {
      notificacaoService.notificar(novoContador);
    }
  }, [notificationCount]);

  // Handler específico para notificações de tarefas
  const handleTaskNotification = useCallback((data) => {
    // console.log("NOTIFICAÇÃO DE TAREFA RECEBIDA:", data);

    // Criar objeto de notificação completo
    const newNotification = {
      id: data.task_id || Date.now(),
      taskId: data.taskId || data.task_id,
      taskName: data.taskName || data.task_name,
      type: data.type || data.notification_type || 'update',
      timestamp: data.timestamp || new Date().toISOString(),
      status: data.status,
      statusId: data.statusId || data.status_id,
      senderName: data.senderName || data.sender_name,
      content: data.content || "Nova atualização",
      read: false
    };

    // console.log("Nova notificação formatada:", newNotification);

    // Adicionar à lista de notificações (evitar duplicados)
    setTaskNotifications(prev => {
      // Verificar se já existe esta notificação
      const existingIndex = prev.findIndex(n => parseInt(n.taskId) === parseInt(newNotification.taskId));

      if (existingIndex >= 0) {
        // console.log("Atualizando notificação existente");
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...newNotification, read: false };
        return updated;
      }

      // console.log("Adicionando nova notificação");
      return [newNotification, ...prev];
    });

    // Incrementar contador
    setUnreadTaskCount(prev => prev + 1);
    setTaskNotificationCount(prev => prev + 1);

    // CRÍTICO: Garantir notificação visual e sonora
    notificacaoService.notificar(unreadTaskCount + 1);

    // Disparar evento para atualizar a lista de tarefas
    window.dispatchEvent(new CustomEvent('task-refresh'));
  }, [unreadTaskCount]);

  // Handler para contagem de notificações de tarefas
  const handleTaskNotificationCount = useCallback((data) => {
    // console.log("Contagem de notificações de tarefas recebida:", data);
    setTaskNotificationCount(data.count || 0);
    setUnreadTaskCount(data.count || 0);
  }, []);

  // Handler para lista de notificações de tarefas
  const handleTaskNotifications = useCallback((data) => {
    // console.log("Lista de notificações de tarefas recebida:", data);

    if (Array.isArray(data.notifications)) {
      // Mapear cada notificação para garantir que tem todos os campos
      const mappedNotifications = data.notifications.map(notif => ({
        ...notif,
        id: notif.id || notif.taskId || Date.now(),
        taskId: notif.taskId || notif.id,
        taskName: notif.taskName || notif.task_name || "Tarefa",
        type: notif.type || 'update',
        timestamp: notif.timestamp || new Date().toISOString(),
        read: false
      }));

      setTaskNotifications(mappedNotifications);
      setTaskNotificationCount(data.count || data.notifications.length);
      setUnreadTaskCount(data.count || data.notifications.length);

      // Se houver notificações novas, também notificar
      if (mappedNotifications.length > 0) {
        notificacaoService.notificar(mappedNotifications.length);
      }
    }
  }, []);

  // Handler para notificações individuais
  const handleNewNotification = useCallback((data) => {
    const novoContador = notificationCount + 1;
    setNotificationCount(novoContador);
    setGlobalNotificationCount(novoContador);

    // Notificar sempre
    notificacaoService.notificar(novoContador);
  }, [notificationCount]);

  // =========================================================================
  // FUNÇÕES DE SOLICITAÇÃO E ATUALIZAÇÃO
  // =========================================================================

  // Solicitar atualização das notificações de tarefas
  const refreshTaskNotifications = useCallback(() => {
    if (socket && socket.connected && user) {
      // console.log("Solicitando lista de notificações de tarefas...");
      socket.emit("get_task_notifications", {
        userId: user.user_id,
        sessionId: user.session_id
      });
    }
  }, [socket, user]);

  // Função para carregar notificações de tarefas iniciais
  const fetchInitialTaskNotifications = useCallback(async () => {
    if (user) {
      try {
        const response = await api.get("/tasks");

        // Filtrar tarefas com notificações não lidas
        const tasksWithNotifications = response.data.tasks?.filter(task =>
          (task.owner === user.user_id && task.notification_owner === 1) ||
          (task.ts_client === user.user_id && task.notification_client === 1)
        ) || [];

        // Converter tarefas para objetos de notificação
        const initialNotifications = tasksWithNotifications.map(task => ({
          id: task.pk,
          taskId: task.pk,
          taskName: task.name,
          type: 'unread_update',
          timestamp: task.when_start,
          read: false
        }));

        setTaskNotifications(initialNotifications);
        setUnreadTaskCount(initialNotifications.length);
        setTaskNotificationCount(initialNotifications.length);
      } catch (error) {
        console.error('Erro ao carregar notificações de tarefas:', error);
      }
    }
  }, [user]);

  // Marcar notificação de tarefa como lida
  const markTaskNotificationAsRead = useCallback(async (taskId, triggerRefresh = true) => {
    // console.log("Marcando notificação como lida:", taskId);
    try {
      if (socket && socket.connected && user) {
        socket.emit("mark_task_notification_read", {
          taskId,
          userId: user.user_id,
          sessionId: user.session_id
        });
      }

      // Atualizar estado local
      setTaskNotifications(prev =>
        prev.map(notif =>
          parseInt(notif.taskId) === parseInt(taskId) ? { ...notif, read: true } : notif
        )
      );

      // Atualizar contador
      setUnreadTaskCount(prev => Math.max(0, prev - 1));
      setTaskNotificationCount(prev => Math.max(0, prev - 1));

      // Parar de piscar o título se todas as notificações foram lidas
      const remainingUnread = taskNotifications.filter(n =>
        !n.read && parseInt(n.taskId) !== parseInt(taskId)
      ).length;

      if (remainingUnread === 0) {
        notificacaoService.pararPiscar();
      }

      // Disparar evento
      if (triggerRefresh) {
        window.dispatchEvent(new CustomEvent('task-refresh'));
      }

      setTimeout(() => {
        if (socket && socket.connected && user) {
          refreshTaskNotifications();
        }
      }, 500);
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  }, [socket, user, refreshTaskNotifications, taskNotifications]);

  // Marcar todas as notificações de tarefas como lidas
  const markAllTaskNotificationsAsRead = useCallback(async () => {
    if (taskNotifications.length === 0) return;

    try {
      const promises = taskNotifications
        .filter(n => !n.read)
        .map(n => api.put(`/tasks/${n.taskId}/notification`));

      await Promise.all(promises);

      setTaskNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadTaskCount(0);
      setTaskNotificationCount(0);

      // Parar de piscar o título
      notificacaoService.pararPiscar();

      window.dispatchEvent(new CustomEvent('task-refresh'));
    } catch (error) {
      console.error("Erro ao marcar todas notificações como lidas:", error);
    }
  }, [taskNotifications]);

  // Marcar documento como lido
  const markAsRead = useCallback((documentId) => {
    if (socket && socket.connected && user) {
      socket.emit("mark_notification_read", {
        documentId,
        userId: user.user_id,
        sessionId: user.session_id
      });
    }
  }, [socket, user]);

  // Marcar documento como não lido
  const markAsUnread = useCallback((documentId) => {
    if (socket && socket.connected && user) {
      socket.emit("mark_notification_unread", {
        documentId,
        userId: user.user_id,
        sessionId: user.session_id
      });
    }
  }, [socket, user]);

  // Solicitar atualização da contagem
  const refreshNotifications = useCallback(() => {
    if (socket && socket.connected && user) {
      socket.emit("get_notifications", {
        userId: user.user_id,
        sessionId: user.session_id
      });
    }
  }, [socket, user]);

  // Emitir evento personalizado
  const emit = useCallback((eventName, data) => {
    if (socket && socket.connected) {
      const enhancedData = {
        ...data,
        sessionId: data.sessionId || user?.session_id,
        userId: data.userId || user?.user_id
      };
      socket.emit(eventName, enhancedData);
    } else {
      console.warn("Tentativa de emitir evento sem socket conectado:", eventName);
    }
  }, [socket, user]);

  // =========================================================================
  // EFEITOS PARA GESTÃO DE ESTADO
  // =========================================================================

  // Carregar contagem inicial assim que o contexto for montado
  useEffect(() => {
    if (user) {
      fetchInitialCount();
    }
  }, [user, fetchInitialCount]);

  // Solicitar notificações quando conectado
  useEffect(() => {
    if (user && isConnected) {
      refreshTaskNotifications();
    }
  }, [user, isConnected, refreshTaskNotifications]);

  // Registrar event handlers para notificações de tarefas
  useEffect(() => {
    if (socket) {
      // Registrar explicitamente todos os handlers
      socket.on("task_notification", handleTaskNotification);
      socket.on("task_notifications", handleTaskNotifications);
      socket.on("task_notification_count", handleTaskNotificationCount);

      // console.log("Event handlers registrados para notificações de tarefas");

      return () => {
        socket.off("task_notification");
        socket.off("task_notifications");
        socket.off("task_notification_count");
      };
    }
  }, [socket, handleTaskNotification, handleTaskNotifications, handleTaskNotificationCount]);

  // Configuração da conexão socket
  useEffect(() => {
    let socketInstance = null;
    let isConnecting = false;

    const setupSocket = async () => {
      if (!user?.user_id || isLoggingOut || isConnecting) return;

      isConnecting = true;
      try {
        socketInstance = await connectSocket(user.user_id);
        setSocket(socketInstance);
        setIsConnected(true);

        // Socket event handlers
        socketInstance.on("connect", () => {
          // console.log("Socket conectado:", socketInstance.id);
          // console.log("Sala do utilizador:", `user_${user.user_id}`);
          setIsConnected(true);

          // Após conectar, juntar-se à sala
          socketInstance.emit("join", {
            userId: user.user_id,
            sessionId: user.session_id
          });

          // Solicitar lista de notificações imediatamente após a conexão
          setTimeout(() => {
            refreshTaskNotifications();
          }, 500);
        });

        socketInstance.on("disconnect", () => {
          // console.log("Socket desconectado");
          setIsConnected(false);
        });

        // EVENTO CENTRAL - todas as atualizações vêm por aqui
        socketInstance.on("notification_update", handleNotificationUpdate);

        // Registrar event handlers para notificações
        socketInstance.on("new_notification", handleNewNotification);
        socketInstance.on("new_step_added", handleNewNotification);
        socketInstance.on("order_assigned", handleNewNotification);
        socketInstance.on("new_order_created", handleNewNotification);

        // Legacy event handlers para compatibilidade
        socketInstance.on("notification_count", (data) => {
          setNotificationCount(data.count || 0);
          setGlobalNotificationCount(data.count || 0);

          // Também notificar aqui se houver novas notificações
          if (data.count > notificationCount) {
            notificacaoService.notificar(data.count);
          }
        });

        socketInstance.on("notifications_cleared", () => {
          setNotificationCount(0);
          setGlobalNotificationCount(0);
          setNotifications([]);
        });

      } catch (error) {
        console.error("Erro ao configurar socket:", error);
      } finally {
        isConnecting = false;
      }
    };

    if (user?.user_id && !socketInstance) {
      setupSocket();
    }

    return () => {
      if (socketInstance) {
        // Remover apenas os listeners sem desconectar
        socketInstance.off("notification_update");
        socketInstance.off("new_notification");
        socketInstance.off("new_step_added");
        socketInstance.off("order_assigned");
        socketInstance.off("new_order_created");
        socketInstance.off("notification_count");
        socketInstance.off("notifications_cleared");
      }
    };
  }, [user, isLoggingOut, handleNotificationUpdate,
    handleNewNotification, notificationCount,
    refreshTaskNotifications]);

  // Carregar notificações de tarefas iniciais
  useEffect(() => {
    if (user) {
      fetchInitialTaskNotifications();
    }
  }, [user, fetchInitialTaskNotifications]);

  // Event listener para visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        notificacaoService.pararPiscar();

        // Atualizar notificações quando o utilizador volta à página
        if (isConnected) {
          refreshTaskNotifications();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, refreshTaskNotifications]);

  // Retrocompatibilidade
  const fetchInitialNotifications = fetchInitialCount;

  // =========================================================================
  // CONTEXTO PARA COMPONENTES FILHOS
  // =========================================================================

  const value = {
    socket,
    isConnected,
    notificationCount,
    markAsRead,
    markAsUnread,
    refreshNotifications,
    emit,
    globalNotificationCount,
    setGlobalNotificationCount,
    notifications,
    fetchInitialNotifications,
    taskNotifications,
    unreadTaskCount,
    markTaskNotificationAsRead,
    markAllTaskNotificationsAsRead,
    fetchInitialTaskNotifications,
    taskNotificationCount,
    refreshTaskNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket deve ser usado dentro de um SocketProvider");
  }
  return context;
};