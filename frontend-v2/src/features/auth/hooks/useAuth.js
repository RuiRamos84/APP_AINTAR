/**
 * useAuth Hook
 * Hook personalizado para gestão de autenticação
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/store/authStore';
import * as authService from '@/services/auth/authService';

export const useAuth = () => {
  const navigate = useNavigate();

  // Estado do store
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  // Ações do store
  const loginStore = useAuthStore((state) => state.login);
  const logoutStore = useAuthStore((state) => state.logout);
  const setLoading = useAuthStore((state) => state.setLoading);
  const updateUser = useAuthStore((state) => state.updateUser);

  // Seletores do store
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasRole = useAuthStore((state) => state.hasRole);
  const getUserName = useAuthStore((state) => state.getUserName);

  /**
   * Realiza login
   */
  const login = useCallback(
    async (credentials) => {
      try {
        setLoading(true);
        const data = await authService.login(credentials);

        // Guardar token
        authService.setAuthToken(data.token);

        // Atualizar store
        loginStore(data.user, data.token, data.refreshToken);

        // Redirecionar para dashboard
        navigate('/dashboard');

        return { success: true, data };
      } catch (error) {
        console.error('Erro ao fazer login:', error);
        return {
          success: false,
          error: error.response?.data?.message || 'Erro ao fazer login',
        };
      } finally {
        setLoading(false);
      }
    },
    [loginStore, setLoading, navigate]
  );

  /**
   * Realiza registo
   */
  const register = useCallback(
    async (userData) => {
      try {
        setLoading(true);
        const data = await authService.register(userData);

        // Guardar token (se o backend devolver logo o token)
        if (data.token) {
          authService.setAuthToken(data.token);
          loginStore(data.user, data.token, data.refreshToken);
          navigate('/dashboard');
        } else {
          // Se não, redirecionar para login
          navigate('/login');
        }

        return { success: true, data };
      } catch (error) {
        console.error('Erro ao fazer registo:', error);
        return {
          success: false,
          error: error.response?.data?.message || 'Erro ao fazer registo',
        };
      } finally {
        setLoading(false);
      }
    },
    [loginStore, setLoading, navigate]
  );

  /**
   * Realiza logout
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Limpar token e store
      authService.removeAuthToken();
      logoutStore();
      setLoading(false);

      // Redirecionar para login
      navigate('/login');
    }
  }, [logoutStore, setLoading, navigate]);

  /**
   * Carrega dados do utilizador atual
   */
  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const data = await authService.getCurrentUser();
      updateUser(data);
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao carregar utilizador:', error);
      // Se falhar, fazer logout
      authService.removeAuthToken();
      logoutStore();
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [updateUser, logoutStore, setLoading]);

  return {
    // Estado
    user,
    isAuthenticated,
    isLoading,

    // Ações
    login,
    register,
    logout,
    loadUser,

    // Seletores
    hasPermission,
    hasRole,
    getUserName,
  };
};
