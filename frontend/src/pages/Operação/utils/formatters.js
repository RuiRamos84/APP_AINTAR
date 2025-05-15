export const formatCurrency = (value, currency = 'EUR') => {
    if (!value || isNaN(value)) return '0.00€';

    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: currency
    }).format(value);
};

export const formatPhoneNumber = (phone) => {
    if (!phone) return '';

    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 9) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }

    return phone;
};

export const formatAddress = (address, door, locality, parish) => {
    return [address, door && `Porta: ${door}`, locality, parish]
        .filter(Boolean)
        .join(', ');
};

export const formatBooleanParam = (value) => {
    if (value === '1' || value === true) return 'Sim';
    if (value === '0' || value === false) return 'Não';
    return '-';
};

export const formatDistance = (meters) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
};