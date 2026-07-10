/**
 * BackofficeRoutes.jsx
 * Todas as rotas do backoffice interno (app.aintar.pt).
 * Conteúdo migrado de App.jsx — manter sincronizado.
 *
 * Code-splitting: páginas de funcionalidades são carregadas via React.lazy,
 * autenticação/layout/erros mantêm-se eager (necessários no primeiro render).
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import {
  LoginPage, RegisterPage, ProtectedRoute, PublicRoute,
  ForgotPasswordPage, ResetPasswordPage, ActivationPage,
} from '@/features/auth';
import { HomePage, HomeRedirect } from '@/features/home';
import { MainLayout, PublicLayout } from '@/shared/components/layout';
import { ForbiddenPage, UnauthorizedPage } from '@/features/errors/pages';

// ==================== PÁGINAS COM LAZY LOADING ====================

const DashboardPage = lazy(() => import('@/features/dashboard').then(m => ({ default: m.DashboardPage })));

const UserProfilePage = lazy(() => import('@/features/user/pages').then(m => ({ default: m.UserProfilePage })));
const ChangePasswordPage = lazy(() => import('@/features/user/pages').then(m => ({ default: m.ChangePasswordPage })));
const SettingsPage = lazy(() => import('@/features/user/pages').then(m => ({ default: m.SettingsPage })));

const UserListPage = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.UserListPage })));
const UserDetailPage = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.UserDetailPage })));
const UserCreatePage = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.UserCreatePage })));
const AdminDashboardPage = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.AdminDashboardPage })));
const PermissionsListPage = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.PermissionsListPage })));
const SystemConfigPage = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.SystemConfigPage })));
const ActivityLogsPage = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.ActivityLogsPage })));
const SessionLogsPage = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.SessionLogsPage })));
const AdminActionsPage = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.AdminActionsPage })));
const AdminNotificationLab = lazy(() => import('@/features/admin/components/AdminNotificationLab'));

const OperationMetadataPage = lazy(() => import('@/features/operations/pages').then(m => ({ default: m.OperationMetadataPage })));
const OperationControlPage = lazy(() => import('@/features/operations/pages').then(m => ({ default: m.OperationControlPage })));
const SupervisorPage = lazy(() => import('@/features/operations/pages').then(m => ({ default: m.SupervisorPage })));
const OperationTasksPage = lazy(() => import('@/features/operations/pages').then(m => ({ default: m.TasksPage })));

const ETARPage = lazy(() => import('@/features/gestao/pages').then(m => ({ default: m.ETARPage })));
const EEPage = lazy(() => import('@/features/gestao/pages').then(m => ({ default: m.EEPage })));
const AnalysisPage = lazy(() => import('@/features/gestao/pages').then(m => ({ default: m.AnalysisPage })));
const TelemetryPage = lazy(() => import('@/features/gestao/pages').then(m => ({ default: m.TelemetryPage })));
const OfficesPage = lazy(() => import('@/features/gestao/pages').then(m => ({ default: m.OfficesPage })));
const RequestsPage = lazy(() => import('@/features/gestao/pages').then(m => ({ default: m.RequestsPage })));

const ClientsPage = lazy(() => import('@/features/payments/pages').then(m => ({ default: m.ClientsPage })));
const InvoicesPage = lazy(() => import('@/features/payments/pages').then(m => ({ default: m.InvoicesPage })));
const ClientContractsPage = lazy(() => import('@/features/payments/pages').then(m => ({ default: m.ClientContractsPage })));
const CaixaPage = lazy(() => import('@/features/payments/pages').then(m => ({ default: m.CaixaPage })));
const PaymentAdminPage = lazy(() => import('@/features/payments/pages/PaymentAdminPage'));

const DashboardOverviewPage = lazy(() => import('@/features/dashboards/pages').then(m => ({ default: m.DashboardOverviewPage })));
const DashboardRequestsPage = lazy(() => import('@/features/dashboards/pages').then(m => ({ default: m.DashboardRequestsPage })));
const DashboardBranchesPage = lazy(() => import('@/features/dashboards/pages').then(m => ({ default: m.DashboardBranchesPage })));
const DashboardSepticTanksPage = lazy(() => import('@/features/dashboards/pages').then(m => ({ default: m.DashboardSepticTanksPage })));
const DashboardInstallationsPage = lazy(() => import('@/features/dashboards/pages').then(m => ({ default: m.DashboardInstallationsPage })));
const DashboardViolationsPage = lazy(() => import('@/features/dashboards/pages').then(m => ({ default: m.DashboardViolationsPage })));
const DashboardAnalysesPage = lazy(() => import('@/features/dashboards/pages').then(m => ({ default: m.DashboardAnalysesPage })));
const DashboardRepavPage = lazy(() => import('@/features/dashboards/pages').then(m => ({ default: m.DashboardRepavPage })));
const DashboardTramitacoesPage = lazy(() => import('@/features/dashboards/pages').then(m => ({ default: m.DashboardTramitacoesPage })));
const DashboardFaturacaoPage = lazy(() => import('@/features/dashboards/pages').then(m => ({ default: m.DashboardFaturacaoPage })));

const EmissoesPage = lazy(() => import('@/features/emissoes').then(m => ({ default: m.EmissoesPage })));
const EquipamentosPage = lazy(() => import('@/features/equipamentos').then(m => ({ default: m.EquipamentosPage })));
const ObrasPage = lazy(() => import('@/features/obras').then(m => ({ default: m.ObrasPage })));
const PavimentosPage = lazy(() => import('@/features/pavimentos').then(m => ({ default: m.PavimentosPage })));
const EPIPage = lazy(() => import('@/features/administrativo/pages').then(m => ({ default: m.EPIPage })));
const AvalPage = lazy(() => import('@/features/aval').then(m => ({ default: m.AvalPage })));
const AvalAdminPage = lazy(() => import('@/features/aval').then(m => ({ default: m.AvalAdminPage })));
const AvalAnalyticsPage = lazy(() => import('@/features/aval').then(m => ({ default: m.AvalAnalyticsPage })));

const RhPessoalPage = lazy(() => import('@/features/rh/pages/RhPessoalPage'));
const RhChefiaPage = lazy(() => import('@/features/rh/pages/RhChefiaPage'));
const RhAdminPage = lazy(() => import('@/features/rh/pages/RhAdminPage'));
const FeriasPage = lazy(() => import('@/features/rh/pages/FeriasPage'));
const ParticipacaoPage = lazy(() => import('@/features/rh/pages/ParticipacaoPage'));
const HorariosPage = lazy(() => import('@/features/rh/pages/HorariosPage'));
const PiquetePage = lazy(() => import('@/features/rh/pages/PiquetePage'));
const PontoPage = lazy(() => import('@/features/rh/pages/PontoPage'));
const GestaoColaboradoresPage = lazy(() => import('@/features/rh/pages/GestaoColaboradoresPage'));
const LocaisPage = lazy(() => import('@/features/rh/pages/LocaisPage'));
const PontoMapaPage      = lazy(() => import('@/features/rh/pages/PontoMapaPage'));
const MapaFeriasPage     = lazy(() => import('@/features/rh/pages/MapaFeriasPage'));
const RhGestaoCentralPage = lazy(() => import('@/features/rh/pages/RhGestaoCentralPage'));

const TasksPage = lazy(() => import('@/features/tasks/pages').then(m => ({ default: m.TasksPage })));
const EntitiesPage = lazy(() => import('@/features/entities/pages').then(m => ({ default: m.EntitiesPage })));
const DocumentsPage = lazy(() => import('@/features/documents/pages/DocumentsPage'));

const InternalDashboardPage = lazy(() => import('@/features/internal').then(m => ({ default: m.InternalDashboardPage })));
const RequisicaoInternaPage = lazy(() => import('@/features/internal').then(m => ({ default: m.RequisicaoInternaPage })));
const FleetDashboard = lazy(() => import('@/features/fleet').then(m => ({ default: m.FleetDashboard })));

const WebsiteNoticiasPage = lazy(() => import('@/features/website/pages').then(m => ({ default: m.WebsiteNoticiasPage })));
const WebsiteAlertasPage = lazy(() => import('@/features/website/pages').then(m => ({ default: m.WebsiteAlertasPage })));
const WebsiteDocumentosPage = lazy(() => import('@/features/website/pages').then(m => ({ default: m.WebsiteDocumentosPage })));
const WebsitePublicacoesPage = lazy(() => import('@/features/website/pages').then(m => ({ default: m.WebsitePublicacoesPage })));
const WebsiteProcedimentosPage = lazy(() => import('@/features/website/pages').then(m => ({ default: m.WebsiteProcedimentosPage })));
const WebsiteProcessosFinanceirosPage = lazy(() => import('@/features/website/pages').then(m => ({ default: m.WebsiteProcessosFinanceirosPage })));

const NetworkExpensesPage = lazy(() => import('@/features/expenses').then(m => ({ default: m.NetworkExpensesPage })));
const BranchesExpensesPage = lazy(() => import('@/features/expenses').then(m => ({ default: m.BranchesExpensesPage })));
const MaintenanceExpensesPage = lazy(() => import('@/features/expenses').then(m => ({ default: m.MaintenanceExpensesPage })));
const EquipmentExpensesPage = lazy(() => import('@/features/expenses').then(m => ({ default: m.EquipmentExpensesPage })));

const OrcamentoPage = lazy(() => import('@/features/orcamento').then(m => ({ default: m.OrcamentoPage })));
const CatalogPage = lazy(() => import('@/features/orcamento/pages/CatalogPage'));
const StockPage = lazy(() => import('@/features/stock').then(m => ({ default: m.StockPage })));
const WhatsAppAlertasPage = lazy(() => import('@/features/alertas/pages/WhatsAppAlertasPage'));

// ==================== FALLBACK DE CARREGAMENTO ====================

function PageFallback() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function BackofficeRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
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
        {/* AdminNotificationLab: scope de teste do motor de toasts Sileo (só /admin/*) */}
        <Route element={<AdminNotificationLab />}>
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
        </Route>
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
        <Route path="/rh/chefia"                    element={<RhChefiaPage />} />
        <Route path="/rh/admin"                     element={<RhAdminPage />} />
        <Route path="/rh/pessoal/ponto"             element={<PontoPage />} />
        <Route path="/rh/pessoal/ferias"            element={<FeriasPage />} />
        <Route path="/rh/pessoal/faltas"            element={<ParticipacaoPage />} />
        <Route path="/rh/pessoal/horarios"          element={<HorariosPage />} />
        <Route path="/rh/pessoal/piquete"           element={<PiquetePage />} />
        <Route path="/rh/gestao/colaboradores"      element={<GestaoColaboradoresPage />} />
        <Route path="/rh/gestao/locais"             element={<LocaisPage />} />
        <Route path="/rh/gestao/ponto-mapa"         element={<PontoMapaPage />} />
        <Route path="/rh/gestao/mapa-ferias"        element={<MapaFeriasPage />} />
        <Route path="/rh/gestao/central"            element={<RhGestaoCentralPage />} />
        <Route path="/aval"                         element={<AvalPage />} />
        <Route path="/rh/gestao/aval-config"         element={<AvalAdminPage />} />
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
    </Suspense>
  );
}
