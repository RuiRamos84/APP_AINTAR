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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NOTIFICATION_KEYS } from '@/core/constants/notificationKeys';

const SocketContext = createContext(null);

// Tipos cuja persistência vive na tabela central (após a unificação faseada).
// Os restantes (payment, system) são só estado local efémero.
const CENTRAL_TYPES = ['operacao', 'rh', 'task', 'document'];

/**
 * Socket Provider Component
 */
export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Estados da conexão
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Estado local: APENAS para tipos sem persistência própria ainda
  // (document, payment, system). Operação/RH vivem no React Query.
  const [localNotifications, setNotifications] = useState([]);

  // ========================================================================
  // FEED CENTRAL (React Query) — operação, RH
  // ========================================================================

  const { data: centralFeed } = useQuery({
    queryKey: NOTIFICATION_KEYS.central,
    queryFn: async () => {
      const res = await apiClient.get('/notifications/feed', { params: { limit: 50 } });
      return res?.notifications || [];
    },
    enabled: !!user?.user_id,
    staleTime: 1000 * 30,
  });

  const centralNotifications = useMemo(
    () =>
      (centralFeed || []).map((n) => ({
        id: n.pk,
        type: n.type,
        notification_type: n.notification_type,
        title: n.title,
        message: n.message || '',
        route: n.route,
        timestamp: n.hist_time,
        read: !!n.read,
        priority: 'medium',
        metadata: n.metadata || {},
        // Tasks/documentos guardam o id da entidade em metadata; expor a
        // nível de topo para o NotificationCenter navegar sem saber do shape interno.
        ...(n.metadata?.task_id != null && { taskId: n.metadata.task_id }),
        ...(n.metadata?.document_id != null && { documentId: n.metadata.document_id }),
      })),
    [centralFeed]
  );

  // Notificações expostas ao resto da app: central (RQ) + locais (estado efémero)
  const notifications = useMemo(
    () =>
      [...centralNotifications, ...localNotifications].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      ),
    [centralNotifications, localNotifications]
  );

  // Calcular unreadCount a partir da lista combinada (evita dessincronização)
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // Seletores por-entidade (fase B da unificação): badges por-item (TaskCard,
  // DocumentCard, ...) derivam destes Sets em vez de flags legados
  // (tb_task.notification_*, tb_document.notification). A fonte é o próprio
  // feed central já em memória — sem pedidos extra à BD.
  const unreadTaskIds = useMemo(() => {
    const ids = new Set();
    for (const n of centralNotifications) {
      if (n.type === 'task' && !n.read && n.metadata?.task_id != null) {
        ids.add(n.metadata.task_id);
      }
    }
    return ids;
  }, [centralNotifications]);

  const unreadDocumentIds = useMemo(() => {
    const ids = new Set();
    for (const n of centralNotifications) {
      if (n.type === 'document' && !n.read && n.metadata?.document_id != null) {
        ids.add(n.metadata.document_id);
      }
    }
    return ids;
  }, [centralNotifications]);

  const markCentralReadMutation = useMutation({
    mutationFn: (pk) => apiClient.put(`/notifications/${pk}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.central }),
  });

  const markAllCentralReadMutation = useMutation({
    mutationFn: () => apiClient.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.central }),
  });

  // Refs para controlo
  const audioRef = useRef(null);

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
      // Documentos já são persistidos na tabela central pelo backend (dual-write,
      // fase A). Não duplicar em estado local — só toast/som + invalidar o feed,
      // tal como já acontece para operação/RH.
      if (data.type === 'document') {
        if (showToast) {
          playNotificationSound();
          notification.info(`${data.title || 'Novo Pedido'}: ${data.message || ''}`, {
            duration: 5000,
          });
        }
        queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.central });
        return;
      }

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
          ...(data.route && { route: data.route }),
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
    [generateNotificationId, playNotificationSound, queryClient]
  );

  /**
   * Handler global para confirmação de pagamento SIBS (webhook).
   * Sempre activo — invalida caches mesmo com o modal fechado.
   */
  const handlePaymentStatusUpdate = useCallback(
    (data) => {
      const documentId = data.document_id;
      if (!documentId) return;

      // Invalidar tab de pagamentos do documento
      queryClient.invalidateQueries({ queryKey: ['invoiceAmount', documentId] });
      // Invalidar detalhe do documento (para reflectir estado na lista e no modal)
      queryClient.invalidateQueries({ queryKey: ['documents', 'detail'] });
      queryClient.invalidateQueries({ queryKey: ['documents', 'list'] });

      if (data.payment_status === 'SUCCESS') {
        notification.success('Pagamento confirmado com sucesso.');
      }
    },
    [queryClient]
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

      // Tarefas já são persistidas na tabela central pelo backend (dual-write,
      // fase A). Não duplicar em estado local — só invalidar o feed, para o
      // badge por-item (derivado do feed) e o sino atualizarem.
      // Sem toast, tal como já era o comportamento anterior.
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.central });
    },
    [queryClient]
  );

  /**
   * Notificações de Operação/RH são persistidas na BD pelo backend antes
   * de o evento chegar (ver Fase 1). Aqui não tocamos no estado local —
   * apenas mostramos o toast imediato e invalidamos o feed central do
   * React Query, que é a fonte de verdade para estes dois tipos.
   */
  const notifyAndRefreshCentral = useCallback(
    (title, message) => {
      playNotificationSound();
      notification.info(`${title}: ${message}`, { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.central });
    },
    [playNotificationSound, queryClient]
  );

  /**
   * Handler para notificações do módulo RH
   * participacao_workflow → colaborador notificado de mudança de estado
   * participacao_criada   → participação criada automaticamente após regresso
   */
  const handleRhNotification = useCallback(
    (data) => {
      notifyAndRefreshCentral(data.title || 'Recursos Humanos', data.message || '');
    },
    [notifyAndRefreshCentral]
  );

  /**
   * Handler para alertas de renovação de licenças de ETAR (módulo Gestão)
   * licenca_expirar  → licença a aproximar-se do fim (90/60/30/15/7/1 dias)
   * licenca_expirada → licença já expirada (repete a cada 7 dias)
   */
  const handleLicencaNotification = useCallback(
    (data) => {
      notifyAndRefreshCentral(data.title || 'Licença', data.message || '');
    },
    [notifyAndRefreshCentral]
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
        nova_tarefa: 'Nova tarefa atribuída',
        tarefa_executada: 'Tarefa executada',
        tarefa_validada: 'Tarefa validada',
      };
      const title = data.title || notifTypeMap[data.notification_type] || 'Operação';
      notifyAndRefreshCentral(title, data.message || '');
    },
    [notifyAndRefreshCentral]
  );

  /**
   * Handler para notificações de frota (módulo Frota)
   * avaria_reportada → condutor reportou avaria via "A Minha Viatura"
   */
  const handleFleetNotification = useCallback(
    (data) => {
      notifyAndRefreshCentral(data.title || 'Frota', data.message || '');
    },
    [notifyAndRefreshCentral]
  );

  /**
   * Handler para confirmação de leitura de tarefa vinda de outro ecrã
   * (ex: tarefa aberta diretamente, não pelo sino, ou noutro separador).
   * Tarefas vivem agora na tabela central — invalidar o feed garante que o
   * badge por-item (derivado dele) e o sino refletem o estado lido.
   */
  const handleTaskNotificationsUpdated = useCallback((data) => {
    const { taskId } = data;
    if (taskId == null) return;
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.central });
  }, [queryClient]);

  // ========================================================================
  // ACTIONS
  // ========================================================================

  /**
   * Marcar notificação como lida.
   * Tipos centrais (operação/RH/tarefa/documento): a tabela central é dona do
   * estado — a mutação invalida o React Query, que reflete o `read` da BD.
   */
  const markAsRead = useCallback(
    (notificationId) => {
      const notif = notifications.find((n) => n.id === notificationId);
      if (!notif) return;

      if (CENTRAL_TYPES.includes(notif.type)) {
        markCentralReadMutation.mutate(notif.id);
        return;
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
    [notifications, user?.user_id, markCentralReadMutation]
  );

  /**
   * Marcar todas como lidas.
   * Uma única chamada marca tudo na tabela central (operação/RH/tarefa/documento).
   */
  const markAllAsRead = useCallback(() => {
    const unread = notifications.filter((n) => !n.read);
    const unreadIds = unread.map((n) => n.id);

    if (unread.some((n) => CENTRAL_TYPES.includes(n.type))) {
      markAllCentralReadMutation.mutate();
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
  }, [notifications, user?.user_id, markAllCentralReadMutation]);

  /**
   * Limpar notificações antigas (mais de 7 dias)
   */
  const clearOldNotifications = useCallback(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    setNotifications((prev) => prev.filter((n) => new Date(n.timestamp).getTime() > weekAgo));
  }, []);

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
        const removeTaskNotif = onEvent(SOCKET_EVENTS.TASK_NOTIFICATION, handleTaskNotification);
        const removeTaskNotifUpdated = onEvent(
          'task_notifications_updated',
          handleTaskNotificationsUpdated
        );
        const removeOperacaoNotif = onEvent('operacao_notification', handleOperacaoNotification);
        const removeRhNotif = onEvent('rh_notification', handleRhNotification);
        const removeLicencaNotif = onEvent('licenca_notification', handleLicencaNotification);
        const removeFleetNotif = onEvent('fleet_notification', handleFleetNotification);
        const removePaymentUpdate = onEvent('payment_status_update', handlePaymentStatusUpdate);

        // Deteção automática de manutenção: o Enable-MaintenanceMode reinicia
        // o nginx, o que derruba TODAS as ligações activas em segundos. Uma
        // desconexão pode ser isso ou só uma instabilidade de rede pontual —
        // por isso nunca decidimos pelo erro do socket sozinho: confirmamos
        // com pedidos HTTP reais a "/" (mesma rota que a maintenance.html usa)
        // durante uma janela curta, e só redireccionamos se algum vier 503.
        let maintenanceCheckTimers = [];
        const clearMaintenanceCheck = () => {
          maintenanceCheckTimers.forEach(clearTimeout);
          maintenanceCheckTimers = [];
        };
        const checkMaintenanceOnce = () => {
          fetch('/', { method: 'HEAD', cache: 'no-store' })
            .then((r) => {
              if (r.status === 503) window.location.href = '/maintenance.html';
            })
            .catch(() => {}); // nginx ainda a reiniciar — a proxima tentativa confirma
        };

        // Event para atualização de conexão
        const removeConnect = onEvent(SOCKET_EVENTS.CONNECT, () => {
          setIsConnected(true);
          clearMaintenanceCheck(); // reconectou sozinho — não era manutenção
        });

        const removeDisconnect = onEvent(SOCKET_EVENTS.DISCONNECT, () => {
          setIsConnected(false);
          clearMaintenanceCheck();
          [1500, 3500, 6000, 10000].forEach((delay) => {
            maintenanceCheckTimers.push(setTimeout(checkMaintenanceOnce, delay));
          });
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
          removeTaskNotif,
          removeTaskNotifUpdated,
          removeOperacaoNotif,
          removeRhNotif,
          removeLicencaNotif,
          removeFleetNotif,
          removePaymentUpdate,
          removeConnect,
          removeDisconnect,
          () => clearInterval(heartbeatInterval),
          clearMaintenanceCheck,
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
    handleTaskNotification,
    handleTaskNotificationsUpdated,
    handleOperacaoNotification,
    handleRhNotification,
    handleLicencaNotification,
    handleFleetNotification,
    handlePaymentStatusUpdate,
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

    // Seletores por-entidade para badges por-item (TaskCard, DocumentCard, ...)
    unreadTaskIds,
    unreadDocumentIds,

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
