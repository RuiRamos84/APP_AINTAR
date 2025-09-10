// hooks/useRouteConfig.js
import { useAuth } from '../contexts/AuthContext';
import { ROUTE_CONFIG, getRouteConfig, getRoutePermissions, getSidebarItems } from '../config/routeConfig';

export const useRouteConfig = () => {
    const { user } = useAuth();

    // ===== VALIDAÇÃO DE PERMISSÕES =====

    const hasAccess = (requiredInterface) => {
        if (user?.profil === '0') return true;
        if (!user?.interfaces || !Array.isArray(user.interfaces)) return false;
        return user.interfaces.includes(requiredInterface);
    };

    const hasPermission = (config) => {
        if (!user) return false;
        if (user.profil === '0') return true;

        // 1. Perfil + Interface
        if (config.requiredProfil && config.requiredInterface) {
            return user.profil === config.requiredProfil &&
                hasAccess(config.requiredInterface);
        }

        // 2. Só Perfil
        if (config.requiredProfil) {
            return user.profil === config.requiredProfil;
        }

        // 3. Só Interface  
        if (config.requiredInterface) {
            return hasAccess(config.requiredInterface);
        }

        // 4. Legacy (rolesAllowed)
        if (config.rolesAllowed) {
            const hasRole = config.rolesAllowed.includes(user.profil);
            const hasUserId = !config.allowedUserIds ||
                config.allowedUserIds.includes(user.user_id);
            return hasRole && hasUserId;
        }

        return true;
    };

    // ===== FUNÇÕES PRINCIPAIS =====

    const hasRouteAccess = (path) => {
        const permissions = getRoutePermissions(path);
        return hasPermission(permissions);
    };

    const getAccessibleRoutes = () => {
        return Object.entries(ROUTE_CONFIG)
            .filter(([path]) => hasRouteAccess(path))
            .reduce((acc, [path, config]) => ({ ...acc, [path]: config }), {});
    };

    const getAccessibleSidebarItems = () => {
        const sidebarItems = getSidebarItems();

        return sidebarItems.filter(item => {
            const hasAccess = hasPermission(item.permissions);

            // Se tem submenu, filtrar também os itens do submenu
            if (item.submenu && hasAccess) {
                const accessibleSubmenu = {};

                Object.entries(item.submenu).forEach(([key, subItem]) => {
                    if (hasPermission(subItem.permissions)) {
                        // CORREÇÃO: Transferir a chave como 'to' se o subitem não tiver 'to' definido
                        const processedSubItem = {
                            ...subItem,
                            // Se a chave parece uma URL (começa com '/') e o subitem não tem 'to', usar a chave
                            to: subItem.to || (key.startsWith('/') ? key : undefined)
                        };

                        accessibleSubmenu[key] = processedSubItem;

                        // console.log('🔧 Processed submenu item:', {
                        //     key,
                        //     originalTo: subItem.to,
                        //     newTo: processedSubItem.to,
                        //     text: subItem.text
                        // });
                    }
                });

                item.submenu = accessibleSubmenu;
            }

            return hasAccess;
        });
    };

    const canAccessRoute = (path, additionalConfig = {}) => {
        const routePermissions = getRoutePermissions(path);
        const combinedConfig = { ...routePermissions, ...additionalConfig };
        return hasPermission(combinedConfig);
    };

    // ===== FUNÇÕES UTILITÁRIAS =====

    const getRouteInfo = (path) => {
        return getRouteConfig(path);
    };

    const isPublicRoute = (path) => {
        const publicRoutes = [
            '/',
            '/login',
            '/create-user',
            '/activation',
            '/password-recovery',
            '/reset-password'
        ];
        return publicRoutes.some(route => path.startsWith(route));
    };

    const getRequiredPermissionsForRoute = (path) => {
        return getRoutePermissions(path);
    };

    // ===== COMPATIBILIDADE =====

    // Manter compatibilidade com usePermissions anterior
    const hasAccessLegacy = hasAccess;
    const hasPermissionLegacy = hasPermission;

    return {
        // Principais
        hasRouteAccess,
        getAccessibleRoutes,
        getAccessibleSidebarItems,
        canAccessRoute,

        // Utilitárias
        getRouteInfo,
        getRoutePermissions,
        getRequiredPermissionsForRoute,
        isPublicRoute,

        // Permissões básicas
        hasAccess,
        hasPermission,

        // Compatibilidade
        hasAccessLegacy,
        hasPermissionLegacy,

        // Dados
        routeConfig: ROUTE_CONFIG
    };
};