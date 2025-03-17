import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { connectSocket, disconnectSocket } from '../services/socketService';
import { useAuth } from './AuthContext';
import notificacaoService from "../services/NotificacaoService";
import api from '../services/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, isLoggingOut } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Para compatibilidade com componentes legados
  const [globalNotificationCount, setGlobalNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // Carregar a contagem inicial de notificações via REST API
  const fetchInitialCount = useCallback(async () => {
    if (user) {
      try {
        // Chamar API REST diretamente para obter contagem inicial
        const response = await api.get("/notifications/count");
        const count = response.data.count || 0;

        setNotificationCount(count);
        setGlobalNotificationCount(count);

        // console.log("Contagem inicial de notificações obtida via REST:", count);
      } catch (error) {
        console.error("Erro ao buscar contagem inicial de notificações:", error);
      }
    }
  }, [user]);

  // Handler para notification_update socket event
  const handleNotificationUpdate = useCallback((data) => {
    // console.log("Notificação recebida:", data);
    const novoContador = data.count || 0;

    setNotificationCount(novoContador);
    setGlobalNotificationCount(novoContador);

    // Se o servidor enviar dados de notificação, atualiza
    if (data.notifications) {
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    }

    // Adicionar notificação na aba e som quando receber uma atualização
    // Apenas se houver um aumento no contador
    if (document.visibilityState !== 'visible' && novoContador > notificationCount) {
      notificacaoService.notificar(novoContador);
    }
  }, [notificationCount]);


  // Handler para notificações individuais
  const handleNewNotification = useCallback((data) => {
    // console.log("Nova notificação recebida:", data);

    // Incrementar contadores
    const novoContador = notificationCount + 1;
    setNotificationCount(novoContador);
    setGlobalNotificationCount(novoContador);

    // Adicionar notificação na aba e som com o contador atualizado
    if (document.visibilityState !== 'visible') {
      notificacaoService.notificar(novoContador);
    }
  }, [notificationCount]);

  // Carregar contagem inicial assim que o contexto for montado
  useEffect(() => {
    if (user) {
      fetchInitialCount();
    }
  }, [user, fetchInitialCount]);

  // Configuração da conexão socket
  useEffect(() => {
    let socketInstance = null;

    const setupSocket = async () => {
      if (user?.user_id && !isLoggingOut) {
        try {
          socketInstance = await connectSocket(user.user_id);
          setSocket(socketInstance);
          setIsConnected(true);

          // Socket event handlers
          socketInstance.on("connect", () => {
            console.log("Socket conectado:", socketInstance.id);
            setIsConnected(true);

            // Após conectar, juntar-se à sala
            socketInstance.emit("join", {
              userId: user.user_id,
              sessionId: user.session_id
            });
          });

          socketInstance.on("disconnect", () => {
            console.log("Socket desconectado");
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
            // console.log("Contagem legada recebida:", data);
            setNotificationCount(data.count || 0);
            setGlobalNotificationCount(data.count || 0);

            // Também notificar aqui se houver novas notificações
            if (document.visibilityState !== 'visible' && data.count > notificationCount) {
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
          setIsConnected(false);
        }
      }
    };

    setupSocket();

    return () => {
      if (socketInstance) {
        disconnectSocket();
        setIsConnected(false);
      }
    };
  }, [user, isLoggingOut, handleNotificationUpdate, handleNewNotification, notificationCount]);

  // Event listener para visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        notificacaoService.pararPiscar();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

  // Retrocompatibilidade
  const fetchInitialNotifications = fetchInitialCount;

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
    fetchInitialNotifications
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