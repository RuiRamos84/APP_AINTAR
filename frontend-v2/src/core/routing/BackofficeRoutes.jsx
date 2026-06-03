/**
 * BackofficeRoutes.jsx
 * Todas as rotas do backoffice interno (app.aintar.pt).
 * Conteúdo migrado de App.jsx — manter sincronizado.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
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
  UserListPage, UserDetailPage, UserCreatePage, AdminDashboardPage,
  PermissionsListPage, SystemConfigPage, ActivityLogsPage,
  SessionLogsPage, AdminActionsPage,
} from '@/features/admin/pages';
import { OperationPage, OperationMetadataPage, OperationControlPage, SupervisorPage, TasksPage as OperationTasksPage } from '@/features/operations/pages';
import { ETARPage, EEPage, AnalysisPage, TelemetryPage, OfficesPage, RequestsPage } from '@/features/gestao/pages';
import { ClientsPage, InvoicesPage, ClientContractsPage, CaixaPage } from '@/features/payments/pages';
import PaymentAdminPage from '@/features/payments/pages/PaymentAdminPage';
import {
  DashboardOverviewPage, DashboardRequestsPage, DashboardBranchesPage,
  DashboardSepticTanksPage, DashboardInstallationsPage,
  DashboardViolationsPage, DashboardAnalysesPage,
  DashboardRepavPage, DashboardTramitacoesPage,
  DashboardFaturacaoPage,
} from '@/features/dashboards/pages';
import { EmissoesPage } from '@/features/emissoes';
import { EquipamentosPage } from '@/features/equipamentos';
import { ObrasPage } from '@/features/obras';
import { PavimentosPage } from '@/features/pavimentos';
import { EPIPage } from '@/features/administrativo/pages';
import { AvalPage, AvalAdminPage, AvalAnalyticsPage } from '@/features/aval';
import RhPessoalPage from '@/features/rh/pages/RhPessoalPage';
import FeriasPage from '@/features/rh/pages/FeriasPage';
import ParticipacaoPage from '@/features/rh/pages/ParticipacaoPage';
import HorariosPage from '@/features/rh/pages/HorariosPage';
import PiquetePage from '@/features/rh/pages/PiquetePage';
import PontoPage from '@/features/rh/pages/PontoPage';
import GestaoColaboradoresPage from '@/features/rh/pages/GestaoColaboradoresPage';
import LocaisPage from '@/features/rh/pages/LocaisPage';
import PontoMapaPage from '@/features/rh/pages/PontoMapaPage';
import RhGestaoCentralPage from '@/features/rh/pages/RhGestaoCentralPage';
import { TasksPage } from '@/features/tasks/pages';
import { EntitiesPage } from '@/features/entities/pages';
import DocumentsPage from '@/features/documents/pages/DocumentsPage';
import { InternalDashboardPage, RequisicaoInternaPage } from '@/features/internal';
import { FleetDashboard } from '@/features/fleet';
import {
  WebsiteNoticiasPage, WebsiteAlertasPage, WebsiteDocumentosPage,
  WebsitePublicacoesPage, WebsiteProcedimentosPage, WebsiteProcessosFinanceirosPage,
} from '@/features/website/pages';
import {
  NetworkExpensesPage, BranchesExpensesPage,
  MaintenanceExpensesPage, EquipmentExpensesPage,
} from '@/features/expenses';
import { OrcamentoPage } from '@/features/orcamento';
import { StockPage } from '@/features/stock';
import CatalogPage from '@/features/orcamento/pages/CatalogPage';
import WhatsAppAlertasPage from '@/features/alertas/pages/WhatsAppAlertasPage';

export default function BackofficeRoutes() {
  return (
    <Routes>
      {/* ==================== HOME PAGE ==================== */}
      <Route path="/" element={<HomeRedirect />} />

      {/* ==================== ROTAS PÚBLICAS ==================== */}
      <Route element={<PublicLayout />}>
        <Route path="/about"   element={<div>About Page (Coming Soon)</div>} />
        <Route path="/contact" element={<div>Contact Page (Coming Soon)</div>} />
      </Route>

      {/* ==================== AUTENTICAÇÃO ==================== */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password"               element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token"         element={<ResetPasswordPage />} />
      <Route path="/activation/:id/:activation_code" element={<ActivationPage />} />

      {/* ==================== PÁGINAS DE ERRO ==================== */}
      <Route path="/401" element={<UnauthorizedPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* ==================== ROTAS PRIVADAS ==================== */}
      {/* ✨ NOTA: Permissões são verificadas automaticamente via routeConfig.js */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

        {/* Home */}
        <Route path="/home"            element={<HomePage />} />
        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/settings"        element={<SettingsPage />} />
        <Route path="/profile"         element={<UserProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        {/* ==================== ADMINISTRAÇÃO ==================== */}
        <Route path="/admin"                        element={<AdminDashboardPage />} />
        <Route path="/admin/dashboard"              element={<AdminDashboardPage />} />
        <Route path="/admin/users"                  element={<UserListPage />} />
        <Route path="/admin/users/list"             element={<UserListPage />} />
        <Route path="/admin/users/new"              element={<UserCreatePage />} />
        <Route path="/admin/users/:userId/edit"     element={<UserDetailPage />} />
        <Route path="/admin/permissions"            element={<PermissionsListPage />} />
        <Route path="/admin/config"                 element={<SystemConfigPage />} />
        <Route path="/admin/activity-logs"          element={<ActivityLogsPage />} />
        <Route path="/admin/session-logs"           element={<SessionLogsPage />} />
        <Route path="/admin/actions"                element={<AdminActionsPage />} />
        <Route path="/users" element={<Navigate to="/admin/users" replace />} />

        {/* ==================== CMS WEBSITE ==================== */}
        <Route path="/intern/website/noticias"    element={<WebsiteNoticiasPage />} />
        <Route path="/intern/website/alertas"     element={<WebsiteAlertasPage />} />
        <Route path="/intern/website/documentos"  element={<WebsiteDocumentosPage />} />
        <Route path="/intern/website/publicacoes" element={<WebsitePublicacoesPage />} />
        <Route path="/intern/website/procedimentos" element={<WebsiteProcedimentosPage />} />
        <Route path="/intern/website/financeiros" element={<WebsiteProcessosFinanceirosPage />} />

        {/* ==================== MÓDULO: PAGAMENTOS ==================== */}
        <Route path="/payments"            element={<PaymentAdminPage />} />
        <Route path="/clients"             element={<EntitiesPage />} />
        <Route path="/clients/*"           element={<EntitiesPage />} />
        <Route path="/clients/contracts"   element={<ClientContractsPage />} />
        <Route path="/caixa"               element={<CaixaPage />} />
        <Route path="/invoices"            element={<InvoicesPage />} />
        <Route path="/invoices/issued"     element={<Navigate to="/invoices" replace />} />
        <Route path="/invoices/payment-plans" element={<Navigate to="/invoices" replace />} />

        {/* ==================== MÓDULO: OPERAÇÃO ==================== */}
        <Route path="/intern/tasks"    element={<TasksPage />} />
        <Route path="/intern/tasks/*"  element={<TasksPage />} />
        <Route path="/operation"       element={<Navigate to="/operation/tasks" replace />} />
        <Route path="/operation/tasks"      element={<OperationTasksPage />} />
        <Route path="/operation/control"    element={<OperationControlPage />} />
        <Route path="/operation/metadata"   element={<OperationMetadataPage />} />
        <Route path="/operation/supervisor" element={<SupervisorPage />} />

        {/* ==================== MÓDULO: GESTÃO ==================== */}
        <Route path="/analyses"  element={<AnalysisPage />} />
        <Route path="/etar"      element={<ETARPage />} />
        <Route path="/etar/characteristics" element={<div>ETAR Characteristics (Coming Soon)</div>} />
        <Route path="/etar/volumes"         element={<div>ETAR Volumes (Coming Soon)</div>} />
        <Route path="/etar/energy"          element={<div>ETAR Energy (Coming Soon)</div>} />
        <Route path="/etar/expenses"        element={<div>ETAR Expenses (Coming Soon)</div>} />
        <Route path="/etar/violations"      element={<div>ETAR Violations (Coming Soon)</div>} />
        <Route path="/ee"        element={<EEPage />} />
        <Route path="/expenses"  element={<Navigate to="/expenses/network" replace />} />
        <Route path="/expenses/network"     element={<NetworkExpensesPage />} />
        <Route path="/expenses/branches"    element={<BranchesExpensesPage />} />
        <Route path="/expenses/maintenance" element={<MaintenanceExpensesPage />} />
        <Route path="/expenses/equipment"   element={<EquipmentExpensesPage />} />
        <Route path="/equipamentos" element={<EquipamentosPage />} />
        <Route path="/obras"        element={<ObrasPage />} />
        <Route path="/telemetry"    element={<TelemetryPage />} />
        <Route path="/gestao/whatsapp-alertas" element={<WhatsAppAlertasPage />} />
        <Route path="/pavements"    element={<PavimentosPage />} />
        <Route path="/offices-admin" element={<OfficesPage />} />
        <Route path="/stock"        element={<StockPage />} />

        {/* ==================== MÓDULO: DASHBOARDS ==================== */}
        <Route path="/dashboards/overview"      element={<DashboardOverviewPage />} />
        <Route path="/dashboards/requests"      element={<DashboardRequestsPage />} />
        <Route path="/dashboards/branches"      element={<DashboardBranchesPage />} />
        <Route path="/dashboards/septic-tanks"  element={<DashboardSepticTanksPage />} />
        <Route path="/dashboards/installations" element={<DashboardInstallationsPage />} />
        <Route path="/dashboards/violations"    element={<DashboardViolationsPage />} />
        <Route path="/dashboards/analyses"      element={<DashboardAnalysesPage />} />
        <Route path="/dashboards/repav"         element={<DashboardRepavPage />} />
        <Route path="/dashboards/tramitacoes"   element={<DashboardTramitacoesPage />} />
        <Route path="/dashboards/faturacao"     element={<DashboardFaturacaoPage />} />

        {/* ==================== EMISSÕES ==================== */}
        <Route path="/intern/emissoes" element={<EmissoesPage />} />

        {/* ==================== MÓDULO: ADMINISTRATIVO ==================== */}
        <Route path="/epi"                          element={<EPIPage />} />
        <Route path="/rh/pessoal"                   element={<RhPessoalPage />} />
        <Route path="/rh/pessoal/ponto"             element={<PontoPage />} />
        <Route path="/rh/pessoal/ferias"            element={<FeriasPage />} />
        <Route path="/rh/pessoal/faltas"            element={<ParticipacaoPage />} />
        <Route path="/rh/pessoal/horarios"          element={<HorariosPage />} />
        <Route path="/rh/pessoal/piquete"           element={<PiquetePage />} />
        <Route path="/rh/gestao/colaboradores"      element={<GestaoColaboradoresPage />} />
        <Route path="/rh/gestao/locais"             element={<LocaisPage />} />
        <Route path="/rh/gestao/ponto-mapa"         element={<PontoMapaPage />} />
        <Route path="/rh/gestao/central"            element={<RhGestaoCentralPage />} />
        <Route path="/aval"                         element={<AvalPage />} />
        <Route path="/admin/aval"                   element={<AvalAdminPage />} />
        <Route path="/aval/analytics"               element={<AvalAnalyticsPage />} />

        {/* ==================== ÁREA INTERNA ==================== */}
        <Route path="/internal"            element={<InternalDashboardPage />} />
        <Route path="/internal/requisicao" element={<RequisicaoInternaPage />} />

        {/* Frota */}
        <Route path="/fleet" element={<FleetDashboard />} />

        {/* ==================== DOCUMENTOS ==================== */}
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/pedidos"   element={<DocumentsPage />} />

        {/* ==================== ORÇAMENTO ==================== */}
        <Route path="/orcamento"          element={<OrcamentoPage />} />
        <Route path="/orcamento/catalogo" element={<CatalogPage />} />

        {/* ==================== ENTIDADES ==================== */}
        <Route path="/entities"   element={<EntitiesPage />} />
        <Route path="/entities/*" element={<EntitiesPage />} />

      </Route>

      {/* ==================== 404 ==================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
