/**
 * Métodos de pagamento
 */
export const PAYMENT_METHODS = {
    MBWAY: 'MBWAY',
    MULTIBANCO: 'MULTIBANCO',
    CASH: 'CASH',
    BANK_TRANSFER: 'BANK_TRANSFER',
    MUNICIPALITY: 'MUNICIPALITY'
};

/**
 * Estados de pagamento (alinhados com backend)
 */
export const PAYMENT_STATUS = {
    CREATED: 'CREATED',
    PENDING: 'PENDING',
    PENDING_VALIDATION: 'PENDING_VALIDATION',
    SUCCESS: 'SUCCESS',
    DECLINED: 'DECLINED',
    EXPIRED: 'EXPIRED',
    // Aliases para compatibilidade
    PAID: 'SUCCESS',
    FAILED: 'DECLINED',
    UNKNOWN: 'PENDING'
};

/**
 * Permissões por perfil
 */
export const PAYMENT_METHOD_PERMISSIONS = {
    [PAYMENT_METHODS.MBWAY]: ['0', '1', '2', '3'],
    [PAYMENT_METHODS.MULTIBANCO]: ['0', '1', '2', '3'],
    [PAYMENT_METHODS.BANK_TRANSFER]: ['0', '1', '2', '3'],
    [PAYMENT_METHODS.CASH]: ['0', '1'],
    [PAYMENT_METHODS.MUNICIPALITY]: ['0', '2']
};

/**
 * Labels em português
 */
export const PAYMENT_METHOD_LABELS = {
    [PAYMENT_METHODS.MBWAY]: 'MB WAY',
    [PAYMENT_METHODS.MULTIBANCO]: 'Multibanco',
    [PAYMENT_METHODS.CASH]: 'Numerário',
    [PAYMENT_METHODS.BANK_TRANSFER]: 'Transferência',
    [PAYMENT_METHODS.MUNICIPALITY]: 'Municípios'
};

export const PAYMENT_STATUS_LABELS = {
    [PAYMENT_STATUS.CREATED]: 'Iniciado',
    [PAYMENT_STATUS.PENDING]: 'Pendente',
    [PAYMENT_STATUS.PENDING_VALIDATION]: 'Aguarda validação',
    [PAYMENT_STATUS.SUCCESS]: 'Pago',
    [PAYMENT_STATUS.DECLINED]: 'Rejeitado',
    [PAYMENT_STATUS.EXPIRED]: 'Expirado'
};

/**
 * Cores por estado
 */
export const PAYMENT_STATUS_COLORS = {
    [PAYMENT_STATUS.CREATED]: 'info.main',
    [PAYMENT_STATUS.PENDING]: 'warning.main',
    [PAYMENT_STATUS.PENDING_VALIDATION]: 'info.light',
    [PAYMENT_STATUS.SUCCESS]: 'success.main',
    [PAYMENT_STATUS.DECLINED]: 'error.main',
    [PAYMENT_STATUS.EXPIRED]: 'error.light'
};

/**
 * Métodos disponíveis para perfil
 */
export const getAvailableMethodsForProfile = (userProfile) => {
    if (!userProfile) return [];

    return Object.entries(PAYMENT_METHOD_PERMISSIONS)
        .filter(([_, profiles]) => profiles.includes(String(userProfile)))
        .map(([method]) => method);
};

/**
 * Verificar permissão
 */
export const canUsePaymentMethod = (userProfile, paymentMethod) => {
    if (!userProfile || !paymentMethod) return false;

    const allowedProfiles = PAYMENT_METHOD_PERMISSIONS[paymentMethod] || [];
    return allowedProfiles.includes(String(userProfile));
};

/**
 * Mapear estado backend → frontend
 */
export const mapBackendStatus = (backendStatus) => {
    const mapping = {
        'CREATED': PAYMENT_STATUS.CREATED,
        'PENDING': PAYMENT_STATUS.PENDING,
        'PENDING_VALIDATION': PAYMENT_STATUS.PENDING_VALIDATION,
        'SUCCESS': PAYMENT_STATUS.SUCCESS,
        'DECLINED': PAYMENT_STATUS.DECLINED,
        'EXPIRED': PAYMENT_STATUS.EXPIRED,
        // Compatibilidade
        'PAID': PAYMENT_STATUS.SUCCESS,
        'FAILED': PAYMENT_STATUS.DECLINED
    };
    return mapping[backendStatus] || PAYMENT_STATUS.PENDING;
};