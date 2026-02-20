import { useMemo } from 'react';

export const OPERATION_PERMISSIONS = {
    ACCESS: 310,
    EXECUTE: 311,
    SUPERVISE: 312,
    MANAGE: 313,
    ANALYTICS: 314
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
                canViewAnalytics: () => false,
                canAccessModule: () => false,
                canCreateMeta: () => false,
                canViewTeam: () => false,
            };
        }

        const userPermissions = user.interfaces || user.permissions || [];

        const hasPermission = (permissionCode) => {
            return userPermissions.includes(permissionCode);
        };

        const canExecute = hasPermission(OPERATION_PERMISSIONS.EXECUTE);
        const canSupervise = hasPermission(OPERATION_PERMISSIONS.SUPERVISE);
        const canManage = hasPermission(OPERATION_PERMISSIONS.MANAGE);
        const canViewAnalytics = hasPermission(OPERATION_PERMISSIONS.ANALYTICS);

        const isManager = canManage;
        const isSupervisor = canSupervise && !isManager;
        const isOperator = canExecute && !isSupervisor && !isManager;

        let userRole = 'operator';
        if (isManager) userRole = 'manager';
        else if (isSupervisor) userRole = 'supervisor';
        else if (isOperator) userRole = 'operator';

        return {
            userRole,
            isSupervisor,
            isOperator,
            isManager,
            permissions: userPermissions,
            hasPermission,
            canSupervise: () => canSupervise || canManage,
            canExecute: () => canExecute || canSupervise || canManage,
            canManage: () => canManage,
            canViewAnalytics: () => canViewAnalytics || canManage,
            canAccessModule: () => hasPermission(OPERATION_PERMISSIONS.ACCESS),
            canCreateMeta: () => canManage,
            canViewTeam: () => canSupervise || canManage,
            canEditOperations: () => canManage,
        };
    }, [user]);

    return roleInfo;
};
