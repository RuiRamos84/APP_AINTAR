/**
 * Utilitários para gerenciar funcionalidades dinâmicas do sistema
 * Versão simplificada para resolver problemas de importação
 */

/**
 * Verifica se uma funcionalidade está disponível no contexto atual
 * @param {string} feature - Nome da funcionalidade
 * @param {object} context - Contexto atual (tab, documento, permissões)
 * @returns {boolean} - Se a funcionalidade está disponível
 */
export function isFeatureAvailable(feature, context) {
    const { activeTab, document, user } = context || {};

    // Versão simplificada das regras
    switch (feature) {
        case 'viewDetails':
            return true; // Sempre disponível

        case 'addStep':
            // Disponível apenas para documentos em tratamento
            return activeTab === 1 && document && !isDocumentClosed(document);

        case 'addAnnex':
            // Disponível apenas para documentos em tratamento
            return activeTab === 1 && document && !isDocumentClosed(document);

        case 'replicate':
            // Disponível apenas para documentos em tratamento
            return activeTab === 1 && document;

        case 'downloadComprovativo':
            // Disponível para documentos criados pelo usuário ou na tab "Criados por Mim"
            return activeTab === 2 || (document && document.creator === user?.id);

        case 'createDocument':
            return true; // Sempre disponível

        // Funcionalidades de UI
        case 'filterDocuments':
        case 'sortDocuments':
            return true; // Sempre disponível

        default:
            return true;
    }
}

/**
 * Verifica se o usuário pode editar um documento
 * @param {object} document - Documento a verificar
 * @param {object} user - Usuário atual
 * @returns {boolean} - Se o usuário pode editar o documento
 */
export function canEditDocument(document, user) {
    if (!document || !user) return false;

    // Admin pode editar qualquer documento
    if (user.isAdmin) return true;

    // Usuário pode editar se o documento estiver atribuído a ele
    return document.who === user.id;
}

/**
 * Verifica se um documento está fechado (não pode ser modificado)
 * @param {object} document - Documento a verificar
 * @returns {boolean} - Se o documento está fechado
 */
export function isDocumentClosed(document) {
    if (!document) return false;

    // IDs de status que representam documentos fechados
    const closedStatusIds = [-1, 0]; // ANULADO, CONCLUIDO

    return closedStatusIds.includes(document.what);
}

/**
 * Obtém textos e descrições para as funcionalidades
 * @returns {object} - Objeto com textos para cada funcionalidade
 */
export function getFeatureTexts() {
    return {
        viewDetails: {
            label: 'Ver detalhes',
            tooltip: 'Visualizar detalhes completos do pedido'
        },
        addStep: {
            label: 'Adicionar passo',
            tooltip: 'Adicionar um novo passo ao pedido'
        },
        addAnnex: {
            label: 'Adicionar anexo',
            tooltip: 'Adicionar um novo anexo ao pedido'
        },
        replicate: {
            label: 'Replicar',
            tooltip: 'Criar uma cópia deste pedido'
        },
        downloadComprovativo: {
            label: 'Baixar comprovativo',
            tooltip: 'Baixar o comprovativo do pedido'
        },
        createDocument: {
            label: 'Novo Pedido',
            tooltip: 'Criar um novo pedido'
        },
        filterDocuments: {
            label: 'Filtrar',
            tooltip: 'Filtrar lista de pedidos'
        },
        sortDocuments: {
            label: 'Ordenar',
            tooltip: 'Ordenar lista de pedidos'
        }
    };
}

/**
 * Obtém ícones para cada funcionalidade
 * @returns {object} - Objeto com nomes de ícones do Material UI
 */
export function getFeatureIcons() {
    return {
        viewDetails: 'Visibility',
        addStep: 'Send',
        addAnnex: 'Attachment',
        replicate: 'FileCopy',
        downloadComprovativo: 'CloudDownload',
        createDocument: 'Add',
        filterDocuments: 'FilterList',
        sortDocuments: 'Sort',
        refreshDocuments: 'Refresh'
    };
}

/**
 * Obtém configuração completa das funcionalidades
 * @param {object} context - Contexto atual
 * @returns {object} - Configuração das funcionalidades
 */
export function getFeatureConfig(context) {
    const texts = getFeatureTexts();
    const icons = getFeatureIcons();

    // Combinar textos, ícones e disponibilidade
    return Object.keys(texts).reduce((config, feature) => {
        config[feature] = {
            ...texts[feature],
            icon: icons[feature],
            available: isFeatureAvailable(feature, context)
        };
        return config;
    }, {});
}

/**
 * Obtém funcionalidades disponíveis para um contexto
 * @param {object} context - Contexto atual
 * @returns {Array} - Lista de funcionalidades disponíveis
 */
export function getAvailableFeatures(context) {
    const featureConfig = getFeatureConfig(context);

    return Object.entries(featureConfig)
        .filter(([_, config]) => config.available)
        .map(([feature, config]) => ({
            feature,
            ...config
        }));
}

/**
 * Obtém funcionalidades específicas para documento
 * @param {object} document - Documento atual
 * @param {object} user - Usuário atual
 * @param {number} activeTab - Tab ativa
 * @returns {Array} - Lista de funcionalidades disponíveis para o documento
 */
export function getDocumentFeatures(document, user, activeTab) {
    const context = { document, user, activeTab };

    // Lista de funcionalidades específicas para documentos
    const documentFeatures = [
        'viewDetails', 'addStep', 'addAnnex', 'replicate', 'downloadComprovativo'
    ];

    return getAvailableFeatures(context)
        .filter(item => documentFeatures.includes(item.feature));
}