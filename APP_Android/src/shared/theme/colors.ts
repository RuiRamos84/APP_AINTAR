export const COLORS = {
  // Brand
  primary: '#1B5E8E',
  primaryLight: '#6BA5E4',
  primaryDark: '#123D5C',
  primarySurface: '#E8F1FA',

  secondary: '#29B5E8',
  secondarySurface: '#E1F5FE',

  navy: '#0A1628',

  // Backgrounds
  background: '#EFF6FC',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F7FF',

  // Text
  textPrimary: '#0A1628',
  textSecondary: 'rgba(10, 22, 40, 0.55)',
  textDisabled: '#9E9E9E',

  // Semantic
  success: '#2e7d32',
  successLight: '#4caf50',
  successSurface: '#E8F5E9',

  warning: '#ed6c02',
  warningLight: '#ff9800',
  warningSurface: '#FFF3E0',

  error: '#d32f2f',
  errorLight: '#ef5350',
  errorSurface: '#FFEBEE',

  info: '#0288d1',
  infoSurface: '#E1F5FE',

  // Borders & dividers
  border: 'rgba(27, 94, 142, 0.12)',
  divider: 'rgba(10, 22, 40, 0.08)',
  overlay: 'rgba(10, 22, 40, 0.04)',
} as const;

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 100,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
