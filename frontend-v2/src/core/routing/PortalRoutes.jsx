import { Routes, Route, Navigate } from 'react-router-dom';
import {
  LoginPage, RegisterPage, PublicRoute, ProtectedRoute,
  ForgotPasswordPage, ResetPasswordPage, ActivationPage,
} from '@/features/auth';
import { ForbiddenPage, UnauthorizedPage } from '@/features/errors/pages';

import { PortalLayout } from '@/shared/components/layout/PortalLayout';
import { PortalAuthLayout } from '@/shared/components/layout/PortalAuthLayout';
import PortalPedidosPage from '@/features/portal/pages/PortalPedidosPage';
import PortalNovoPedidoPage from '@/features/portal/pages/PortalNovoPedidoPage';
import PortalFacturasPage from '@/features/portal/pages/PortalFacturasPage';
import PortalPerfilPage from '@/features/portal/pages/PortalPerfilPage';
import PortalPedidoDetailPage from '@/features/portal/pages/PortalPedidoDetailPage';
import ChangePasswordPage from '@/features/user/pages/ChangePasswordPage';

export default function PortalRoutes() {
  return (
    <Routes>
      {/* ==================== AUTENTICAÇÃO (PortalAuthLayout) ==================== */}
      <Route element={<PortalAuthLayout />}>
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password"                element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token"          element={<ResetPasswordPage />} />
        <Route path="/activation/:id/:activation_code" element={<ActivationPage />} />
      </Route>

      {/* ==================== PÁGINAS DE ERRO ==================== */}
      <Route path="/401" element={<UnauthorizedPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* ==================== PORTAL (PortalLayout) ==================== */}
      <Route element={<PortalLayout />}>
        <Route path="/" element={<Navigate to="/pedidos" replace />} />
        <Route path="/pedidos"     element={<ProtectedRoute><PortalPedidosPage /></ProtectedRoute>} />
        <Route path="/pedidos/:id" element={<ProtectedRoute><PortalPedidoDetailPage /></ProtectedRoute>} />
        <Route path="/novo-pedido" element={<ProtectedRoute><PortalNovoPedidoPage /></ProtectedRoute>} />
        <Route path="/faturas"     element={<ProtectedRoute><PortalFacturasPage /></ProtectedRoute>} />
        <Route path="/perfil"      element={<ProtectedRoute><PortalPerfilPage /></ProtectedRoute>} />
        <Route path="/alterar-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
      </Route>

      {/* ==================== 404 ==================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
