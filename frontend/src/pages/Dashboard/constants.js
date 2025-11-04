import { alpha } from '@mui/material';

// Estrutura de categorias do dashboard
export const DASHBOARD_CATEGORIES = {
  pedidos: {
    id: 'pedidos',
    name: 'Pedidos',
    icon: 'assignment',
    description: 'Análise de pedidos e tramitações'
  },
  ramais: {
    id: 'ramais',
    name: 'Ramais',
    icon: 'account_tree',
    description: 'Estatísticas de ramais'
  },
  fossas: {
    id: 'fossas',
    name: 'Fossas',
    icon: 'cleaning_services',
    description: 'Gestão de fossas'
  },
  instalacoes: {
    id: 'instalacoes',
    name: 'Instalações',
    icon: 'construction',
    description: 'Controlo de instalações'
  }
};

// Mapear viewNames para seus respectivos metadados
export const VIEW_MAP = {
  // Pedidos
  'vds_pedido_01$001': { category: 'pedidos', name: 'Por tipo' },
  'vds_pedido_01$002': { category: 'pedidos', name: 'Por tipo e por ano' },
  'vds_pedido_01$003': { category: 'pedidos', name: 'Por tipo, total e concluídos' },
  'vds_pedido_01$004': { category: 'pedidos', name: 'Por tipo, total e concluídos, ano corrente' },
  'vds_pedido_01$005': { category: 'pedidos', name: 'Por ano de início, total e concluídos' },
  'vds_pedido_01$006': { category: 'pedidos', name: 'Por concelho, total e concluídos' },
  'vds_pedido_01$007': { category: 'pedidos', name: 'Por concelho, total e concluídos, para o ano corrente' },
  'vds_pedido_01$008': { category: 'pedidos', name: 'Por concelho e tipo' },
  'vds_pedido_01$009': { category: 'pedidos', name: 'Por concelho e tipo, total e concluídos, ano corrente' },
  'vds_pedido_01$010': { category: 'pedidos', name: 'Por estado corrente' },
  'vds_pedido_01$011': { category: 'pedidos', name: 'Por estado corrente, ano corrente' },
  'vds_pedido_01$012': { category: 'pedidos', name: 'Por utilizador' },
  'vds_pedido_01$013': { category: 'pedidos', name: 'Por utilizador, abertos' },
  'vds_pedido_01$014': { category: 'pedidos', name: 'Número de tramitações por utilizador' },
  'vds_pedido_01$015': { category: 'pedidos', name: 'Número de tramitações por utilizador, ano corrente' },
  'vds_pedido_01$016': { category: 'pedidos', name: 'Duração média por passo, só para passos fechados, por ano' },
  'vds_pedido_01$017': { category: 'pedidos', name: 'Duração média por técnico, só para passos fechados' },

  // Ramais
  'vds_ramal_01$001': { category: 'ramais', name: 'Por estado' },
  'vds_ramal_01$002': { category: 'ramais', name: 'Metros construídos por ano' },
  'vds_ramal_01$003': { category: 'ramais', name: 'Metros construídos por ano e mês, para o ano corrente' },
  'vds_ramal_01$004': { category: 'ramais', name: 'Pedidos por município' },

  // Fossas
  'vds_fossa_01$001': { category: 'fossas', name: 'Por estado' },
  'vds_fossa_01$002': { category: 'fossas', name: 'Por município, por ano' },
  'vds_fossa_01$003': { category: 'fossas', name: 'Por ano e mês, para o ano corrente' },

  // Instalações
  'vds_instalacao_01$001': { category: 'instalacoes', name: 'Por tipo de instalação, total, abertos e controlados' },
  'vds_instalacao_01$002': { category: 'instalacoes', name: 'Por tipo de instalação, total, abertos e controlados, para o ano corrente' },
  'vds_instalacao_01$003': { category: 'instalacoes', name: 'Por tipo de operação, total, abertos e controlados' },
  'vds_instalacao_01$004': { category: 'instalacoes', name: 'Por tipo de operação, total, abertos e controlados, para o ano corrente' },
  'vds_instalacao_01$005': { category: 'instalacoes', name: 'Por operador' },
  'vds_instalacao_01$006': { category: 'instalacoes', name: 'Por operador, para o ano corrente' },
  'vds_instalacao_01$007': { category: 'instalacoes', name: 'Duração por tipo de instalação' },
  'vds_instalacao_01$008': { category: 'instalacoes', name: 'Duração por tipo de instalação, para o ano corrente' },
  'vds_instalacao_01$009': { category: 'instalacoes', name: 'Duração por operação' },
  'vds_instalacao_01$010': { category: 'instalacoes', name: 'Duração por operação, para o ano corrente' },
  'vds_instalacao_01$011': { category: 'instalacoes', name: 'Duração por operador' },
  'vds_instalacao_01$012': { category: 'instalacoes', name: 'Duração por operador, para o ano corrente' },

  // Views antigas (mantidas para compatibilidade)
  'vbr_document_001': { category: 'legacy', name: 'Pedidos por tipo (legado)' },
  'vbr_document_002': { category: 'legacy', name: 'Pedidos por concelho (legado)' },
  'vbr_document_003': { category: 'legacy', name: 'Pedidos por concelho e tipo (legado)' },
  'vbr_document_004': { category: 'legacy', name: 'Pedidos por estado corrente (legado)' },
  'vbr_document_005': { category: 'legacy', name: 'Pedidos por estado (legado)' },
  'vbr_document_006': { category: 'legacy', name: 'Pedidos em estado corrente por técnico (legado)' },
  'vbr_document_007': { category: 'legacy', name: 'Pedidos por técnico (legado)' },
  'vbr_document_008': { category: 'legacy', name: 'Tempo médio resposta pedidos fechados (legado)' },
  'vbr_document_009': { category: 'legacy', name: 'Tempo médio resposta todos pedidos (legado)' }
};

