/**
 * Utilitários para manipulação de estados/status de documentos
 * Utiliza metadados dinâmicos em vez de valores hardcoded
 */

/**
 * Obtém o nome do status a partir dos metadados
 * @param {number|string} statusId - Código do status (campo 'what' do documento)
 * @param {Array} statusMetadata - Metadados de status (array 'what' dos metadados)
 * @returns {string} - Nome do status
 */
export const getStatusName = (statusId, statusMetadata) => {
    if (!statusMetadata || !Array.isArray(statusMetadata)) {
        return getDefaultStatusName(statusId);
    }

    const status = statusMetadata.find(s => s.pk === statusId);
    return status ? status.step : getDefaultStatusName(statusId);
};

/**
 * Obtém um nome de status padrão quando metadados não estão disponíveis
 * @param {number|string} statusId - Código do status
 * @returns {string} - Nome padrão do status
 */
export const getDefaultStatusName = (statusId) => {
    const defaultNames = {
        '-1': 'ANULADO',
        '0': 'CONCLUIDO',
        '1': 'ENTRADA',
        '2': 'PARA VALIDAÇÃO',
        '4': 'PARA TRATAMENTO',
        '5': 'ANÁLISE EXTERNA',
        '6': 'PEDIDO DE ELEMENTOS',
        '7': 'EMISSÃO DE OFÍCIO',
        '8': 'PARA PAVIMENTAÇÃO',
        '9': 'PARA AVALIAÇÃO NO TERRENO',
        '10': 'PARA EXECUÇÃO',
        '11': 'PARA ORÇAMENTAÇÃO',
        '12': 'PARA COBRANÇA',
        '13': 'PARA ACEITAÇÃO DE ORÇAMENTO',
        '100': 'PARA PAGAMENTO DE PAVIMENTAÇÃO'
    };

    return defaultNames[String(statusId)] || `Status ${statusId}`;
};

/**
 * Obtém a cor para um status específico
 * @param {number|string} statusId - Código do status
 * @returns {string} - Nome da cor para Material UI (success, error, etc)
 */
export const getStatusColor = (statusId) => {
    if (statusId === undefined || statusId === null) return 'grey'; // Changed from 'default' to 'grey'

    // Mapeamento de cores do Material UI para status
    const colorMap = {
        '-1': 'error',     // ANULADO
        '0': 'success',    // CONCLUIDO
        '1': 'grey',       // ENTRADA (changed from 'default' to 'grey')
        '2': 'primary',    // PARA VALIDAÇÃO
        '4': 'primary',    // PARA TRATAMENTO
        '5': 'warning',    // ANÁLISE EXTERNA
        '6': 'secondary',  // PEDIDO DE ELEMENTOS
        '7': 'info',       // EMISSÃO DE OFÍCIO
        '8': 'primary',    // PARA PAVIMENTAÇÃO
        '9': 'warning',    // PARA AVALIAÇÃO NO TERRENO
        '10': 'secondary', // PARA EXECUÇÃO
        '11': 'info',      // PARA ORÇAMENTAÇÃO
        '12': 'primary',   // PARA COBRANÇA
        '13': 'warning',   // PARA ACEITAÇÃO DE ORÇAMENTO
        '100': 'info'      // PARA PAGAMENTO DE PAVIMENTAÇÃO
    };

    return colorMap[String(statusId)] || 'grey'; // Changed from 'default' to 'grey'
};

/**
 * Obtém a ordem para visualização do status no Kanban
 * @param {number|string} statusId - Código do status
 * @returns {number} - Valor numérico para ordenação
 */
