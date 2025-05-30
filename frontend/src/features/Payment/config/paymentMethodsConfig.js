// frontend/src/features/Payment/config/paymentMethodsConfig.js

/**
 * Configuração de métodos de pagamento por perfil
 */
export const PAYMENT_METHODS = {
    MBWAY: 'MBWAY',
    MULTIBANCO: 'MULTIBANCO',
    BANK_TRANSFER: 'BANK_TRANSFER',
    CASH: 'CASH',
    MUNICIPALITY: 'MUNICIPALITY' // Novo método
};

/**
 * Configuração de perfis que podem usar cada método
 */
export const PAYMENT_METHOD_PERMISSIONS = {
    [PAYMENT_METHODS.MBWAY]: ['0', '1', '2', '3'],
    [PAYMENT_METHODS.MULTIBANCO]: ['0', '1', '2', '3'],
    [PAYMENT_METHODS.BANK_TRANSFER]: ['0', '1', '2', '3'],
    [PAYMENT_METHODS.CASH]: ['0', '1'],
    [PAYMENT_METHODS.MUNICIPALITY]: ['0', '2']
};

/**
 * Labels em PT-PT
 */
export const PAYMENT_METHOD_LABELS = {
    [PAYMENT_METHODS.MBWAY]: 'MB WAY',
    [PAYMENT_METHODS.MULTIBANCO]: 'Referências Multibanco',
    [PAYMENT_METHODS.BANK_TRANSFER]: 'Transferência Bancária',
    [PAYMENT_METHODS.CASH]: 'Dinheiro',
    [PAYMENT_METHODS.MUNICIPALITY]: 'Pagamento nos Municípios'
};

/**
 * Função para obter métodos disponíveis para um perfil
 */
export const getAvailableMethodsForProfile = (userProfile) => {
    if (!userProfile) return [];

    return Object.entries(PAYMENT_METHOD_PERMISSIONS)
        .filter(([_, allowedProfiles]) => allowedProfiles.includes(String(userProfile)))
        .map(([method]) => method);
};

/**
 * Função para verificar se um perfil pode usar um método
 */
export const canUsePaymentMethod = (userProfile, paymentMethod) => {
    if (!userProfile || !paymentMethod) return false;

    const allowedProfiles = PAYMENT_METHOD_PERMISSIONS[paymentMethod] || [];
    return allowedProfiles.includes(String(userProfile));
};