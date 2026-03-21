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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { pt } from 'date-fns/locale';
import {
  LoginPage, RegisterPage, ProtectedRoute, PublicRoute,
  ForgotPasswordPage, ResetPasswordPage, ActivationPage,
} from '@/features/auth';
import { DashboardPage } from '@/features/dashboard';
import { HomePage, HomeRedirect } from '@/features/home';
import { MainLayout, PublicLayout } from '@/shared/components/layout';
import { ForbiddenPage, UnauthorizedPage } from '@/features/errors/pages';
import { UserProfilePage, ChangePasswordPage, SettingsPage } from '@/features/user/pages';
import {
  UserListPage,
  UserDetailPage,
  UserCreatePage,
  AdminDashboardPage,
  PermissionsListPage,
  SystemConfigPage,
  ActivityLogsPage,
  SessionLogsPage,
  AdminActionsPage,
} from '@/features/admin/pages';

// Módulos do sistema de navegação híbrida
import { OperationPage, OperationMetadataPage, OperationControlPage, SupervisorPage, TasksPage as OperationTasksPage } from '@/features/operations/pages';
import { ETARPage, EEPage, AnalysisPage, TelemetryPage, OfficesPage, RequestsPage } from '@/features/gestao/pages';
import { ClientsPage, InvoicesPage, ClientContractsPage } from '@/features/payments/pages';
import PaymentAdminPage from '@/features/payments/pages/PaymentAdminPage';
import {
  DashboardOverviewPage, DashboardRequestsPage, DashboardBranchesPage,
  DashboardSepticTanksPage, DashboardInstallationsPage,
  DashboardViolationsPage, DashboardAnalysesPage,
  DashboardRepavPage, DashboardTramitacoesPage,
} from '@/features/dashboards/pages';
import { EmissoesPage } from '@/features/emissoes';
import { EquipamentosPage } from '@/features/equipamentos';
import { EPIPage } from '@/features/administrativo/pages';
import { AvalPage, AvalAdminPage, AvalAnalyticsPage } from '@/features/aval';
import { TasksPage } from '@/features/tasks/pages';
import { EntitiesPage } from '@/features/entities/pages';
import DocumentsPage from '@/features/documents/pages/DocumentsPage';
import { InternalDashboardPage, InventoryPage, RequisicaoInternaPage } from '@/features/internal';
import { FleetDashboard } from '@/features/fleet';
import { EquipamentoInstalacaoPage } from '@/features/equipamento';

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={pt}>
    <Routes>
      {/* ==================== HOME PAGE ==================== */}
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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/activation/:id/:activation_code" element={<ActivationPage />} />

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

        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* ==================== PERFIL DO UTILIZADOR ==================== */}
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        {/* ==================== ADMINISTRAÇÃO ==================== */}
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<UserListPage />} />
        <Route path="/admin/users/list" element={<UserListPage />} />
        <Route path="/admin/users/new" element={<UserCreatePage />} />
        <Route path="/admin/users/:userId/edit" element={<UserDetailPage />} />
        <Route path="/admin/permissions" element={<PermissionsListPage />} />
        <Route path="/admin/config" element={<SystemConfigPage />} />
        <Route path="/admin/activity-logs" element={<ActivityLogsPage />} />
        <Route path="/admin/session-logs" element={<SessionLogsPage />} />
        <Route path="/admin/actions" element={<AdminActionsPage />} />
        <Route path="/users" element={<Navigate to="/admin/users" replace />} />

        {/* ==================== MÓDULO: PAGAMENTOS ==================== */}
        <Route path="/payments" element={<PaymentAdminPage />} />

        {/* Clients */}
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/contracts" element={<ClientContractsPage />} />

        {/* Invoices */}
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/issued" element={<Navigate to="/invoices" replace />} />
        <Route path="/invoices/payment-plans" element={<Navigate to="/invoices" replace />} />

        {/* ==================== MÓDULO: OPERAÇÃO ==================== */}
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/*" element={<TasksPage />} />
        <Route path="/operation" element={<Navigate to="/operation/tasks" replace />} />
        <Route path="/operation/tasks" element={<OperationTasksPage />} />
        <Route path="/operation/control" element={<OperationControlPage />} />
        <Route path="/operation/metadata" element={<OperationMetadataPage />} />
        <Route path="/operation/supervisor" element={<SupervisorPage />} />

        {/* ==================== MÓDULO: GESTÃO ==================== */}
        {/* Analyses */}
        <Route path="/analyses" element={<AnalysisPage />} />

        {/* ETAR */}
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

        {/* Equipamentos - permissão 1500 (EQUIPAMENTOS_VIEW) */}
        <Route path="/equipamentos" element={<EquipamentosPage />} />

        {/* Telemetry - permissão 750 (TELEMETRY_VIEW) verificada automaticamente */}
        <Route path="/telemetry" element={<TelemetryPage />} />

        {/* Pavements - permissão 1200 (PAVEMENTS_VIEW) verificada automaticamente */}
        <Route path="/pavements" element={<div>Pavements Page (Coming Soon)</div>} />

        {/* ==================== MÓDULO: DASHBOARDS ==================== */}
        <Route path="/dashboards/overview" element={<DashboardOverviewPage />} />
        <Route path="/dashboards/requests" element={<DashboardRequestsPage />} />
        <Route path="/dashboards/branches" element={<DashboardBranchesPage />} />
        <Route path="/dashboards/septic-tanks" element={<DashboardSepticTanksPage />} />
        <Route path="/dashboards/installations" element={<DashboardInstallationsPage />} />
        <Route path="/dashboards/violations" element={<DashboardViolationsPage />} />
        <Route path="/dashboards/analyses" element={<DashboardAnalysesPage />} />
        <Route path="/dashboards/repav" element={<DashboardRepavPage />} />
        <Route path="/dashboards/tramitacoes" element={<DashboardTramitacoesPage />} />

        {/* ==================== MÓDULO: ADMINISTRATIVO ==================== */}
        <Route path="/aval" element={<AvalPage />} />
        <Route path="/aval/admin" element={<AvalAdminPage />} />
        <Route path="/aval/analytics" element={<AvalAnalyticsPage />} />
        <Route path="/epi" element={<EPIPage />} />

        {/* ==================== ÁREA INTERNA ==================== */}
        <Route path="/internal" element={<InternalDashboardPage />} />
        <Route path="/internal/inventario" element={<InventoryPage />} />
        <Route path="/internal/requisicao" element={<RequisicaoInternaPage />} />
        <Route path="/internal/equipamento" element={<EquipamentoInstalacaoPage />} />
        <Route path="/equipamento" element={<EquipamentoInstalacaoPage />} />

        {/* Inventory - redireciona para área interna */}
        <Route path="/inventory" element={<Navigate to="/internal/inventario" replace />} />
        <Route path="/inventory/stocks" element={<Navigate to="/internal/inventario" replace />} />
        <Route path="/inventory/movements" element={<Navigate to="/internal/inventario" replace />} />

        {/* Frota */}
        <Route path="/fleet" element={<FleetDashboard />} />

        {/* ==================== DOCUMENTOS ==================== */}
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/pedidos" element={<DocumentsPage />} />

        {/* ==================== ENTIDADES ==================== */}
        <Route path="/entities" element={<EntitiesPage />} />
        <Route path="/entities/*" element={<EntitiesPage />} />
      </Route>

      {/* ==================== 404 ==================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </LocalizationProvider>
  );
}

export default App;
