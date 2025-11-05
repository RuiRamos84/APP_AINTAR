/**
 * Design Tokens - Tipografia
 * Sistema de tipografia responsivo e escalável
 * Mobile-first com escalas adaptadas
 */

export const typographyTokens = {
  // Famílias de Fontes
  fontFamily: {
    primary: '"Roboto", "Helvetica", "Arial", sans-serif',
    secondary: '"Inter", "Segoe UI", sans-serif',
    monospace: '"Roboto Mono", "Courier New", monospace',
  },

  // Tamanhos de Fonte - Mobile (valores base)
  fontSize: {
    mobile: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px (base)
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.75rem', // 28px
      '4xl': '2rem',    // 32px
    },

    // Tamanhos de Fonte - Desktop (mais generosos)
    desktop: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px (base)
      lg: '1.25rem',    // 20px
      xl: '1.5rem',     // 24px
      '2xl': '1.875rem', // 30px
      '3xl': '2.25rem', // 36px
      '4xl': '3rem',    // 48px
    },
  },

  // Pesos de Fonte
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line Heights (altura de linha)
  lineHeight: {
    none: 1,
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

/**
 * Hierarquia de Tipografia
 * Mapeamento semântico de estilos tipográficos
 */
export const typographyHierarchy = {
  // Headings
  h1: {
    mobile: {
      fontSize: typographyTokens.fontSize.mobile['3xl'],
      fontWeight: typographyTokens.fontWeight.bold,
      lineHeight: typographyTokens.lineHeight.tight,
    },
    desktop: {
      fontSize: typographyTokens.fontSize.desktop['4xl'],
      fontWeight: typographyTokens.fontWeight.bold,
      lineHeight: typographyTokens.lineHeight.tight,
    },
  },

  h2: {
    mobile: {
      fontSize: typographyTokens.fontSize.mobile['2xl'],
      fontWeight: typographyTokens.fontWeight.semibold,
      lineHeight: typographyTokens.lineHeight.tight,
    },
    desktop: {
      fontSize: typographyTokens.fontSize.desktop['3xl'],
      fontWeight: typographyTokens.fontWeight.semibold,
      lineHeight: typographyTokens.lineHeight.tight,
    },
  },

  h3: {
    mobile: {
      fontSize: typographyTokens.fontSize.mobile.xl,
      fontWeight: typographyTokens.fontWeight.semibold,
      lineHeight: typographyTokens.lineHeight.snug,
    },
    desktop: {
      fontSize: typographyTokens.fontSize.desktop['2xl'],
      fontWeight: typographyTokens.fontWeight.semibold,
      lineHeight: typographyTokens.lineHeight.snug,
    },
  },

  h4: {
    mobile: {
      fontSize: typographyTokens.fontSize.mobile.lg,
      fontWeight: typographyTokens.fontWeight.medium,
      lineHeight: typographyTokens.lineHeight.snug,
    },
    desktop: {
      fontSize: typographyTokens.fontSize.desktop.xl,
      fontWeight: typographyTokens.fontWeight.medium,
      lineHeight: typographyTokens.lineHeight.snug,
    },
  },

  // Body text
  body1: {
    fontSize: typographyTokens.fontSize.mobile.md,
    fontWeight: typographyTokens.fontWeight.regular,
    lineHeight: typographyTokens.lineHeight.normal,
  },

  body2: {
    fontSize: typographyTokens.fontSize.mobile.sm,
    fontWeight: typographyTokens.fontWeight.regular,
    lineHeight: typographyTokens.lineHeight.normal,
  },

  // Utility
  caption: {
    fontSize: typographyTokens.fontSize.mobile.xs,
    fontWeight: typographyTokens.fontWeight.regular,
    lineHeight: typographyTokens.lineHeight.normal,
  },

  button: {
    fontSize: typographyTokens.fontSize.mobile.sm,
    fontWeight: typographyTokens.fontWeight.medium,
    textTransform: 'none', // Manter capitalização normal (PT-PT)
    letterSpacing: typographyTokens.letterSpacing.wide,
  },
};
