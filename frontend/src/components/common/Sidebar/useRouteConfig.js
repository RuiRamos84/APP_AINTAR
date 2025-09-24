// hooks/useRouteConfig.js - Lógica de permissões para a Sidebar
import { useCallback, useMemo } from 'react';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { ROUTE_CONFIG } from '../../../config/routeConfig';

export const useRouteConfig = () => {
    const { hasPermission, hasAnyPermission } = usePermissionContext();

    /**
     * Verifica se um utilizador pode aceder a um item de configuração (rota ou ação).
     */
    const canAccess = useCallback((config) => {
        if (!config?.permissions?.required) {
            return true; // Sem restrições de permissão
        }
        return hasPermission(config.permissions.required);
    }, [hasPermission]);

    /**
     * Filtra e constrói os itens da sidebar com base nas permissões do utilizador.
     */
    const getAccessibleSidebarItems = useMemo(() => {
        const sidebarItems = Object.entries(ROUTE_CONFIG)
            .filter(([_, config]) => config.showInSidebar);

        return sidebarItems.reduce((accessibleItems, [path, config]) => {
            // 1. Filtrar os sub-itens acessíveis primeiro
            const accessibleSubmenu = config.submenu
                ? Object.entries(config.submenu).reduce((acc, [subPath, subConfig]) => {
                    if (canAccess(subConfig)) {
                        // Garante que a propriedade 'to' está definida para navegação
                        const finalSubConfig = { ...subConfig };
                        if (!finalSubConfig.action && !finalSubConfig.to && subPath.startsWith('/')) {
                            finalSubConfig.to = subPath;
                        }
                        acc[subConfig.id || subPath] = finalSubConfig;
                    }
                    return acc;
                }, {})
                : null;

            // 2. Determinar se o item principal deve ser visível
            const hasDirectAccess = canAccess(config);
            const hasAccessToSubmenu = accessibleSubmenu && Object.keys(accessibleSubmenu).length > 0;

            // CORREÇÃO: Se o item não tem permissão definida mas tem submenu,
            // só deve ser visível se tiver acesso a pelo menos um sub-item
            const hasPermissionDefined = !!config.permissions?.required;
            const shouldShow = hasPermissionDefined
                ? hasDirectAccess || hasAccessToSubmenu  // Item com permissão definida
                : hasAccessToSubmenu; // Item sem permissão definida só mostra se tiver sub-itens acessíveis

            if (shouldShow) {
                const finalItem = {
                    ...config,
                    to: path,
                    id: config.id || path,
                };

                // Se o item principal não tem uma rota própria mas tem um submenu,
                // e o utilizador só tem acesso ao submenu, não o tornamos clicável.
                if (!hasDirectAccess && hasAccessToSubmenu) {
                    delete finalItem.to; // Remove a capacidade de navegar no item pai
                }

                // Anexar apenas o submenu acessível
                if (hasAccessToSubmenu) {
                    finalItem.submenu = accessibleSubmenu;
                } else {
                    // Garante que não mostramos um submenu vazio se o utilizador não tiver acesso a nenhum item
                    delete finalItem.submenu;
                }

                accessibleItems.push(finalItem);
            }

            return accessibleItems;
        }, []);
    }, [canAccess, hasAnyPermission]); // hasAnyPermission pode ser útil no futuro

    /**
     * Cria um mapa de ID de permissão para o seu nome (ex: 10 -> 'admin.dashboard').
     * É memoizado para performance.
     */
    const permissionIdToNameMap = useMemo(() => {
        const map = {};
        const buildMap = (config) => {
            for (const key in config) {
                const item = config[key];
                if (item.permissions?.required && item.id) {
                    map[item.permissions.required] = item.id;
                }
                if (item.submenu) {
                    buildMap(item.submenu);
                }
            }
        };
        buildMap(ROUTE_CONFIG);
        return map;
    }, []);

    return {
        getAccessibleSidebarItems: () => getAccessibleSidebarItems,
        permissionIdToNameMap, // Exportar o novo mapa
        routeConfig: ROUTE_CONFIG // Manter para compatibilidade se necessário
    };
};