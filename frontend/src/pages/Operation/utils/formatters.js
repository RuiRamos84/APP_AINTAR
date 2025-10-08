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

// Mapeamento de PKs de análise para descrições
export const getAnaliseParamName = (pk, metaData) => {
    if (!pk || !metaData?.analise_param) return null;
    const param = metaData.analise_param.find(p => p.pk === Number(pk));
    return param ? param.value : `Parâmetro #${pk}`;
};

export const getAnalisePontoName = (pk, metaData) => {
    if (!pk || !metaData?.analise_ponto) return null;
    const ponto = metaData.analise_ponto.find(p => p.pk === Number(pk));
    return ponto ? ponto.value : `Ponto #${pk}`;
};

export const getAnaliseFormaName = (pk, metaData) => {
    if (!pk || !metaData?.analise_forma) return null;
    const forma = metaData.analise_forma.find(f => f.pk === Number(pk));
    return forma ? forma.value : `Forma #${pk}`;
};

// Helper para obter cor baseada no status de licenciamento
// 1/null = Sem licença (cinza)
// 2 = A aguardar licenciamento (laranja)
// 3 = Licença ativa (verde)
export const getInstallationLicenseColor = (licenseStatus) => {
    switch (licenseStatus) {
        case 3:
            return '#4caf50'; // Verde - Licença ativa
        case 2:
            return '#ff9800'; // Laranja - A aguardar licenciamento
        case 1:
        case null:
        case undefined:
        default:
            return '#9e9e9e'; // Cinza - Sem licença
    }
};

// Helper para obter texto do status de licenciamento
export const getInstallationLicenseText = (licenseStatus) => {
    switch (licenseStatus) {
        case 3:
            return 'Licença ativa';
        case 2:
            return 'A aguardar licenciamento';
        case 1:
        case null:
        case undefined:
        default:
            return 'Sem licença';
    }
};

// Helper para obter nome da instalação (ETAR ou EE)
export const getInstallationName = (pk, metaData) => {
    if (!pk || !metaData) return null;

    // Procurar em ETAR
    const etar = metaData.etar?.find(item => item.pk === Number(pk));
    if (etar) return etar.nome;

    // Procurar em EE
    const ee = metaData.ee?.find(item => item.pk === Number(pk));
    if (ee) return ee.nome;

    return null;
};

// Helper para obter nome da ação
export const getOperationActionName = (pk, metaData) => {
    if (!pk || !metaData?.operacaoaccao) return null;
    const item = metaData.operacaoaccao.find(i => i.pk === Number(pk));
    return item ? item.value : null;
};

// Helper para obter nome do modo
export const getOperationModeName = (pk, metaData) => {
    if (!pk || !metaData?.operacamodo) return null;
    const item = metaData.operacamodo.find(i => i.pk === Number(pk));
    return item ? item.value : null;
};

// Helper para obter nome do dia
export const getOperationDayName = (pk, metaData) => {
    if (!pk || !metaData?.operacaodia) return null;
    const item = metaData.operacaodia.find(i => i.pk === Number(pk));
    return item ? item.value : null;
};

// Helper para enriquecer tarefa com nomes de análise mapeados
export const enrichTaskWithAnalysisNames = (task, metaData) => {
    if (!task) return task;

    return {
        ...task,
        analise_param_nome: getAnaliseParamName(task.tt_operacaoaccao_analiseparam, metaData),
        analise_ponto_nome: getAnalisePontoName(task.tt_operacaoaccao_analiseponto, metaData),
        analise_forma_nome: getAnaliseFormaName(task.tt_operacaoaccao_analiseforma, metaData),
    };
};

// Helper para enriquecer tarefa de operação com todos os nomes
// NOTA: Para tarefas do operador (operacao_self), os nomes já vêm do backend!
// Este helper é para voltas programadas (operacao_meta) que vêm com PKs
export const enrichOperationTask = (task, metaData) => {
    if (!task) return task;

    // Se já tem instalacao_nome, não precisa mapear (já vem do backend)
    if (task.instalacao_nome && task.acao_operacao && task.modo_operacao) {
        console.log('✅ Tarefa já vem com nomes do backend:', task.pk);
        return task;
    }

    // Caso contrário, mapear os PKs
    const instalacao_name = getInstallationName(task.tb_instalacao, metaData);
    const accao_name = getOperationActionName(task.tt_operacaoaccao, metaData);
    const modo_name = getOperationModeName(task.tt_operacaomodo, metaData);
    const dia_name = getOperationDayName(task.tt_operacaodia, metaData);

    console.log('🔧 Mapeando PKs para nomes:', {
        task_pk: task.pk,
        tb_instalacao: task.tb_instalacao,
        instalacao_name,
        tt_operacaoaccao: task.tt_operacaoaccao,
        accao_name,
        tt_operacaomodo: task.tt_operacaomodo,
        modo_name,
        tt_operacaodia: task.tt_operacaodia,
        dia_name
    });

    return {
        ...task,
        instalacao_name,
        accao_name,
        modo_name,
        dia_name,
        analise_param_nome: getAnaliseParamName(task.tt_operacaoaccao_analiseparam, metaData),
        analise_ponto_nome: getAnalisePontoName(task.tt_operacaoaccao_analiseponto, metaData),
        analise_forma_nome: getAnaliseFormaName(task.tt_operacaoaccao_analiseforma, metaData),
    };
};