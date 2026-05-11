/**
 * Permission Service
 * Centralized permission checking logic
 *
 * Usa user.permissions (string[]) devolvido pelo backend no login/refresh/me.
 * Sem catálogo local, sem localStorage, sem resolver pk↔value no frontend.
 *
 * FONTE ÚNICA DE VERDADE: backend (ts_interface) — convertido em strings antes de chegar ao cliente.
 */

class PermissionService {
  constructor() {
    this.user = null;
  }

  /**
   * Define o utilizador autenticado.
   * @param {Object} user — objecto com profil, permissions: string[], interfaces: number[]
   */
  setUser(user) {
    this.user = user;
  }

  /** Limpa o utilizador no logout */
  clearUser() {
    this.user = null;
  }

  /**
   * Verifica se o utilizador tem a permissão indicada.
   * @param {string|number} permission — string 'portal.access' ou PK numérico (legacy)
   */
  hasPermission(permission) {
    if (!this.user) return false;

    // Super admin tem acesso a tudo
    if (String(this.user.profil) === '0') return true;

    if (typeof permission === 'string') {
      return Array.isArray(this.user.permissions) && this.user.permissions.includes(permission);
    }

    // Fallback numérico — para código legacy que ainda passa PKs
    if (typeof permission === 'number') {
      return Array.isArray(this.user.interfaces) && this.user.interfaces.includes(permission);
    }

    return false;
  }

  /**
   * Verifica se o utilizador tem PELO MENOS UMA das permissões.
   * @param {Array<string|number>} permissions
   */
  hasAnyPermission(permissions) {
    if (!Array.isArray(permissions) || permissions.length === 0) return false;
    return permissions.some(p => this.hasPermission(p));
  }

  /**
   * Verifica se o utilizador tem TODAS as permissões.
   * @param {Array<string|number>} permissions
   */
  hasAllPermissions(permissions) {
    if (!Array.isArray(permissions) || permissions.length === 0) return false;
    return permissions.every(p => this.hasPermission(p));
  }

  /**
   * Verifica um mapa de permissões em batch.
   * @param {Object} permissionMap — ex: { canView: 'operation.access', canEdit: 'operation.manage' }
   * @returns {Object} — ex: { canView: true, canEdit: false }
   */
  checkBatchPermissions(permissionMap) {
    const result = {};
    Object.keys(permissionMap).forEach(key => {
      result[key] = this.hasPermission(permissionMap[key]);
    });
    return result;
  }

  /** @returns {string[]} Array de permission strings do utilizador */
  getUserPermissions() {
    return this.user?.permissions || [];
  }

  /** @returns {boolean} */
  isAdmin() {
    return String(this.user?.profil) === '0';
  }

  /** @returns {string|null} */
  getUserProfile() {
    return this.user?.profil || null;
  }

  /** @returns {boolean} */
  isAuthenticated() {
    return !!this.user;
  }
}

// Singleton
const permissionService = new PermissionService();
export default permissionService;
