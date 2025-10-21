import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '../services/socketService';
import { useAuth } from './AuthContext';
import { usePermissionContext } from './PermissionContext';
import { notifySuccess, notifyInfo, notifyWarning } from '../components/common/Toaster/ThemedToaster';
import api from '../services/api';

const SocketContext = createContext();

/**
 * Contexto unificado para Socket.IO e notificações em tempo real
 * - Gestão de conexão Socket.IO
 * - Sistema avançado de notificações (documentos, tarefas, sistema)
 * - Armazenamento persistente resistente a localStorage.clear()
 * - Sons e feedback visual unificados
 */
export const SocketProvider = ({ children }) => {
    const { user, isLoggingOut } = useAuth();
    const { hasPermission, initialized: permissionsInitialized } = usePermissionContext();

    // Estados da conexão socket
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // Estados unificados de notificações
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastNotificationId, setLastNotificationId] = useState(null);

    // Estados de compatibilidade (para componentes legados)
    const [globalNotificationCount, setGlobalNotificationCount] = useState(0);
    const [taskNotifications, setTaskNotifications] = useState([]);
    const [unreadTaskCount, setUnreadTaskCount] = useState(0);
    const [taskNotificationCount, setTaskNotificationCount] = useState(0);

    // Referências para controlo
    const audioRef = useRef(null);
    const listenersRegisteredRef = useRef(false);
    const isInitializedRef = useRef(false);

    // =========================================================================
    // ARMAZENAMENTO PERSISTENTE E RESISTENTE
    // =========================================================================

    // Carregar estado inicial do localStorage com múltiplas chaves de backup
    const loadFromStorage = useCallback(() => {
        const userId = user?.user_id || 'anonymous';
        const keys = [
            `notifications_${userId}`,
            `notifications_backup_${userId}`,
            `app_notifications_${userId}`,
            // Fallback para chaves antigas
            'documentNotifications',
            'notifications'
        ];

        for (const key of keys) {
            try {
                const stored = localStorage.getItem(key);

                if (stored && stored !== 'null') {
                    const parsed = JSON.parse(stored);
                    if (parsed && (parsed.notifications?.length > 0 || parsed.unreadCount > 0)) {
                        return {
                            notifications: parsed.notifications || [],
                            unreadCount: parsed.unreadCount || 0,
                            lastNotificationId: parsed.lastNotificationId || null
                        };
                    }
                }
            } catch (error) {
                console.warn(`Erro ao carregar de ${key}:`, error);
            }
        }
        return { notifications: [], unreadCount: 0, lastNotificationId: null };
    }, [user?.user_id]);

    // Salvar no localStorage com múltiplas chaves de backup
    const saveToStorage = useCallback((notifications, count, lastId) => {
        const userId = user?.user_id || 'anonymous';
        const data = {
            notifications,
            unreadCount: count,
            lastNotificationId: lastId,
            userId,
            timestamp: Date.now()
        };

        const keys = [
            `notifications_${userId}`,
            `notifications_backup_${userId}`,
            `app_notifications_${userId}`
        ];

        const dataString = JSON.stringify(data);

        keys.forEach(key => {
            try {
                localStorage.setItem(key, dataString);
            } catch (error) {
                console.warn(`Erro ao salvar em ${key}:`, error);
            }
        });
    }, [user?.user_id]);

    // Carregar estado inicial
    const initialState = loadFromStorage();

    // Inicializar estados com dados carregados
    useEffect(() => {
        if (initialState.notifications.length > 0 || initialState.unreadCount > 0) {
            setNotifications(initialState.notifications);
            setUnreadCount(initialState.unreadCount);
            setLastNotificationId(initialState.lastNotificationId);
            setGlobalNotificationCount(initialState.unreadCount);
        }
    }, []);

    // Efeito para sincronizar localStorage automaticamente quando o estado mudar
    useEffect(() => {
        // Marcar como inicializado após o primeiro render
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            return; // Não salvar na primeira inicialização
        }

        // Só salvar se há dados para salvar ou se explicitamente mudou algo
        if (notifications.length > 0 || unreadCount > 0 || lastNotificationId) {
            saveToStorage(notifications, unreadCount, lastNotificationId);
        }
    }, [notifications, unreadCount, lastNotificationId, saveToStorage]);

    // =========================================================================
    // UTILITÁRIOS DE NOTIFICAÇÃO
    // =========================================================================

    /**
     * Reproduzir som de notificação
     */
    const playNotificationSound = useCallback(() => {
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhC1mf4PK3aRgCJn/K8duILgUke8v25ooxB2Kw5uGpXxIC");
                audioRef.current.volume = 0.3;
            }
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {
                // Ignorar erros de reprodução
            });
        } catch (error) {
            console.debug('Não foi possível reproduzir som de notificação:', error);
        }
    }, []);

    /**
     * Gerar ID único para notificação
     */
    const generateNotificationId = useCallback(() => {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    /**
     * Formatar timestamp legível
     */
    const formatTimestamp = useCallback((timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `há ${diffMins}m`;
        if (diffMins < 1440) return `há ${Math.floor(diffMins / 60)}h`;
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }, []);

    // =========================================================================
    // HANDLERS DE EVENTOS SOCKET.IO
    // =========================================================================

    /**
     * Handler unificado para novas notificações
     */
    const handleNewNotification = useCallback((data) => {
        const currentUserId = user?.user_id;
        const notificationId = data.notification_id || generateNotificationId();

        // Verificar se já processamos esta notificação
        if (notificationId) {
            setNotifications(prev => {
                const exists = prev.some(n => n.originalId === notificationId);
                if (exists) {
                    return prev;
                }

                // Determinar tipo de notificação
                let notificationType = 'system';
                let notification = {};

                if (data.document_id || data.documentId) {
                    // Notificação de documento
                    notificationType = 'document';
                    notification = {
                        id: generateNotificationId(),
                        originalId: notificationId,
                        type: 'document_transfer',
                        documentId: data.document_id || data.documentId,
                        documentNumber: data.document_number || data.documentNumber || `Doc ${data.document_id || data.documentId}`,
                        fromUser: data.from_user || data.fromUser || 17,
                        fromUserName: data.from_user_name || data.fromUserName || 'Utilizador',
                        toUser: data.to_user || data.toUser || currentUserId,
                        toUserName: data.to_user_name || data.toUserName || user?.name || 'Utilizador',
                        stepName: data.step_name || data.stepName || 'Novo passo',
                        stepType: data.step_type || data.stepType || 'transfer',
                        currentStatus: data.current_status || data.currentStatus || 'Em processamento',
                        timestamp: data.timestamp || new Date().toISOString(),
                        isReceiver: (data.to_user || data.toUser || currentUserId) === currentUserId,
                        isSender: (data.from_user || data.fromUser) === currentUserId,
                        read: false,
                        metadata: data.metadata || {},
                        title: (data.to_user || data.toUser || currentUserId) === currentUserId ? 'Novo documento atribuído' : 'Documento transferido',
                        message: (data.to_user || data.toUser || currentUserId) === currentUserId
                            ? `Recebeu o documento ${data.document_number || data.documentNumber || `Doc ${data.document_id || data.documentId}`} de ${data.from_user_name || data.fromUserName || 'Utilizador'}`
                            : `Documento ${data.document_number || data.documentNumber || `Doc ${data.document_id || data.documentId}`} transferido para ${data.to_user_name || data.toUserName || 'Utilizador'}`,
                        priority: (data.to_user || data.toUser || currentUserId) === currentUserId ? 'high' : 'medium',
                        icon: (data.to_user || data.toUser || currentUserId) === currentUserId ? '📬' : '📤'
                    };
                } else if (data.task_id || data.taskId) {
                    // Notificação de tarefa
                    notificationType = 'task';

                    // Determinar título e mensagem baseado no tipo de notificação
                    const taskName = data.task_name || data.taskName || 'Tarefa';
                    const senderName = data.senderName || data.sender_name || 'Utilizador';
                    const content = data.content || data.message || 'Nova atualização';
                    const notifType = data.notification_type || 'task_update';

                    let title = 'Tarefa atualizada';
                    let message = `${taskName}: ${content}`;
                    let icon = '📋';

                    // Mensagens específicas por tipo de ação
                    switch (notifType) {
                        case 'new_task':
                            title = 'Nova tarefa atribuída';
                            message = `${senderName} atribuiu-lhe a tarefa: ${taskName}`;
                            icon = '✨';
                            break;
                        case 'new_note':
                            title = 'Nova resposta na tarefa';
                            message = `${senderName} adicionou uma nota em "${taskName}"`;
                            icon = '💬';
                            break;
                        case 'status_update':
                            title = 'Estado da tarefa alterado';
                            message = `${senderName} mudou o estado de "${taskName}"`;
                            icon = '🔄';
                            break;
                        case 'task_update':
                            title = 'Tarefa atualizada';
                            message = `${senderName} atualizou a tarefa "${taskName}"`;
                            icon = '✏️';
                            break;
                        case 'task_closed':
                            title = 'Tarefa encerrada';
                            message = `${senderName} encerrou a tarefa "${taskName}"`;
                            icon = '✅';
                            break;
                        default:
                            title = 'Atualização na tarefa';
                            message = `${senderName}: ${content}`;
                            icon = '📋';
                    }

                    notification = {
                        id: generateNotificationId(),
                        originalId: notificationId,
                        type: 'task_notification',
                        notificationType: notifType,
                        taskId: data.task_id || data.taskId,
                        taskName,
                        status: data.status,
                        statusId: data.statusId || data.status_id,
                        senderName,
                        content,
                        timestamp: data.timestamp || new Date().toISOString(),
                        read: false,
                        title,
                        message,
                        priority: notifType === 'new_task' ? 'high' : 'medium',
                        icon
                    };
                } else {
                    // Notificação genérica/sistema
                    notification = {
                        id: generateNotificationId(),
                        originalId: notificationId,
                        type: 'system',
                        content: data.message || data.content || 'Nova notificação',
                        timestamp: data.timestamp || new Date().toISOString(),
                        read: false,
                        title: 'Notificação do sistema',
                        message: data.message || data.content || 'Nova notificação',
                        priority: 'low',
                        icon: '🔔'
                    };
                }

                const newList = [notification, ...prev.slice(0, 99)];

                // Atualizar contadores para receivers
                const isReceiver = notification.isReceiver !== false; // Para documentos, usar o campo específico; para outros, assumir que é receiver
                if (isReceiver) {
                    setUnreadCount(prevCount => prevCount + 1);
                    setGlobalNotificationCount(prevCount => prevCount + 1);
                    setLastNotificationId(notification.id);

                    // Som e feedback
                    playNotificationSound();

                    // Feedback visual específico por tipo
                    if (notificationType === 'document') {
                        if (notification.isReceiver) {
                            notifyInfo(`📬 ${notification.message}`, {
                                duration: 6000,
                                action: {
                                    label: 'Ver',
                                    onClick: () => handleViewDocument(notification.documentId)
                                }
                            });
                        } else if (notification.isSender) {
                            notifySuccess(`📤 ${notification.message}`, { duration: 4000 });
                        }
                    } else if (notificationType === 'task') {
                        // Usar ícone específico da notificação
                        notifyInfo(`${notification.icon} ${notification.message}`, { duration: 5000 });
                    } else {
                        notifyInfo(`🔔 ${notification.message}`, { duration: 3000 });
                    }

                    // Atualizar contador de tarefas se for notificação de tarefa (compatibilidade)
                    if (notificationType === 'task') {
                        setTaskNotifications(prevTasks => {
                            const existingIndex = prevTasks.findIndex(n => parseInt(n.taskId) === parseInt(notification.taskId));
                            if (existingIndex >= 0) {
                                const updated = [...prevTasks];
                                updated[existingIndex] = { ...updated[existingIndex], ...notification, read: false };
                                return updated;
                            }
                            return [notification, ...prevTasks];
                        });
                        setUnreadTaskCount(prev => prev + 1);
                        setTaskNotificationCount(prev => prev + 1);
                    }
                }

                return newList;
            });
        }
    }, [user?.user_id, generateNotificationId, playNotificationSound]);

    /**
     * Visualizar documento específico
     */
    const handleViewDocument = useCallback((documentId) => {
        // Disparar evento para abrir modal de documento
        window.dispatchEvent(new CustomEvent('open-document-modal', {
            detail: { documentId }
        }));
    }, []);

    // =========================================================================
    // AÇÕES E UTILITÁRIOS
    // =========================================================================

    /**
     * Marcar notificação como lida
     */
    const markNotificationAsRead = useCallback((notificationId) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === notificationId ? { ...notif, read: true } : notif
            )
        );

        setUnreadCount(prev => Math.max(0, prev - 1));
        setGlobalNotificationCount(prev => Math.max(0, prev - 1));

        // Emitir evento para servidor se necessário
        if (socket && isConnected) {
            emit('mark_notification_read', {
                notificationId,
                userId: user?.user_id
            });
        }
    }, [socket, isConnected, user?.user_id]);

    /**
     * Marcar todas como lidas
     */
    const markAllAsRead = useCallback(() => {
        const unreadIds = notifications
            .filter(notif => !notif.read)
            .map(notif => notif.id);

        setNotifications(prev =>
            prev.map(notif => ({ ...notif, read: true }))
        );

        setUnreadCount(0);
        setGlobalNotificationCount(0);

        // Emitir para servidor
        if (socket && isConnected && unreadIds.length > 0) {
            emit('mark_all_notifications_read', {
                notificationIds: unreadIds,
                userId: user?.user_id
            });
        }

        notifySuccess(`✅ ${unreadIds.length} notificações marcadas como lidas`);
    }, [notifications, socket, isConnected, user?.user_id]);

    /**
     * Limpar notificações antigas (mais de 7 dias)
     */
    const clearOldNotifications = useCallback(() => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        setNotifications(prev =>
            prev.filter(notif => new Date(notif.timestamp) > weekAgo)
        );
    }, []);

    /**
     * Emitir evento personalizado
     */
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

    /**
     * Emitir evento de transferência de documento
     */
    const notifyDocumentTransfer = useCallback((transferData) => {
        if (socket && isConnected) {
            emit('document_transferred', {
                ...transferData,
                fromUser: user?.user_id,
                fromUserName: user?.name || user?.username,
                timestamp: new Date().toISOString()
            });
        }
    }, [socket, isConnected, emit, user]);

    // =========================================================================
    // COMPATIBILIDADE COM CÓDIGO LEGACY
    // =========================================================================

    // Carregar a contagem inicial de notificações via REST API
    const fetchInitialCount = useCallback(async () => {
        if (user) {
            try {
                const response = await api.get("/notifications");
                const count = response.data.count || 0;
                setGlobalNotificationCount(count);
            } catch (error) {
                console.error("Erro ao buscar contagem inicial de notificações:", error);
            }
        }
    }, [user]);

    // Marcar documento como lido (legacy)
    const markAsRead = useCallback((documentId) => {
        if (socket && isConnected && user) {
            socket.emit("mark_notification_read", {
                documentId,
                userId: user.user_id,
                sessionId: user.session_id
            });
        }
    }, [socket, isConnected, user]);

    // Marcar documento como não lido (legacy)
    const markAsUnread = useCallback((documentId) => {
        if (socket && isConnected && user) {
            socket.emit("mark_notification_unread", {
                documentId,
                userId: user.user_id,
                sessionId: user.session_id
            });
        }
    }, [socket, isConnected, user]);

    // Solicitar atualização da contagem (legacy)
    const refreshNotifications = useCallback(() => {
        if (socket && isConnected && user) {
            socket.emit("get_notifications", {
                userId: user.user_id,
                sessionId: user.session_id
            });
        }
    }, [socket, isConnected, user]);

    // Funções para tarefas (legacy)
    const markTaskNotificationAsRead = useCallback(async (taskId) => {
        try {
            if (socket && isConnected && user) {
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

            setUnreadTaskCount(prev => Math.max(0, prev - 1));
            setTaskNotificationCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Erro ao marcar notificação de tarefa como lida:", error);
        }
    }, [socket, isConnected, user]);

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
        } catch (error) {
            console.error("Erro ao marcar todas notificações de tarefas como lidas:", error);
        }
    }, [taskNotifications]);

    const fetchInitialTaskNotifications = useCallback(async () => {
        if (user && permissionsInitialized && hasPermission(200)) {
            try {
                const response = await api.get("/tasks");

                const tasksWithNotifications = response.data.tasks?.filter(task =>
                    (task.owner === user.user_id && task.notification_owner === 1) ||
                    (task.ts_client === user.user_id && task.notification_client === 1)
                ) || [];

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
    }, [user, permissionsInitialized, hasPermission]);

    const refreshTaskNotifications = useCallback(() => {
        if (socket && socket.connected && user && permissionsInitialized && hasPermission(200)) {
            socket.emit("get_task_notifications", {
                userId: user.user_id,
                sessionId: user.session_id
            });
        }
    }, [socket, user, permissionsInitialized, hasPermission]);

    // =========================================================================
    // GESTÃO DE CONEXÃO SOCKET
    // =========================================================================

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
                    setIsConnected(true);

                    // Após conectar, juntar-se à sala
                    socketInstance.emit("join", {
                        userId: user.user_id,
                        sessionId: user.session_id
                    });

                    // Solicitar notificações iniciais
                    setTimeout(() => {
                        refreshTaskNotifications();
                    }, 500);
                });

                socketInstance.on("disconnect", () => {
                    setIsConnected(false);
                });

                // Registar event handlers unificados
                socketInstance.on("new_notification", handleNewNotification);
                socketInstance.on("document_transferred", handleNewNotification);
                socketInstance.on("task_notification", (data) => {
                    console.log("📨 TASK_NOTIFICATION RECEBIDA:", data);
                    handleNewNotification(data);
                });

                // Legacy event handlers
                socketInstance.on("notification_update", (data) => {
                    const novoContador = data.count || 0;
                    setGlobalNotificationCount(novoContador);
                    if (data.notifications) {
                        // Processar notificações do servidor se necessário
                    }
                });

                socketInstance.on("notification_count", (data) => {
                    setGlobalNotificationCount(data.count || 0);
                });

                socketInstance.on("notifications_cleared", () => {
                    setGlobalNotificationCount(0);
                });

                // Handler para notificações de tarefas da BD (quando user conecta)
                socketInstance.on("task_notifications", (data) => {
                    if (data && data.notifications && Array.isArray(data.notifications)) {
                        console.log(`📋 Carregadas ${data.notifications.length} notificações de tarefas da BD`);

                        // Processar cada notificação da BD e adicionar ao sistema unificado
                        data.notifications.forEach(taskNotif => {
                            // Converter notificação da BD para formato do sistema unificado
                            const notification = {
                                id: generateNotificationId(),
                                originalId: `task_${taskNotif.taskId}_${taskNotif.timestamp}`,
                                type: 'task_notification',
                                notificationType: 'task_update', // Tipo genérico para notificações da BD
                                taskId: taskNotif.taskId,
                                taskName: taskNotif.taskName || 'Tarefa',
                                senderName: taskNotif.senderName || 'Utilizador',
                                content: taskNotif.content || 'Atualização pendente',
                                timestamp: taskNotif.timestamp || new Date().toISOString(),
                                read: false,
                                title: 'Tarefa com atualizações pendentes',
                                message: `${taskNotif.senderName || 'Alguém'} atualizou "${taskNotif.taskName || 'a tarefa'}"`,
                                priority: 'medium',
                                icon: '📋'
                            };

                            // Adicionar ao sistema unificado sem duplicar
                            setNotifications(prev => {
                                const exists = prev.some(n =>
                                    n.type === 'task_notification' &&
                                    parseInt(n.taskId) === parseInt(taskNotif.taskId)
                                );
                                if (exists) return prev;
                                return [notification, ...prev];
                            });
                        });

                        // Atualizar contadores
                        setUnreadTaskCount(data.count || data.notifications.length);
                        setTaskNotificationCount(data.count || data.notifications.length);
                    }
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
                socketInstance.off("new_notification");
                socketInstance.off("document_transferred");
                socketInstance.off("task_notification");
                socketInstance.off("task_notifications");
                socketInstance.off("notification_update");
                socketInstance.off("notification_count");
                socketInstance.off("notifications_cleared");
            }
        };
    }, [user, isLoggingOut, handleNewNotification, refreshTaskNotifications, generateNotificationId]);

    // Outros efeitos
    useEffect(() => {
        if (user) {
            fetchInitialCount();
        }
    }, [user, fetchInitialCount]);

    useEffect(() => {
        if (user && isConnected) {
            refreshTaskNotifications();
        }
    }, [user, isConnected, refreshTaskNotifications]);

    useEffect(() => {
        if (user && permissionsInitialized) {
            fetchInitialTaskNotifications();
        }
    }, [user, permissionsInitialized, fetchInitialTaskNotifications]);

    // Limpeza automática de notificações antigas
    useEffect(() => {
        const interval = setInterval(clearOldNotifications, 1000 * 60 * 60); // A cada hora
        return () => clearInterval(interval);
    }, [clearOldNotifications]);

    // =========================================================================
    // CONTEXTO PARA COMPONENTES FILHOS
    // =========================================================================

    const value = {
        // Conexão socket
        socket,
        isConnected,
        emit,

        // Notificações unificadas (novo sistema)
        notifications,
        unreadCount,
        lastNotificationId,
        markNotificationAsRead,
        markAllAsRead,
        clearOldNotifications,
        handleViewDocument,
        formatTimestamp,
        notifyDocumentTransfer,

        // Sistema de documentos (compatibilidade)
        documentNotifications: notifications.filter(n => n.type === 'document_transfer'),
        documentNotificationsLength: notifications.filter(n => n.type === 'document_transfer').length,

        // Legacy/compatibilidade
        notificationCount: globalNotificationCount,
        globalNotificationCount,
        setGlobalNotificationCount,
        markAsRead,
        markAsUnread,
        refreshNotifications,
        fetchInitialNotifications: fetchInitialCount,

        // Tarefas (legacy)
        taskNotifications,
        unreadTaskCount,
        taskNotificationCount,
        markTaskNotificationAsRead,
        markAllTaskNotificationsAsRead,
        fetchInitialTaskNotifications,
        refreshTaskNotifications
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

/**
 * Hook para utilizar o contexto de socket
 */
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket deve ser usado dentro de um SocketProvider");
    }
    return context;
};

export default SocketContext;