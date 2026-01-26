/**
 * PermissionContext
 * React context for permission checking
 * Wraps PermissionService and provides hooks for components
 */

import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import permissionService from '@/services/permissionService';
import { useAuth } from './AuthContext';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { user, isLoading } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const userIdRef = useRef(null);

  // Initialize permission service when user changes
  useEffect(() => {
    // Early return if loading
    if (isLoading) {
      if (initialized) setInitialized(false);
      return;
    }

    // Check if user actually changed (prevent redundant updates)
    const currentUserId = user?.user_id || null;
    if (currentUserId === userIdRef.current && initialized) {
      return; // No change, skip update
    }

    userIdRef.current = currentUserId;

    // Update permission service
    if (user) {
      permissionService.setUser(user);
    } else {
      permissionService.clearUser();
    }

    // Mark as initialized
    if (!initialized) {
      setInitialized(true);
    }
  }, [user?.user_id, isLoading, initialized]);

  // Memoizar o value para evitar re-renders desnecessários
  const value = useMemo(() => ({
    initialized,
    hasPermission: (permissionId) => permissionService.hasPermission(permissionId),
    hasAnyPermission: (permissions) => permissionService.hasAnyPermission(permissions),
    hasAllPermissions: (permissions) => permissionService.hasAllPermissions(permissions),
    checkBatchPermissions: (permissionMap) => permissionService.checkBatchPermissions(permissionMap),
    getUserPermissions: () => permissionService.getUserPermissions(),
    isAdmin: () => permissionService.isAdmin(),
    getUserProfile: () => permissionService.getUserProfile(),
  }), [initialized]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to use permission context
 */
export function usePermissionContext() {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider');
  }

  return context;
}

export default PermissionContext;
