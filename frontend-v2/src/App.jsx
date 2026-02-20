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
import { HomePage, HomeRedirect } from '@/features/home';
import { MainLayout, PublicLayout } from '@/shared/components/layout';
import { ForbiddenPage, UnauthorizedPage } from '@/features/errors/pages';
import { UserProfilePage, ChangePasswordPage } from '@/features/user/pages';
import {
  UserListPage,
  UserDetailPage,
  UserCreatePage,
  AdminDashboardPage,
  PermissionsListPage,
} from '@/features/admin/pages';

// Módulos do sistema de navegação híbrida
import { OperationPage, OperationMetadataPage, OperationControlPage } from '@/features/operations/pages';
import { ETARPage } from '@/features/gestao/pages';
import { ClientsPage } from '@/features/payments/pages';
import PaymentAdminPage from '@/features/payments/pages/PaymentAdminPage';
import { DashboardOverviewPage } from '@/features/dashboards/pages';
import { EPIPage } from '@/features/administrativo/pages';
import { TasksPage } from '@/features/tasks/pages';
import { EntitiesPage } from '@/features/entities/pages';
import DocumentsPage from '@/features/documents/pages/DocumentsPage';

function App() {
  return (
    <Routes>
      {/* ==================== HOME PAGE ==================== */}
      {/* Rota raiz - redireciona para /home se autenticado, ou mostra página pública */}
      <Route path="/" element={<HomeRedirect />} />

      {/* ==================== ROTAS PÚBLICAS ==================== */}
      <Route element={<PublicLayout />}>
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
        {/* Home - quando autenticado (com sidebar e navbar) */}
        <Route path="/home" element={<HomePage />} />

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
        {/* Admin Root - permissão 10 (ADMIN_DASHBOARD) verificada automaticamente */}
        <Route path="/admin" element={<AdminDashboardPage />} />

        {/* Admin Dashboard - permissão 10 (ADMIN_DASHBOARD) verificada automaticamente */}
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

        {/* Admin Users - permissão 20 (ADMIN_USERS) verificada automaticamente */}
        <Route path="/admin/users" element={<UserListPage />} />
        <Route path="/admin/users/list" element={<UserListPage />} />
        <Route path="/admin/users/new" element={<UserCreatePage />} />
        <Route path="/admin/users/:userId/edit" element={<UserDetailPage />} />

        {/* Admin Permissions - permissão 20 (ADMIN_USERS) verificada automaticamente */}
        <Route path="/admin/permissions" element={<PermissionsListPage />} />

        {/* Users (deprecated) - mantido para compatibilidade */}
        <Route path="/users" element={<div>Users Page (Coming Soon)</div>} />

        {/* Payments - permissão 850 (PAYMENTS_VIEW) verificada automaticamente */}
        <Route path="/payments" element={<PaymentAdminPage />} />

        {/* ==================== MÓDULO: OPERAÇÃO ==================== */}
        {/* Tasks - permissão 200 (TASKS_VIEW) verificada automaticamente */}
        {/* Página unificada com tabs: Todas (admin) | Minhas Tarefas | Criadas por Mim */}
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/*" element={<TasksPage />} />

        {/* Operation - permissão 310 (OPERATIONS_ACCESS) verificada automaticamente */}
        {/* Vista adaptativa: mobile → OperatorMobilePage, desktop → TasksPage/SupervisorPage */}
        <Route path="/operation" element={<OperationPage />} />
        <Route path="/operation/control" element={<OperationControlPage />} />
        <Route path="/operation/metadata" element={<OperationMetadataPage />} />

        {/* /branches e /septic-tanks removidos - não implementados */}

        {/* ==================== MÓDULO: GESTÃO ==================== */}
        {/* Analyses - permissão 700 (ANALYSES_VIEW) verificada automaticamente */}
        <Route path="/analyses" element={<div>Analyses Page (Coming Soon)</div>} />

        {/* ETAR - permissão 600 (ETAR_VIEW) verificada automaticamente */}
        <Route path="/etar" element={<ETARPage />} />
        <Route path="/etar/characteristics" element={<div>ETAR Characteristics (Coming Soon)</div>} />
        <Route path="/etar/volumes" element={<div>ETAR Volumes (Coming Soon)</div>} />
        <Route path="/etar/energy" element={<div>ETAR Energy (Coming Soon)</div>} />
        <Route path="/etar/expenses" element={<div>ETAR Expenses (Coming Soon)</div>} />
        <Route path="/etar/violations" element={<div>ETAR Violations (Coming Soon)</div>} />

        {/* EE - permissão 660 (EE_VIEW) verificada automaticamente */}
        <Route path="/ee" element={<div>EE Page (Coming Soon)</div>} />
        <Route path="/ee/characteristics" element={<div>EE Characteristics (Coming Soon)</div>} />
        <Route path="/ee/volumes" element={<div>EE Volumes (Coming Soon)</div>} />
        <Route path="/ee/energy" element={<div>EE Energy (Coming Soon)</div>} />
        <Route path="/ee/expenses" element={<div>EE Expenses (Coming Soon)</div>} />

        {/* Expenses - permissão 1250 (EXPENSES_VIEW) verificada automaticamente */}
        <Route path="/expenses" element={<div>Expenses Page (Coming Soon)</div>} />
        <Route path="/expenses/network" element={<div>Network Expenses (Coming Soon)</div>} />
        <Route path="/expenses/branches" element={<div>Branches Expenses (Coming Soon)</div>} />
        <Route path="/expenses/maintenance" element={<div>Maintenance Expenses (Coming Soon)</div>} />
        <Route path="/expenses/equipment" element={<div>Equipment Expenses (Coming Soon)</div>} />

        {/* Telemetry - permissão 750 (TELEMETRY_VIEW) verificada automaticamente */}
        <Route path="/telemetry" element={<div>Telemetry Page (Coming Soon)</div>} />

        {/* Pavements - permissão 1200 (PAVEMENTS_VIEW) verificada automaticamente */}
        <Route path="/pavements" element={<div>Pavements Page (Coming Soon)</div>} />

        {/* ==================== MÓDULO: PAGAMENTOS ==================== */}
        {/* Clients - permissão 950 (CLIENTS_VIEW) verificada automaticamente */}
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/contracts" element={<div>Client Contracts (Coming Soon)</div>} />

        {/* Invoices - permissão 900 (INVOICES_VIEW) verificada automaticamente */}
        <Route path="/invoices" element={<div>Invoices Page (Coming Soon)</div>} />
        <Route path="/invoices/issued" element={<div>Issued Invoices (Coming Soon)</div>} />
        <Route path="/invoices/payment-plans" element={<div>Payment Plans (Coming Soon)</div>} />

        {/* ==================== MÓDULO: DASHBOARDS ==================== */}
        {/* Dashboard Overview - permissão 1000 (DASHBOARD_VIEW) verificada automaticamente */}
        <Route path="/dashboards/overview" element={<DashboardOverviewPage />} />
        <Route path="/dashboards/requests" element={<div>Requests Dashboard (Coming Soon)</div>} />
        <Route path="/dashboards/branches" element={<div>Branches Dashboard (Coming Soon)</div>} />
        <Route path="/dashboards/septic-tanks" element={<div>Septic Tanks Dashboard (Coming Soon)</div>} />
        <Route path="/dashboards/installations" element={<div>Installations Dashboard (Coming Soon)</div>} />
        <Route path="/dashboards/violations" element={<div>Violations Dashboard (Coming Soon)</div>} />
        <Route path="/dashboards/analyses" element={<div>Analyses Dashboard (Coming Soon)</div>} />

        {/* ==================== MÓDULO: ADMINISTRATIVO ==================== */}
        {/* EPI - permissão 1100 (EPI_MANAGEMENT) verificada automaticamente */}
        <Route path="/epi" element={<EPIPage />} />

        {/* Inventory - permissão 1150 (INVENTORY_VIEW) verificada automaticamente */}
        <Route path="/inventory" element={<div>Inventory Page (Coming Soon)</div>} />
        <Route path="/inventory/stocks" element={<div>Inventory Stocks (Coming Soon)</div>} />
        <Route path="/inventory/movements" element={<div>Inventory Movements (Coming Soon)</div>} />

        {/* Offices - permissão 1300 (OFFICES_VIEW) verificada automaticamente */}
        <Route path="/offices" element={<div>Offices Page (Coming Soon)</div>} />
        <Route path="/offices-admin" element={<div>Offices Admin (Coming Soon)</div>} />
        <Route path="/offices-admin/open" element={<div>Open Office (Coming Soon)</div>} />
        <Route path="/offices-admin/close" element={<div>Close Office (Coming Soon)</div>} />
        <Route path="/offices-admin/replicate" element={<div>Replicate Office (Coming Soon)</div>} />

        {/* Requests - permissão 1350 (REQUESTS_VIEW) verificada automaticamente */}
        <Route path="/requests" element={<div>Requests Page (Coming Soon)</div>} />
        <Route path="/requests/open" element={<div>Open Request (Coming Soon)</div>} />
        <Route path="/requests/close" element={<div>Close Request (Coming Soon)</div>} />
        <Route path="/requests/replicate" element={<div>Replicate Request (Coming Soon)</div>} />

        {/* ==================== DOCUMENTOS (LEGACY) ==================== */}
        {/* Documents - permissão 500 (DOCS_VIEW_ALL) verificada automaticamente */}
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/pedidos" element={<DocumentsPage />} />

        {/* ==================== ENTIDADES ==================== */}
        {/* Entities - permissão 800 (ENTITIES_VIEW) verificada automaticamente */}
        <Route path="/entities" element={<EntitiesPage />} />
        <Route path="/entities/*" element={<EntitiesPage />} />
      </Route>

      {/* ==================== 404 ==================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
