import { alpha } from '@mui/material';

// Mapear viewNames para seus respectivos pks
export const VIEW_MAP = {
  'vbr_document_001': 1, // Pedidos por tipo
  'vbr_document_002': 2, // Pedidos por concelho
  'vbr_document_003': 3, // Pedidos por concelho e tipo
  'vbr_document_004': 4, // Pedidos por estado corrente
  'vbr_document_005': 5, // Pedidos por estado
  'vbr_document_006': 6, // Pedidos em estado corrente por técnico
  'vbr_document_007': 7, // Pedidos por técnico
  'vbr_document_008': 8, // Tempo médio resposta pedidos fechados
  'vbr_document_009': 9  // Tempo médio resposta todos pedidos
};

// Tipos de visualização padrão para cada view
export const DEFAULT_VIEW_TYPES = {
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
