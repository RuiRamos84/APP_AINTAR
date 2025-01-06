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
} from "../services/authService";
import {
  setupActivityTracking,
  resetLastActivity,
  resetTimers,
  setupHeartbeat,
} from "../services/activityTracker";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
} from "../components/common/Toaster/ThemedToaster";
import { updateDarkMode, updateVacationStatus } from "../services/userService";
import { connectSocket, disconnectSocket } from "../services/socketService";
import { startLogout, finishLogout, resetLogoutState } from "../services/api";
import Swal from "sweetalert2";
import config from "../config";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggedOutRef = useRef(false);
  const timersRef = useRef({});

  // const INACTIVITY_TIMEOUT = config.INACTIVITY_TIMEOUT;
  // const WARNING_TIMEOUT = config.WARNING_TIMEOUT;
  // const TOKEN_REFRESH_INTERVAL = config.TOKEN_REFRESH_INTERVAL;

  const clearAllIntervals = useCallback(() => {
    Object.values(timersRef.current).forEach(clearInterval);
    timersRef.current = {};
  }, []);

  const logoutUser = useCallback(
    async (silent = false) => {
      if (isLoggedOutRef.current) return;

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
        window.location.href = "/"; // Força o redirecionamento
        setIsLoggingOut(false);
        finishLogout();
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
        setUser((prevUser) => ({ ...prevUser, ...newTokens }));
        localStorage.setItem("user", JSON.stringify({ ...user, ...newTokens }));
        resetLastActivity();
        resetTimers();
        return newTokens;
      }
    } catch (error) {
      console.error("Erro ao atualizar o token:", error);
      await logoutUser(true);
    }
    return null;
  }, [logoutUser]);

  useEffect(() => {
    const handleSessionWarning = async () => {
      let timerInterval;
      const result = await Swal.fire({
        title: "Aviso de Inatividade",
        html: "Sua sessão irá expirar em <b></b> segundos.<br/><br/>Deseja continuar?",
        icon: "warning",
        timer: 5 * 60 * 1000, // 5 minutos para resposta do utilizador
        timerProgressBar: true,
        showCancelButton: true,
        confirmButtonText: "Continuar sessão",
        cancelButtonText: "Fazer logout",
        allowOutsideClick: false,
        didOpen: () => {
          timerInterval = setInterval(() => {
            const b = Swal.getHtmlContainer().querySelector("b");
            if (b) {
              b.textContent = (Swal.getTimerLeft() / 1000).toFixed(0);
            }
          }, 100);
        },
        willClose: () => {
          clearInterval(timerInterval);
        },
      });

      if (result.isConfirmed) {
        await refreshToken();
      } else if (result.dismiss === Swal.DismissReason.cancel || result.dismiss === Swal.DismissReason.timer) {
        await logoutUser(true);
      }
    };

    const handleSessionExpired = async () => {
      await Swal.fire({
        title: "Sessão Expirada",
        text: "Sua sessão expirou devido à inatividade.",
        icon: "info",
        confirmButtonText: "OK",
      });
      await logoutUser(true);
    };

    window.addEventListener("sessionWarning", handleSessionWarning);
    window.addEventListener("sessionExpired", handleSessionExpired);

    return () => {
      window.removeEventListener("sessionWarning", handleSessionWarning);
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, [refreshToken, logoutUser]);

  const loginUser = async (username, password) => {
    try {
      setIsLoading(true);
      resetLogoutState();
      const userData = await loginService(username, password);
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("lastActivityTime", Date.now().toString());
      setupActivityTracking();
      setupHeartbeat(refreshToken);
      resetTimers();
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
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setupActivityTracking();
        setupHeartbeat();
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

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
