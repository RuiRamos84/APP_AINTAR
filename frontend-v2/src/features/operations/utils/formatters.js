/**
 * Utilitários de formatação para o módulo de operações
 */

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
    if (!userPk || !metaData?.who) return 'Não atribuído';
    const user = metaData.who.find(u => u.pk === Number(userPk));
    return user ? user.name : `Utilizador #${userPk}`;
};

export const getRemainingDaysColor = (days) => {
    if (days <= 0) return 'error.main';
    if (days <= 15) return 'warning.main';
    if (days <= 30) return 'warning.light';
    return 'success.main';
};

/** Cor baseada no status de licenciamento da instalação */
export const getInstallationLicenseColor = (licenseStatus) => {
    switch (licenseStatus) {
        case 3: return '#4caf50'; // Licença ativa
        case 2: return '#ff9800'; // A aguardar licenciamento
        default: return '#9e9e9e'; // Sem licença
    }
};

export const getInstallationLicenseText = (licenseStatus) => {
    switch (licenseStatus) {
        case 3: return 'Licença ativa';
        case 2: return 'A aguardar licenciamento';
        default: return 'Sem licença';
    }
};

/** Nomes de instalação (ETAR ou EE) */
export const getInstallationName = (pk, metaData) => {
    if (!pk || !metaData) return null;
    const etar = metaData.etar?.find(item => item.pk === Number(pk));
    if (etar) return etar.nome;
    const ee = metaData.ee?.find(item => item.pk === Number(pk));
    if (ee) return ee.nome;
    return null;
};

export const getOperationActionName = (pk, metaData) => {
    if (!pk || !metaData?.operacaoaccao) return null;
    const item = metaData.operacaoaccao.find(i => i.pk === Number(pk));
    return item ? item.value : null;
};

export const getOperationModeName = (pk, metaData) => {
    if (!pk || !metaData?.operacamodo) return null;
    const item = metaData.operacamodo.find(i => i.pk === Number(pk));
    return item ? item.value : null;
};

export const getOperationDayName = (pk, metaData) => {
    if (!pk || !metaData?.operacaodia) return null;
    const item = metaData.operacaodia.find(i => i.pk === Number(pk));
    return item ? item.value : null;
};

/**
 * Formatar valor de conclusão baseado no tipo de operação
 * @returns {{ label: string, value: string } | null}
 */
export const formatCompletedTaskValue = (task) => {
    if (!task) return null;
    const tipo = task.operacao_tipo || task.tt_operacaoaccao_type;
    const valuetext = task.valuetext;
    const valuenumb = task.valuenumb;

    if (!tipo) {
        if (valuetext) return { label: 'Resultado', value: valuetext };
        if (valuenumb != null) return { label: 'Valor', value: valuenumb.toString() };
        return null;
    }

    switch (parseInt(tipo)) {
        case 1: {
            const numValue = valuenumb != null ? valuenumb : valuetext;
            return numValue != null ? { label: 'Valor Numérico', value: numValue.toString() } : null;
        }
        case 2:
            return valuetext ? { label: 'Observações', value: valuetext } : null;
        case 3:
            return valuetext ? { label: 'Opção Selecionada', value: valuetext } : null;
        case 4: {
            const boolText = valuetext === '1' || valuetext === 'true' ? 'Sim' : 'Não';
            return { label: 'Confirmação', value: boolText };
        }
        case 5:
            if (valuetext === '1') return { label: 'Análise', value: 'Recolha realizada' };
            if (valuetext) return { label: 'Análise', value: valuetext };
            return null;
        default:
            return valuetext ? { label: 'Resultado', value: valuetext } : null;
    }
};

/** Enriquecer tarefa de operação com nomes (para metas que vêm com PKs) */
export const enrichOperationTask = (task, metaData) => {
    if (!task) return task;
    if (task.instalacao_nome && task.acao_operacao && task.modo_operacao) {
        return task;
    }
    return {
        ...task,
        instalacao_name: getInstallationName(task.tb_instalacao, metaData),
        accao_name: getOperationActionName(task.tt_operacaoaccao, metaData),
        modo_name: getOperationModeName(task.tt_operacaomodo, metaData),
        dia_name: getOperationDayName(task.tt_operacaodia, metaData),
    };
};
