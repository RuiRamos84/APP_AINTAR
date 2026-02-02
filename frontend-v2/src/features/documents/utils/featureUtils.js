/**
 * Feature Utilities - Verificação de disponibilidade de funcionalidades
 * Baseado em permissões, tab activa e estado do documento
 */

import { isDocumentClosed } from './statusUtils';

/**
 * Verifica se uma funcionalidade está disponível no contexto actual
 * @param {string} feature - Nome da funcionalidade
 * @param {Object} context - { activeTab, document, user }
 * @returns {boolean}
 */
export function isFeatureAvailable(feature, context) {
  const { activeTab, document, user } = context || {};

  switch (feature) {
    case 'viewDetails':
      return true;

    case 'addStep':
      // Disponível para documentos em tratamento (tab 1) e não fechados
      return activeTab === 1 && document != null && !isDocumentClosed(document);

    case 'addAnnex':
      // Disponível para documentos em tratamento e não fechados
      return activeTab === 1 && document != null && !isDocumentClosed(document);

    case 'replicate':
      // Disponível para documentos em tratamento
      return activeTab === 1 && document != null;

    case 'downloadComprovativo':
      // Disponível na tab "Criados por Mim" ou se é o criador
      return activeTab === 2 || (document && document.creator === user?.id);

    case 'createDocument':
      return true;

    case 'createEmission':
      // Disponível apenas na tab "A meu cargo"
      return activeTab === 1;

    case 'filterDocuments':
    case 'sortDocuments':
      return true;

    default:
      return true;
  }
}

/**
 * Verifica se o utilizador pode editar um documento
 * @param {Object} document
 * @param {Object} user
 * @returns {boolean}
 */
export function canEditDocument(document, user) {
  if (!document || !user) return false;
  if (user.isAdmin) return true;
  return document.who === user.id;
}

/**
 * Textos e tooltips para cada funcionalidade
 */
export function getFeatureTexts() {
  return {
    viewDetails: {
      label: 'Ver detalhes',
      tooltip: 'Visualizar detalhes completos do pedido',
    },
    addStep: {
      label: 'Adicionar passo',
      tooltip: 'Adicionar um novo passo ao pedido',
    },
    addAnnex: {
      label: 'Adicionar anexo',
      tooltip: 'Adicionar um novo anexo ao pedido',
    },
    replicate: {
      label: 'Replicar',
      tooltip: 'Criar uma cópia deste pedido',
    },
    downloadComprovativo: {
      label: 'Baixar comprovativo',
      tooltip: 'Baixar o comprovativo do pedido',
    },
    createDocument: {
      label: 'Novo Pedido',
      tooltip: 'Criar um novo pedido',
    },
    createEmission: {
      label: 'Criar Emissão',
      tooltip: 'Criar uma emissão (ofício, notificação, etc.)',
    },
    filterDocuments: {
      label: 'Filtrar',
      tooltip: 'Filtrar lista de pedidos',
    },
    sortDocuments: {
      label: 'Ordenar',
      tooltip: 'Ordenar lista de pedidos',
    },
  };
}

/**
 * Ícones MUI para cada funcionalidade
 */
export function getFeatureIcons() {
  return {
    viewDetails: 'Visibility',
    addStep: 'Send',
    addAnnex: 'Attachment',
    replicate: 'FileCopy',
    downloadComprovativo: 'CloudDownload',
    createDocument: 'Add',
    createEmission: 'Mail',
    filterDocuments: 'FilterList',
    sortDocuments: 'Sort',
    refreshDocuments: 'Refresh',
  };
}

/**
 * Configuração completa das funcionalidades para um contexto
 * @param {Object} context - { activeTab, document, user }
 * @returns {Object} { feature: { label, tooltip, icon, available } }
 */
export function getFeatureConfig(context) {
  const texts = getFeatureTexts();
  const icons = getFeatureIcons();

  return Object.keys(texts).reduce((config, feature) => {
    config[feature] = {
      ...texts[feature],
      icon: icons[feature],
      available: isFeatureAvailable(feature, context),
    };
    return config;
  }, {});
}

/**
 * Lista de funcionalidades disponíveis para um contexto
 * @param {Object} context
 * @returns {Array} [{ feature, label, tooltip, icon, available }]
 */
export function getAvailableFeatures(context) {
  const featureConfig = getFeatureConfig(context);

  return Object.entries(featureConfig)
    .filter(([, config]) => config.available)
    .map(([feature, config]) => ({
      feature,
      ...config,
    }));
}

/**
 * Funcionalidades específicas para um documento
 * @param {Object} document
 * @param {Object} user
 * @param {number} activeTab
 * @returns {Array}
 */
export function getDocumentFeatures(document, user, activeTab) {
  const context = { document, user, activeTab };
  const documentFeatures = [
    'viewDetails',
    'addStep',
    'addAnnex',
    'replicate',
    'downloadComprovativo',
  ];

  return getAvailableFeatures(context).filter((item) =>
    documentFeatures.includes(item.feature)
  );
}
