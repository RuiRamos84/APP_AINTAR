export const formatDate = (value) => {
    if (!value) return '';

    // Se já estiver no formato "YYYY-MM-DD às HH:MM"
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

export const getColumnsForView = (viewName) => {
    const baseColumns = [
        { id: "regnumber", label: "Nº Processo" },
        {
            id: "submission",
            label: "Data Submissão",
            format: formatDate
        },
        { id: "ts_entity", label: "Requerente" },
        { id: "phone", label: "Contacto" },
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
            // { id: "local_descarga", label: "Local Descarga" },
            // { id: "n_cisternas", label: "Nº Cisternas" }
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

export const getRemainingDaysColor = (days) => {
    if (days <= 0) return 'error.main';
    if (days <= 15) return 'warning.main';
    if (days <= 30) return 'warning.light';
    return 'success.main';
};

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