export const getStatusOrder = (statusId) => {
    const orderMap = {
        '-1': 999, // ANULADO (no final)
        '0': 998,  // CONCLUIDO (penúltimo)
        '1': 1,    // ENTRADA
        '2': 2,    // PARA VALIDAÇÃO
        '4': 3,    // PARA TRATAMENTO
        '5': 4,    // ANÁLISE EXTERNA
        '6': 5,    // PEDIDO DE ELEMENTOS
        '7': 6,    // EMISSÃO DE OFÍCIO
        '8': 7,    // PARA PAVIMENTAÇÃO
        '9': 8,    // PARA AVALIAÇÃO NO TERRENO
        '10': 9,   // PARA EXECUÇÃO
        '11': 10,  // PARA ORÇAMENTAÇÃO
        '12': 11,  // PARA COBRANÇA
        '13': 12,  // PARA ACEITAÇÃO DE ORÇAMENTO
        '100': 13  // PARA PAGAMENTO DE PAVIMENTAÇÃO
    };

    return orderMap[String(statusId)] || 500; // Status desconhecidos ficam no meio
};

/**
 * Obtém valor de cor (não nome) para um status
 * @param {string|number} statusId - ID do status
 * @param {Object} theme - Tema do Material UI
 * @returns {string} - Valor CSS da cor
 */
export const getStatusColorValue = (statusId, theme) => {
    if (!theme) return '#9e9e9e'; // Default cinza

    const colorName = getStatusColor(statusId);

    // Mapear nomes de cores para valores reais do tema
    switch (colorName) {
        case 'error': return theme.palette.error.main;
        case 'success': return theme.palette.success.main;
        case 'primary': return theme.palette.primary.main;
        case 'secondary': return theme.palette.secondary.main;
        case 'warning': return theme.palette.warning.main;
        case 'info': return theme.palette.info.main;
        case 'grey': return theme.palette.grey[500];
        default: return theme.palette.grey[500];
    }
};

/**
 * Obtém um mapa de status a partir dos metadados
 * @param {Array} statusMetadata - Metadados de status (array 'what')
 * @param {Object} theme - Tema do Material UI para obter cores
 * @returns {Object} Mapa de status com informações para exibição
 */
export const getStatusMap = (statusMetadata, theme) => {
    const statusMap = {};

    // Se temos metadados, usar eles para construir o mapa
    if (statusMetadata && Array.isArray(statusMetadata)) {
        statusMetadata.forEach(status => {
            const statusId = String(status.pk);
            statusMap[statusId] = {
                name: status.step,
                color: getStatusColorValue(statusId, theme),
                order: getStatusOrder(statusId),
                items: [] // Inicializado vazio para uso no KanbanView
            };
        });
    }
    // Caso contrário, usar valores padrão
    else {
        const defaultIds = ['-1', '0', '1', '2', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '100'];

        defaultIds.forEach(statusId => {
            statusMap[statusId] = {
                name: getDefaultStatusName(statusId),
                color: getStatusColorValue(statusId, theme),
                order: getStatusOrder(statusId),
                items: []
            };
        });
    }

    return statusMap;
};

/**
 * Agrupa documentos por status usando metadados
 * @param {Array} documents - Lista de documentos
 * @param {Array} statusMetadata - Metadados de status (array 'what')
 * @param {Object} theme - Tema do Material UI
 * @returns {Object} - Documentos agrupados por status
 */
export const groupDocumentsByStatus = (documents, statusMetadata, theme) => {
    if (!Array.isArray(documents)) return {};

    // Obter mapa de status a partir dos metadados
    const statusMap = getStatusMap(statusMetadata, theme);

    // Adicionar documentos aos respectivos grupos
    documents.forEach(doc => {
        const statusId = String(doc.what);

        // Se o status não estiver no mapa, criar um novo grupo
        if (!statusMap[statusId]) {
            statusMap[statusId] = {
                name: getStatusName(doc.what, statusMetadata),
                color: getStatusColorValue(statusId, theme),
                order: getStatusOrder(statusId),
                items: []
            };
        }

        // Adicionar o documento ao grupo
        statusMap[statusId].items.push(doc);
    });

    return statusMap;
};

/**
 * Verifica se um documento está fechado (não pode ser modificado)
 * @param {object} document - Documento a verificar
 * @returns {boolean} - Se o documento está fechado
 */
export const isDocumentClosed = (document) => {
    if (!document) return false;

    // IDs de status que representam documentos fechados
    const closedStatusIds = [-1, 0]; // ANULADO, CONCLUIDO

    return closedStatusIds.includes(Number(document.what));
};