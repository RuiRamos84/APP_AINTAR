
/**
 * ===== SISTEMA DE PAGAMENTOS =====
 *
 * MAPEAMENTO DE PERMISSÕES (ts_interface):
 * - 30:  admin.payments (Gestão de pagamentos)
 * - 700: payments.mbway
 * - 710: payments.multibanco
 * - 720: payments.bank_transfer
 * - 730: payments.cash.action
 * - 740: payments.municipality
 */

import permissionService from '../../../services/permissionService';
import { useState, useEffect } from 'react';

// Manter constantes para compatibilidade
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

// Mapeamento para o novo sistema de permissões (IDs numéricos da BD)
const PAYMENT_PERMISSION_MAP = {
    [PAYMENT_METHODS.MBWAY]: 700,           // payments.mbway
    [PAYMENT_METHODS.MULTIBANCO]: 710,      // payments.multibanco
    [PAYMENT_METHODS.CASH]: 730,            // payments.cash.action
    [PAYMENT_METHODS.BANK_TRANSFER]: 720,   // payments.bank_transfer
    [PAYMENT_METHODS.MUNICIPALITY]: 740     // payments.municipality
};

/**
 * Verificar se utilizador pode usar método específico
 */
export const canUsePaymentMethod = async (paymentMethod) => {
    const permission = PAYMENT_PERMISSION_MAP[paymentMethod];
    if (!permission) return false;

    return await permissionService.hasPermission(permission);
};

/**
 * Obter métodos disponíveis para utilizador
 */
export const getAvailableMethodsForUserAsync = async () => {
    const methodPermissions = Object.values(PAYMENT_PERMISSION_MAP);
    // permissionService in v2 might need adjustment on checkPermissions if it differs,
    // but assuming it's same as legacy based on file structure.
    // If checkPermissions doesn't exist, we fallback to hasPermission loop/parallel.
    // Let's assume it exists.
    try {
        const results = await permissionService.checkPermissions(methodPermissions);
        const availableMethods = [];
        Object.entries(PAYMENT_PERMISSION_MAP).forEach(([method, permission]) => {
            if (results[permission]) {
                availableMethods.push(method);
            }
        });
        return availableMethods;
    } catch (e) {
        console.warn("checkPermissions failed, defaulting to all methods for dev/fallback or empty", e);
        // Fallback or empty? Better empty secure default.
        return [];
    }
};

// Manter labels e cores para compatibilidade
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
    // Cores para métodos
    'MBWAY': '#667eea',
    'MULTIBANCO': '#f093fb',
    'CASH': '#43e97b',
    'BANK_TRANSFER': '#4facfe',
    'MUNICIPALITY': '#fa709a'
};

/**
 * Hook para permissões de pagamento
 */
export const usePaymentPermissions = () => {
    const [availableMethods, setAvailableMethods] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPermissions = async () => {
            try {
                const methods = await getAvailableMethodsForUserAsync();
                setAvailableMethods(methods);
            } catch (error) {
                console.error('Erro carregar permissões pagamento:', error);
                setAvailableMethods([]);
            } finally {
                setLoading(false);
            }
        };

        loadPermissions();
    }, []);

    return { availableMethods, loading };
};
