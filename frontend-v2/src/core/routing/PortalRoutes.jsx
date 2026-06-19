import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import {
  LoginPage, RegisterPage, PublicRoute, ProtectedRoute,
  ForgotPasswordPage, ResetPasswordPage, ActivationPage,
} from '@/features/auth';
import { ForbiddenPage, UnauthorizedPage } from '@/features/errors/pages';

import { PortalLayout } from '@/shared/components/layout/PortalLayout';
import { PortalAuthLayout } from '@/shared/components/layout/PortalAuthLayout';

const PortalPedidosPage = lazy(() => import('@/features/portal/pages/PortalPedidosPage'));
const PortalNovoPedidoPage = lazy(() => import('@/features/portal/pages/PortalNovoPedidoPage'));
const PortalFacturasPage = lazy(() => import('@/features/portal/pages/PortalFacturasPage'));
const PortalPerfilPage = lazy(() => import('@/features/portal/pages/PortalPerfilPage'));
const PortalPedidoDetailPage = lazy(() => import('@/features/portal/pages/PortalPedidoDetailPage'));
const ChangePasswordPage = lazy(() => import('@/features/user/pages/ChangePasswordPage'));

function PageFallback() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function PortalRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
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
        <Route path="/pedidos"     element={<ProtectedRoute requiredPermission="portal.access"><PortalPedidosPage /></ProtectedRoute>} />
        <Route path="/pedidos/:id" element={<ProtectedRoute requiredPermission="portal.access"><PortalPedidoDetailPage /></ProtectedRoute>} />
        <Route path="/novo-pedido" element={<ProtectedRoute requiredPermission="portal.access"><PortalNovoPedidoPage /></ProtectedRoute>} />
        <Route path="/faturas"     element={<ProtectedRoute requiredPermission="portal.invoices.view"><PortalFacturasPage /></ProtectedRoute>} />
        <Route path="/perfil"      element={<ProtectedRoute requiredPermission="portal.access"><PortalPerfilPage /></ProtectedRoute>} />
        <Route path="/alterar-password" element={<ProtectedRoute requiredPermission="portal.access"><ChangePasswordPage /></ProtectedRoute>} />
      </Route>

      {/* ==================== 404 ==================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
