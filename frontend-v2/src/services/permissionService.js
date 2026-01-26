/**
 * Permission Service
 * Centralized permission checking logic
 */

class PermissionService {
  constructor() {
    this.user = null;
  }

  /**
   * Set current user
   * @param {Object} user - User object with interfaces array
   */
  setUser(user) {
    // Evitar atualizações desnecessárias se o user não mudou
    if (this.user?.user_id === user?.user_id) {
      return;
    }
    this.user = user;
  }

  /**
   * Clear current user
   */
  clearUser() {
    this.user = null;
  }

  /**
   * Check if user has a specific permission
   * @param {number} requiredInterfaceId - Numeric permission ID
   * @returns {boolean}
   */
  hasPermission(requiredInterfaceId) {
    if (!this.user) {
      return false;
    }

    // Converter para número para garantir comparação
    const permId = Number(requiredInterfaceId);

    // Super admin (profil === '0') has all permissions
    if (String(this.user.profil) === '0') {
      return true;
    }

    // Check if permission ID is valid
    if (typeof permId !== 'number' || isNaN(permId)) {
      return false;
    }

    // Check if user has the permission in their interfaces array
    const userInterfaces = this.user.interfaces || [];
    return userInterfaces.includes(permId);
  }



  /**
   * Check if user has ANY of the specified permissions
   * @param {number[]} permissions - Array of permission IDs
   * @returns {boolean}
   */
  hasAnyPermission(permissions) {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }

    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has ALL of the specified permissions
   * @param {number[]} permissions - Array of permission IDs
   * @returns {boolean}
   */
  hasAllPermissions(permissions) {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }

    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Batch check multiple permissions
   * @param {Object} permissionMap - Object with keys and permission IDs
   * @returns {Object} Object with same keys and boolean values
   */
  checkBatchPermissions(permissionMap) {
    const result = {};

    Object.keys(permissionMap).forEach(key => {
      const permissionId = permissionMap[key];
      result[key] = this.hasPermission(permissionId);
    });

    return result;
  }

  /**
   * Get all user permissions
   * @returns {number[]} Array of permission IDs
   */
  getUserPermissions() {
    return this.user?.interfaces || [];
  }

  /**
   * Check if user is super admin
   * @returns {boolean}
   */
  isAdmin() {
    return this.user?.profil === '0';
  }

  /**
   * Get user profile
   * @returns {string|null}
   */
  getUserProfile() {
    return this.user?.profil || null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.user;
  }
}

// Export singleton instance
const permissionService = new PermissionService();
export default permissionService;
