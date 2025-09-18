// frontend/src/features/Payment/services/paymentTypes.js - ATUALIZADO

/**
 * ===== SISTEMA DE PAGAMENTOS - MIGRADO PARA SISTEMA CENTRALIZADO =====
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

// Mapeamento para o novo sistema de permissões
const PAYMENT_PERMISSION_MAP = {
    [PAYMENT_METHODS.MBWAY]: 'payments.mbway',
    [PAYMENT_METHODS.MULTIBANCO]: 'payments.multibanco',
    [PAYMENT_METHODS.CASH]: 'payments.cash',
    [PAYMENT_METHODS.BANK_TRANSFER]: 'payments.bank_transfer',
    [PAYMENT_METHODS.MUNICIPALITY]: 'payments.municipality'
};

/**
 * Verificar se utilizador pode usar método específico (NOVA IMPLEMENTAÇÃO)
 */
export const canUsePaymentMethod = async (paymentMethod) => {
    const permission = PAYMENT_PERMISSION_MAP[paymentMethod];
    if (!permission) return false;

    return await permissionService.hasPermission(permission);
};

/**
 * Obter métodos disponíveis para utilizador (NOVA IMPLEMENTAÇÃO)
 */
export const getAvailableMethodsForUserAsync = async () => {
    const methodPermissions = Object.values(PAYMENT_PERMISSION_MAP);
    const results = await permissionService.checkPermissions(methodPermissions);

    const availableMethods = [];
    Object.entries(PAYMENT_PERMISSION_MAP).forEach(([method, permission]) => {
        if (results[permission]) {
            availableMethods.push(method);
        }
    });

    return availableMethods;
};

/**
 * Verificar se pode gerir pagamentos (NOVA IMPLEMENTAÇÃO)
 */
export const canManagePayments = async () => {
    return await permissionService.hasPermission('payments.validate');
};

/**
 * Verificar se pode processar pagamentos CASH (NOVA IMPLEMENTAÇÃO)
 */
export const canProcessCashPayments = async () => {
    return await permissionService.hasPermission('payments.cash.process');
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