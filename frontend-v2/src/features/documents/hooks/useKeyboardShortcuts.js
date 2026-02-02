import { useEffect, useState, useCallback } from 'react';

/**
 * Keyboard shortcuts definition
 */
const SHORTCUTS = [
  { key: 'Ctrl + K', description: 'Pesquisar documentos', category: 'Navegação' },
  { key: 'Ctrl + N', description: 'Novo documento', category: 'Ações' },
  { key: 'F5', description: 'Atualizar dados', category: 'Ações' },
  { key: 'Ctrl + F', description: 'Toggle filtros', category: 'Vista' },
  { key: '1', description: 'Vista Lista', category: 'Vista' },
  { key: '2', description: 'Vista Grid', category: 'Vista' },
  { key: '3', description: 'Vista Kanban', category: 'Vista' },
  { key: '?', description: 'Mostrar ajuda', category: 'Ajuda' },
  { key: 'Esc', description: 'Fechar modais', category: 'Navegação' },
];

/**
 * Hook for managing keyboard shortcuts in the Documents feature
 * @param {Object} handlers - Callback functions for each shortcut action
 * @param {Function} handlers.onSearch - Focus search input
 * @param {Function} handlers.onCreate - Open create document modal
 * @param {Function} handlers.onRefresh - Refresh data
 * @param {Function} handlers.onToggleFilters - Toggle filters panel
 * @param {Function} handlers.onViewModeChange - Change view mode (list/grid/kanban)
 * @param {boolean} [enabled=true] - Whether shortcuts are active
 * @returns {{ showHelp: boolean, setShowHelp: Function, shortcuts: Array }}
 */
export const useKeyboardShortcuts = (handlers = {}, enabled = true) => {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (event) => {
      if (!enabled) return;

      // Don't interfere with text inputs or textareas
      const tag = event.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (event.key === 'Escape') {
          event.target.blur();
        }
        return;
      }

      switch (true) {
        // Ctrl + K - Focus search
        case event.ctrlKey && event.key === 'k': {
          event.preventDefault();
          if (handlers.onSearch) {
            handlers.onSearch();
          } else {
            const searchInput = document.querySelector('input[placeholder*="Pesquisar"]');
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
          }
          break;
        }

        // Ctrl + N - New document
        case event.ctrlKey && event.key === 'n':
          event.preventDefault();
          handlers.onCreate?.();
          break;

        // F5 - Refresh
        case event.key === 'F5':
          event.preventDefault();
          handlers.onRefresh?.();
          break;

        // Ctrl + F - Toggle filters
        case event.ctrlKey && event.key === 'f':
          event.preventDefault();
          handlers.onToggleFilters?.();
          break;

        // 1 - List view
        case event.key === '1':
          event.preventDefault();
          handlers.onViewModeChange?.('list');
          break;

        // 2 - Grid view
        case event.key === '2':
          event.preventDefault();
          handlers.onViewModeChange?.('grid');
          break;

        // 3 - Kanban view
        case event.key === '3':
          event.preventDefault();
          handlers.onViewModeChange?.('kanban');
          break;

        // ? - Help
        case event.key === '?':
          event.preventDefault();
          setShowHelp(true);
          break;

        // Esc - Close
        case event.key === 'Escape':
          if (showHelp) {
            event.preventDefault();
            setShowHelp(false);
          }
          break;

        default:
          break;
      }
    },
    [enabled, handlers, showHelp]
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    showHelp,
    setShowHelp,
    shortcuts: SHORTCUTS,
  };
};
