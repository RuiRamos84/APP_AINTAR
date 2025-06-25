// utils/formatters.js - CONSOLIDADO
export const formatDate = (value) => {
    if (!value || value.includes(' às ')) return value || '';
    return new Date(value).toLocaleString('pt-PT', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
};

export const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
};

export const formatAddress = (row) => {
    return [
        row.address,
        row.door && `Porta: ${row.door}`,
        row.nut4, row.nut3, row.nut2
    ].filter(Boolean).join(', ');
};

export const formatCurrency = (value, currency = 'EUR') => {
    if (!value || isNaN(value)) return '0.00€';
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency', currency
    }).format(value);
};

export const getUserNameByPk = (userPk, metaData) => {
    if (!userPk || !metaData?.who) return "Não atribuído";
    const user = metaData.who.find(u => u.pk === Number(userPk));
    return user ? user.name : `Utilizador #${userPk}`;
};

export const getRemainingDaysColor = (days) => {
    if (days <= 0) return 'error.main';
    if (days <= 15) return 'warning.main';
    if (days <= 30) return 'warning.light';
    return 'success.main';
};

export const getColumnsForView = (viewName, metaData = null) => {
    const baseColumns = [
        { id: "regnumber", label: "Nº Processo" },
        { id: "submission", label: "Data Submissão", format: formatDate },
        { id: "ts_entity", label: "Requerente" },
        { id: "phone", label: "Contacto" },
        { id: "who", label: "Atribuído a", format: (value) => getUserNameByPk(value, metaData) }
    ];

    if (viewName?.includes('ramais')) {
        return [
            ...baseColumns,
            { id: "tipo", label: "Tipo" },
            { id: "execution", label: "Data Execução", format: formatDate },
            { id: "limitdate", label: "Data Limite", format: formatDate },
            { id: "restdays", label: "Dias Restantes", format: (value) => `${Math.floor(value)} dias` }
        ];
    }
    return baseColumns;
};

export const sortViews = (views) => {
    const order = [
        "fossa", "ramais_execucao", "ramais_pavimentacao",
        "caixas", "desobstrucao", "pavimentacao", "rede"
    ];

    return Object.entries(views).sort((a, b) => {
        const aIndex = order.indexOf(a[0]);
        const bIndex = order.indexOf(b[0]);
        return aIndex !== bIndex ? aIndex - bIndex : a[1].name.localeCompare(b[1].name);
    });
};

// Validação
export const isBooleanParam = (name) => {
    return [
        "Gratuito", "Gratuita", "Existência de sanemanto até 20 m",
        "Existência de rede de água", "Urgência"
    ].includes(name);
};

// Sanitização
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};