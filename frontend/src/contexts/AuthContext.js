import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  login as loginService,
  logout as logoutService,
  refreshToken as refreshTokenService,
  decodeToken,
  checkTokenValidity,
} from "../services/authService";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
} from "../components/common/Toaster/ThemedToaster";
import { updateDarkMode, updateVacationStatus } from "../services/userService";
import { connectSocket, disconnectSocket } from "../services/socketService";
import { startLogout, finishLogout, resetLogoutState } from "../services/api";
import { sessionService } from '../services/SessionService';
import Swal from "sweetalert2";
import config from "../config";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggedOutRef = useRef(false);
  const timersRef = useRef({});

  const clearAllIntervals = useCallback(() => {
    Object.values(timersRef.current).forEach(clearInterval);
    timersRef.current = {};
  }, []);

  const logoutUser = useCallback(
    async (silent = false) => {
      if (isLoggedOutRef.current) {
        window.location.href = "/";
        return;
      }

      setIsLoggingOut(true);
      try {
        startLogout();
        await logoutService();
        await disconnectSocket();
        setUser(null);
        clearAllIntervals();
        localStorage.clear();
        isLoggedOutRef.current = true;
      } catch (error) {
        console.error("Erro durante o logout:", error);
      } finally {
        setIsLoggingOut(false);
        finishLogout();
        window.location.href = "/";
      }
    },
    [clearAllIntervals]
  );

  const refreshToken = useCallback(async () => {
    if (isLoggedOutRef.current) return null;
    try {
      const currentTime = Date.now();
      const newTokens = await refreshTokenService(currentTime);
      if (newTokens) {
        setUser(prevUser => ({ ...prevUser, ...newTokens }));
        localStorage.setItem("user", JSON.stringify(newTokens));
        return newTokens;
      }
    } catch (error) {
      console.error("Erro ao atualizar o token:", error);
      await logoutUser(true);
    }
    return null;
  }, [logoutUser]);

  const loginUser = async (username, password) => {
    try {
      setIsLoading(true);
      resetLogoutState();
      const userData = await loginService(username, password);
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("Usuário logado:", userData);
      localStorage.setItem("lastActivityTime", Date.now().toString());
      await connectSocket(userData.user_id);
      return userData;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = useCallback(async () => {
    if (!user) return;
    try {
      const updatedUser = await updateDarkMode(user.user_id, !user.dark_mode);
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error("Erro ao alterar o modo escuro:", error);
      throw error;
    }
  }, [user]);

  const toggleVacationStatus = useCallback(async () => {
    if (!user) return;
    try {
      const updatedUser = await updateVacationStatus(
        user.user_id,
        !user.vacation
      );
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error("Erro ao alterar o status de férias:", error);
      throw error;
    }
  }, [user]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          setIsLoading(false);
          return;
        }

        const userData = JSON.parse(storedUser);
        if (!checkTokenValidity(userData.access_token)) {
          const newTokens = await refreshToken(Date.now());
          if (!newTokens) {
            await logoutUser(true);
            return;
          }
          userData.access_token = newTokens.access_token;
          userData.refresh_token = newTokens.refresh_token;
        }

        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        sessionService.initialize(
          () => refreshToken(),
          () => logoutUser(true)
        );
      } catch (error) {
        await logoutUser(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [refreshToken, logoutUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggingOut,
        loginUser,
        logoutUser,
        refreshToken,
        toggleDarkMode,
        toggleVacationStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
