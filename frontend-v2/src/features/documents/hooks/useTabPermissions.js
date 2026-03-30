import { useMemo } from 'react';
import { usePermissions } from '@/core/contexts';

/**
 * Tab definitions for the Documents page
 * Each tab maps to a permission string
 */
const TAB_CONFIG = [
  { index: 0, label: 'Todos os Pedidos', permission: 'docs.view.all' },
  { index: 1, label: 'A Meu Cargo', permission: 'docs.view.assigned' },
  { index: 2, label: 'Criados por Mim', permission: 'docs.view.owner' },
  { index: 3, label: 'Em Atraso', permission: 'docs.view.all' },
];

/**
 * Hook to manage tab visibility based on user permissions
 * @returns {{ visibleTabs, isTabVisible, getDefaultActiveTab, toRealIndex, toVisibleIndex }}
 */
export const useTabPermissions = () => {
  const { hasPermission } = usePermissions();

  const visibleTabs = useMemo(() => {
    return TAB_CONFIG.filter((tab) => hasPermission(tab.permission));
  }, [hasPermission]);

  const isTabVisible = (tabIndex) => {
    const tab = TAB_CONFIG.find((t) => t.index === tabIndex);
    if (!tab) return false;
    return hasPermission(tab.permission);
  };

  const getDefaultActiveTab = () => {
    if (visibleTabs.length === 0) return 0;
    return visibleTabs[0].index;
  };

  /**
   * Convert visible tab position to real tab index
   * e.g. if tabs [0,2,3] are visible, visible position 1 -> real index 2
   */
  const toRealIndex = (visiblePosition) => {
    if (visiblePosition < 0 || visiblePosition >= visibleTabs.length) return 0;
    return visibleTabs[visiblePosition].index;
  };

  /**
   * Convert real tab index to visible position
   * e.g. if tabs [0,2,3] are visible, real index 2 -> visible position 1
   */
  const toVisibleIndex = (realIndex) => {
    const pos = visibleTabs.findIndex((t) => t.index === realIndex);
    return pos >= 0 ? pos : 0;
  };

  return {
    visibleTabs,
    isTabVisible,
    getDefaultActiveTab,
    toRealIndex,
    toVisibleIndex,
  };
};

export default useTabPermissions;
