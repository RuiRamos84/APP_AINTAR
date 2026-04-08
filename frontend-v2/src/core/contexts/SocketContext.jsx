/**
 * SocketContext
 *
 * Context Provider moderno para gestão de WebSocket com Socket.IO
 *
 * Features:
 * - Conexão/desconexão automática baseada em auth
 * - Sistema de notificações em tempo real
 * - Event emitters tipados
 * - Armazenamento persistente de notificações
 * - Contadores de notificações não lidas
 * - Suporte a múltiplos tipos de notificações (documentos, tarefas, sistema)
 *
 * Usage:
 * const { socket, isConnected, emit, notifications, unreadCount } = useSocket();
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  connectSocket,
  disconnectSocket,
  cleanupSocketSession,
  emitEvent,
  onEvent,
  offEvent,
  getSocket,
  isSocketConnected,
  SOCKET_EVENTS,
} from '@/services/websocket/socketService';
import { useAuth } from './AuthContext';
import { notification } from '@/core/services/notification/notificationService';
import apiClient from '@/services/api/client';

const SocketContext = createContext(null);

/**
 * Socket Provider Component
 */
export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // Estados da conexão
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Estados de notificações
  const [notifications, setNotifications] = useState([]);

  // Calcular unreadCount a partir do array (evita dessincronização)
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // Refs para controlo
  const audioRef = useRef(null);
  const hasLoadedFromStorageRef = useRef(false);

  // ========================================================================
  // ARMAZENAMENTO PERSISTENTE
  // ========================================================================

  /**
   * Carregar notificações do localStorage
   */
  const loadFromStorage = useCallback(() => {
    if (hasLoadedFromStorageRef.current) return;

    const userId = user?.user_id;
    if (!userId) return;

    const key = `socket_notifications_${userId}`;

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.notifications && Array.isArray(parsed.notifications)) {
          setNotifications(parsed.notifications);
          // unreadCount é calculado automaticamente via useMemo
          hasLoadedFromStorageRef.current = true;
        }
      }
    } catch (error) {
      console.error('[SocketContext] Error loading from storage:', error);
    }
  }, [user?.user_id]);

  /**
   * Salvar notificações no localStorage
   */
  const saveToStorage = useCallback(
    (notifs, count) => {
      const userId = user?.user_id;
      if (!userId) return;

      const key = `socket_notifications_${userId}`;
      const data = {
        notifications: notifs,
        unreadCount: count,
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('[SocketContext] Error saving to storage:', error);
      }
    },
    [user?.user_id]
  );

  // Carregar do storage quando utilizador muda
  useEffect(() => {
    if (user?.user_id) {
      loadFromStorage();
    }
  }, [user?.user_id, loadFromStorage]);

  // Salvar automaticamente quando notificações mudam
  useEffect(() => {
    if (hasLoadedFromStorageRef.current && notifications.length > 0) {
      saveToStorage(notifications, unreadCount);
    }
  }, [notifications, unreadCount, saveToStorage]);

  // Atualizar título da aba com contador
  useEffect(() => {
    const title = 'AINTAR'; // Título base
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${title}`;
    } else {
      document.title = title;
    }
  }, [unreadCount]);

  // ========================================================================
  // UTILITÁRIOS
  // ========================================================================

  /**
   * Reproduzir som de notificação
   */
  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        // Som de notificação simples (base64 encoded WAV)
        audioRef.current = new Audio(
          'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhC1mf4PK3aRgCJn/K8duILgUke8v25ooxB2Kw5uGpXxIC'
        );
        audioRef.current.volume = 0.3;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignorar erros de reprodução (browser pode bloquear)
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('[SocketContext] Cannot play notification sound:', error);
      }
    }
  }, []);

  /**
   * Gerar ID único para notificação
   */
  const generateNotificationId = useCallback(() => {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // ========================================================================
  // HANDLERS DE EVENTOS
  // ========================================================================

  /**
   * Handler unificado para novas notificações
   * @param {Object} data - Dados da notificação
   * @param {boolean} showToast - Se deve mostrar toast (default: true)
   */
  const handleNewNotification = useCallback(
    (data, showToast = true) => {
      const notificationId = data.notification_id || generateNotificationId();
      const taskId = data.taskId || data.task_id;

      setNotifications((prev) => {
        // Verificar duplicados por ID
        const existsById = prev.some((n) => n.id === notificationId);
        if (existsById) return prev;

        // Verificar duplicados por taskId (para notificações de tarefas)
        // Ignorar se já existe uma notificação para a mesma tarefa nos últimos 5 segundos
        if (taskId) {
          const recentTaskNotif = prev.find(
            (n) => n.taskId === taskId && new Date() - new Date(n.timestamp) < 5000
          );
          if (recentTaskNotif) {
            console.debug('[SocketContext] Ignorando notificação duplicada para tarefa:', taskId);
            return prev;
          }
        }

        // Criar notificação normalizada
        const newNotification = {
          id: notificationId,
          type: data.type || 'system',
          title: data.title || 'Nova Notificação',
          message: data.message || data.content || '',
          timestamp: data.timestamp || new Date().toISOString(),
          read: false,
          priority: data.priority || 'medium',
          metadata: data.metadata || {},
          // Campos específicos por tipo
          ...(data.documentId && { documentId: data.documentId }),
          ...(data.taskId && { taskId: data.taskId }),
        };

        // Som e toast (apenas se showToast for true)
        if (showToast) {
          playNotificationSound();
          notification.info(`${newNotification.title}: ${newNotification.message}`, {
            duration: 5000,
          });
        }

        // unreadCount é calculado automaticamente via useMemo
        return [newNotification, ...prev.slice(0, 99)]; // Manter só 100 notificações
      });
    },
    [generateNotificationId, playNotificationSound]
  );

  /**
   * Handler para transferência de documentos
   */
  const handleDocumentTransferred = useCallback(
    (data) => {
      const isReceiver = data.toUser === user?.user_id;
      const isSender = data.fromUser === user?.user_id;

      const notif = {
        ...data,
        type: 'document',
        title: isReceiver ? 'Documento Recebido' : 'Documento Transferido',
        message: isReceiver
          ? `Recebeu o documento ${data.documentNumber || 'N/D'} de ${data.fromUserName || 'Utilizador'}`
          : `Documento ${data.documentNumber || 'N/D'} transferido para ${data.toUserName || 'Utilizador'}`,
        priority: isReceiver ? 'high' : 'medium',
      };

      handleNewNotification(notif);
    },
    [user?.user_id, handleNewNotification]
  );

  /**
   * Handler para notificações de tarefas
   * Inclui proteção contra duplicados baseada em taskId e tempo
   */
  const lastTaskNotificationRef = useRef({ taskId: null, timestamp: 0 });

  const handleTaskNotification = useCallback(
    (data) => {
      const now = Date.now();
      const taskId = data.taskId || data.task_id;

      // Evitar duplicados: ignorar se for a mesma tarefa em menos de 3 segundos
      if (
        taskId &&
        lastTaskNotificationRef.current.taskId === taskId &&
        now - lastTaskNotificationRef.current.timestamp < 3000
      ) {
        console.debug('[SocketContext] Ignorando notificação duplicada para tarefa:', taskId);
        return;
      }

      // Atualizar referência
      lastTaskNotificationRef.current = { taskId, timestamp: now };

      const notif = {
        ...data,
        type: 'task',
        title: data.title || 'Atualização de Tarefa',
        message: data.message || `Tarefa ${data.taskName || 'N/D'} foi atualizada`,
        priority: data.priority || 'medium',
        taskId,
      };

      // Não mostrar toast para notificações de tarefas
      // O refresh em tempo real é gerido pelo hook useTaskSocket (subscreve diretamente ao evento)
      handleNewNotification(notif, false);
    },
    [handleNewNotification]
  );

  /**
   * Handler para notificações de operações (módulo de operação)
   * nova_tarefa → operador recebe tarefa atribuída
   * tarefa_executada → supervisor é notificado de execução
   * tarefa_validada → operador é notificado de validação
   */
  const handleOperacaoNotification = useCallback(
    (data) => {
      const notifTypeMap = {
        nova_tarefa: { title: 'Nova tarefa atribuída', priority: 'high' },
        tarefa_executada: { title: 'Tarefa executada', priority: 'high' },
        tarefa_validada: { title: 'Tarefa validada', priority: 'medium' },
      };
      const meta = notifTypeMap[data.notification_type] || { title: data.title || 'Operação', priority: 'medium' };

      const notif = {
        ...data,
        type: 'operacao',
        title: data.title || meta.title,
        message: data.message || '',
        priority: meta.priority,
        meta_pk: data.meta_pk,
        operacao_pk: data.operacao_pk,
        route: data.route || '/operation/supervisor',
      };

      handleNewNotification(notif, true);
    },
    [handleNewNotification]
  );

  // ========================================================================
  // ACTIONS
  // ========================================================================

  /**
   * Marcar notificação como lida.
   * Para notificações de tarefas, também persiste no backend via REST.
   */
  const markAsRead = useCallback(
    (notificationId) => {
      // Encontrar antes de actualizar estado para aceder ao taskId
      const notif = notifications.find((n) => n.id === notificationId);

      // Persistir no backend para notificações de tarefas
      if (notif?.taskId) {
        apiClient
          .put(`/tasks/${notif.taskId}/notification`)
          .catch((err) =>
            console.error('[SocketContext] Erro ao marcar tarefa como lida:', err)
          );
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );

      // Emitir para servidor Socket.IO
      emitEvent(SOCKET_EVENTS.MARK_NOTIFICATION_READ, {
        notificationId,
        userId: user?.user_id,
      });
    },
    [notifications, user?.user_id]
  );

  /**
   * Marcar todas como lidas.
   * Para notificações de tarefas, persiste no backend via REST em batch.
   */
  const markAllAsRead = useCallback(() => {
    const unread = notifications.filter((n) => !n.read);
    const unreadIds = unread.map((n) => n.id);

    // Persistir no backend as notificações de tarefas não lidas
    const taskUnread = unread.filter((n) => n.taskId);
    if (taskUnread.length > 0) {
      Promise.all(
        taskUnread.map((n) =>
          apiClient
            .put(`/tasks/${n.taskId}/notification`)
            .catch((err) =>
              console.error(`[SocketContext] Erro ao marcar tarefa ${n.taskId} como lida:`, err)
            )
        )
      );
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Emitir para servidor Socket.IO
    if (unreadIds.length > 0) {
      emitEvent(SOCKET_EVENTS.MARK_ALL_NOTIFICATIONS_READ, {
        notificationIds: unreadIds,
        userId: user?.user_id,
      });
    }

    notification.success(`${unreadIds.length} notificações marcadas como lidas`);
  }, [notifications, user?.user_id]);

  /**
   * Limpar notificações antigas (mais de 7 dias)
   */
  const clearOldNotifications = useCallback(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    setNotifications((prev) => prev.filter((n) => new Date(n.timestamp).getTime() > weekAgo));
  }, []);

  /**
   * Carregar notificações de tarefas pendentes da base de dados (recuperação offline).
   * Chamado ao montar o contexto quando o utilizador está autenticado.
   * Filtra tarefas com notification_owner=1 (owner) ou notification_client=1 (client).
   */
  const loadOfflineTaskNotifications = useCallback(async () => {
    if (!user?.user_id) return;

    try {
      const response = await apiClient.get('/tasks');
      const tasks = response?.tasks || [];

      const tasksWithNotifs = tasks.filter(
        (task) =>
          (task.owner === user.user_id && task.notification_owner === 1) ||
          (task.ts_client === user.user_id && task.notification_client === 1)
      );

      if (tasksWithNotifs.length === 0) return;

      const offlineNotifications = tasksWithNotifs.map((task) => ({
        id: `offline_task_${task.pk}`,
        type: 'task',
        title: 'Nota não lida',
        message: `Tarefa "${task.name}" tem atualizações não lidas`,
        timestamp: task.when_start || new Date().toISOString(),
        read: false,
        priority: 'medium',
        taskId: task.pk,
        taskName: task.name,
        metadata: { offline: true },
      }));

      // Merge evitando duplicados por taskId
      setNotifications((prev) => {
        const existingTaskIds = new Set(
          prev.filter((n) => n.taskId).map((n) => n.taskId)
        );
        const newOnes = offlineNotifications.filter(
          (n) => !existingTaskIds.has(n.taskId)
        );
        if (newOnes.length === 0) return prev;
        return [...newOnes, ...prev];
      });
    } catch (error) {
      console.error('[SocketContext] Erro ao carregar notificações offline de tarefas:', error);
    }
  }, [user?.user_id]);

  // Recuperar notificações offline de tarefas ao autenticar
  useEffect(() => {
    if (user?.user_id) {
      loadOfflineTaskNotifications();
    }
  }, [user?.user_id, loadOfflineTaskNotifications]);

  /**
   * Emitir evento customizado
   */
  const emit = useCallback((eventName, data) => {
    return emitEvent(eventName, data);
  }, []);

  // ========================================================================
  // GESTÃO DE CONEXÃO SOCKET
  // ========================================================================

  useEffect(() => {
    let socketInstance = null;
    let cleanupFunctions = [];

    const setupSocket = async () => {
      if (!isAuthenticated || !user?.user_id) {
        return;
      }

      try {
        // Conectar (passar token diretamente do user)
        socketInstance = await connectSocket(user.user_id, user.access_token);
        setSocket(socketInstance);
        setIsConnected(true);

        // Entrar na sala do utilizador
        emit(SOCKET_EVENTS.JOIN, {
          userId: user.user_id,
          sessionId: user.session_id,
        });

        // Registar event listeners
        const removeNewNotif = onEvent(SOCKET_EVENTS.NEW_NOTIFICATION, handleNewNotification);
        const removeDocTransfer = onEvent(
          SOCKET_EVENTS.DOCUMENT_TRANSFERRED,
          handleDocumentTransferred
        );
        const removeTaskNotif = onEvent(SOCKET_EVENTS.TASK_NOTIFICATION, handleTaskNotification);
        const removeOperacaoNotif = onEvent('operacao_notification', handleOperacaoNotification);

        // Event para atualização de conexão
        const removeConnect = onEvent(SOCKET_EVENTS.CONNECT, () => {
          setIsConnected(true);
        });

        const removeDisconnect = onEvent(SOCKET_EVENTS.DISCONNECT, () => {
          setIsConnected(false);
        });

        // Heartbeat via socket a cada 10 minutos (evita HTTP poll quando socket está ligado)
        // Guarda isSocketConnected() para não emitir durante janelas de reconnect
        const HEARTBEAT_INTERVAL = 10 * 60 * 1000;
        const heartbeatInterval = setInterval(() => {
          if (isSocketConnected()) {
            emitEvent('heartbeat', { userId: user.user_id, timestamp: Date.now() });
          }
        }, HEARTBEAT_INTERVAL);

        cleanupFunctions = [
          removeNewNotif,
          removeDocTransfer,
          removeTaskNotif,
          removeOperacaoNotif,
          removeConnect,
          removeDisconnect,
          () => clearInterval(heartbeatInterval),
        ];
      } catch (error) {
        console.error('[SocketContext] Error setting up socket:', error);
        setIsConnected(false);
      }
    };

    setupSocket();

    // Cleanup — usa cleanupSocketSession() (síncrono) em vez de disconnectSocket() (Promise)
    // Isto elimina a race condition onde o novo ciclo do effect começa antes do socket
    // anterior estar completamente destruído, causando isConnected = false incorrectamente.
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupSocketSession(); // síncrono: remove listeners + disconnect + null na mesma frame
      setSocket(null);
      setIsConnected(false);
    };
  }, [
    isAuthenticated,
    user?.user_id, // primitivo estável — evita re-conexão por re-render do AuthContext
    emit,
    handleNewNotification,
    handleDocumentTransferred,
    handleTaskNotification,
    handleOperacaoNotification,
  ]);

  // Polling de fallback: corre continuamente enquanto autenticado.
  // Não depende de `socket` (state) para evitar reinícios que criam janelas cegas.
  // Intervalo de 3s garante correcção rápida em qualquer estado residual.
  useEffect(() => {
    if (!isAuthenticated) {
      setIsConnected(false);
      return;
    }
    setIsConnected(isSocketConnected());
    const poll = setInterval(() => setIsConnected(isSocketConnected()), 3000);
    return () => clearInterval(poll);
  }, [isAuthenticated]); // só `isAuthenticated` — sem `socket` para evitar reinícios

  // Limpeza automática de notificações antigas (a cada hora)
  useEffect(() => {
    const interval = setInterval(clearOldNotifications, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [clearOldNotifications]);

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const value = {
    // Conexão
    socket,
    isConnected,
    emit,

    // Notificações
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearOldNotifications,

    // Helpers
    playNotificationSound,

    // Socket.IO events constants
    SOCKET_EVENTS,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

/**
 * Hook para usar o SocketContext
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  return context;
};

export default SocketContext;
