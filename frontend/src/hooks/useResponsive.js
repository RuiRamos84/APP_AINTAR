import { useTheme, useMediaQuery } from '@mui/material';

/**
 * HOOK USERESPONSIVE CENTRALIZADO
 *
 * Substitui múltiplos useMediaQuery espalhados pelo código
 * Garante breakpoints consistentes em toda a aplicação
 *
 * Uso:
 * const { isMobile, isTablet, isDesktop, above, below } = useResponsive();
 *
 * if (isMobile) { ... }
 * if (above('md')) { ... }
 */

const useResponsive = () => {
  const theme = useTheme();

  // Breakpoints principais (seguindo Material-UI)
  // xs: 0px, sm: 600px, md: 900px, lg: 1200px, xl: 1536px
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // < 900px
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg')); // 900px - 1200px
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg')); // >= 1200px

  // Detecção de orientação (útil para mobile)
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');

  // Detecção de tamanho específico
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('xl')); // >= 1536px

  // Helpers para queries customizadas
  const above = (breakpoint) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMediaQuery(theme.breakpoints.up(breakpoint));
  };

  const below = (breakpoint) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMediaQuery(theme.breakpoints.down(breakpoint));
  };

  const between = (start, end) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMediaQuery(theme.breakpoints.between(start, end));
  };

  // Helper para queries customizadas literais
  const customQuery = (query) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMediaQuery(query);
  };

  // Tipo de dispositivo (simplificado)
  const deviceType = isMobile
    ? 'mobile'
    : isTablet
      ? 'tablet'
      : 'desktop';

  // Touch device detection
  const isTouchDevice = useMediaQuery('(hover: none) and (pointer: coarse)');

  // Reticular density (para assets otimizados)
  const isHighDensity = useMediaQuery('(min-resolution: 2dppx)');

  return {
    // Breakpoints principais
    isMobile,
    isTablet,
    isDesktop,

    // Tamanhos específicos
    isSmallMobile,
    isLargeDesktop,

    // Orientação
    isPortrait,
    isLandscape,

    // Tipo de dispositivo
    deviceType,

    // Capacidades
    isTouchDevice,
    isHighDensity,

    // Helpers
    above,
    below,
    between,
    customQuery,

    // Breakpoints do tema (para casos especiais)
    breakpoints: theme.breakpoints,
  };
};

export default useResponsive;
