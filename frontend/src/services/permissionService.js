// frontend/src/services/permissionService.js
import api from './api';

/**
 * ===================================================================
 * NOVO SISTEMA DE PERMISSÕES BASEADO EM IDs DE INTERFACE (PKs)
 * A fonte da verdade são os dados do utilizador (user.profil e user.interfaces)
 * ===================================================================
 */

class PermissionService {
    constructor() {
        this.userPermissions = null;
        this.lastUserCheck = null;
        this.user = null; // Referência do utilizador atual
    }

    /**
     * Definir utilizador atual (chamado pelo AuthContext)
     */
    setUser(user) {
        if (this.user?.user_id !== user?.user_id) {
            this.clearLocalState(); // Limpar estado se mudou utilizador
        }
        this.user = user;
    }

    /**
     * Verifica se o utilizador tem uma permissão (ID de interface).
     * Agora usa apenas IDs numéricos para máxima eficiência.
     */
    hasPermission(requiredInterfaceId) {
        if (!this.user) return false;

        // Super admin sempre tem acesso
        if (this.user.profil === '0') return true;

        // Apenas IDs numéricos são suportados
        if (typeof requiredInterfaceId !== 'number') {
            console.warn(`Permissão deve ser ID numérico, recebido: ${typeof requiredInterfaceId}`);
            return false;
        }

        // Verifica se o ID da interface está na lista de interfaces do utilizador
        const userInterfaces = this.user.interfaces || [];
        return userInterfaces.includes(requiredInterfaceId);
    }

    /**
     * Verificar múltiplas permissões. A lógica agora é local.
     */
    checkPermissions(permissions) {
        const permissionList = Array.isArray(permissions) ? permissions : [permissions];
        return permissionList.reduce((acc, p) => {
            acc[p] = this.hasPermission(p);
            return acc;
        }, {});
    }

    /**
     * Obter todas as permissões do utilizador atual
     */
    getUserPermissions() {
        // Após a refatoração, as permissões (interfaces) estão sempre disponíveis
        // no objeto 'user'. Esta função agora é síncrona e retorna os dados locais.
        if (!this.user || !this.user.interfaces) {
            return [];
        }
        // Adiciona a permissão de super admin (perfil '0') para consistência.
        const permissions = [...this.user.interfaces];
        if (this.user.profil === '0') {
            permissions.push('admin.super'); // Adiciona uma permissão virtual
        }
        return permissions;
    }

    /**
     * Verificar se tem pelo menos uma das permissões
     */
    hasAnyPermission(permissions) {
        if (!Array.isArray(permissions) || permissions.length === 0) {
            return false;
        }

        for (const permission of permissions) {
            if (this.hasPermission(permission)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Verificar se tem todas as permissões
     */
    hasAllPermissions(permissions) {
        if (!Array.isArray(permissions) || permissions.length === 0) {
            return true;
        }

        for (const permission of permissions) {
            if (!this.hasPermission(permission)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Verificação batch para múltiplos componentes
     */
    checkBatchPermissions(permissionMap) {
        const permissions = Object.values(permissionMap).filter(Boolean);
        if (permissions.length === 0) return {};
        // A chamada à API foi removida, a verificação é local
        const results = this.checkPermissions(permissions);

        const mapped = {};
        Object.entries(permissionMap).forEach(([key, permission]) => {
            mapped[key] = permission ? (results[permission] || false) : true;
        });

        return mapped;
    }

    /**
     * Limpar cache
     */
    clearLocalState() {
        this.userPermissions = null;
        this.lastUserCheck = null;
    }

    /**
     * Pré-carregar permissões comuns
     */
    async preloadCommonPermissions() {
        // Esta função não é mais necessária, pois todas as permissões (interfaces)
        // já estão disponíveis localmente no objeto `user`.
        console.log('✅ Permissões já estão disponíveis localmente. Pré-carregamento não é necessário.');
        return Promise.resolve();
    }

    /**
     * Estatísticas do cache (debug)
     */
    getCacheStats() {
        return {
            userPermissionsCount: this.userPermissions?.length || 0,
            lastUserCheck: this.lastUserCheck ? new Date(this.lastUserCheck).toLocaleString() : 'Nunca'
        };
    }

    // === GESTÃO ADMINISTRATIVA ===

    async getPermissionRules() {
        try {
            const response = await api.get('/permissions/rules');
            if (response.data.success) {
                return response.data.rules;
            }
            throw new Error(response.data.error);
        } catch (error) {
            console.error('Erro obter regras:', error);
            throw error;
        }
    }

    async createRule(ruleData) {
        try {
            const response = await api.post('/permissions/rules', ruleData);
            if (response.data.success) {
                return true;
            }
            throw new Error(response.data.error);
        } catch (error) {
            console.error('Erro criar regra:', error);
            throw error;
        }
    }

    async updateRule(ruleId, updates) {
        try {
            const response = await api.put(`/permissions/rules/${ruleId}`, updates);
            if (response.data.success) {
                return true;
            }
            throw new Error(response.data.error);
        } catch (error) {
            console.error('Erro atualizar regra:', error);
            throw error;
        }
    }

    async disableRule(ruleId) {
        try {
            const response = await api.delete(`/permissions/rules/${ruleId}`);
            if (response.data.success) {
                return true;
            }
            throw new Error(response.data.error);
        } catch (error) {
            console.error('Erro desativar regra:', error);
            throw error;
        }
    }

    async enableRule(ruleId) {
        try {
            const response = await api.put(`/permissions/rules/${ruleId}/enable`);
            if (response.data.success) {
                return true;
            }
            throw new Error(response.data.error);
        } catch (error) {
            console.error('Erro reativar regra:', error);
            throw error;
        }
    }
}

// Instância singleton
const permissionService = new PermissionService();

export default permissionService;