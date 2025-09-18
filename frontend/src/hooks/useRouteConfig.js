// hooks/useRouteConfig.js - VERSÃO COM DEBUG TEMPORÁRIO
import { useCallback, useMemo } from 'react';
import { usePermissionContext } from '../contexts/PermissionContext';
import { ROUTE_CONFIG } from '../config/routeConfig';
import { Home as HomeIcon } from '@mui/icons-material';

export const useRouteConfig = () => {
    const { hasPermission, hasAnyPermission, checkPermissions } = usePermissionContext();

    const canAccessRoute = useCallback((path, additionalConfig = {}) => {
        // CORREÇÃO: Se o 'path' não é uma rota (não começa com '/'),
        // significa que é uma ação (ex: 'add-entity-action').
        // Nesse caso, as permissões estão no 'additionalConfig'.
        const routeConfig = path.startsWith('/') ? ROUTE_CONFIG[path] : null;
        
        // Se não há configuração de rota e nem configuração adicional, permitir.
        // Ou se a rota não existe no ROUTE_CONFIG (pode ser uma sub-rota dinâmica).
        if (!routeConfig && Object.keys(additionalConfig).length === 0) return true;

        const permissions = { ...(routeConfig?.permissions || {}), ...additionalConfig };

        // Se não há requisitos de permissão, permitir acesso
        if (!permissions.required) return true;

        return hasPermission(permissions.required);
    }, [hasPermission]);

    const getAccessibleSidebarItems = useCallback(() => {
        const sidebarItems = Object.entries(ROUTE_CONFIG)
            .filter(([_, config]) => config.showInSidebar);

        const accessibleItems = [];

        for (const [path, config] of sidebarItems) {

            let hasAccess = canAccessRoute(path);

            // LÓGICA ADICIONAL: Se não tem acesso direto, verificar submenus
            if (!hasAccess && config.submenu) {
                const submenuPermissions = Object.values(config.submenu)
                    .map(sub => sub.permissions?.required)
                    .filter(Boolean);

                if (submenuPermissions.length > 0) {
                    // CORREÇÃO: Usar hasAnyPermission para verificar se o utilizador tem acesso a pelo menos um dos sub-itens.
                    hasAccess = hasAnyPermission(submenuPermissions);
                }
            }

            if (hasAccess) {
                const item = { ...config, to: path, id: path };

                // Otimização: Filtrar submenu apenas se existir
                if (config.submenu && Object.keys(config.submenu).length > 0) {
                    const submenuEntries = Object.entries(config.submenu);

                    const accessibleSubmenu = submenuEntries.reduce((acc, [subPath, subConfig]) => {
                        // CORREÇÃO: Chamar canAccessRoute para cada sub-item e verificar o resultado booleano.
                        // Passar as permissões do sub-item como configuração adicional.
                        const subPermissions = subConfig.permissions || {};
                        if (canAccessRoute(subPath, subPermissions)) {
                            acc[subPath] = {
                                ...subConfig
                            };
                            // CORREÇÃO: Apenas atribuir 'to' se não houver uma ação 'onClick'.
                            // Isto previne que itens como "Adicionar Entidade" tenham uma rota e uma ação.
                            if (!subConfig.onClick) {
                                acc[subPath].to = subConfig.to || (subPath.startsWith('/') ? subPath : undefined);
                            };
                        }
                        return acc;
                    }, {});

                    // Apenas adicionar submenu se tiver itens acessíveis
                    if (Object.keys(accessibleSubmenu).length > 0) {
                        item.submenu = accessibleSubmenu;
                    }
                }

                accessibleItems.push(item);
            }
        }

        return accessibleItems;
    }, [canAccessRoute, hasAnyPermission]);

    return {
        canAccessRoute,
        getAccessibleSidebarItems,
        routeConfig: ROUTE_CONFIG
    };
};