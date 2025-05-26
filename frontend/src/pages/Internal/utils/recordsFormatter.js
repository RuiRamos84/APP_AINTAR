// /utils/recordsFormatter.js
export const formatDate = (dateString) => {
    if (!dateString) return null;

    try {
        // Para strings no formato "Sun, 30 Apr 2023 00:00:00 GMT"
        const date = new Date(dateString);

        // Verificar se a data é válida
        if (isNaN(date.getTime())) {
            console.warn('Data inválida:', dateString);
            return dateString;
        }

        return date.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return dateString;
    }
};

export const formatCurrency = (value) => {
    if (!value && value !== 0) return "-";
    return parseFloat(value).toLocaleString("pt-PT", {
        style: "currency",
        currency: "EUR",
    });
};

export const formatBoolean = (value) => {
    return value ? "Sim" : "Não";
};

export const formatNumber = (value, decimals = 2) => {
    if (!value && value !== 0) return "-";
    return parseFloat(value).toLocaleString("pt-PT", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
  };