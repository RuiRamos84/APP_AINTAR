import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const { user, isLoggingOut } = useAuth();

  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!user || isLoggingOut) {
        console.log(
          "Usuário não logado ou logout em andamento, não buscando notificações"
        );
        return;
      }

      try {
        const response = await api.get("/notification");
        setNotifications(response.data.notifications || []);
      } catch (error) {
        if (!silent) {
          if (error.response && error.response.status === 401) {
            console.log(
              "Token inválido ou sessão expirada. Não buscar notificações."
            );
          } else {
            console.error("Erro ao buscar notificações:", error);
          }
        }
      }
    },
    [user, isLoggingOut]
  );

  useEffect(() => {
    if (user && !isLoggingOut) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user, isLoggingOut, fetchNotifications]);
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [...prev, notification]);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        fetchNotifications,
        addNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};
