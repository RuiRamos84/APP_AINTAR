import { useEffect } from 'react';

/**
 * Hook para registar atalhos de teclado globais
 * Suporta combinações com Ctrl/Cmd, Shift e Alt
 *
 * @param {Object} shortcuts - Objeto com combos de teclas e handlers
 *
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+k': () => focusSearch(),
 *   'ctrl+n': () => openNewTask(),
 *   'esc': () => closeModal(),
 *   'ctrl+shift+f': () => toggleFilters()
 * });
 */
export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey; // Suporta Cmd no Mac
      const shift = e.shiftKey;
      const alt = e.altKey;

      Object.entries(shortcuts).forEach(([combo, handler]) => {
        const parts = combo.toLowerCase().split('+');
        const needsCtrl = parts.includes('ctrl') || parts.includes('cmd');
        const needsShift = parts.includes('shift');
        const needsAlt = parts.includes('alt');
        const keyPart = parts[parts.length - 1];

        // Verifica se todas as condições são atendidas
        if (
          key === keyPart &&
          ctrl === needsCtrl &&
          shift === needsShift &&
          alt === needsAlt
        ) {
          e.preventDefault();
          handler(e);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export default useKeyboardShortcuts;
