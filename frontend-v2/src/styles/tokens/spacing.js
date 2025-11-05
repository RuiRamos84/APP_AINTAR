/**
 * Design Tokens - Espaçamentos
 * Sistema de espaçamento baseado em múltiplos de 8px (base unit)
 * Mobile-first approach
 */

export const spacingTokens = {
  // Base unit (8px)
  base: 8,

  // Espaçamentos específicos
  none: 0,
  xs: 4,    // 0.5 * base
  sm: 8,    // 1 * base
  md: 16,   // 2 * base
  lg: 24,   // 3 * base
  xl: 32,   // 4 * base
  xxl: 48,  // 6 * base
  xxxl: 64, // 8 * base

  // Espaçamentos para mobile (valores conservadores)
  mobile: {
    page: 16,        // Padding das páginas
    section: 24,     // Entre secções
    card: 16,        // Padding de cards
    component: 12,   // Entre componentes
    element: 8,      // Entre elementos pequenos
  },

  // Espaçamentos para desktop (mais generosos)
  desktop: {
    page: 32,
    section: 48,
    card: 24,
    component: 16,
    element: 12,
  },

  // Touch targets (iOS/Android guidelines)
  touch: {
    minTarget: 44,   // Tamanho mínimo de área touch (44x44px)
    comfortable: 48,  // Tamanho confortável
    large: 56,        // Botões primários
    spacing: 8,       // Espaçamento mínimo entre targets
  },
};

// Função helper para obter espaçamento responsivo
export const getResponsiveSpacing = (size, isMobile = false) => {
  const map = isMobile ? spacingTokens.mobile : spacingTokens.desktop;
  return map[size] || spacingTokens[size] || spacingTokens.md;
};
