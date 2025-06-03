/**
 * Utilidades para processamento de pagamentos
 */

/**
 * Formata um número de telefone para o formato MB WAY
 * @param {string} phoneNumber - Número de telefone (ex: 912345678)
 * @returns {string} - Número formatado (ex: 351#912345678)
 */
export const formatMBWayPhone = (phoneNumber) => {
    if (!phoneNumber) return '';

    // Remover espaços e caracteres não numéricos
    const cleaned = phoneNumber.replace(/\s+/g, '').replace(/[^\d]/g, '');

    // Se já começar com 351, não adicionar o prefixo
    if (cleaned.startsWith('351')) {
        return `351#${cleaned.substring(3)}`;
    }

    return `351#${cleaned}`;
};

/**
 * Valida um número de telefone para MB WAY
 * @param {string} phoneNumber - Número de telefone
 * @returns {Object} - Objeto com resultado da validação
 */
export const validateMBWayPhone = (phoneNumber) => {
    if (!phoneNumber) {
        return { valid: false, error: 'Número de telefone é obrigatório' };
    }

    // Limpar o número
    const cleaned = phoneNumber.replace(/\s+/g, '').replace(/[^\d]/g, '');

    // Verificar se começa com 9 e tem 9 dígitos
    const phonePattern = /^9\d{8}$/;

    if (!phonePattern.test(cleaned)) {
        return {
            valid: false,
            error: 'Formato inválido. O número deve começar com 9 e ter 9 dígitos (ex: 912345678)'
        };
    }

    return { valid: true, error: null };
};

/**
 * Formata uma data de validade para exibição localizada
 * @param {string} dateString - Data no formato ISO
 * @returns {string} - Data formatada para exibição
 */
export const formatExpiryDate = (dateString) => {
    if (!dateString) return 'N/A';

    try {
        return new Date(dateString).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        console.error('Erro ao formatar data:', e);
        return 'N/A';
    }
};

/**
 * Formata um valor monetário para exibição localizada
 * @param {number} amount - Valor a formatar
 * @param {string} currency - Moeda (default: EUR)
 * @returns {string} - Valor formatado
 */
export const safeAmount = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
};

export const formatAmount = (value, decimals = 2) => {
    return safeAmount(value).toFixed(decimals);
};

export const formatCurrency = (value, currency = 'EUR') => {
    const amount = safeAmount(value);
    return `€${amount.toFixed(2)}`;
};

/**
 * Gera uma classe CSS baseada no status do pagamento
 * @param {string} status - Status do pagamento
 * @param {Object} theme - Tema MUI
 * @returns {string} - String de estilo CSS
 */
export const getStatusColor = (status, theme) => {
    switch (status) {
        case 'PAID':
            return theme.palette.success.main;
        case 'PENDING':
        case 'PROCESSING':
            return theme.palette.warning.main;
        case 'FAILED':
        case 'EXPIRED':
        case 'CANCELLED':
            return theme.palette.error.main;
        default:
            return theme.palette.text.secondary;
    }
};

/**
 * Calcula uma data de expiração futura
 * @param {number} days - Número de dias para adicionar
 * @returns {string} - Data ISO resultante
 */
export const calculateExpiryDate = (days = 2) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
};

export default {
    formatMBWayPhone,
    validateMBWayPhone,
    formatExpiryDate,
    formatCurrency,
    getStatusColor,
    calculateExpiryDate
};