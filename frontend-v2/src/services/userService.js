/**
 * User Service
 * Comprehensive service for user profile, settings, and CRUD operations
 *
 * Features:
 * - User profile management (CRUD)
 * - Password management (change, recovery, reset)
 * - Settings (dark mode, vacation status)
 * - User activation
 * - Admin operations (list, create, update, delete users)
 *
 * All methods return promises that resolve with the response data
 * or reject with the error object
 */

import apiClient from './api/client';
import {
  userProfileSchema,
  changePasswordSchema,
  userProfileRequiredSchema
} from '@/features/auth/schemas';

// =============================================================================
// PROFILE OPERATIONS - Current User
// =============================================================================

/**
 * Get current user's full profile information
 *
 * @returns {Promise<Object>} User profile data
 * @throws {Error} If request fails
 *
 * @example
 * const userInfo = await getUserInfo();
 * console.log(userInfo.name, userInfo.email);
 */
export const getUserInfo = async () => {
  try {
    // apiClient já retorna response.data via interceptor
    const data = await apiClient.get('/user/user_info');
    return data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error fetching user info:', error);
    }
    throw error;
  }
};

/**
 * Update current user's profile information
 * Validates data with Zod schema before sending to API
 *
 * @param {Object} userData - Updated user data
 * @param {string} userData.name - Full name (required)
 * @param {string} userData.email - Email address (required)
 * @param {string} userData.address - Street address (required)
 * @param {string} [userData.phone] - Phone number (optional)
 * @param {string} [userData.nipc] - Tax number (optional)
 * @param {string} [userData.postal] - Postal code (optional)
 * @param {boolean} [validateSchema=true] - Whether to validate with Zod schema
 * @returns {Promise<Object>} Updated user data
 * @throws {Error} If validation fails or request fails
 *
 * @example
 * const updated = await updateUserInfo({
 *   name: 'João Silva',
 *   email: 'joao@example.com',
 *   address: 'Rua Principal, 123',
 *   phone: '912345678'
 * });
 */
export const updateUserInfo = async (userData, validateSchema = true) => {
  try {
    // Validar dados com Zod se solicitado
    if (validateSchema) {
      try {
        // Validar apenas os campos obrigatórios se for uma atualização parcial
        // ou todos os campos se for uma atualização completa
        const hasAllFields = userData.name && userData.email && userData.address;

        if (hasAllFields) {
          userProfileSchema.parse(userData);
        } else {
          userProfileRequiredSchema.parse(userData);
        }
      } catch (validationError) {
        if (import.meta.env.DEV) {
          console.error('[userService] Validation error:', validationError);
        }
        // ZodError usa 'issues', não 'errors'
        throw new Error(
          validationError.issues?.[0]?.message || 'Dados de perfil inválidos'
        );
      }
    }

    const data = await apiClient.put('/user/user_info', userData);
    return data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error updating user info:', error);
    }
    throw error;
  }
};

// =============================================================================
// PASSWORD MANAGEMENT
// =============================================================================

/**
 * Change user password
 * Validates password data with Zod schema before sending to API
 *
 * @param {Object} passwordData - Password change data
 * @param {string} passwordData.oldPassword - Current password
 * @param {string} passwordData.newPassword - New password (must meet strength requirements)
 * @param {string} passwordData.confirmPassword - Confirm new password (must match newPassword)
 * @param {boolean} [validateSchema=true] - Whether to validate with Zod schema
 * @returns {Promise<Object>} Response data
 * @throws {Error} If validation fails or request fails
 *
 * @example
 * await changePassword({
 *   oldPassword: 'current123',
 *   newPassword: 'NewSecure@2024',
 *   confirmPassword: 'NewSecure@2024'
 * });
 */
export const changePassword = async (passwordData, validateSchema = true) => {
  try {
    // Validar dados com Zod se solicitado
    if (validateSchema) {
      try {
        changePasswordSchema.parse(passwordData);
      } catch (validationError) {
        if (import.meta.env.DEV) {
          console.error('[userService] Password validation error:', validationError);
        }
        // ZodError usa 'issues', não 'errors'
        throw new Error(
          validationError.issues?.[0]?.message || 'Dados de password inválidos'
        );
      }
    }

    // Converter para o formato esperado pela API (old_password, new_password)
    const apiData = {
      old_password: passwordData.oldPassword,
      new_password: passwordData.newPassword,
    };

    const response = await apiClient.put('/user/change_password', apiData);
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error changing password:', error);
    }
    throw error;
  }
};

/**
 * Request password recovery
 * Sends a password recovery email with reset token
 *
 * @param {string} email - User email
 * @returns {Promise<Object>} Response data
 * @throws {Error} If request fails
 *
 * @example
 * await passwordRecovery('user@example.com');
 */
