/**
 * PermissionContext
 * React context for permission checking
 *
 * Liga o permissionService ao AuthContext (user).
 * Permissões chegam como strings no user.permissions — sem catálogo, sem localStorage.
 */

import { createContext, useContext, useEffect, useMemo } from 'react';
import permissionService from '@/services/permissionService';
import { useAuth } from './AuthContext';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { user, isLoading: authLoading } = useAuth();

  // Sincronizar permissionService com o estado React actual.
  // useEffect é o mecanismo correto para efeitos colaterais — useMemo não garante execução.
  useEffect(() => {
    if (user) {
      permissionService.setUser(user);
    } else {
      permissionService.clearUser();
    }
  }, [user]);

  // Pronto quando auth terminou E (sem utilizador OU user tem permissions carregadas).
  // user.permissions é preenchido pelo backend no login/refresh/me — sempre presente.
  const isReady = !authLoading && (!user || Array.isArray(user?.permissions));

  const value = useMemo(() => ({
    initialized: isReady,
    hasPermission: (permission) => permissionService.hasPermission(permission),
    hasAnyPermission: (permissions) => permissionService.hasAnyPermission(permissions),
    hasAllPermissions: (permissions) => permissionService.hasAllPermissions(permissions),
    checkBatchPermissions: (permissionMap) => permissionService.checkBatchPermissions(permissionMap),
    getUserPermissions: () => permissionService.getUserPermissions(),
    isAdmin: () => permissionService.isAdmin(),
    getUserProfile: () => permissionService.getUserProfile(),
  }), [isReady, user]);

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
 *      hasPermission(310)                 // ID numérico (legacy)
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
