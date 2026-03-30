/**
 * Permission Service
 * Centralized permission checking logic
 *
 * Aceita tanto IDs numéricos como value strings (ex: 'operation.access').
 * Os value strings são resolvidos via catálogo da BD (ts_interface),
 * injectado pelo PermissionContext usando os dados do MetadataContext.
 *
 * FONTE ÚNICA DE VERDADE: ts_interface (BD) — sem permissionMap.js.
 */

class PermissionService {
  constructor() {
    this.user = null;
    this._userInterfacesSet = new Set();
    this._interfaceCatalog = [];
    this._interfaceMap = new Map(); // O(1) lookup
  }

  /**
   * Define o utilizador autenticado (chamado pelo AuthContext/PermissionContext)
   * @param {Object} user - Objecto com user_id, profil, interfaces[]
   */
  setUser(user) {
    if (this.user?.user_id === user?.user_id && this.user?.interfaces?.length === user?.interfaces?.length) return;
    this.user = user;
    this._userInterfacesSet = new Set(user?.interfaces || []);
  }

  /**
   * Injeta o catálogo de interfaces da BD (chamado pelo PermissionContext)
   * Deve ser chamado assim que o MetadataContext terminar de carregar.
   * @param {Array} interfaces - Array de objectos ts_interface da BD
   */
  setInterfaceCatalog(interfaces = []) {
    this._interfaceCatalog = interfaces;
    this._interfaceMap = new Map();
    interfaces.forEach(i => {
      if (i.value) this._interfaceMap.set(i.value, i.pk);
    });
  }

  /** Limpa o utilizador no logout */
  clearUser() {
    this.user = null;
    this._userInterfacesSet.clear();
  }

  /**
   * Resolve um identificador de permissão para o ID numérico (pk).
   * Aceita:
   *   - number  → usa directamente (ex: 310)
   *   - string  → faz lookup por `value` no catálogo da BD (ex: 'operation.access')
   *
   * @param {number|string} permission
   * @returns {number|null}
   */
  _resolveId(permission) {
    if (typeof permission === 'number') return permission;
    if (typeof permission === 'string') {
      const pk = this._interfaceMap.get(permission);
      if (pk === undefined) {
        if (import.meta.env.DEV && this._interfaceMap.size > 0) {
          console.warn(`[PermissionService] Permissão '${permission}' não encontrada no catálogo da BD.`);
        }
        return null;
      }
      return pk;
    }
    return null;
  }

  /**
   * Verifica se o utilizador tem a permissão indicada.
   * @param {number|string} permission - ID numérico ou value string (ex: 'operation.access')
   * @returns {boolean}
   */
  hasPermission(permission) {
    if (!this.user) return false;

    // Super admin (profil === '0') tem acesso a tudo
    if (String(this.user.profil) === '0') return true;

    const permId = this._resolveId(permission);
    if (permId === null) return false;

    // Fast O(1) lookup
    return this._userInterfacesSet.has(permId);
  }

  /**
   * Verifica se o utilizador tem PELO MENOS UMA das permissões.
   * @param {Array<number|string>} permissions
   * @returns {boolean}
   */
  hasAnyPermission(permissions) {
    if (!Array.isArray(permissions) || permissions.length === 0) return false;
    return permissions.some(p => this.hasPermission(p));
  }

  /**
   * Verifica se o utilizador tem TODAS as permissões.
   * @param {Array<number|string>} permissions
   * @returns {boolean}
   */
  hasAllPermissions(permissions) {
    if (!Array.isArray(permissions) || permissions.length === 0) return false;
    return permissions.every(p => this.hasPermission(p));
  }

  /**
   * Verifica um mapa de permissões em batch.
   * @param {Object} permissionMap - Ex: { canView: 'operation.access', canEdit: 'operation.manage' }
   * @returns {Object} - Ex: { canView: true, canEdit: false }
   */
  checkBatchPermissions(permissionMap) {
    const result = {};
    Object.keys(permissionMap).forEach(key => {
      result[key] = this.hasPermission(permissionMap[key]);
    });
    return result;
  }

  /** @returns {number[]} Array de IDs de interfaces do utilizador */
  getUserPermissions() {
    return this.user?.interfaces || [];
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
