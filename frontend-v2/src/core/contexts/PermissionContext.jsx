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

  // catalogVersion — incrementa quando o catálogo (ts_interface) é (re)carregado:
  //   fix da race condition: isReady só fica true APÓS _interfaceMap estar populado
  //   também propaga refreshMetadata() do admin sem logout
  const [catalogVersion, setCatalogVersion] = useState(0);

  // userVersion — incrementa quando as interfaces do utilizador mudam efectivamente:
  //   permite que alterações de permissões na BD sejam reflectidas com F5 sem logout
  const [userVersion, setUserVersion] = useState(0);

  const userIdRef = useRef(null);

  // Chave estável das interfaces: muda só quando o conjunto de PKs muda
  // Usado como dependência para detectar alterações reais (não apenas de referência)
  const interfaceKey = useMemo(
    () => (user?.interfaces || []).slice().sort((a, b) => a - b).join(','),
    [user?.interfaces]
  );

  // Injectar catálogo de interfaces da BD no permissionService.
  // Corre quando o metadata termina de carregar OU quando é refrescado em background.
  useEffect(() => {
    if (metaLoading) return;
    permissionService.setInterfaceCatalog(metadata?.interfaces || []);
    setCatalogVersion(v => v + 1);
  }, [metaLoading, metadata?.interfaces]);

  // Injectar o utilizador autenticado no permissionService.
  // Depende de interfaceKey para detectar alterações reais de permissões (ex: /auth/me no F5).
  useEffect(() => {
    if (authLoading) {
      if (initialized) setInitialized(false);
      return;
    }

    const currentUserId = user?.user_id || null;
    userIdRef.current = currentUserId;

    if (user) {
      permissionService.setUser(user);
      setUserVersion(v => v + 1);
    } else {
      permissionService.clearUser();
    }

    if (!initialized) setInitialized(true);
  // interfaceKey garante que o efeito corre quando as permissões mudam, mesmo sem logout
  }, [user?.user_id, interfaceKey, authLoading, initialized]);

  // Pronto quando auth está inicializado E catálogo foi carregado pelo menos 1x.
  const isReady = initialized && !authLoading && catalogVersion > 0;

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
  }), [isReady, catalogVersion, userVersion]);

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
