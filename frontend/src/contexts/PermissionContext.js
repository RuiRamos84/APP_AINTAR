// frontend/src/contexts/PermissionContext.js - NOVO ARQUIVO

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import permissionService from '../services/permissionService';

const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Carregar permissões do utilizador
    const loadUserPermissions = useCallback(async (forceRefresh = false) => {
        if (!user) {
            setPermissions([]);
            setInitialized(false);
            return;
        }

        setLoading(true);
        try {
            const userPermissions = await permissionService.getUserPermissions(forceRefresh);
            setPermissions(userPermissions);

            // Pré-carregar permissões comuns para melhor performance
            if (!forceRefresh) {
                permissionService.preloadCommonPermissions().catch(console.warn);
            }
            setInitialized(true); // ✅ Inicializado apenas após sucesso
        } catch (error) {
            console.error('Erro carregar permissões:', error);
            setPermissions([]);
            setInitialized(true);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Carregar permissões quando utilizador muda
    useEffect(() => {
        loadUserPermissions();
    }, [loadUserPermissions]);

    // Limpar cache quando utilizador faz logout
    useEffect(() => {
        if (!user) {
            permissionService.clearLocalState();
            setPermissions([]);
            setInitialized(false);
        }
    }, [user]);

    /**
     * Verificar se tem permissão específica
     */
    const hasPermission = useCallback((permission) => {
        // Se o sistema de permissões ainda não foi inicializado, aguardar.
        if (!initialized) return false;

        // Super admin sempre tem acesso
        if (user?.profil === '0') return true;

        // Se não há permissão especificada, negar por segurança (ou permitir, dependendo da regra)
        if (!permission) return true;

        // Verificar via serviço (com cache)
        return permissionService.hasPermission(permission);
    }, [user, initialized]);

    /**
     * Verificar múltiplas permissões (qualquer uma)
     */
    const hasAnyPermission = useCallback((permissionList) => {
        if (user?.profil === '0') return true;
        if (!permissionList || permissionList.length === 0) return true;

        return permissionService.hasAnyPermission(permissionList);
    }, [user]);

    /**
     * Verificar múltiplas permissões (todas)
     */
    const hasAllPermissions = useCallback((permissionList) => {
        if (user?.profil === '0') return true;
        if (!permissionList || permissionList.length === 0) return true;

        return permissionService.hasAllPermissions(permissionList);
    }, [user]);

    /**
     * Verificar permissões batch para otimização
     */
    const checkPermissions = useCallback((permissionMap) => {
        if (user?.profil === '0') {
            // Super admin tem todas as permissões
            return Object.keys(permissionMap).reduce((acc, key) => {
                acc[key] = true;
                return acc;
            }, {});
        }

        return permissionService.checkBatchPermissions(permissionMap);
    }, [user]);

    /**
     * Recarregar permissões (útil após mudanças)
     */
    const reload = useCallback(() => {
        return loadUserPermissions(true);
    }, [loadUserPermissions]);

    /**
     * Verificar se utilizador tem capacidade administrativa
     */
    const isAdmin = useCallback(() => {
        if (user?.profil === '0') return true;
        return hasPermission(2); // 2 = admin.users
    }, [user, hasPermission]);

    const contextValue = {
        // Estado
        permissions,
        loading,
        initialized,
        user,

        // Métodos de verificação
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        checkPermissions,
        isAdmin,

        // Utilidades
        reload,

        // Informações de debug
        getCacheStats: permissionService.getCacheStats.bind(permissionService)
    };

    return (
        <PermissionContext.Provider value={contextValue}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermissionContext = () => {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermissionContext must be used within PermissionProvider');
    }
    return context;
};

// Hook simplificado para uso direto
export const usePermissions = () => {
    const context = usePermissionContext();
    return {
        permissions: context.permissions,
        hasPermission: context.hasPermission,
        hasAnyPermission: context.hasAnyPermission,
        hasAllPermissions: context.hasAllPermissions,
        checkPermissions: context.checkPermissions,
        loading: context.loading,
        initialized: context.initialized,
        reload: context.reload,
        isAdmin: context.isAdmin
    };
};
