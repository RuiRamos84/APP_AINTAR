/**
 * Design Tokens - Movimento (easings e durações)
 * Curvas fortes para UI deliberada — os easings nativos do browser
 * (`ease`, `ease-in-out`) são demasiado fracos para transições intencionais.
 */

export const easingTokens = {
  // Entrar/sair — arranca rápido, sente-se responsivo
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  // Mover/transformar em ecrã
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  // Gavetas/drawers estilo iOS
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
};

// Mesmas curvas, como arrays compatíveis com a prop `ease` do Framer Motion
export const easingTokensFramer = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
  drawer: [0.32, 0.72, 0, 1],
};

export const durationTokens = {
  // Feedback de botão/press
  fast: 150,
  // Tooltips, popovers pequenos, badges
  quick: 180,
  // Dropdowns, selects, painéis de filtro
  base: 220,
  // Modais, drawers, transições de página
  slow: 320,
};
