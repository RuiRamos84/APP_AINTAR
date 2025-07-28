// frontend/src/pages/Global/utils/helpers.js

export const formatDate = (dateString, options = {}) => {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: options.includeTime ? '2-digit' : undefined,
            minute: options.includeTime ? '2-digit' : undefined,
            ...options
        });
    } catch {
        return dateString;
    }
};

export const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return parseFloat(value).toLocaleString('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
};

export const formatNumber = (value, decimals = 3) => {
    if (!value && value !== 0) return '-';
    return parseFloat(value).toLocaleString('pt-PT', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};

export const getCurrentDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDateTime = new Date(now.getTime() - offset * 60 * 1000);
    return localDateTime.toISOString().slice(0, 16);
};

export const getAreaById = (areaId, areas) => {
    return Object.values(areas).find(area => area.id === areaId);
};

export const validateForm = (data, fields) => {
    const errors = {};

    fields.forEach(field => {
        if (field.required && (!data[field.name] || data[field.name] === '')) {
            errors[field.name] = 'Campo obrigatório';
        }

        if (field.type === 'number' && data[field.name] && isNaN(parseFloat(data[field.name]))) {
            errors[field.name] = 'Deve ser um número válido';
        }
    });

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export const buildPayload = (formData, fields, entityId = null) => {
    const payload = {};

    fields.forEach(field => {
        const value = formData[field.name];
        if (value !== undefined && value !== '') {
            switch (field.type) {
                case 'number':
                    payload[field.apiField || field.name] = parseFloat(value);
                    break;
                case 'select':
                    payload[field.apiField || field.name] = parseInt(value, 10);
                    break;
                default:
                    payload[field.apiField || field.name] = value;
            }
        }
    });

    if (entityId) {
        payload.pnpk = entityId;
    }

    return payload;
};

export const processWaterVolumeRecords = (records) => {
    return records.map((record, index) => {
        const nextRecord = records[index + 1];
        let diasDecorridos = '-';
        let volumeConsumido = '-';

        if (nextRecord) {
            const dataActual = new Date(record.data);
            const dataAnterior = new Date(nextRecord.data);
            diasDecorridos = Math.floor((dataActual - dataAnterior) / (1000 * 60 * 60 * 24));

            const valorActual = parseFloat(record.valor) || 0;
            const valorAnterior = parseFloat(nextRecord.valor) || 0;
            volumeConsumido = Math.max(0, valorActual - valorAnterior);
        }

        return {
            ...record,
            diasDecorridos,
            volumeConsumido
        };
    });
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};