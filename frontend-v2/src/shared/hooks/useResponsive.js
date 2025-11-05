/**
 * useResponsive Hook
 * Hook para detetar breakpoints e dispositivos
 */

import { useTheme, useMediaQuery } from '@mui/material';

/**
 * Hook para verificar breakpoints responsivos
 * @returns {Object} - Objeto com flags de breakpoints
 *
 * @example
 * const { isMobile, isDesktop } = useResponsive();
 *
 * if (isMobile) {
 *   return <MobileView />;
 * }
 */
export function useResponsive() {
  const theme = useTheme();

  // Breakpoints individuais
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.only('xl'));

  // Ranges úteis
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // 0-599px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600-959px
  const isDesktop = useMediaQuery(theme.breakpoints.up('md')); // 960px+
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('lg')); // 1280px+

  // Mobile vs Desktop
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md')); // < 960px
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg')); // >= 1280px

  // Orientation
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');

  // Touch vs Mouse
  const isTouch = useMediaQuery('(hover: none) and (pointer: coarse)');
  const isMouse = useMediaQuery('(hover: hover) and (pointer: fine)');

  // Retina/High DPI
  const isRetina = useMediaQuery('(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)');

  return {
    // Breakpoints individuais
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,

    // Ranges úteis
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,

    // Screen sizes
    isSmallScreen,
    isLargeScreen,

    // Orientation
    isPortrait,
    isLandscape,

    // Input methods
    isTouch,
    isMouse,

    // Display quality
    isRetina,
  };
}
