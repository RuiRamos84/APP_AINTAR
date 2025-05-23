// /utils/recordsFormatter.js
export const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
        return new Date(dateString).toLocaleDateString("pt-PT", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (error) {
        console.error("Erro ao formatar data:", error);
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