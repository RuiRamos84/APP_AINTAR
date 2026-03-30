/**
 * PermissionContext
 * React context for permission checking
 *
 * Liga o permissionService ao AuthContext (user) e ao MetadataContext (catálogo de interfaces da BD).
 * Com isto, o permissionService aceita value strings ('operation.access') sem qualquer permissionMap.js.
 */

import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import permissionService from '@/services/permissionService';
import { useAuth } from './AuthContext';
import { useMetadata } from './MetadataContext';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { user, isLoading: authLoading } = useAuth();
  const { metadata, isLoading: metaLoading } = useMetadata();
  const [initialized, setInitialized] = useState(false);
  const userIdRef = useRef(null);

  // Injectar catálogo de interfaces da BD no permissionService
  // Sempre que o MetadataContext recarregar a ts_interface, o service fica actualizado
  useEffect(() => {
    if (metadata?.interfaces?.length > 0) {
      permissionService.setInterfaceCatalog(metadata.interfaces);
    }
  }, [metadata?.interfaces]);

  // Injectar o utilizador autenticado no permissionService
  useEffect(() => {
    if (authLoading) {
      if (initialized) setInitialized(false);
      return;
    }

    const currentUserId = user?.user_id || null;
    if (currentUserId === userIdRef.current && initialized) return;

    userIdRef.current = currentUserId;

    if (user) {
      permissionService.setUser(user);
    } else {
      permissionService.clearUser();
    }

    if (!initialized) setInitialized(true);
  }, [user?.user_id, authLoading, initialized]);

  // Pronto quando auth E metadata estiverem carregados
  const isReady = initialized && !authLoading && !metaLoading;

  const value = useMemo(() => ({
    initialized: isReady,
    // Aceita number (310) ou string ('operation.access')
    hasPermission: (permission) => permissionService.hasPermission(permission),
    hasAnyPermission: (permissions) => permissionService.hasAnyPermission(permissions),
    hasAllPermissions: (permissions) => permissionService.hasAllPermissions(permissions),
    checkBatchPermissions: (permissionMap) => permissionService.checkBatchPermissions(permissionMap),
    getUserPermissions: () => permissionService.getUserPermissions(),
    isAdmin: () => permissionService.isAdmin(),
    getUserProfile: () => permissionService.getUserProfile(),
  }), [isReady]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook principal de permissões
 * Uso: const { hasPermission } = usePermissions()
 *      hasPermission('operation.access')  // string da BD
 *      hasPermission(310)                 // ID numérico
 */
export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
}

// Backward-compat
export const usePermissionContext = usePermissions;

export default PermissionContext;
