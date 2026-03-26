/**
 * useNavbarCompact
 * Devolve `true` assim que o utilizador faz qualquer scroll (scrollY > 0).
 * Usa listener passivo na window — mais fiável que useScrollTrigger em layouts
 * onde o elemento de scroll pode não ser a window diretamente.
 */
import { useState, useEffect } from 'react';

export const useNavbarCompact = () => {
  const [compact, setCompact] = useState(() => window.scrollY > 0);

  useEffect(() => {
    const handler = () => setCompact(window.scrollY > 0);
    window.addEventListener('scroll', handler, { passive: true });
    // Verifica o estado inicial (ex: navegação com scroll já feito)
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return compact;
};
