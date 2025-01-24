export const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
};

export const formatDate = (date) => {
    if (!date) return '';
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(date).toLocaleString('pt-PT', options);
};

export const formatDateShort = (date) => {
    if (!date) return '';
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };
    return new Date(date).toLocaleString('pt-PT', options);
};

export const getDateRangeForPeriod = (period) => {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
        case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            startDate.setMonth(now.getMonth() - 1); // default to last month
    }

    return {
        start: startDate.toISOString(),
        end: now.toISOString()
    };
};

export const isDateInRange = (date, start, end) => {
    const checkDate = new Date(date);
    const startDate = new Date(start);
    const endDate = new Date(end);

    return checkDate >= startDate && checkDate <= endDate;
};