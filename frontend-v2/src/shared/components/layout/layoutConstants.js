/**
 * Constantes de layout para a aplicação.
 * Centraliza os valores para garantir consistência entre AppBar, Sidebar e MainLayout.
 */
export const DRAWER_WIDTH_EXPANDED = 260;
export const DRAWER_WIDTH_COLLAPSED = 72;

// Alturas do AppBar — sincronizadas em todo o layout
export const NAVBAR_HEIGHT         = { xs: 64, sm: 72 }; // estado normal
export const NAVBAR_HEIGHT_COMPACT = { xs: 48, sm: 54 }; // estado compacto (scrolled)

// Tokens de animação — reutilizados em toda a app para consistência
export const TRANSITION = {
  fast:    '0.15s ease',
  default: '0.25s ease',
  slow:    '0.35s ease',
};

export const EASING = {
  // Snappy ease-out — rápido sem parecer abrupto
  snappy: [0.25, 0.46, 0.45, 0.94],
  // Spring-like — para elementos que "encaixam"
  spring: [0.34, 1.56, 0.64, 1],
  // Standard MUI
  standard: [0.4, 0, 0.2, 1],
};

export const DURATION = {
  instant:  0.10,
  fast:     0.18,
  default:  0.25,
  moderate: 0.35,
  slow:     0.45,
};