/**
 * AuthContext
 * React context for authentication state distribution
 * Wraps AuthManager and provides hooks for components
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import authManager from '@/services/auth/AuthManager';
import permissionService from '@/services/permissionService';

const AuthContext = createContext(null);

// Páginas públicas que não requerem autenticação
const PUBLIC_PATHS = ['/', '/login', '/register', '/about', '/contact'];

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const previousUserRef = useRef(null);

  // Subscribe to AuthManager state changes
  useEffect(() => {
    // Initial sync - do this BEFORE subscribing to prevent duplicate updates
    const initialState = authManager.authState.getState();
    setUser(initialState.user);
    setIsLoading(initialState.isLoading);
    setIsLoggingOut(initialState.isLoggingOut);
    previousUserRef.current = initialState.user;

    if (initialState.user) {
      permissionService.setUser(initialState.user);
    }

    // Subscribe to future changes
    const unsubscribe = authManager.subscribe((authState) => {
      setUser(authState.user);
      setIsLoading(authState.isLoading);
      setIsLoggingOut(authState.isLoggingOut);

      // Update permission service
      if (authState.user) {
        permissionService.setUser(authState.user);
      } else {
        permissionService.clearUser();
      }

      // Track previous user state
      previousUserRef.current = authState.user;
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Auto-redirect to login when session expires
   * Monitora quando o user muda de autenticado para não autenticado
   */
  useEffect(() => {
    // Skip if still loading or if user is logging out manually
    if (isLoading || isLoggingOut) {
      return;
    }

    // Skip if in public path
    if (PUBLIC_PATHS.includes(location.pathname)) {
      return;
    }

    // User just logged out (was authenticated, now is not)
    const wasAuthenticated = previousUserRef.current !== null;
    const isNowAuthenticated = user !== null;

    if (wasAuthenticated && !isNowAuthenticated) {
      // Check if session expired
      const sessionExpired = sessionStorage.getItem('session_expired');

      if (sessionExpired) {
        // Clear the flag
        sessionStorage.removeItem('session_expired');

        // Redirect to login with session expired message
        navigate('/login', {
          replace: true,
          state: { sessionExpired: true, from: location.pathname }
        });
      }
    }
  }, [user, isLoading, isLoggingOut, location.pathname, navigate]);

  /**
   * Login user
   */
  const loginUser = useCallback(async (username, password) => {
    try {
      const userData = await authManager.login(username, password);

      // Check for temporary password (starts with xP!tO)
      if (password.startsWith('xP!tO')) {
        navigate('/change-password');
      } else {
        navigate('/home');
      }

      return userData;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AuthContext] Login error:', error);
      }
      throw error;
    }
  }, [navigate]);

  /**
   * Logout user and redirect
   * Vai para /login se sessão expirou, ou para / (home) se foi logout manual
   * Always redirects, even if logout fails
   */
  const logoutUser = useCallback(async () => {
    try {
      await authManager.logout();

      // Limpar cache de metadata ao fazer logout
      queryClient.removeQueries({ queryKey: ['metadata'] });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AuthContext] Logout error:', error);
      }
    } finally {
      // Verificar se foi por expiração de sessão
      const sessionExpired = sessionStorage.getItem('session_expired');

      if (sessionExpired) {
        // Sessão expirou - ir para login com mensagem
        navigate('/login', { replace: true, state: { sessionExpired: true } });
      } else {
        // Logout manual - ir para home
        navigate('/', { replace: true });
      }
    }
  }, [navigate, queryClient]);

  /**
   * Refresh token manually
   */
  const refreshToken = useCallback(async (currentTime) => {
    return authManager.tokenManager.refreshToken(currentTime);
  }, []);

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = useCallback(async () => {
    await authManager.toggleDarkMode();
  }, []);

  /**
   * Toggle vacation status
   */
  const toggleVacationStatus = useCallback(async () => {
    await authManager.toggleVacationStatus();
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    isLoggingOut,
    loginUser,
    logoutUser,
    refreshToken,
    toggleDarkMode,
    toggleVacationStatus,
  }), [user, isLoading, isLoggingOut, loginUser, logoutUser, refreshToken, toggleDarkMode, toggleVacationStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default AuthContext;
