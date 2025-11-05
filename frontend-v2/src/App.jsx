/**
 * App Component
 * Componente raiz da aplicação com sistema de rotas
 *
 * ✨ SISTEMA DINÂMICO DE PERMISSÕES:
 * - Todas as permissões são definidas em routeConfig.js
 * - ProtectedRoute consulta automaticamente a permissão necessária
 * - Não é necessário especificar requiredPermission manualmente
 * - Basta adicionar a rota aqui e configurar permissão em routeConfig.js
 *
 * Estrutura:
 * - Homepage pública (/) - PublicLayout (navbar apenas)
 * - Login/Register - Páginas standalone (sem layout)
 * - Páginas de erro (401, 403) - Standalone
 * - Rotas privadas - MainLayout (sidebar + navbar) com verificação automática de permissões
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, RegisterPage, ProtectedRoute, PublicRoute } from '@/features/auth';
import { DashboardPage } from '@/features/dashboard';
import { HomePage } from '@/features/home';
import { MainLayout, PublicLayout } from '@/shared/components/layout';
import { ForbiddenPage, UnauthorizedPage } from '@/features/errors/pages';
import { UserProfilePage, ChangePasswordPage } from '@/features/user/pages';

function App() {
  return (
    <Routes>
      {/* ==================== ROTAS PÚBLICAS ==================== */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<div>About Page (Coming Soon)</div>} />
        <Route path="/contact" element={<div>Contact Page (Coming Soon)</div>} />
      </Route>

      {/* ==================== AUTENTICAÇÃO ==================== */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* ==================== PÁGINAS DE ERRO ==================== */}
      <Route path="/401" element={<UnauthorizedPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* ==================== ROTAS PRIVADAS ==================== */}
      {/* ✨ NOTA: Permissões são verificadas automaticamente via routeConfig.js */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - sem permissão específica (definido em routeConfig) */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Settings - sem permissão específica (definido em routeConfig) */}
        <Route path="/settings" element={<div>Settings Page (Coming Soon)</div>} />

        {/* ==================== PERFIL DO UTILIZADOR ==================== */}
        {/* Perfil - qualquer utilizador autenticado pode aceder */}
        <Route path="/profile" element={<UserProfilePage />} />

        {/* Alterar Password - qualquer utilizador autenticado pode aceder */}
        <Route path="/change-password" element={<ChangePasswordPage />} />

        {/* ==================== ADMINISTRAÇÃO ==================== */}
        {/* Users - permissão 20 (ADMIN_USERS) verificada automaticamente */}
        <Route path="/users" element={<div>Users Page (Coming Soon)</div>} />

        {/* Payments - permissão 30 (ADMIN_PAYMENTS) verificada automaticamente */}
        <Route path="/payments" element={<div>Payments Page (Coming Soon)</div>} />

        {/* ==================== TAREFAS ==================== */}
        {/* Tasks - permissão 200 (TASKS_VIEW) verificada automaticamente */}
        <Route path="/tasks" element={<div>Tasks Page (Coming Soon)</div>} />

        {/* ==================== DOCUMENTOS ==================== */}
        {/* Documents - permissão 500 (DOCS_VIEW_ALL) verificada automaticamente */}
        <Route path="/documents" element={<div>Documents Page (Coming Soon)</div>} />

        {/* ==================== ENTIDADES ==================== */}
        {/* Entities - permissão 800 (ENTITIES_VIEW) verificada automaticamente */}
        <Route path="/entities" element={<div>Entities Page (Coming Soon)</div>} />
      </Route>

      {/* ==================== 404 ==================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
