/**
 * PublicRoute Component
 * Componente para rotas públicas (login, register)
 * Redireciona para a área autenticada se já estiver autenticado
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/contexts/AuthContext';
import { IS_PORTAL } from '@/core/config/appContext';

export const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  // Aguardar inicialização — evita mount→unmount→remount do formulário
  // que bloqueia o autoFocus do browser por ausência de gesto do utilizador
  if (isLoading) {
    return null;
  }

  if (user) {
    return <Navigate to={IS_PORTAL ? '/pedidos' : '/home'} replace />;
  }

  return children;
};

export default PublicRoute;