// Tipos de visualização padrão para cada view
export const DEFAULT_VIEW_TYPES = {
  // Pedidos
  'vds_pedido_01$001': 'pie',
  'vds_pedido_01$002': 'bar',
  'vds_pedido_01$003': 'bar',
  'vds_pedido_01$004': 'bar',
  'vds_pedido_01$005': 'line',
  'vds_pedido_01$006': 'bar',
  'vds_pedido_01$007': 'bar',
  'vds_pedido_01$008': 'bar',
  'vds_pedido_01$009': 'bar',
  'vds_pedido_01$010': 'bar',
  'vds_pedido_01$011': 'bar',
  'vds_pedido_01$012': 'bar',
  'vds_pedido_01$013': 'bar',
  'vds_pedido_01$014': 'bar',
  'vds_pedido_01$015': 'bar',
  'vds_pedido_01$016': 'line',
  'vds_pedido_01$017': 'bar',

  // Ramais
  'vds_ramal_01$001': 'pie',
  'vds_ramal_01$002': 'bar',
  'vds_ramal_01$003': 'line',
  'vds_ramal_01$004': 'bar',

  // Fossas
  'vds_fossa_01$001': 'pie',
  'vds_fossa_01$002': 'bar',
  'vds_fossa_01$003': 'line',

  // Instalações
  'vds_instalacao_01$001': 'bar',
  'vds_instalacao_01$002': 'bar',
  'vds_instalacao_01$003': 'bar',
  'vds_instalacao_01$004': 'bar',
  'vds_instalacao_01$005': 'bar',
  'vds_instalacao_01$006': 'bar',
  'vds_instalacao_01$007': 'bar',
  'vds_instalacao_01$008': 'bar',
  'vds_instalacao_01$009': 'bar',
  'vds_instalacao_01$010': 'bar',
  'vds_instalacao_01$011': 'bar',
  'vds_instalacao_01$012': 'bar',

  // Legacy
  'vbr_document_001': 'pie',
  'vbr_document_002': 'bar',
  'vbr_document_003': 'bar',
  'vbr_document_004': 'bar',
  'vbr_document_005': 'line',
  'vbr_document_006': 'bar',
  'vbr_document_007': 'radar',
  'vbr_document_008': 'area',
  'vbr_document_009': 'line'
};

// Função que gera a paleta de cores com base na paleta do tema
export const getColorPalette = (theme) => [
  theme.palette.primary.main,
  theme.palette.secondary.main,
  theme.palette.success.main,
  theme.palette.info.main,
  theme.palette.warning.main,
  alpha(theme.palette.primary.main, 0.7),
  alpha(theme.palette.secondary.main, 0.7),
  alpha(theme.palette.success.main, 0.7),
  alpha(theme.palette.info.main, 0.7),
  theme.palette.error.main,
  theme.palette.warning.dark,
  theme.palette.info.dark,
  theme.palette.success.dark,
  theme.palette.primary.dark,
  theme.palette.secondary.dark,
];

// Thresholds para simplificação de dados
export const DATA_THRESHOLDS = {
  PIE_CHART: 5,      // Máximo de itens em gráfico de pizza
  BAR_CHART: 8,      // Máximo de itens em gráfico de barras
  LINE_CHART: 8,     // Máximo de linhas em gráfico de linhas
  MAX_TYPES: 5,      // Máximo de tipos em gráficos complexos
  MAX_CONCELHOS: 5   // Máximo de concelhos em gráficos complexos
};