export const passwordRecovery = async (email) => {
  try {
    const response = await apiClient.post('/user/password_recovery', { email });
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error recovering password:', error);
    }
    throw error;
  }
};

/**
 * Reset password with token
 * Resets user password using recovery token
 *
 * @param {Object} resetData - Reset token and new password
 * @param {string} resetData.token - Reset token received by email
 * @param {string} resetData.new_password - New password
 * @returns {Promise<Object>} Response data
 * @throws {Error} If request fails
 *
 * @example
 * await resetPassword({
 *   token: 'abc123...',
 *   new_password: 'NewSecure@2024'
 * });
 */
export const resetPassword = async (resetData) => {
  try {
    const response = await apiClient.post('/user/reset_password', resetData);
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error resetting password:', error);
    }
    throw error;
  }
};

// =============================================================================
// SETTINGS & PREFERENCES
// =============================================================================

/**
 * Update dark mode preference
 *
 * @param {number} userId - User ID
 * @param {boolean} darkMode - Dark mode enabled
 * @returns {Promise<Object>} Updated user data
 * @throws {Error} If request fails
 *
 * @example
 * await updateDarkMode(12, true);
 */
export const updateDarkMode = async (userId, darkMode) => {
  try {
    const response = await apiClient.post('/auth/update_dark_mode', {
      user_id: userId,
      dark_mode: darkMode ? 1 : 0,
    });
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error updating dark mode:', error);
    }
    throw error;
  }
};

/**
 * Update vacation status
 *
 * @param {number} userId - User ID
 * @param {boolean} status - Vacation status
 * @returns {Promise<Object>} Updated user data
 * @throws {Error} If request fails
 *
 * @example
 * await updateVacationStatus(12, true);
 */
export const updateVacationStatus = async (userId, status) => {
  try {
    const response = await apiClient.post('/user/vacation_status', {
      user_id: userId,
      vacation: status ? 1 : 0,
    });
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error updating vacation status:', error);
    }
    throw error;
  }
};

// =============================================================================
// USER REGISTRATION & ACTIVATION
// =============================================================================

/**
 * Create new user (external registration)
 * Creates a new user account without admin privileges
 *
 * @param {Object} userData - New user data
 * @param {string} userData.username - Username
 * @param {string} userData.email - Email address
 * @param {string} userData.password - Password
 * @param {string} userData.name - Full name
 * @returns {Promise<Object>} Created user data
 * @throws {Error} If request fails
 *
 * @example
 * const newUser = await createUser({
 *   username: 'joao.silva',
 *   email: 'joao@example.com',
 *   password: 'Secure@123',
 *   name: 'João Silva'
 * });
 */
export const createUser = async (userData) => {
  try {
    const response = await apiClient.post('/user/create_user_ext', userData);
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error creating user:', error);
    }
    if (error.response?.data) {
      throw new Error(error.response.data.erro || error.response.data.error || 'Error creating user');
    }
    throw error;
  }
};

/**
 * Activate user account
 * Activates a user account using activation code sent by email
 *
 * @param {string|number} id - User ID
 * @param {string} activation_code - Activation code
 * @returns {Promise<Object>} Activation result
 * @throws {Error} If request fails
 *
 * @example
 * const result = await activateUser(123, 'abc123xyz');
 */
export const activateUser = async (id, activation_code) => {
  try {
    const response = await apiClient.get(`/user/activation/${id}/${activation_code}`);
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error activating user:', error);
    }
    throw error;
  }
};

// =============================================================================
// ADMIN OPERATIONS - User Management (CRUD)
// =============================================================================

/**
 * List all users (Admin only)
 * Retrieves a paginated list of all users in the system
 *
 * @param {Object} [params] - Query parameters
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=20] - Items per page
 * @param {string} [params.search] - Search term (username, name, email)
 * @param {string} [params.sortBy='user_id'] - Sort field
 * @param {string} [params.sortOrder='asc'] - Sort order (asc/desc)
 * @returns {Promise<Object>} Users list with pagination
 * @throws {Error} If request fails or user is not admin
 *
 * @example
 * const users = await listUsers({ page: 1, limit: 20, search: 'joão' });
 */
export const listUsers = async (params = {}) => {
  try {
    const response = await apiClient.get('/user/admin/users', { params });
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error listing users:', error);
    }
    throw error;
  }
};

/**
 * Get user by ID (Admin only)
 * Retrieves detailed information about a specific user
 *
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User data
 * @throws {Error} If request fails or user is not admin
 *
 * @example
 * const user = await getUserById(123);
 */
export const getUserById = async (userId) => {
  try {
    const response = await apiClient.get(`/user/admin/users/${userId}`);
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error getting user by ID:', error);
    }
    throw error;
  }
};

