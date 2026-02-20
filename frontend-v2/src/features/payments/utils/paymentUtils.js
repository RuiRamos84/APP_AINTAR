/**
 * Utilidades para processamento de pagamentos
 */

export const formatMBWayPhone = (phoneNumber) => {
    if (!phoneNumber) return '';
    const cleaned = phoneNumber.replace(/\s+/g, '').replace(/[^\d]/g, '');
    if (cleaned.startsWith('351')) {
        return `351#${cleaned.substring(3)}`;
    }
    return `351#${cleaned}`;
};

export const validateMBWayPhone = (phoneNumber) => {
    if (!phoneNumber) {
        return { valid: false, error: 'Número de telefone é obrigatório' };
    }
    const cleaned = phoneNumber.replace(/\s+/g, '').replace(/[^\d]/g, '');
    if (!/^9\d{8}$/.test(cleaned)) {
        return {
            valid: false,
            error: 'Formato inválido. O número deve começar com 9 e ter 9 dígitos (ex: 912345678)'
        };
    }
    return { valid: true, error: null };
};

export const formatExpiryDate = (dateString) => {
    if (!dateString) return 'N/D';
    try {
        return new Date(dateString).toLocaleDateString('pt-PT', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    } catch {
        return 'N/D';
    }
};

export const safeAmount = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
};

export const formatAmount = (value, decimals = 2) => {
    return safeAmount(value).toFixed(decimals);
};

export const formatCurrency = (value) => {
    return `€${safeAmount(value).toFixed(2)}`;
};

export const getStatusColor = (status, theme) => {
    switch (status) {
        case 'PAID':
        case 'SUCCESS':
            return theme.palette.success.main;
        case 'PENDING':
        case 'PROCESSING':
        case 'PENDING_VALIDATION':
            return theme.palette.warning.main;
        case 'FAILED':
        case 'EXPIRED':
        case 'CANCELLED':
        case 'DECLINED':
            return theme.palette.error.main;
        default:
            return theme.palette.text.secondary;
    }
};

export const calculateExpiryDate = (days = 2) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
};
