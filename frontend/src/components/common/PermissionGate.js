// frontend/src/components/common/PermissionGate.js - NOVO ARQUIVO

import React, { useState, useEffect } from 'react';
import { usePermissionContext } from '../../contexts/PermissionContext';
import { Box, CircularProgress, Alert } from '@mui/material';

/**
 * Componente para controlar renderização baseada em permissões
 * 
 * Exemplos de uso:
 * 
 * // Permissão única
 * <PermissionGate permission="admin.users">
 *   <Button>Gerir Utilizadores</Button>
 * </PermissionGate>
 * 
 * // Múltiplas permissões (OR)
 * <PermissionGate permissions={["admin.users", "admin.dashboard"]}>
 *   <AdminPanel />
 * </PermissionGate>
 * 
 * // Múltiplas permissões (AND)
 * <PermissionGate permissions={["docs.view", "docs.edit"]} operator="AND">
 *   <DocumentEditor />
 * </PermissionGate>
 * 
 * // Com fallback personalizado
 * <PermissionGate 
 *   permission="payments.validate" 
 *   fallback={<Alert severity="warning">Sem acesso a pagamentos</Alert>}
 * >
 *   <PaymentValidation />
 * </PermissionGate>
 */
const PermissionGate = ({
    permission,
    permissions = [],
    operator = 'OR',
    fallback = null,
    loading: customLoading = null,
    children,
    showError = false,
    errorMessage = "Sem permissão para aceder a esta funcionalidade."
}) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions, initialized } = usePermissionContext();

    // Mostrar loading personalizado ou padrão
    if (!initialized) {
        if (customLoading !== null) {
            return customLoading;
        }
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                <CircularProgress size={20} />
            </Box>
        );
    }

    let hasAccess = false;
    if (permission) {
        // Permissão única
        hasAccess = hasPermission(permission);
    } else if (permissions.length > 0) {
        // Múltiplas permissões
        hasAccess = (operator === 'AND')
            ? hasAllPermissions(permissions)
            : hasAnyPermission(permissions);
    } else {
        // Sem permissões especificadas = acesso livre
        hasAccess = true;
    }

    // Sem acesso
    if (!hasAccess) {
        if (fallback !== null) {
            return fallback;
        }
        if (showError) {
            return (
                <Alert severity="warning" sx={{ m: 1 }}>
                    {errorMessage}
                </Alert>
            );
        }

        return null;
    }

    // Com acesso - renderizar conteúdo
    return children;
};

export default PermissionGate;