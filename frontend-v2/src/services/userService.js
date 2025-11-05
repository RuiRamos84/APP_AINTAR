/**
 * User Service
 * Handles user profile and settings operations
 */

import apiClient from './api/client';

/**
 * Get current user's full profile information
 * @returns {Promise<Object>} User profile data
 */
export const getUserInfo = async () => {
  try {
    // apiClient já retorna response.data via interceptor
    const data = await apiClient.get('/user/user_info');
    return data;
  } catch (error) {
    console.error('[userService] Error fetching user info:', error);
    throw error;
  }
};

/**
 * Update current user's profile information
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserInfo = async (userData) => {
  try {
    const data = await apiClient.put('/user/user_info', userData);
    return data;
  } catch (error) {
    console.error('[userService] Error updating user info:', error);
    throw error;
  }
};

/**
 * Change user password
 * @param {Object} passwordData - Old and new password
 * @param {string} passwordData.old_password - Current password
 * @param {string} passwordData.new_password - New password
 * @returns {Promise<Object>} Response data
 */
export const changePassword = async (passwordData) => {
  try {
    const response = await apiClient.put('/user/change_password', passwordData);
    return response;
  } catch (error) {
    console.error('[userService] Error changing password:', error);
    throw error;
  }
};

/**
 * Request password recovery
 * @param {string} email - User email
 * @returns {Promise<Object>} Response data
 */
export const passwordRecovery = async (email) => {
  try {
    const response = await apiClient.post('/user/password_recovery', { email });
    return response;
  } catch (error) {
    console.error('[userService] Error recovering password:', error);
    throw error;
  }
};

/**
 * Reset password with token
 * @param {Object} resetData - Reset token and new password
 * @returns {Promise<Object>} Response data
 */
export const resetPassword = async (resetData) => {
  try {
    const response = await apiClient.post('/user/reset_password', resetData);
    return response;
  } catch (error) {
    console.error('[userService] Error resetting password:', error);
    throw error;
  }
};

/**
 * Update dark mode preference
 * @param {number} userId - User ID
 * @param {boolean} darkMode - Dark mode enabled
 * @returns {Promise<Object>} Updated user data
 */
export const updateDarkMode = async (userId, darkMode) => {
  try {
    const response = await apiClient.post('/auth/update_dark_mode', {
      user_id: userId,
      dark_mode: darkMode ? 1 : 0,
    });
    return response;
  } catch (error) {
    console.error('[userService] Error updating dark mode:', error);
    throw error;
  }
};

/**
 * Update vacation status
 * @param {number} userId - User ID
 * @param {boolean} status - Vacation status
 * @returns {Promise<Object>} Updated user data
 */
export const updateVacationStatus = async (userId, status) => {
  try {
    const response = await apiClient.post('/user/vacation_status', {
      user_id: userId,
      vacation: status ? 1 : 0,
    });
    return response;
  } catch (error) {
    console.error('[userService] Error updating vacation status:', error);
    throw error;
  }
};

/**
 * Create new user (external registration)
 * @param {Object} userData - New user data
 * @returns {Promise<Object>} Created user data
 */
export const createUser = async (userData) => {
  try {
    const response = await apiClient.post('/user/create_user_ext', userData);
    return response;
  } catch (error) {
    console.error('[userService] Error creating user:', error);
    if (error.response?.data) {
      throw new Error(error.response.data.erro || error.response.data.error || 'Error creating user');
    }
    throw error;
  }
};

/**
 * Activate user account
 * @param {string|number} id - User ID
 * @param {string} activation_code - Activation code
 * @returns {Promise<Object>} Activation result
 */
export const activateUser = async (id, activation_code) => {
  try {
    const response = await apiClient.get(`/user/activation/${id}/${activation_code}`);
    return response;
  } catch (error) {
    console.error('[userService] Error activating user:', error);
    throw error;
  }
};
