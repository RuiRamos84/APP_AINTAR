/**
 * PublicRoute Component
 * Componente para rotas públicas (login, register)
 * Redireciona para dashboard se já estiver autenticado
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/contexts/AuthContext';

export const PublicRoute = ({ children }) => {
  const { user } = useAuth();

  // Se já está autenticado, redirecionar para dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Se não está autenticado, renderizar children
  return children;
};

export default PublicRoute;
