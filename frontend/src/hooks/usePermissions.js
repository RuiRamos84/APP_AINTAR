// frontend/src/hooks/usePermissions.js - ATUALIZADO

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import permissionService from '../services/permissionService';

export const usePermissions = () => {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState(new Set());
    const [loading, setLoading] = useState(false);

    // Carregar permissões do utilizador
    const loadUserPermissions = useCallback(async () => {
        if (!user) {
            setPermissions(new Set());
            return;
        }

        setLoading(true);
        try {
            const userPermissions = await permissionService.getUserPermissions();
            setPermissions(new Set(userPermissions));
        } catch (error) {
            console.error('Erro carregar permissões:', error);
            setPermissions(new Set());
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadUserPermissions();
    }, [loadUserPermissions]);

    /**
     * Verificar se tem permissão específica
     */
    const hasPermission = useCallback(async (permission) => {
        // Super admin sempre tem acesso
        if (user?.profil === '0') return true;

        // Verificar no cache local primeiro
        if (permissions.has(permission)) return true;

        // Verificar via API se não estiver no cache
        return await permissionService.hasPermission(permission);
    }, [user, permissions]);

    /**
     * Verificar múltiplas permissões
     */
    const hasAnyPermission = useCallback(async (permissionList) => {
        if (user?.profil === '0') return true;

        for (const permission of permissionList) {
            if (await hasPermission(permission)) {
                return true;
            }
        }
        return false;
    }, [user, hasPermission]);

    /**
     * Verificar todas as permissões
     */
    const hasAllPermissions = useCallback(async (permissionList) => {
        if (user?.profil === '0') return true;

        for (const permission of permissionList) {
            if (!(await hasPermission(permission))) {
                return false;
            }
        }
        return true;
    }, [user, hasPermission]);

    /**
     * Verificar permissões batch
     */
    const checkPermissions = useCallback(async (permissionMap) => {
        if (user?.profil === '0') {
            return Object.keys(permissionMap).reduce((acc, key) => {
                acc[key] = true;
                return acc;
            }, {});
        }

        return await permissionService.checkBatchPermissions(permissionMap);
    }, [user]);

    return {
        permissions: Array.from(permissions),
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        checkPermissions,
        loading,
        reload: loadUserPermissions
    };
};
