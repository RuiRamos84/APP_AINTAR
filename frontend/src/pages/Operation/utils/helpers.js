// Formatação de datas
export const formatDate = (value) => {
    if (!value) return '';

    if (value.includes(' às ')) {
        return value;
    }

    const date = new Date(value);
    return date.toLocaleString('pt-PT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Nome do utilizador por PK
export const getUserNameByPk = (userPk, metaData) => {
    if (!userPk || !metaData?.who) return "Não atribuído";

    const user = metaData.who.find(u => u.pk === Number(userPk));
    return user ? user.name : `Utilizador #${userPk}`;
};

// Colunas por vista
export const getColumnsForView = (viewName, metaData = null) => {
    const baseColumns = [
        { id: "regnumber", label: "Nº Processo" },
        {
            id: "submission",
            label: "Data Submissão",
            format: formatDate
        },
        { id: "ts_entity", label: "Requerente" },
        { id: "phone", label: "Contacto" },
        {
            id: "who",
            label: "Atribuído a",
            format: (value) => getUserNameByPk(value, metaData)
        }
    ];

    const viewSpecificColumns = {
        ramais: [
            ...baseColumns,
            { id: "tipo", label: "Tipo" },
            {
                id: "execution",
                label: "Data Execução",
                format: formatDate
            },
            {
                id: "limitdate",
                label: "Data Limite",
                format: formatDate
            },
            {
                id: "restdays",
                label: "Dias Restantes",
                format: (value) => `${Math.floor(value)} dias`
            }
        ],
        fossa: [
            ...baseColumns,
        ],
    };

    if (viewName?.startsWith('vbr_document_ramais')) {
        return viewSpecificColumns.ramais;
    }
    if (viewName?.startsWith('vbr_document_fossa')) {
        return viewSpecificColumns.fossa;
    }

    return baseColumns;
};

// Cor por dias restantes
export const getRemainingDaysColor = (days) => {
    if (days <= 0) return 'error.main';
    if (days <= 15) return 'warning.main';
    if (days <= 30) return 'warning.light';
    return 'success.main';
};

// Ordenação de vistas
export const sortViews = (views) => {
    const order = [
        "vbr_document_fossa",
        "vbr_document_ramais",
        "vbr_document_caixas",
        "vbr_document_desobstrucao",
        "vbr_document_pavimentacao",
        "vbr_document_rede",
    ];

    return Object.entries(views).sort((a, b) => {
        const aIndex = order.findIndex((item) => a[0].startsWith(item));
        const bIndex = order.findIndex((item) => b[0].startsWith(item));
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a[1].name.localeCompare(b[1].name);
    });
};

// Formatação de moradas
export const formatAddress = (row) => {
    return [
        row.address,
        row.door && `Porta: ${row.door}`,
        row.nut4,
        row.nut3,
        row.nut2
    ].filter(Boolean).join(', ');
};

// Formatação de telefone
export const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
};

// Validação de parâmetros booleanos
export const isBooleanParam = (name) => {
    return [
        "Gratuito", "Gratuita", "Existência de sanemanto até 20 m",
        "Existência de rede de água", "Urgência",
        "Existência de saneamento até 20 m"
    ].includes(name);
};
