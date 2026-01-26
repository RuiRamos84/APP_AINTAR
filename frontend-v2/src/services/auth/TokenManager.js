/**
 * TokenManager
 * Handles JWT token validation and refresh
 */

import apiClient from '@/services/api/client';

class TokenManager {
  constructor(authState) {
    this.authState = authState;
  }

  /**
   * Validate if token is still valid
   * Access tokens expire after 1 hour (backend: ACCESS_TOKEN_EXPIRES = 1 hour)
   */
  isTokenValid(token) {
    try {
      if (!token) return false;

      // Decode JWT payload (without verification - backend handles that)
      const payload = JSON.parse(atob(token.split('.')[1]));

      // Token expires at created_at + 1 hour (60 minutes)
      const expirationTime = payload.created_at * 1000 + (60 * 60 * 1000);
      return Date.now() < expirationTime;
    } catch (error) {
      console.error('[TokenManager] Error validating token:', error);
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {number} currentTime - Current timestamp
   * @returns {Promise<Object>} Updated user object with new tokens
   */
  async refreshToken(currentTime) {
    const currentUser = this.authState.getState().user;

    if (!currentUser?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      this.authState.setState({ isRefreshing: true });

      // Note: apiClient response interceptor returns response.data directly
      const responseData = await apiClient.post('/auth/refresh',
        { current_time: currentTime },
        {
          headers: {
            Authorization: `Bearer ${currentUser.refresh_token}`
          }
        }
      );

      const { access_token, refresh_token } = responseData;

      // Update user object with new tokens
      const updatedUser = {
        ...currentUser,
        access_token,
        refresh_token
      };

      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Update state
      this.authState.setState({
        user: updatedUser,
        isRefreshing: false
      });

      return updatedUser;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.authState.setState({ isRefreshing: false });
      throw error;
    }
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
