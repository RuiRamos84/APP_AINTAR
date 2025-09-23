export const getCurrentDateTime = () => {
    const now = new Date();
    // Formata para YYYY-MM-DDTHH:MM, que é o formato esperado pelo input datetime-local
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().slice(0, 10); // Apenas data: YYYY-MM-DD
};

export const formatDate = (date) => {
    if (!date) return '';
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
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