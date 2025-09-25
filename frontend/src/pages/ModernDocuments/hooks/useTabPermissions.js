import { useMemo } from 'react';
import permissionService from '../../../services/permissionService';

/**
 * Hook para verificar permissões das tabs de documentos modernos
 * Baseado no sistema de permissões existente dos componentes tradicionais
 */
export const useTabPermissions = () => {
    const tabPermissions = useMemo(() => {
        return {
            // Tab 0: Todos os documentos - requer permissão para ver todos
            all: permissionService.hasPermission(500), // docs.view.all

            // Tab 1: Documentos atribuídos ao utilizador - requer permissão para ver atribuídos
            assigned: permissionService.hasPermission(520), // docs.view.assigned

            // Tab 2: Documentos criados pelo utilizador - requer permissão para ver próprios
            created: permissionService.hasPermission(510), // docs.view.owner

            // Tab 3: Documentos em atraso - requer pelo menos permissão para ver todos
            late: permissionService.hasPermission(500) // docs.view.all (mesmo que "Todos")
        };
    }, []);

    /**
     * Obtém lista de tabs visíveis baseado nas permissões
     */
    const getVisibleTabs = useMemo(() => {
        const visibleTabs = [];

        if (tabPermissions.all) {
            visibleTabs.push({
                index: 0,
                key: 'all',
                label: 'Todos',
                permission: 500
            });
        }

        if (tabPermissions.assigned) {
            visibleTabs.push({
                index: visibleTabs.length,
                key: 'assigned',
                label: 'A meu cargo',
                permission: 520
            });
        }

        if (tabPermissions.created) {
            visibleTabs.push({
                index: visibleTabs.length,
                key: 'created',
                label: 'Por mim criados',
                permission: 510
            });
        }

        if (tabPermissions.late) {
            visibleTabs.push({
                index: visibleTabs.length,
                key: 'late',
                label: 'Prazo excedido',
                permission: 500
            });
        }

        return visibleTabs;
    }, [tabPermissions]);

    /**
     * Verifica se uma tab específica é visível
     */
    const isTabVisible = (tabKey) => {
        return tabPermissions[tabKey] || false;
    };

    /**
     * Obtém a primeira tab disponível (para definir tab ativa padrão)
     */
    const getDefaultActiveTab = useMemo(() => {
        const visibleTabs = getVisibleTabs;
        return visibleTabs.length > 0 ? visibleTabs[0].index : 0;
    }, [getVisibleTabs]);

    /**
     * Mapeia índice da tab visível para a tab real do sistema
     */
    const mapVisibleIndexToRealIndex = (visibleIndex) => {
        const visibleTabs = getVisibleTabs;
        if (visibleIndex >= 0 && visibleIndex < visibleTabs.length) {
            // Mapear de volta para os índices originais do sistema
            const tabKey = visibleTabs[visibleIndex].key;
            switch (tabKey) {
                case 'all': return 0;
                case 'assigned': return 1;
                case 'created': return 2;
                case 'late': return 3;
                default: return 0;
            }
        }
        return 0;
    };

    /**
     * Mapeia índice real da tab para índice visível
     */
    const mapRealIndexToVisibleIndex = (realIndex) => {
        const tabKey = ['all', 'assigned', 'created', 'late'][realIndex];
        const visibleTabs = getVisibleTabs;
        const visibleTabIndex = visibleTabs.findIndex(tab => tab.key === tabKey);
        return visibleTabIndex >= 0 ? visibleTabIndex : 0;
    };

    return {
        // Permissões individuais
        tabPermissions,

        // Funções utilitárias
        isTabVisible,
        getVisibleTabs,
        getDefaultActiveTab,
        mapVisibleIndexToRealIndex,
        mapRealIndexToVisibleIndex,

        // Estado de permissões resumido
        hasAnyPermission: getVisibleTabs.length > 0,
        visibleTabsCount: getVisibleTabs.length
    };
};