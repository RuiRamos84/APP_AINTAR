/**
 * Constantes para métodos de pagamento
 */
export const PAYMENT_METHODS = {
    CARD: 'CARD',
    MBWAY: 'MBWAY',
    MULTIBANCO: 'MULTIBANCO'
};

/**
 * Constantes para status de pagamento
 */
export const PAYMENT_STATUS = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
    PROCESSING: 'PROCESSING',
    UNKNOWN: 'UNKNOWN',
    DECLINED: 'Declined'
};

/**
 * Mapeamento de métodos de pagamento para labels em PT
 */
export const PAYMENT_METHOD_LABELS = {
    [PAYMENT_METHODS.CARD]: 'Cartão de Crédito/Débito',
    [PAYMENT_METHODS.MBWAY]: 'MB WAY',
    [PAYMENT_METHODS.MULTIBANCO]: 'Multibanco (Entidade e Referência)'
};

/**
 * Mapeamento de status de pagamento para labels em PT
 */
export const PAYMENT_STATUS_LABELS = {
    [PAYMENT_STATUS.PENDING]: 'Pendente',
    [PAYMENT_STATUS.PAID]: 'Pago',
    [PAYMENT_STATUS.FAILED]: 'Falhou',
    [PAYMENT_STATUS.EXPIRED]: 'Expirado',
    [PAYMENT_STATUS.CANCELLED]: 'Cancelado',
    [PAYMENT_STATUS.PROCESSING]: 'Em Processamento',
    [PAYMENT_STATUS.UNKNOWN]: 'Desconhecido',
    [PAYMENT_STATUS.DECLINED]: 'Recusado'
};

/**
 * Mapeamento de status de pagamento para cores
 */
export const PAYMENT_STATUS_COLORS = {
    [PAYMENT_STATUS.PENDING]: 'warning.main',
    [PAYMENT_STATUS.PAID]: 'success.main',
    [PAYMENT_STATUS.FAILED]: 'error.main',
    [PAYMENT_STATUS.EXPIRED]: 'error.light',
    [PAYMENT_STATUS.CANCELLED]: 'text.disabled',
    [PAYMENT_STATUS.PROCESSING]: 'info.main',
    [PAYMENT_STATUS.UNKNOWN]: 'text.secondary',
    [PAYMENT_STATUS.DECLINED]: 'error.main'
};