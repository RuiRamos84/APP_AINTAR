/**
 * TokenManager
 * Handles JWT token validation and refresh
 */

import apiClient from '@/services/api/client';

class TokenManager {
  constructor(authState) {
    this.authState = authState;
    this._refreshPromise = null; // dedupe de chamadas concorrentes
  }

  /**
   * Validate if token is still valid using the standard JWT `exp` claim.
   * Backend is the single source of truth for token lifetime.
   */
  isTokenValid(token) {
    try {
      if (!token) return false;

      // Decode JWT payload (without verification — backend handles signature)
      const payload = JSON.parse(atob(token.split('.')[1]));

      // `exp` is a standard JWT claim: Unix timestamp (seconds) of expiration
      if (!payload?.exp) return false;
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {number} currentTime - Current timestamp
   * @returns {Promise<Object>} Updated user object with new tokens
   */
  async refreshToken(currentTime) {
    // Refresh já em curso: todas as chamadas concorrentes esperam pelo MESMO
    // resultado em vez de disparar um novo POST /auth/refresh cada uma. Sem
    // isto, várias respostas 401 quase simultâneas (ex.: várias queries React
    // Query a pedir dados no arranque da página, todas com o access token já
    // expirado) causam uma rajada de refreshes — visto em produção: 5 POSTs
    // em <70ms para a mesma sessão. A rota tem rate-limit de 5/min POR IP;
    // numa rede partilhada (ex. edifício municipal), isto pode esgotar a
    // quota de outros utilizadores atrás do mesmo IP e causar-lhes logout.
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    const currentUser = this.authState.getState().user;

    if (!currentUser?.refresh_token) {
      throw new Error('No refresh token available');
    }

    this._refreshPromise = (async () => {
      try {
        this.authState.setState({ isRefreshing: true });

        // Note: apiClient response interceptor returns response.data directly
        const responseData = await apiClient.post(
          '/auth/refresh',
          { current_time: currentTime },
          {
            headers: {
              Authorization: `Bearer ${currentUser.refresh_token}`,
            },
          }
        );

        const { access_token, refresh_token, interfaces, permissions } = responseData;

        // Actualizar user com novos tokens + interfaces/permissions frescos do backend
        const updatedUser = {
          ...currentUser,
          access_token,
          refresh_token,
          ...(interfaces !== undefined && { interfaces }),
          ...(permissions !== undefined && { permissions }),
        };

        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Update state
        this.authState.setState({
          user: updatedUser,
          isRefreshing: false,
        });

        return updatedUser;
      } catch (error) {
        this.authState.setState({ isRefreshing: false });
        throw error;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  }

  /**
   * Get current access token
   */
  getAccessToken() {
    return this.authState.getState().user?.access_token;
  }

  /**
   * Get current refresh token
   */
  getRefreshToken() {
    return this.authState.getState().user?.refresh_token;
  }
}

export default TokenManager;
