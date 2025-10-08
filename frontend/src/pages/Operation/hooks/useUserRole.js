/**
 * HOOK DE DETECÇÃO DE ROLE E PERMISSÕES
 *
 * Sistema de permissões granulares:
 * - 310: operation.access (básico)
 * - 311: operation.execute (operadores)
 * - 312: operation.supervise (supervisores)
 * - 313: operation.manage (gestores)
 * - 314: operation.analytics (analytics)
 */
import { useMemo } from 'react';

// Constantes de permissões
export const OPERATION_PERMISSIONS = {
    ACCESS: 310,      // Acesso básico
    EXECUTE: 311,     // Executar tarefas
    SUPERVISE: 312,   // Supervisionar equipa
    MANAGE: 313,      // Gestão de metas/voltas
    ANALYTICS: 314    // Analytics avançados
};

export const useUserRole = (user) => {
    const roleInfo = useMemo(() => {
        if (!user) {
            return {
                userRole: 'guest',
                isSupervisor: false,
                isOperator: false,
                isManager: false,
                permissions: [],
                hasPermission: () => false,
                canSupervise: () => false,
                canExecute: () => false,
                canManage: () => false,
                canViewAnalytics: () => false
            };
        }

        // Obter permissões do utilizador (códigos numéricos)
        // O backend envia as permissões em 'interfaces' (não 'permissions')
        const userPermissions = user.interfaces || user.permissions || [];

        // Helper para verificar se tem permissão
        const hasPermission = (permissionCode) => {
            return userPermissions.includes(permissionCode);
        };

        // Detecção de roles baseada em permissões granulares
        const canExecute = hasPermission(OPERATION_PERMISSIONS.EXECUTE);
        const canSupervise = hasPermission(OPERATION_PERMISSIONS.SUPERVISE);
        const canManage = hasPermission(OPERATION_PERMISSIONS.MANAGE);
        const canViewAnalytics = hasPermission(OPERATION_PERMISSIONS.ANALYTICS);

        // Determinar role principal
        const isManager = canManage;
        const isSupervisor = canSupervise && !isManager;
        const isOperator = canExecute && !isSupervisor && !isManager;

        let userRole = 'operator'; // Default
        if (isManager) {
            userRole = 'manager';
        } else if (isSupervisor) {
            userRole = 'supervisor';
        } else if (isOperator) {
            userRole = 'operator';
        }

        // Preferências do utilizador
        const preferredInterface = user.preferences?.interface || null;
        const hasExplicitPreference = !!preferredInterface;

        return {
            // Role information
            userRole,
            isSupervisor,
            isOperator,
            isManager,

            // Permissions
            permissions: userPermissions,
            hasPermission,

            // Capabilities (métodos úteis)
            canSupervise: () => canSupervise || canManage,
            canExecute: () => canExecute || canSupervise || canManage,
            canManage: () => canManage,
            canViewAnalytics: () => canViewAnalytics || canManage,

            // UI Preferences
            preferredInterface,
            hasExplicitPreference,

            // Permission checks específicos
            canAccessModule: () => hasPermission(OPERATION_PERMISSIONS.ACCESS),
            canCreateMeta: () => canManage,
            canViewTeam: () => canSupervise || canManage,
            canEditOperations: () => canManage,
        };
    }, [user]);

    return roleInfo;
};
