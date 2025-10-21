import { useEffect, useRef } from 'react';

/**
 * Hook para monitorar performance de componentes React
 * Útil em desenvolvimento para identificar componentes lentos
 *
 * @param {string} componentName - Nome do componente para logging
 * @param {number} threshold - Threshold em ms para warning (padrão: 100ms)
 * @returns {number} - Número total de renders
 *
 * @example
 * const TaskCard = ({ task }) => {
 *   usePerformanceMonitor('TaskCard', 50);
 *   // ...
 * };
 */
export const usePerformanceMonitor = (componentName, threshold = 100) => {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    // Só loga em desenvolvimento e se exceder threshold
    if (process.env.NODE_ENV === 'development' && renderTime > threshold) {
      console.warn(
        `= ${componentName} render #${renderCount.current}: ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
      );
    }

    // Reset timer para próximo render
    startTime.current = performance.now();
  });

  return renderCount.current;
};

export default usePerformanceMonitor;
