/**
 * Design Tokens - Breakpoints
 * Sistema de breakpoints responsivos
 * Mobile-first approach
 */

export const breakpointsTokens = {
  values: {
    xs: 0,      // Extra small - Mobile portrait (320px+)
    sm: 600,    // Small - Mobile landscape / Phablet (600px+)
    md: 960,    // Medium - Tablet portrait (960px+)
    lg: 1280,   // Large - Desktop / Tablet landscape (1280px+)
    xl: 1920,   // Extra large - Large desktop (1920px+)
  },

  // Unidade padrão
  unit: 'px',

  // Nomes semânticos
  aliases: {
    mobile: 'xs',      // 0-599px
    tablet: 'md',      // 960-1279px
    desktop: 'lg',     // 1280px+
    widescreen: 'xl',  // 1920px+
  },
};

/**
 * Media queries helpers
 * Facilitam uso de media queries
 */
export const mediaQueries = {
  // Up (maior ou igual)
  up: {
    xs: `@media (min-width: ${breakpointsTokens.values.xs}${breakpointsTokens.unit})`,
    sm: `@media (min-width: ${breakpointsTokens.values.sm}${breakpointsTokens.unit})`,
    md: `@media (min-width: ${breakpointsTokens.values.md}${breakpointsTokens.unit})`,
    lg: `@media (min-width: ${breakpointsTokens.values.lg}${breakpointsTokens.unit})`,
    xl: `@media (min-width: ${breakpointsTokens.values.xl}${breakpointsTokens.unit})`,
  },

  // Down (menor que)
  down: {
    xs: `@media (max-width: ${breakpointsTokens.values.sm - 1}${breakpointsTokens.unit})`,
    sm: `@media (max-width: ${breakpointsTokens.values.md - 1}${breakpointsTokens.unit})`,
    md: `@media (max-width: ${breakpointsTokens.values.lg - 1}${breakpointsTokens.unit})`,
    lg: `@media (max-width: ${breakpointsTokens.values.xl - 1}${breakpointsTokens.unit})`,
    xl: `@media (max-width: 9999${breakpointsTokens.unit})`,
  },

  // Between (entre dois breakpoints)
  between: (start, end) => {
    const startValue = breakpointsTokens.values[start];
    const endValue = breakpointsTokens.values[end];
    return `@media (min-width: ${startValue}${breakpointsTokens.unit}) and (max-width: ${endValue - 1}${breakpointsTokens.unit})`;
  },

  // Only (apenas um breakpoint específico)
  only: {
    xs: `@media (min-width: ${breakpointsTokens.values.xs}${breakpointsTokens.unit}) and (max-width: ${breakpointsTokens.values.sm - 1}${breakpointsTokens.unit})`,
    sm: `@media (min-width: ${breakpointsTokens.values.sm}${breakpointsTokens.unit}) and (max-width: ${breakpointsTokens.values.md - 1}${breakpointsTokens.unit})`,
    md: `@media (min-width: ${breakpointsTokens.values.md}${breakpointsTokens.unit}) and (max-width: ${breakpointsTokens.values.lg - 1}${breakpointsTokens.unit})`,
    lg: `@media (min-width: ${breakpointsTokens.values.lg}${breakpointsTokens.unit}) and (max-width: ${breakpointsTokens.values.xl - 1}${breakpointsTokens.unit})`,
    xl: `@media (min-width: ${breakpointsTokens.values.xl}${breakpointsTokens.unit})`,
  },
};

/**
 * Características de dispositivos
 * Detecção de tipos de dispositivos
 */
export const deviceDetection = {
  mobile: mediaQueries.down.sm,
  tablet: mediaQueries.between('sm', 'lg'),
  desktop: mediaQueries.up.lg,

  // Orientação
  landscape: '@media (orientation: landscape)',
  portrait: '@media (orientation: portrait)',

  // Touch vs Mouse
  touch: '@media (hover: none) and (pointer: coarse)',
  mouse: '@media (hover: hover) and (pointer: fine)',

  // High DPI
  retina: '@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
};
