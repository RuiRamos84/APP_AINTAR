// frontend/src/features/Payment/services/paymentTypes.js

/**
 * ===== SISTEMA DE PAGAMENTOS - MAPEAMENTO DE PERMISSÕES =====
 *
 * IDs numéricos da tabela ts_interface:
 * - 30:  admin.payments (Gestão de pagamentos)
 * - 700: payments.mbway
 * - 710: payments.multibanco
 * - 720: payments.bank_transfer
 * - 730: payments.cash.action
 * - 740: payments.municipality
 */

import permissionService from '../../../services/permissionService';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { useMemo } from 'react';

export const PAYMENT_METHODS = {
    MBWAY: 'MBWAY',
    MULTIBANCO: 'MULTIBANCO',
    CASH: 'CASH',
    BANK_TRANSFER: 'BANK_TRANSFER',
    MUNICIPALITY: 'MUNICIPALITY'
};

export const PAYMENT_STATUS = {
    CREATED: 'CREATED',
    PENDING: 'PENDING',
    PENDING_VALIDATION: 'PENDING_VALIDATION',
    SUCCESS: 'SUCCESS',
    DECLINED: 'DECLINED',
    EXPIRED: 'EXPIRED'
};

const PAYMENT_PERMISSION_MAP = {
    [PAYMENT_METHODS.MBWAY]: 700,
    [PAYMENT_METHODS.MULTIBANCO]: 710,
    [PAYMENT_METHODS.CASH]: 730,
    [PAYMENT_METHODS.BANK_TRANSFER]: 720,
    [PAYMENT_METHODS.MUNICIPALITY]: 740
};

export const PAYMENT_METHOD_LABELS = {
    [PAYMENT_METHODS.MBWAY]: 'MB WAY',
    [PAYMENT_METHODS.MULTIBANCO]: 'Multibanco',
    [PAYMENT_METHODS.CASH]: 'Numerário',
    [PAYMENT_METHODS.BANK_TRANSFER]: 'Transferência',
    [PAYMENT_METHODS.MUNICIPALITY]: 'Municípios'
};

export const PAYMENT_STATUS_COLORS = {
    [PAYMENT_STATUS.CREATED]: 'info.main',
    [PAYMENT_STATUS.PENDING]: 'warning.main',
    [PAYMENT_STATUS.PENDING_VALIDATION]: 'info.light',
    [PAYMENT_STATUS.SUCCESS]: 'success.main',
    [PAYMENT_STATUS.DECLINED]: 'error.main',
    [PAYMENT_STATUS.EXPIRED]: 'error.light',
    'MBWAY': '#667eea',
    'MULTIBANCO': '#f093fb',
    'CASH': '#43e97b',
    'BANK_TRANSFER': '#4facfe',
    'MUNICIPALITY': '#fa709a'
};

/**
 * Hook para permissões de pagamento.
 * Usa usePermissionContext (reactivo) — recalcula quando o catálogo carrega.
 */
export const usePaymentPermissions = () => {
    const { hasPermission, initialized } = usePermissionContext();

    const availableMethods = useMemo(() => {
        if (!initialized) return [];
        return Object.entries(PAYMENT_PERMISSION_MAP)
            .filter(([, permId]) => hasPermission(permId))
            .map(([method]) => method);
    }, [hasPermission, initialized]);

    return { availableMethods, loading: !initialized };
};

// Helpers síncronos (usam permissionService directamente — apenas válidos após catálogo carregado)
export const canUsePaymentMethod = (paymentMethod) => {
    const permission = PAYMENT_PERMISSION_MAP[paymentMethod];
    if (!permission) return false;
    return permissionService.hasPermission(permission);
};

export const canManagePayments = () => permissionService.hasPermission(30);
export const canProcessCashPayments = () => permissionService.hasPermission(730);

export const getAvailableMethodsSync = () =>
    Object.entries(PAYMENT_PERMISSION_MAP)
        .filter(([, permId]) => permissionService.hasPermission(permId))
        .map(([method]) => method);
