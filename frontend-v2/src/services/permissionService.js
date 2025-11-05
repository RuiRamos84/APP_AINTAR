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
    // Evitar logs repetidos se o user não mudou
    if (this.user?.user_id === user?.user_id) {
      return;
    }

    this.user = user;

    // Log apenas em desenvolvimento e apenas uma vez por user
    if (process.env.NODE_ENV === 'development') {
      console.log('[PermissionService] User set:', {
        user_id: user?.user_id,
        user_name: user?.user_name,
        profil: user?.profil,
        isSuperAdmin: user?.profil === '0',
        interfacesCount: user?.interfaces?.length || 0
      });
    }
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
    // No user = no permission
    if (!this.user) {
      console.warn('[PermissionService] ✗ NO USER authenticated');
      return false;
    }

    // Super admin (profil === '0') has all permissions
    if (this.user.profil === '0') {
      // Super admin - sem log para evitar spam (apenas return true)
      return true;
    }

    // Check if permission ID is valid
    if (typeof requiredInterfaceId !== 'number') {
      console.warn('[PermissionService] ✗ Invalid permission ID (must be number):', requiredInterfaceId);
      return false;
    }

    // Check if user has the permission in their interfaces array
    const userInterfaces = this.user.interfaces || [];
    const hasAccess = userInterfaces.includes(requiredInterfaceId);

    // Log apenas negações (para debug de problemas)
    if (!hasAccess) {
      console.warn(`[PermissionService] ✗ Permission ${requiredInterfaceId} - DENIED`, {
        requiredPermission: requiredInterfaceId,
        userInterfaces: userInterfaces,
        userProfil: this.user.profil
      });
    }

    return hasAccess;
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
