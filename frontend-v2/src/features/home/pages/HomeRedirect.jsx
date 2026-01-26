/**
 * HomeRedirect
 * Componente que gerencia o redirecionamento da página inicial
 * - Se autenticado: redireciona para /home (com sidebar e navbar)
 * - Se não autenticado: mostra HomePage pública
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/contexts/AuthContext';
import HomePage from './HomePage';

export function HomeRedirect() {
  const { user, isLoading } = useAuth();

  // Aguardar verificação de autenticação
  if (isLoading) {
    return null; // ou um loading spinner
  }

  // Se autenticado, redireciona para /home (que tem MainLayout)
  if (user) {
    return <Navigate to="/home" replace />;
  }

  // Se não autenticado, mostra a HomePage pública
  return <HomePage />;
}

export default HomeRedirect;
