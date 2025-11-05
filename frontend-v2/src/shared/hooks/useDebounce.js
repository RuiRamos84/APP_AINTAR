/**
 * useDebounce Hook
 * Hook para fazer debounce de valores (útil para inputs de pesquisa)
 */

import { useState, useEffect } from 'react';

/**
 * Debounce de um valor
 * @param {any} value - Valor a fazer debounce
 * @param {number} delay - Delay em milisegundos (default: 500ms)
 * @returns {any} - Valor debounced
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // Executar pesquisa apenas quando debouncedSearch mudar
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Criar timer para atualizar o valor debounced
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancelar timer se valor mudar antes do delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce de uma função callback
 * @param {Function} callback - Função a fazer debounce
 * @param {number} delay - Delay em milisegundos (default: 500ms)
 * @returns {Function} - Função debounced
 *
 * @example
 * const handleSearch = useDebouncedCallback((term) => {
 *   fetchResults(term);
 * }, 500);
 *
 * <Input onChange={(e) => handleSearch(e.target.value)} />
 */
export function useDebouncedCallback(callback, delay = 500) {
  const [timeoutId, setTimeoutId] = useState(null);

  useEffect(() => {
    // Cleanup ao desmontar
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (...args) => {
    // Cancelar timeout anterior
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Criar novo timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}
