import { useState, useEffect } from 'react';

/**
 * Adia a atualização de um valor pelo delay indicado (ms).
 * Útil para pesquisa: evita pedidos à API a cada tecla.
 */
export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
