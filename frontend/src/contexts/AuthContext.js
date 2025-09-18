// src/contexts/AuthContext.js - VERSÃO MIGRADA
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { authManager } from "../services/auth/AuthManager";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
} from "../components/common/Toaster/ThemedToaster";
import { updateDarkMode, updateVacationStatus } from "../services/userService";
import { connectSocket, disconnectSocket } from "../services/socketService";
import permissionService from "../services/permissionService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggedOutRef = useRef(false);

  // Subscribe ao AuthManager
  useEffect(() => {
    const unsubscribe = authManager.subscribe((authState) => {
      setUser(authState.user);
      setIsLoading(authState.isLoading);
      setIsLoggingOut(authState.isLoggingOut);

      // ADICIONAR ESTAS LINHAS
      if (authState.user) {
        permissionService.setUser(authState.user);
      } else {
        permissionService.clearLocalState();
      }

      // Socket já existente...
      if (authState.user && !isLoggedOutRef.current) {
        connectSocket(authState.user.user_id).catch(console.error);
      }
    });

    // Estado inicial - ADICIONAR TAMBÉM AQUI
    const initialUser = authManager.getUser();
    setUser(initialUser);
    if (initialUser) {
      permissionService.setUser(initialUser);
    }

    setIsLoading(authManager.isLoading());
    setIsLoggingOut(authManager.isLoggingOut());

    return unsubscribe;
  }, []);

  const loginUser = useCallback(async (username, password) => {
    try {
      isLoggedOutRef.current = false;
      const userData = await authManager.login(username, password);
      await connectSocket(userData.user_id);
      return userData;
    } catch (error) {
      throw error;
    }
  }, []);

  const logoutUser = useCallback(async (silent = false) => {
    if (isLoggedOutRef.current) return;

    try {
      isLoggedOutRef.current = true;
      await disconnectSocket();
      await authManager.logout();
    } catch (error) {
      console.error("Erro durante logout:", error);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    if (isLoggedOutRef.current) return null;

    try {
      return await authManager.tokenManager.refreshToken(Date.now());
    } catch (error) {
      await logoutUser(true);
      return null;
    }
  }, [logoutUser]);

  const toggleDarkMode = useCallback(async () => {
    if (!user) return;
    try {
      const updatedUser = await updateDarkMode(user.user_id, !user.dark_mode);
      // Actualizar no AuthManager também
      const currentUser = authManager.getUser();
      const newUser = { ...currentUser, ...updatedUser };
      localStorage.setItem("user", JSON.stringify(newUser));
      authManager.authState.setState({ user: newUser });
      return updatedUser;
    } catch (error) {
      console.error("Erro ao alterar modo escuro:", error);
      throw error;
    }
  }, [user]);

  const toggleVacationStatus = useCallback(async () => {
    if (!user) return;
    try {
      const updatedUser = await updateVacationStatus(user.user_id, !user.vacation);
      // Actualizar no AuthManager também
      const currentUser = authManager.getUser();
      const newUser = { ...currentUser, ...updatedUser };
      localStorage.setItem("user", JSON.stringify(newUser));
      authManager.authState.setState({ user: newUser });
      return updatedUser;
    } catch (error) {
      console.error("Erro ao alterar status de férias:", error);
      throw error;
    }
  }, [user]);

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