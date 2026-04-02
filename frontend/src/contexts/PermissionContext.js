// frontend/src/contexts/PermissionContext.js

/**
 * PermissionContext
 * Liga o permissionService ao AuthContext (user) e ao MetaDataContext (catálogo da BD).
 *
 * Padrão idêntico ao frontend-v2:
 * - catalogVersion: incrementa APÓS setInterfaceCatalog() → garante que isReady só é true
 *   depois do _interfaceMap estar populado (fix da race condition)
 * - userVersion: incrementa quando as interfaces do utilizador mudam efectivamente →
 *   permite que alterações de permissões se reflictam com F5 sem logout
 * - interfaceKey: string estável das PKs ordenadas → detecta mudanças reais de interfaces
 */

import React, {
    createContext, useContext, useEffect, useState, useMemo, useCallback, useRef
} from 'react';
import { useAuth } from './AuthContext';
import { useMetaData } from './MetaDataContext';
import permissionService from '../services/permissionService';

const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
    const { user, isLoading: authLoading } = useAuth();
    const { metaData, loading: metaLoading } = useMetaData();

    const [initialized, setInitialized] = useState(false);
    const [catalogVersion, setCatalogVersion] = useState(0);
    const [userVersion, setUserVersion] = useState(0);

    // Chave estável das interfaces: muda só quando o conjunto de PKs muda efectivamente
    const interfaceKey = useMemo(
        () => (user?.interfaces || []).slice().sort((a, b) => a - b).join(','),
        [user?.interfaces]
    );

    // Injectar catálogo de interfaces da BD no permissionService.
    // setCatalogVersion corre APÓS setInterfaceCatalog → isReady só fica true com catálogo pronto.
    useEffect(() => {
        if (metaLoading) return;
        permissionService.setInterfaceCatalog(metaData?.interfaces || []);
        setCatalogVersion(v => v + 1);
    }, [metaLoading, metaData?.interfaces]);

    // Injectar utilizador autenticado.
    // interfaceKey como dependência garante que corre quando as permissões mudam (ex: F5 com /auth/me).
    useEffect(() => {
        if (authLoading) {
            if (initialized) setInitialized(false);
            return;
        }

        if (user) {
            permissionService.setUser(user);
            setUserVersion(v => v + 1);
        } else {
            permissionService.clearLocalState();
        }

        if (!initialized) setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.user_id, interfaceKey, authLoading]);

    // Pronto quando auth está inicializado E catálogo foi carregado pelo menos 1x
    const isReady = initialized && !authLoading && catalogVersion > 0;

    const hasPermission = useCallback(
        (permission) => {
            if (!isReady) return false;
            return permissionService.hasPermission(permission);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isReady, catalogVersion, userVersion]
    );

    const hasAnyPermission = useCallback(
        (permissionList) => {
            if (!permissionList || permissionList.length === 0) return true;
            if (!isReady) return false;
            return permissionService.hasAnyPermission(permissionList);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isReady, catalogVersion, userVersion]
    );

    const hasAllPermissions = useCallback(
        (permissionList) => {
            if (!permissionList || permissionList.length === 0) return true;
            if (!isReady) return false;
            return permissionService.hasAllPermissions(permissionList);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isReady, catalogVersion, userVersion]
    );

    const checkPermissions = useCallback(
        (permissionMap) => {
            if (user?.profil === '0') {
                return Object.keys(permissionMap).reduce((acc, key) => {
                    acc[key] = true;
                    return acc;
                }, {});
            }
            return permissionService.checkBatchPermissions(permissionMap);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isReady, catalogVersion, userVersion, user?.profil]
    );

    const isAdmin = useCallback(
        () => String(user?.profil) === '0',
        [user?.profil]
    );

    const reload = useCallback(() => {
        // Com o novo sistema, as permissões actualizam via F5 (/auth/me).
        // Esta função mantida para retrocompatibilidade.
        Promise.resolve();
    }, []);

    const contextValue = useMemo(() => ({
        // Estado
        permissions: user?.interfaces || [],
        loading: !isReady && !authLoading,
        initialized: isReady,
        user,

        // Métodos de verificação
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        checkPermissions,
        isAdmin,

        // Utilidades
        reload,
        getCacheStats: () => permissionService.getCacheStats(),
    }), [
        isReady, authLoading, user,
        hasPermission, hasAnyPermission, hasAllPermissions,
        checkPermissions, isAdmin, reload,
    ]);

    return (
        <PermissionContext.Provider value={contextValue}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermissionContext = () => {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermissionContext must be used within PermissionProvider');
    }
    return context;
};

export const usePermissions = () => {
    const context = usePermissionContext();
    return {
        permissions: context.permissions,
        hasPermission: context.hasPermission,
        hasAnyPermission: context.hasAnyPermission,
        hasAllPermissions: context.hasAllPermissions,
        checkPermissions: context.checkPermissions,
        loading: context.loading,
        initialized: context.initialized,
        reload: context.reload,
        isAdmin: context.isAdmin,
    };
};

export default PermissionContext;
