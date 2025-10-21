import { useEffect, useRef, useState } from 'react';

/**
 * Hook para implementar pull-to-refresh nativo
 * Detecta quando o utilizador arrasta para baixo no topo da página
 *
 * @param {Function} onRefresh - Função async chamada quando refresh é triggered
 * @param {number} threshold - Distância mínima para trigger refresh (padrão: 80px)
 * @returns {Object} - { containerRef, pullDistance, isRefreshing }
 *
 * @example
 * const { containerRef, pullDistance, isRefreshing } = usePullToRefresh(async () => {
 *   await fetchNewData();
 * });
 *
 * <Box ref={containerRef}>
 *   {pullDistance > 0 && <CircularProgress />}
 *   <Content />
 * </Box>
 */
export const usePullToRefresh = (onRefresh, threshold = 80) => {
  const containerRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleTouchStart = (e) => {
      // Só ativa se estiver no topo
      if (element.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (startY.current === 0 || element.scrollTop > 0) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      // Só permite pull para baixo
      if (distance > 0) {
        e.preventDefault();
        // Limita a distância máxima
        setPullDistance(Math.min(distance, threshold * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Erro no refresh:', error);
        } finally {
          setIsRefreshing(false);
        }
      }
      setPullDistance(0);
      startY.current = 0;
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, threshold, onRefresh]);

  return {
    containerRef,
    pullDistance,
    isRefreshing
  };
};

export default usePullToRefresh;
