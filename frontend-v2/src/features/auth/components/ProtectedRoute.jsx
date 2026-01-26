/**
 * ProtectedRoute Component
 * Componente para proteger rotas que requerem autenticação e permissões
 *
 * ✨ SISTEMA DINÂMICO - Baseado em routeConfig.js:
 * - Consulta automaticamente a permissão necessária do routeConfig
 * - Suporta override manual via prop requiredPermission (opcional)
 * - Completamente baseado em BD - basta atualizar routeConfig.js
 *
 * Cenários de Acesso:
 * 1. Utilizador NÃO autenticado (acesso indevido) -> /401 (Unauthorized)
 *    - Mostra: "Tentou aceder a uma área protegida sem estar autenticado"
 *    - Opções: Fazer Login | Página Inicial
 *
 * 2. Utilizador autenticado MAS sem permissão -> /403 (Forbidden)
 *    - Mostra: "Não tem permissão para aceder a esta página"
 *    - Opções: Voltar | Dashboard
 *
 * 3. Utilizador autenticado COM permissão -> Renderiza a rota ✓
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/core/contexts/AuthContext';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { Loading } from '@/shared/components/feedback';
import { getRoutePermission } from '@/core/config/routeConfig';

export const ProtectedRoute = ({ children, requiredPermission }) => {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const { hasPermission, initialized } = usePermissionContext();

  // ✨ SISTEMA DINÂMICO: Obter permissão automaticamente do routeConfig
  // Se requiredPermission for passado manualmente, usa esse (override)
  // Senão, busca automaticamente do routeConfig baseado no path atual
  const permissionNeeded = requiredPermission ?? getRoutePermission(location.pathname);

  // 1. LOADING STATE - Sistema ainda está a inicializar
  if (isLoading || !initialized) {
    return <Loading fullScreen message="A verificar autenticação..." />;
  }

  // 2. NOT AUTHENTICATED - Utilizador não está autenticado (acesso indevido)
  if (!user) {
    return (
      <Navigate
        to="/401"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // 3. AUTHENTICATED BUT NO PERMISSION - Utilizador autenticado mas sem permissão
  if (permissionNeeded && !hasPermission(permissionNeeded)) {
    return (
      <Navigate
        to="/403"
        state={{ from: location.pathname, requiredPermission: permissionNeeded }}
        replace
      />
    );
  }

  // 4. ACCESS GRANTED - Utilizador tem acesso
  return children;
};

export default ProtectedRoute;