/**
 * Create new user (Admin only)
 * Creates a new user account with specified permissions
 *
 * @param {Object} userData - New user data
 * @param {string} userData.username - Username
 * @param {string} userData.email - Email address
 * @param {string} userData.password - Initial password
 * @param {string} userData.name - Full name
 * @param {string} [userData.profil='1'] - User profile/role
 * @returns {Promise<Object>} Created user data
 * @throws {Error} If request fails or user is not admin
 *
 * @example
 * const newUser = await createUserAdmin({
 *   username: 'maria.santos',
 *   email: 'maria@aintar.pt',
 *   password: 'TempPass@123',
 *   name: 'Maria Santos',
 *   profil: '1'
 * });
 */
export const createUserAdmin = async (userData) => {
  try {
    const response = await apiClient.post('/user/admin/users', userData);
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error creating user (admin):', error);
    }
    throw error;
  }
};

/**
 * Update user (Admin only)
 * Updates user information (admin can update any user)
 *
 * @param {number} userId - User ID to update
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user data
 * @throws {Error} If request fails or user is not admin
 *
 * @example
 * const updated = await updateUserAdmin(123, {
 *   name: 'Maria Santos Silva',
 *   email: 'maria.santos@aintar.pt'
 * });
 */
export const updateUserAdmin = async (userId, userData) => {
  try {
    const response = await apiClient.put(`/user/admin/users/${userId}`, userData);
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error updating user (admin):', error);
    }
    throw error;
  }
};

/**
 * Delete user (Admin only)
 * Deletes a user account (soft delete - marks as inactive)
 *
 * @param {number} userId - User ID to delete
 * @returns {Promise<Object>} Deletion result
 * @throws {Error} If request fails or user is not admin
 *
 * @example
 * await deleteUser(123);
 */
export const deleteUser = async (userId) => {
  try {
    const response = await apiClient.delete(`/user/admin/users/${userId}`);
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error deleting user:', error);
    }
    throw error;
  }
};

/**
 * Toggle user active status (Admin only)
 * Activates or deactivates a user account
 *
 * @param {number} userId - User ID
 * @param {boolean} active - Active status
 * @returns {Promise<Object>} Updated user data
 * @throws {Error} If request fails or user is not admin
 *
 * @example
 * await toggleUserStatus(123, false); // Deactivate user
 */
export const toggleUserStatus = async (userId, active) => {
  try {
    const response = await apiClient.post(`/user/admin/users/${userId}/toggle-status`, {
      active: active
    });
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error toggling user status:', error);
    }
    throw error;
  }
};

/**
 * Reset user password (Admin only)
 * Resets a user's password to a temporary password
 *
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Result with temporary password
 * @throws {Error} If request fails or user is not admin
 *
 * @example
 * const result = await resetUserPassword(123);
 * console.log('Temporary password:', result.temp_password);
 */
export const resetUserPassword = async (userId) => {
  try {
    const response = await apiClient.post(`/user/admin/users/${userId}/reset-password`);
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error resetting user password:', error);
    }
    throw error;
  }
};

// =============================================================================
// PERMISSIONS MANAGEMENT
// =============================================================================

/**
 * Update user permissions (Admin only)
 * Updates the permissions (interface) array for a specific user
 *
 * @param {number} userId - User ID
 * @param {Array<number>} permissions - Array of permission IDs
 * @returns {Promise<Object>} Updated user data
 * @throws {Error} If request fails or user is not admin
 *
 * @example
 * await updateUserPermissions(123, [10, 20, 200, 210]);
 */
export const updateUserPermissions = async (userId, permissions) => {
  try {
    const response = await apiClient.put(`/user/admin/users/${userId}/permissions`, {
      interfaces: permissions
    });
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error updating user permissions:', error);
    }
    throw error;
  }
};

/**
 * Bulk update permissions for multiple users (Admin only)
 * Adds, removes, or applies a template to multiple users at once
 *
 * @param {Array<number>} userIds - Array of user IDs
 * @param {Object} data - Bulk operation data
 * @param {string} data.action - Action type: 'add', 'remove', or 'template'
 * @param {Array<number>} [data.permissions] - Permission IDs (for add/remove)
 * @param {string} [data.templateName] - Template name (for template action)
 * @returns {Promise<Object>} Bulk update result
 * @throws {Error} If request fails or user is not admin
 *
 * @example
 * // Add permissions to multiple users
 * await bulkUpdatePermissions([123, 124, 125], {
 *   action: 'add',
 *   permissions: [200, 210]
 * });
 *
 * // Apply template to multiple users
 * await bulkUpdatePermissions([123, 124], {
 *   action: 'template',
 *   templateName: 'Operador Básico'
 * });
 */
export const bulkUpdatePermissions = async (userIds, data) => {
  try {
    const response = await apiClient.post('/user/admin/users/bulk-permissions', {
      user_ids: userIds,
      ...data
    });
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[userService] Error bulk updating permissions:', error);
    }
    throw error;
  }
};
