/**
 * Design Tokens - Tipografia
 * Sistema de tipografia responsivo e escalável
 * Mobile-first com escalas adaptadas
 */

/**
 * Gera um valor `clamp()` para tipografia fluida.
 * Interpola linearmente entre `minPx` (em `minVw`) e `maxPx` (em `maxVw`),
 * em `rem` (não `vw` puro) para continuar a respeitar o zoom de texto do browser.
 */
export const fluidClamp = (minPx, maxPx, minVw = 360, maxVw = 1280) => {
  const root = 16;
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const yIntersection = -minVw * slope + minPx;
  const preferredRem = (yIntersection / root).toFixed(4);
  const slopeVw = (slope * 100).toFixed(4);
  return `clamp(${(minPx / root).toFixed(4)}rem, calc(${preferredRem}rem + ${slopeVw}vw), ${(maxPx / root).toFixed(4)}rem)`;
};

const fluidSize = fluidClamp;

export const typographyTokens = {
  // Famílias de Fontes — Website Matching
  fontFamily: {
    primary: '"Inter", "Segoe UI", system-ui, sans-serif',
    display: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    monospace: '"JetBrains Mono", "Roboto Mono", monospace',
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

    // Tamanhos de Fonte - Desktop (ajustados para Manrope/Outfit com x-height maior)
    desktop: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px (base)
      lg: '1.125rem',   // 18px  (era 20px)
      xl: '1.35rem',    // 21.6px (era 24px)
      '2xl': '1.625rem', // 26px  (era 30px)
      '3xl': '1.875rem', // 30px  (era 36px)
      '4xl': '2.5rem',  // 40px  (era 48px)
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
 * Tamanhos de Fonte Fluidos (clamp)
 * Substitui o salto abrupto mobile→desktop no breakpoint `md` por uma
 * escala contínua entre 360px e 1280px de viewport. Abaixo/acima destes
 * limites o tamanho fica fixo no mínimo/máximo (sem overflow de layout).
 * Só se aplica a headings — texto de corpo mantém-se fixo por legibilidade.
 */
export const fluidFontSize = {
  h1: fluidSize(28, 40),   // 3xl → 4xl
  h2: fluidSize(24, 30),   // 2xl → 3xl
  h3: fluidSize(20, 26),   // xl  → 2xl
  h4: fluidSize(18, 21.6), // lg  → xl
  h5: fluidSize(16, 18),   // md  → lg
  h6: fluidSize(14, 16),   // sm  → md
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
