import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { connectSocket, disconnectSocket } from "../services/socketService";
import {
  getNotifications,
  getNotificationsCount,
} from "../services/notificationService";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, isLoggingOut } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [globalNotificationCount, setGlobalNotificationCount] = useState(0);

  const fetchInitialNotifications = useCallback(async () => {
    if (user) {
      try {
        const fetchedNotifications = await getNotifications();
        setNotifications(
          Array.isArray(fetchedNotifications) ? fetchedNotifications : []
        );

        const count = await getNotificationsCount();
        setGlobalNotificationCount(count);

        // console.log("Fetched notifications:", fetchedNotifications, "Count:", count);
      } catch (error) {
        console.error("Erro ao buscar notificações iniciais:", error);
        setNotifications([]);
        setGlobalNotificationCount(0);
      }
    }
  }, [user, setGlobalNotificationCount]);

  useEffect(() => {
    let socketInstance = null;

    const setupSocket = async () => {
      if (user?.user_id && !isLoggingOut) {
        try {
          socketInstance = await connectSocket(user.user_id);
          setSocket(socketInstance);
          setIsConnected(true);

          socketInstance.on("new_notification", (newNotification) => {
            console.log("Nova notificação recebida:", newNotification);
            setNotifications((prev) => [...prev, newNotification]);
            setGlobalNotificationCount((prev) => prev + 1);
          });

          socketInstance.on("notification_count", (data) => {
            console.log("Contagem de notificações atualizada:", data);
            setGlobalNotificationCount(data.count);
          });

          await fetchInitialNotifications();
        } catch (error) {
          console.error("Erro ao configurar o socket:", error);
        }
      }
    };

    setupSocket();

    return () => {
      if (socketInstance) {
        disconnectSocket(socketInstance);
      }
    };
  }, [user, isLoggingOut, fetchInitialNotifications]);

  const emit = useCallback(
    (eventName, data) => {
      if (socket && socket.connected) {
        socket.emit(eventName, data);
      } else {
        console.warn(
          "Socket não está conectado. Não foi possível emitir o evento."
        );
      }
    },
    [socket]
  );

  const value = {
    socket,
    emit,
    isConnected,
    notifications,
    setNotifications,
    globalNotificationCount,
    setGlobalNotificationCount,
    fetchInitialNotifications,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
