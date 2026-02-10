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
export const formatDateTime = (dateString) => {
    if (!dateString) return null;

    try {
        // Converte a string do backend para Date
        const date = new Date(dateString);

        // Verifica se é válido
        if (isNaN(date.getTime())) {
            console.warn('Data inválida:', dateString);
            return dateString;
        }

        // Extrai dia, mês, ano
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        // Extrai hora e minutos
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        // Retorna no formato dd/MM/yyyy HH:mm
        return `${day}/${month}/${year} ${hours}:${minutes}`;
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
  // Função para printar um registro de inventário
export const printInventoryRecord = (record) => {
  if (!record || typeof record !== "object") {
    console.error("Registro inválido:", record);
    return;
  }

 
};