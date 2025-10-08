/**
 * TIPOGRAFIA RESPONSIVA
 *
 * Sistema de tipografia fluida que escala automaticamente
 * baseado no viewport, sem media queries.
 *
 * Usa clamp() para:
 * - Tamanho mínimo (mobile)
 * - Tamanho ideal (scaling)
 * - Tamanho máximo (desktop)
 *
 * Benefícios:
 * - Legibilidade perfeita em todos os dispositivos
 * - Sem saltos bruscos (transições suaves)
 * - Reduz necessidade de overrides
 * - Acessibilidade melhorada
 */

const responsiveTypography = {
  // ============================================================
  // HEADINGS
  // ============================================================

  h1: {
    fontSize: 'clamp(2rem, 5vw + 1rem, 3.5rem)', // 32px → 56px
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },

  h2: {
    fontSize: 'clamp(1.75rem, 4vw + 0.5rem, 3rem)', // 28px → 48px
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: '-0.01em',
  },

  h3: {
    fontSize: 'clamp(1.5rem, 3vw + 0.5rem, 2.5rem)', // 24px → 40px
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },

  h4: {
    fontSize: 'clamp(1.25rem, 2.5vw + 0.5rem, 2rem)', // 20px → 32px
    fontWeight: 600,
    lineHeight: 1.35,
  },

  h5: {
    fontSize: 'clamp(1.125rem, 2vw + 0.25rem, 1.5rem)', // 18px → 24px
    fontWeight: 600,
    lineHeight: 1.4,
  },

  h6: {
    fontSize: 'clamp(1rem, 1.5vw + 0.25rem, 1.25rem)', // 16px → 20px
    fontWeight: 600,
    lineHeight: 1.4,
  },

  // ============================================================
  // BODY TEXT
  // ============================================================

  body1: {
    fontSize: 'clamp(0.875rem, 1vw + 0.5rem, 1rem)', // 14px → 16px
    lineHeight: 1.6,
    letterSpacing: '0.00938em',
  },

  body2: {
    fontSize: 'clamp(0.8125rem, 1vw + 0.375rem, 0.875rem)', // 13px → 14px
    lineHeight: 1.57,
    letterSpacing: '0.00714em',
  },

  // ============================================================
  // СПЕЦИАЛЬНЫЕ
  // ============================================================

  subtitle1: {
    fontSize: 'clamp(0.875rem, 1.5vw + 0.25rem, 1rem)', // 14px → 16px
    fontWeight: 500,
    lineHeight: 1.75,
    letterSpacing: '0.00938em',
  },

  subtitle2: {
    fontSize: 'clamp(0.8125rem, 1vw + 0.375rem, 0.875rem)', // 13px → 14px
    fontWeight: 500,
    lineHeight: 1.57,
    letterSpacing: '0.00714em',
  },

  button: {
    fontSize: 'clamp(0.8125rem, 1vw + 0.375rem, 0.875rem)', // 13px → 14px
    fontWeight: 500,
    lineHeight: 1.75,
    letterSpacing: '0.02857em',
    textTransform: 'none', // Mais amigável
  },

  caption: {
    fontSize: 'clamp(0.6875rem, 0.75vw + 0.5rem, 0.75rem)', // 11px → 12px
    lineHeight: 1.66,
    letterSpacing: '0.03333em',
  },

  overline: {
    fontSize: 'clamp(0.625rem, 0.75vw + 0.375rem, 0.75rem)', // 10px → 12px
    fontWeight: 400,
    lineHeight: 2.66,
    letterSpacing: '0.08333em',
    textTransform: 'uppercase',
  },
};

// ============================================================
// HELPER: Aplicar ao tema Material-UI
// ============================================================

export const applyResponsiveTypography = (theme) => ({
  ...theme,
  typography: {
    ...theme.typography,
    ...responsiveTypography,

    // Font family (pode customizar)
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),

    // Font weights disponíveis
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
});

// ============================================================
// HELPER: Classes CSS para uso direto
// ============================================================

export const responsiveTypographyClasses = {
  displayLarge: {
    fontSize: 'clamp(2.5rem, 6vw + 1rem, 4rem)', // 40px → 64px
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
  },

  displayMedium: {
    fontSize: 'clamp(2rem, 5vw + 1rem, 3.5rem)', // 32px → 56px
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
  },

  // Para números grandes (estatísticas)
  statNumber: {
    fontSize: 'clamp(1.5rem, 4vw + 0.5rem, 3rem)', // 24px → 48px
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums', // Alinhamento de números
  },

  // Para textos longos (artigos, descrições)
  longText: {
    fontSize: 'clamp(1rem, 1.25vw + 0.5rem, 1.125rem)', // 16px → 18px
    lineHeight: 1.75,
    letterSpacing: '0.01em',
    maxWidth: '65ch', // Ideal para legibilidade
  },
};

export default responsiveTypography;
