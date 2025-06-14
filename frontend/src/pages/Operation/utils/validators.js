export const validatePhone = (phone) => {
    if (!phone) return { valid: false, error: 'Telefone obrigatório' };

    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 9) {
        return { valid: false, error: 'Telefone deve ter 9 dígitos' };
    }

    const regex = /^[239]\d{8}$/;
    if (!regex.test(cleaned)) {
        return { valid: false, error: 'Formato de telefone inválido' };
    }

    return { valid: true };
};

export const validateEmail = (email) => {
    if (!email) return { valid: false, error: 'Email obrigatório' };

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
        return { valid: false, error: 'Formato de email inválido' };
    }

    return { valid: true };
};

export const validateNIF = (nif) => {
    if (!nif) return { valid: false, error: 'NIF obrigatório' };

    const cleaned = nif.replace(/\D/g, '');
    if (cleaned.length !== 9) {
        return { valid: false, error: 'NIF deve ter 9 dígitos' };
    }

    // Validação específica de NIF português
    const multipliers = [9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 8; i++) {
        sum += parseInt(cleaned[i]) * multipliers[i];
    }

    const checkDigit = 11 - (sum % 11);
    const finalDigit = checkDigit >= 10 ? 0 : checkDigit;

    if (finalDigit !== parseInt(cleaned[8])) {
        return { valid: false, error: 'NIF inválido' };
    }

    return { valid: true };
};

export const validateDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) {
        return { valid: true }; // Datas opcionais
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
        return { valid: false, error: 'Data final deve ser posterior à inicial' };
    }

    return { valid: true };
};

export const validateCisternsNumber = (value) => {
    if (!value) return { valid: false, error: 'Número de cisternas obrigatório' };

    const num = parseInt(value);
    if (isNaN(num) || num < 1 || num > 10) {
        return { valid: false, error: 'Número deve estar entre 1 e 10' };
    }

    return { valid: true };
};