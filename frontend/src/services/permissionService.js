// frontend/src/services/permissionService.js

/**
 * Serviço de permissões — aceita IDs numéricos E strings do campo value da ts_interface.
 * O catálogo (string → pk) é injectado pelo PermissionContext via setInterfaceCatalog().
 * Compatível com o sistema legacy (IDs numéricos) e com o novo sistema granular (strings).
 */

import api from './api';

class PermissionService {
    constructor() {
        this.user = null;
        this._userInterfacesSet = new Set(); // O(1) lookup
        this._interfaceCatalog = [];
        this._interfaceMap = new Map(); // string → pk
    }

    /**
     * Injeta o catálogo de interfaces da BD (chamado pelo PermissionContext).
     * Deve ser chamado assim que o MetaDataContext terminar de carregar.
     * @param {Array} interfaces - Array de objectos {pk, value} da BD
     */
    setInterfaceCatalog(interfaces = []) {
        this._interfaceCatalog = interfaces;
        this._interfaceMap = new Map();
        interfaces.forEach(i => {
            if (i.value) this._interfaceMap.set(i.value, i.pk);
        });
    }

    /**
     * Define o utilizador autenticado.
     * @param {Object} user - Objecto com user_id, profil, interfaces[]
     */
    setUser(user) {
        if (this.user?.user_id !== user?.user_id) {
            this.clearLocalState();
        }
        this.user = user;
        this._userInterfacesSet = new Set(user?.interfaces || []);
    }

    /**
     * Resolve um identificador de permissão para o pk numérico.
     * - number  → usa directamente (retrocompatibilidade)
     * - string  → lookup no catálogo da BD
     * @param {number|string} permission
     * @returns {number|null}
     */
    _resolveId(permission) {
        if (typeof permission === 'number') return permission;
        if (typeof permission === 'string') {
            const pk = this._interfaceMap.get(permission);
            if (pk === undefined) {
                if (process.env.NODE_ENV === 'development' && this._interfaceMap.size > 0) {
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
     * Aceita ID numérico (retrocompat) ou string do campo value da ts_interface.
     * @param {number|string} requiredPermission
     * @returns {boolean}
     */
    hasPermission(requiredPermission) {
        if (!this.user) return false;

        // Super admin tem acesso total
        if (this.user.profil === '0') return true;

        const permId = this._resolveId(requiredPermission);
        if (permId === null) return false;

        return this._userInterfacesSet.has(permId);
    }

    /**
     * Verifica múltiplas permissões — qualquer uma.
     * @param {Array<number|string>} permissions
     */
    hasAnyPermission(permissions) {
        if (!Array.isArray(permissions) || permissions.length === 0) return false;
        return permissions.some(p => this.hasPermission(p));
    }

    /**
     * Verifica múltiplas permissões — todas.
     * @param {Array<number|string>} permissions
     */
    hasAllPermissions(permissions) {
        if (!Array.isArray(permissions) || permissions.length === 0) return false;
        return permissions.every(p => this.hasPermission(p));
    }

    /**
     * Verificação batch.
     * @param {Object} permissionMap - Ex: { canView: 'operation.access', canEdit: 310 }
     */
    checkBatchPermissions(permissionMap) {
        const result = {};
        Object.keys(permissionMap).forEach(key => {
            result[key] = this.hasPermission(permissionMap[key]);
        });
        return result;
    }

    /** @returns {number[]} */
    getUserPermissions() {
        if (!this.user || !this.user.interfaces) return [];
        const permissions = [...this.user.interfaces];
        if (this.user.profil === '0') {
            permissions.push('admin.super');
        }
        return permissions;
    }

    /** Limpar estado local (logout ou mudança de utilizador) */
    clearLocalState() {
        this.user = null;
        this._userInterfacesSet = new Set();
    }

    /** @returns {boolean} */
    isAdmin() {
        return String(this.user?.profil) === '0';
    }

    /** @returns {string|null} */
    getUserProfile() {
        return this.user?.profil || null;
    }

    /** Estatísticas de debug */
    getCacheStats() {
        return {
            userPermissionsCount: this._userInterfacesSet.size,
            catalogSize: this._interfaceMap.size,
        };
    }

    // === GESTÃO ADMINISTRATIVA (endpoints) ===

    async getPermissionRules() {
        try {
            const response = await api.get('/permissions/rules');
            if (response.data.success) return response.data.rules;
            throw new Error(response.data.error);
        } catch (error) {
            console.error('Erro obter regras:', error);
            throw error;
        }
    }

    async createRule(ruleData) {
        try {
            const response = await api.post('/permissions/rules', ruleData);
            if (response.data.success) return true;
            throw new Error(response.data.error);
        } catch (error) {
            console.error('Erro criar regra:', error);
            throw error;
        }
    }

    async updateRule(ruleId, updates) {
        try {
            const response = await api.put(`/permissions/rules/${ruleId}`, updates);
            if (response.data.success) return true;
            throw new Error(response.data.error);
        } catch (error) {
            console.error('Erro atualizar regra:', error);
            throw error;
        }
    }

    async disableRule(ruleId) {
        try {
            const response = await api.delete(`/permissions/rules/${ruleId}`);
            if (response.data.success) return true;
            throw new Error(response.data.error);
        } catch (error) {
            console.error('Erro desativar regra:', error);
            throw error;
        }
    }

    async enableRule(ruleId) {
        try {
            const response = await api.put(`/permissions/rules/${ruleId}/enable`);
            if (response.data.success) return true;
            throw new Error(response.data.error);
        } catch (error) {
            console.error('Erro reativar regra:', error);
            throw error;
        }
    }

    // Mantido para retrocompatibilidade
    async preloadCommonPermissions() {
        return Promise.resolve();
    }
}

const permissionService = new PermissionService();
export default permissionService;
