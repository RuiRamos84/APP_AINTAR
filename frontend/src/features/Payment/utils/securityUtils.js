// frontend/src/features/Payment/utils/securityUtils.js

/**
 * Utilitários de segurança para o módulo de pagamentos
 * Versão simplificada sem dependências externas
 */

/**
 * Sanitiza input do utilizador
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;

    // Remove caracteres perigosos
    return input
        .replace(/[<>]/g, '') // Remove tags HTML
        .replace(/javascript:/gi, '') // Remove javascript:
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
};

/**
 * Valida número de telemóvel português
 */
export const validatePhoneNumber = (phone) => {
    const phoneRegex = /^(\+351)?[9][1236]\d{7}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    return phoneRegex.test(cleanPhone);
};

/**
 * Valida IBAN
 */
export const validateIBAN = (iban) => {
    const ibanRegex = /^PT50\d{21}$/;
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    return ibanRegex.test(cleanIBAN);
};

/**
 * Valida montante
 */
export const validateAmount = (amount) => {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0 && numAmount <= 10000;
};

/**
 * Mascara dados sensíveis para logs
 */
export const maskSensitiveData = (data) => {
    const masked = { ...data };

    // Mascara número de telemóvel
    if (masked.phoneNumber) {
        masked.phoneNumber = masked.phoneNumber.substring(0, 3) + '****' + masked.phoneNumber.substring(7);
    }

    // Mascara IBAN
    if (masked.iban) {
        masked.iban = masked.iban.substring(0, 4) + '****' + masked.iban.substring(masked.iban.length - 4);
    }

    // Mascara referência de pagamento
    if (masked.paymentReference) {
        const len = masked.paymentReference.length;
        masked.paymentReference = masked.paymentReference.substring(0, 2) +
            '*'.repeat(Math.max(0, len - 4)) +
            masked.paymentReference.substring(len - 2);
    }

    return masked;
};

/**
 * Gera um token único para a sessão
 */
export const generateSessionToken = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
};

/**
 * Verifica se o token da sessão é válido (não expirou)
 */
export const isSessionTokenValid = (token, maxAgeMinutes = 30) => {
    if (!token) return false;

    const [timestamp] = token.split('-');
    const tokenTime = parseInt(timestamp);
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;

    return (now - tokenTime) < maxAge;
};

/**
 * Rate limiting para prevenir spam
 */
class RateLimiter {
    constructor(maxRequests = 5, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    isAllowed(key) {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];

        // Remove requisições antigas
        const recentRequests = userRequests.filter(time => now - time < this.windowMs);

        if (recentRequests.length >= this.maxRequests) {
            return false;
        }

        recentRequests.push(now);
        this.requests.set(key, recentRequests);

        return true;
    }

    reset(key) {
        this.requests.delete(key);
    }
}

export const paymentRateLimiter = new RateLimiter(5, 60000); // 5 requests per minute

/**
 * Validação de perfil de utilizador
 */
export const validateUserProfile = (profile) => {
    const validProfiles = ['0', '1', '2', '3'];
    return profile && validProfiles.includes(String(profile));
};

/**
 * Verificação de integridade de dados - versão simplificada
 */
export const generateChecksum = (data) => {
    const sortedData = Object.keys(data)
        .sort()
        .reduce((obj, key) => {
            obj[key] = data[key];
            return obj;
        }, {});

    // Simples hash function sem crypto-js
    let hash = 0;
    const str = JSON.stringify(sortedData);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
};

/**
 * Verifica checksum
 */
export const verifyChecksum = (data, checksum) => {
    const calculatedChecksum = generateChecksum(data);
    return calculatedChecksum === checksum;
};