/**
 * useToggle Hook
 * Hook para gerenciar estados booleanos (on/off, aberto/fechado, etc.)
 */

import { useState, useCallback } from 'react';

/**
 * Toggle de estado booleano
 * @param {boolean} initialValue - Valor inicial (default: false)
 * @returns {[boolean, Function, Function, Function]} - [value, toggle, setTrue, setFalse]
 *
 * @example
 * const [isOpen, toggleOpen, openModal, closeModal] = useToggle(false);
 *
 * <Button onClick={openModal}>Abrir</Button>
 * <Modal open={isOpen} onClose={closeModal}>...</Modal>
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  // Toggle (alternar entre true/false)
  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  // Set true
  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  // Set false
  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return [value, toggle, setTrue, setFalse];
}
