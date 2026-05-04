import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { detectModuleFromPath, getModuleById } from '@/core/config/moduleConfig';

/**
 * Deriva o módulo activo directamente da URL — fonte de verdade única.
 * Elimina a race condition entre Zustand e React Router.
 */
export function useCurrentModule() {
  const { pathname } = useLocation();
  const moduleId = useMemo(() => detectModuleFromPath(pathname), [pathname]);
  const moduleConfig = useMemo(() => (moduleId ? getModuleById(moduleId) : null), [moduleId]);
  return { moduleId, moduleConfig };
}
