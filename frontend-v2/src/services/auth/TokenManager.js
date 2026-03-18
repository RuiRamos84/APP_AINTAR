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
