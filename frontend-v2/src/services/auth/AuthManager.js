/**
 * AuthManager
 * Main orchestrator for authentication system
 * Coordinates AuthState, TokenManager, SessionManager, and API interactions
 */

import apiClient from '@/services/api/client';
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
      const storedUser = localStorage.getItem('user');

      if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        try {
          const user = JSON.parse(storedUser);

          if (user?.access_token) {
            // Carregar imediatamente, verificar token depois
            this.authState.setState({ user, isLoading: false });
            this.sessionManager.start();

            // Verificar token em background (não bloqueia)
            if (!this.tokenManager.isTokenValid(user.access_token)) {
              // Token expirado - tentar refresh em background
              this.tokenManager.refreshToken(Date.now())
                .catch(() => {
                  // Falhou - limpar sessão
                  localStorage.removeItem('user');
                  this.authState.setState({ user: null });
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

      this.setupApiInterceptors();
    } catch (error) {
      localStorage.removeItem('user');
      this.authState.setState({ user: null, isLoading: false });
    }
  }

  /**
   * Setup API interceptors for authentication
   */
  setupApiInterceptors() {
    // Request interceptor - add auth token
    apiClient.interceptors.request.use(
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
    apiClient.interceptors.response.use(
      (response) => response.data,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const newTokens = await this.tokenManager.refreshToken(Date.now());

            // Update request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;

            // Retry original request
            return apiClient(originalRequest);
          } catch (refreshError) {
            // Refresh failed - mark session as expired and logout user
            console.error('Token refresh failed:', refreshError);
            sessionStorage.setItem('session_expired', 'true');
            await this.logout();
            return Promise.reject(refreshError);
          }
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
      throw new Error(error.response?.data?.message || 'Erro ao fazer login');
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
   * Send heartbeat to keep session alive
   */
  async sendHeartbeat() {
    try {
      await apiClient.post('/auth/heartbeat');
    } catch (error) {
      console.error('Heartbeat error:', error);
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
