/**
 * AuthManager
 * Main orchestrator for authentication system
 * Coordinates AuthState, TokenManager, SessionManager, and API interactions
 */

import apiClient from '@/services/api/client';
import { isSocketConnected } from '@/services/websocket/socketService';
import AuthState from './AuthState';
import TokenManager from './TokenManager';
import SessionManager from './SessionManager';

class AuthManager {
  constructor() {
    this.authState = new AuthState();
    this.tokenManager = new TokenManager(this.authState);
    this.sessionManager = new SessionManager(
      this.authState,
      this.tokenManager,
      () => this.logout(),           // logout callback
      () => this.sendHeartbeat()     // heartbeat callback
    );

    // Initialize on construction
    this.initialize();
  }

  /**
   * Initialize authentication state from localStorage
   */
  async initialize() {
    try {
      // Registar interceptors ANTES de qualquer chamada API.
      // O Axios constrói a cadeia de interceptors no momento do pedido —
      // se não estiverem registados, o GET /auth/me sai sem Authorization → 401.
      this.setupApiInterceptors();

      // Limpar catálogo de permissões legado (já não é usado — permissões chegam como strings do backend)
      localStorage.removeItem('permission_catalog');

      const storedUser = localStorage.getItem('user');

      if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        try {
          const user = JSON.parse(storedUser);

          if (user?.access_token) {
            this.authState.setState({ user, isLoading: true });
            this.sessionManager.start();

            if (!this.tokenManager.isTokenValid(user.access_token)) {
              this.tokenManager.refreshToken(Date.now())
                .then(() => {
                  this.authState.setState({ isLoading: false });
                })
                .catch(() => {
                  localStorage.removeItem('user');
                  this.authState.setState({ user: null, isLoading: false });
                });
            } else {
              apiClient.get('/auth/me')
                .then((data) => {
                  if (data?.interfaces !== undefined) {
                    const refreshedUser = {
                      ...user,
                      interfaces: data.interfaces,
                      ...(data.permissions !== undefined && { permissions: data.permissions }),
                    };
                    localStorage.setItem('user', JSON.stringify(refreshedUser));
                    this.authState.setState({ user: refreshedUser, isLoading: false });
                  } else {
                    this.authState.setState({ isLoading: false });
                  }
                })
                .catch(() => {
                  this.authState.setState({ isLoading: false });
                });
            }
          } else {
            localStorage.removeItem('user');
            this.authState.setState({ user: null, isLoading: false });
          }
        } catch {
          localStorage.removeItem('user');
          this.authState.setState({ user: null, isLoading: false });
        }
      } else {
        if (storedUser) localStorage.removeItem('user');
        this.authState.setState({ isLoading: false });
      }

    } catch (error) {
      localStorage.removeItem('user');
      this.authState.setState({ user: null, isLoading: false });
    }
  }

  /**
   * Setup API interceptors for authentication
   */
  setupApiInterceptors() {
    // Eject any previously registered interceptors (prevents HMR duplication)
    if (apiClient._authRequestInterceptorId != null) {
      apiClient.interceptors.request.eject(apiClient._authRequestInterceptorId);
    }
    if (apiClient._authResponseInterceptorId != null) {
      apiClient.interceptors.response.eject(apiClient._authResponseInterceptorId);
    }

    // Request interceptor - add auth token
    apiClient._authRequestInterceptorId = apiClient.interceptors.request.use(
      (config) => {
        // Check if logout is in progress
        if (this.authState.getState().isLoggingOut) {
          return Promise.reject(new Error('Logout in progress'));
        }

        // Add authorization header
        const user = this.authState.getState().user;
        if (user?.access_token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${user.access_token}`;
        }

        // Update activity on each request
        if (user) {
          this.sessionManager.updateActivity();
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle 401 and refresh token
    apiClient._authResponseInterceptorId = apiClient.interceptors.response.use(
      (response) => response.data,
      async (error) => {
        const originalRequest = error.config;

        // Manutenção activa: qualquer 503 recarrega a página actual — o nginx
        // tem, em cada location, "if (-f maintenance.flag) return 503" +
        // error_page 503 @maintenance, que substitui o conteúdo pela página
        // de manutenção mantendo o mesmo URL (internal — nunca navegar para
        // "/maintenance.html" directamente, esse location está marcado
        // internal e não resolve para o ficheiro real fora deste mecanismo).
        // Cobre heartbeat periódico, refetches do React Query e qualquer
        // acção do utilizador, sem esperar por um refresh manual.
        if (error.response?.status === 503) {
          window.location.reload();
          return new Promise(() => {});
        }

        // Handle 401 Unauthorized — but NOT for auth endpoints (login, etc.)
        const isAuthEndpoint = originalRequest?.url?.includes('/auth/');
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const newTokens = await this.tokenManager.refreshToken(Date.now());

            // Update request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;

            // Retry original request
            return apiClient(originalRequest);
          } catch (refreshError) {
            sessionStorage.setItem('session_expired', 'true');
            await this.logout();
            return Promise.reject(refreshError);
          }
        }

        // Extract backend error message if available (backend uses 'error' field)
        const backendMessage = error.response?.data?.error;
        if (backendMessage) {
          const enrichedError = new Error(backendMessage);
          enrichedError.response = error.response;
          enrichedError.status = error.response?.status;
          return Promise.reject(enrichedError);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Login user
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>} User object
   */
  async login(username, password) {
    try {
      const user = await apiClient.post('/auth/login', { username, password });

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('lastActivityTime', Date.now().toString());

      this.authState.setState({ user, isLoading: false });
      this.sessionManager.start();

      return user;
    } catch (error) {
      // error.message is already enriched by the response interceptor (backend 'error' field)
      throw new Error(error.message || error.response?.data?.error || 'Erro ao fazer login');
    }
  }

  /**
   * Logout user and completely invalidate all session data
   */
  async logout() {
    try {
      this.authState.setState({ isLoggingOut: true });
      this.sessionManager.stop();

      // Call logout endpoint (best effort)
      const user = this.authState.getState().user;
      if (user?.access_token) {
        apiClient.post('/auth/logout', null, {
          headers: { Authorization: `Bearer ${user.access_token}` }
        }).catch(() => {}); // Ignore errors
      }

      localStorage.clear();
      sessionStorage.clear();

      this.authState.setState({
        user: null,
        isLoggingOut: false,
        isLoading: false,
        isRefreshing: false,
        lastActivity: Date.now(),
        timers: { inactivity: null, warning: null, refresh: null, heartbeat: null }
      });
    } catch (error) {
      localStorage.clear();
      sessionStorage.clear();
      this.authState.setState({
        user: null,
        isLoggingOut: false,
        isLoading: false,
        isRefreshing: false,
        lastActivity: Date.now(),
        timers: { inactivity: null, warning: null, refresh: null, heartbeat: null }
      });
    }
  }

  /**
   * Send heartbeat to keep session alive.
   * Skips HTTP call when Socket.IO is connected (socket heartbeat handles it).
   */
  async sendHeartbeat() {
    if (isSocketConnected()) return; // socket heartbeat already running
    try {
      await apiClient.post('/auth/heartbeat');
    } catch {
      // Silently ignore — não crítico
    }
  }

  /**
   * Toggle dark mode preference
   */
  async toggleDarkMode() {
    const user = this.authState.getState().user;
    if (!user) return;

    const updatedUser = {
      ...user,
      dark_mode: !user.dark_mode
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    this.authState.setState({ user: updatedUser });

    // Optionally sync with backend
    try {
      await apiClient.patch('/auth/preferences', {
        dark_mode: updatedUser.dark_mode
      });
    } catch (error) {
      console.error('Error updating dark mode:', error);
    }
  }

  /**
   * Toggle vacation status
   */
  async toggleVacationStatus() {
    const user = this.authState.getState().user;
    if (!user) return;

    const updatedUser = {
      ...user,
      vacation: !user.vacation
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    this.authState.setState({ user: updatedUser });

    // Sync with backend
    try {
      await apiClient.patch('/auth/preferences', {
        vacation: updatedUser.vacation
      });
    } catch (error) {
      console.error('Error updating vacation status:', error);
    }
  }

  /**
   * Subscribe to auth state changes
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    return this.authState.subscribe(listener);
  }

  /**
   * Get current user
   */
  getUser() {
    return this.authState.getState().user;
  }

  /**
   * Check if loading
   */
  isLoading() {
    return this.authState.getState().isLoading;
  }

  /**
   * Check if logging out
   */
  isLoggingOut() {
    return this.authState.getState().isLoggingOut;
  }
}

// Export singleton instance
export const authManager = new AuthManager();
export default authManager;
