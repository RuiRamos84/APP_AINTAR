/**
 * Route Configuration
 * Mapeamento centralizado de rotas → permissões, módulos e metadados
 *
 * IMPORTANTE: Este é o ficheiro central para definir TODAS as rotas privadas
 * Todas as permissões são geridas aqui, tornando o sistema completamente dinâmico
 */

import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as TasksIcon,
  Settings as SettingsIcon,
  Description as DocumentsIcon,
  Domain as EntitiesIcon,
  Payment as PaymentsIcon,
  AdminPanelSettings as AdminIcon,
  Home as HomeIcon,
  AddCircleOutline as AddIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Autorenew as InProgressIcon,
  AccountTree as ControlIcon,
  Cable as BranchIcon,
  CleaningServices as SepticTankIcon,
  Science as AnalysisIcon,
  Factory as ETARIcon,
  ElectricBolt as EEIcon,
  ElectricBolt as ElectricBoltIcon,
  Router as TelemetryIcon,
  AttachMoney as ExpensesIcon,
  Straighten as PavementIcon,
  PersonAdd as ClientIcon,
  Receipt as InvoiceIcon,
  CreditCard as SIBSIcon,
  Assessment as ReportsIcon,
  BarChart as AnalyticsIcon,
  BarChart as BarChartIcon,
  VpnKey as PermissionsIcon,
  Storage as SystemIcon,
  Article as OfficesIcon,
  RequestPage as RequestsIcon,
  Inventory as InventoryIcon,
  Work as EPIIcon,
  Inventory2 as BoxIcon,
  Cable as NetworkIcon,
} from '@mui/icons-material';
import { PERMISSIONS } from './permissionMap';

/**
 * ROUTE_CONFIG
 * Estrutura:
 * - path: Caminho da rota (deve coincidir com o path em App.jsx)
 * - id: Identificador único da rota
 * - text: Texto para exibição (sidebar, breadcrumbs, etc.)
 * - icon: Ícone Material-UI (componente, não JSX)
 * - module: ID do módulo a que pertence ('operacao', 'gestao', etc.) ou null para rotas globais
 * - permissions: { required: number } - ID de permissão necessário (da BD)
 * - showInSidebar: boolean - Mostrar no menu lateral?
 * - submenu: objeto com sub-rotas (opcional)
 */
export const ROUTE_CONFIG = {
  // ==================== ROTAS GLOBAIS (SEM MÓDULO) ====================

  '/home': {
    id: 'home',
    text: 'Início',
    icon: HomeIcon,
    module: null,
    permissions: null, // Sem permissão específica - qualquer utilizador autenticado
    showInSidebar: false, // Rota default, não aparece na sidebar
  },

  '/dashboard': {
    id: 'dashboard',
    text: 'Dashboard',
    icon: DashboardIcon,
    module: null,
    permissions: null, // Sem permissão específica
    showInSidebar: false, // Dashboard específico está em outro módulo
  },

  '/settings': {
    id: 'settings',
    text: 'Definições',
    icon: SettingsIcon,
    module: null,
    permissions: null,
    showInSidebar: false,
  },

  '/profile': {
    id: 'profile',
    text: 'Meu Perfil',
    icon: PeopleIcon,
    module: null,
    permissions: null,
    showInSidebar: false, // Acedido via menu do utilizador
  },

  '/change-password': {
    id: 'change_password',
    text: 'Alterar Password',
    icon: SettingsIcon,
    module: null,
    permissions: null,
    showInSidebar: false,
  },

  // ==================== MÓDULO: OPERAÇÃO ====================

  '/tasks': {
    id: 'tasks',
    text: 'Tarefas',
    icon: TasksIcon,
    module: 'operacao',
    permissions: { required: PERMISSIONS.TASKS_VIEW },
    showInSidebar: true,
    // Nota: Sub-rotas agora são tabs na página unificada TasksPage
    // - Todas (apenas admin perfil 0)
    // - Minhas Tarefas (atribuídas ao utilizador)
    // - Criadas por Mim (criadas pelo utilizador)
  },

  '/operations/register': {
    id: 'operations_register',
    text: 'Registar Operação',
    icon: AddIcon,
    module: 'operacao',
    permissions: { required: PERMISSIONS.OPERATIONS_CREATE },
    showInSidebar: true,
    submenu: {
      '/operations/register/etar': {
        id: 'operations_etar',
        text: 'ETAR',
        icon: ETARIcon,
        permissions: { required: PERMISSIONS.OPERATIONS_ETAR },
        showInSidebar: true,
      },
      '/operations/register/ee': {
        id: 'operations_ee',
        text: 'Estações Elevatórias (EE)',
        icon: EEIcon,
        permissions: { required: PERMISSIONS.OPERATIONS_EE },
        showInSidebar: true,
      },
      '/operations/register/network': {
        id: 'operations_network',
        text: 'Rede',
        icon: NetworkIcon,
        permissions: { required: PERMISSIONS.OPERATIONS_NETWORK },
        showInSidebar: true,
      },
      '/operations/register/boxes': {
        id: 'operations_boxes',
        text: 'Caixas',
        icon: BoxIcon,
        permissions: { required: PERMISSIONS.OPERATIONS_BOXES },
        showInSidebar: true,
      },
    },
  },

  '/tasks/control': {
    id: 'tasks_control',
    text: 'Controlo de Tarefas',
    icon: ControlIcon,
    module: 'operacao',
    permissions: { required: PERMISSIONS.TASKS_CONTROL },
    showInSidebar: true,
  },

  '/branches': {
    id: 'branches',
    text: 'Ramais',
    icon: BranchIcon,
    module: 'operacao',
    permissions: { required: PERMISSIONS.BRANCHES_VIEW },
    showInSidebar: true,
  },

  '/septic-tanks': {
    id: 'septic_tanks',
    text: 'Fossas',
    icon: SepticTankIcon,
    module: 'operacao',
    permissions: { required: PERMISSIONS.SEPTIC_TANKS_VIEW },
    showInSidebar: true,
  },

  // ==================== MÓDULO: GESTÃO ====================

  '/analyses': {
    id: 'analyses',
    text: 'Análises',
    icon: AnalysisIcon,
    module: 'gestao',
    permissions: { required: PERMISSIONS.ANALYSES_VIEW },
    showInSidebar: true,
  },

  '/etar': {
    id: 'etar',
    text: 'ETAR',
    icon: ETARIcon,
    module: 'gestao',
    permissions: { required: PERMISSIONS.ETAR_VIEW },
    showInSidebar: true,
    submenu: {
      '/etar/characteristics': {
        id: 'etar_characteristics',
        text: 'Características',
        icon: SettingsIcon,
        permissions: { required: PERMISSIONS.ETAR_VIEW_CHARACTERISTICS },
        showInSidebar: true,
      },
      '/etar/volumes': {
        id: 'etar_volumes',
        text: 'Volumes',
        icon: BarChartIcon,
        permissions: { required: PERMISSIONS.ETAR_VIEW_VOLUMES },
        showInSidebar: true,
      },
      '/etar/energy': {
        id: 'etar_energy',
        text: 'Energia',
        icon: ElectricBoltIcon,
        permissions: { required: PERMISSIONS.ETAR_VIEW_ENERGY },
        showInSidebar: true,
      },
      '/etar/expenses': {
        id: 'etar_expenses',
        text: 'Despesas',
        icon: ExpensesIcon,
        permissions: { required: PERMISSIONS.ETAR_VIEW_EXPENSES },
        showInSidebar: true,
      },
      '/etar/violations': {
        id: 'etar_violations',
        text: 'Incumprimentos',
        icon: ReportsIcon,
        permissions: { required: PERMISSIONS.ETAR_VIEW_VIOLATIONS },
        showInSidebar: true,
      },
    },
  },

  '/ee': {
    id: 'ee',
    text: 'Estações Elevatórias',
    icon: EEIcon,
    module: 'gestao',
    permissions: { required: PERMISSIONS.EE_VIEW },
    showInSidebar: true,
    submenu: {
      '/ee/characteristics': {
        id: 'ee_characteristics',
        text: 'Características',
        icon: SettingsIcon,
        permissions: { required: PERMISSIONS.EE_VIEW_CHARACTERISTICS },
        showInSidebar: true,
      },
      '/ee/volumes': {
        id: 'ee_volumes',
        text: 'Volumes',
        icon: BarChartIcon,
        permissions: { required: PERMISSIONS.EE_VIEW_VOLUMES },
        showInSidebar: true,
      },
      '/ee/energy': {
        id: 'ee_energy',
        text: 'Energia',
        icon: ElectricBoltIcon,
        permissions: { required: PERMISSIONS.EE_VIEW_ENERGY },
        showInSidebar: true,
      },
      '/ee/expenses': {
        id: 'ee_expenses',
        text: 'Despesas',
        icon: ExpensesIcon,
        permissions: { required: PERMISSIONS.EE_VIEW_EXPENSES },
        showInSidebar: true,
      },
    },
  },

  '/expenses': {
    id: 'expenses',
    text: 'Despesas',
    icon: ExpensesIcon,
    module: 'gestao',
    permissions: { required: PERMISSIONS.EXPENSES_VIEW },
    showInSidebar: true,
    submenu: {
      '/expenses/network': {
        id: 'expenses_network',
        text: 'Rede',
        icon: NetworkIcon,
        permissions: { required: PERMISSIONS.EXPENSES_VIEW },
        showInSidebar: true,
      },
      '/expenses/branches': {
        id: 'expenses_branches',
        text: 'Ramais',
        icon: BranchIcon,
        permissions: { required: PERMISSIONS.EXPENSES_VIEW },
        showInSidebar: true,
      },
      '/expenses/maintenance': {
        id: 'expenses_maintenance',
        text: 'Manutenção',
        icon: SettingsIcon,
        permissions: { required: PERMISSIONS.EXPENSES_VIEW },
        showInSidebar: true,
      },
      '/expenses/equipment': {
        id: 'expenses_equipment',
        text: 'Equipamento',
        icon: InventoryIcon,
        permissions: { required: PERMISSIONS.EXPENSES_VIEW },
        showInSidebar: true,
      },
    },
  },

  '/telemetry': {
    id: 'telemetry',
    text: 'Telemetria',
    icon: TelemetryIcon,
    module: 'gestao',
    permissions: { required: PERMISSIONS.TELEMETRY_VIEW },
    showInSidebar: true,
  },

  '/pavements': {
    id: 'pavements',
    text: 'Pavimentações',
    icon: PavementIcon,
    module: 'gestao',
    permissions: { required: PERMISSIONS.PAVEMENTS_VIEW },
    showInSidebar: true,
  },

  // ==================== MÓDULO: PAGAMENTOS ====================

  '/clients': {
    id: 'clients',
    text: 'Clientes',
    icon: ClientIcon,
    module: 'pagamentos',
    permissions: { required: PERMISSIONS.CLIENTS_VIEW },
    showInSidebar: true,
    submenu: {
      '/clients/contracts': {
        id: 'clients_contracts',
        text: 'Contratos',
        icon: DocumentsIcon,
        permissions: { required: PERMISSIONS.CLIENTS_CONTRACTS },
        showInSidebar: true,
      },
    },
  },

  '/invoices': {
    id: 'invoices',
    text: 'Faturas',
    icon: InvoiceIcon,
    module: 'pagamentos',
    permissions: { required: PERMISSIONS.INVOICES_VIEW },
    showInSidebar: true,
    submenu: {
      '/invoices/issued': {
        id: 'invoices_issued',
        text: 'Emitidas',
        icon: CheckCircleIcon,
        permissions: { required: PERMISSIONS.INVOICES_VIEW },
        showInSidebar: true,
      },
      '/invoices/payment-plans': {
        id: 'invoices_payment_plans',
        text: 'Planos de Pagamento',
        icon: PaymentsIcon,
        permissions: { required: PERMISSIONS.INVOICES_VIEW },
        showInSidebar: true,
      },
    },
  },

  '/payments': {
    id: 'payments',
    text: 'SIBS/Pagamentos',
    icon: PaymentsIcon,
    module: 'pagamentos',
    permissions: { required: PERMISSIONS.PAYMENTS_VIEW },
    showInSidebar: true,
  },

  // ==================== MÓDULO: DASHBOARDS ====================

  '/dashboards/overview': {
    id: 'dashboards_overview',
    text: 'Visão Geral',
    icon: DashboardIcon,
    module: 'dashboards',
    permissions: { required: PERMISSIONS.DASHBOARD_VIEW },
    showInSidebar: true,
  },

  '/dashboards/requests': {
    id: 'dashboards_requests',
    text: 'Pedidos',
    icon: RequestsIcon,
    module: 'dashboards',
    permissions: { required: PERMISSIONS.DASHBOARD_VIEW },
    showInSidebar: true,
  },

  '/dashboards/branches': {
    id: 'dashboards_branches',
    text: 'Ramais',
    icon: BranchIcon,
    module: 'dashboards',
    permissions: { required: PERMISSIONS.DASHBOARD_BRANCHES },
    showInSidebar: true,
  },

  '/dashboards/septic-tanks': {
    id: 'dashboards_septic_tanks',
    text: 'Fossas',
    icon: SepticTankIcon,
    module: 'dashboards',
    permissions: { required: PERMISSIONS.DASHBOARD_SEPTIC_TANKS },
    showInSidebar: true,
  },

  '/dashboards/installations': {
    id: 'dashboards_installations',
    text: 'Instalações/Operações',
    icon: ETARIcon,
    module: 'dashboards',
    permissions: { required: PERMISSIONS.DASHBOARD_INSTALLATIONS },
    showInSidebar: true,
  },

  '/dashboards/violations': {
    id: 'dashboards_violations',
    text: 'Incumprimentos',
    icon: ReportsIcon,
    module: 'dashboards',
    permissions: { required: PERMISSIONS.DASHBOARD_VIOLATIONS },
    showInSidebar: true,
  },

  '/dashboards/analyses': {
    id: 'dashboards_analyses',
    text: 'Análises',
    icon: AnalyticsIcon,
    module: 'dashboards',
    permissions: { required: PERMISSIONS.DASHBOARD_ANALYSES },
    showInSidebar: true,
  },

  // ==================== MÓDULO: ADMINISTRAÇÃO ====================

  '/admin': {
    id: 'admin',
    text: 'Sistema',
    icon: SystemIcon,
    module: 'administracao',
    permissions: { required: PERMISSIONS.ADMIN_DASHBOARD },
    showInSidebar: true,
    submenu: {
      '/admin/config': {
        id: 'admin_config',
        text: 'Configurações',
        icon: SettingsIcon,
        permissions: { required: PERMISSIONS.SYSTEM_CONFIG },
        showInSidebar: true,
      },
      '/admin/activity-logs': {
        id: 'admin_activity_logs',
        text: 'Logs de Atividade',
        icon: DocumentsIcon,
        permissions: { required: PERMISSIONS.SYSTEM_LOGS },
        showInSidebar: true,
      },
      '/admin/session-logs': {
        id: 'admin_session_logs',
        text: 'Logs de Sessões',
        icon: DocumentsIcon,
        permissions: { required: PERMISSIONS.SYSTEM_LOGS },
        showInSidebar: true,
      },
      '/admin/actions': {
        id: 'admin_actions',
        text: 'Ações',
        icon: TasksIcon,
        permissions: { required: PERMISSIONS.ADMIN_DASHBOARD },
        showInSidebar: true,
      },
    },
  },

  '/admin/users': {
    id: 'admin_users',
    text: 'Utilizadores',
    icon: PeopleIcon,
    module: 'administracao',
    permissions: { required: PERMISSIONS.ADMIN_USERS },
    showInSidebar: true,
    submenu: {
      '/admin/users/list': {
        id: 'admin_users_list',
        text: 'Lista',
        icon: PeopleIcon,
        permissions: { required: PERMISSIONS.ADMIN_USERS },
        showInSidebar: true,
      },
      '/admin/permissions': {
        id: 'admin_permissions',
        text: 'Permissões',
        icon: PermissionsIcon,
        permissions: { required: PERMISSIONS.ADMIN_USERS },
        showInSidebar: true,
      },
    },
  },

  '/admin/users/new': {
    id: 'admin_users_create',
    text: 'Criar Utilizador',
    icon: PeopleIcon,
    module: 'administracao',
    permissions: { required: PERMISSIONS.ADMIN_USERS },
    showInSidebar: false,
  },

  '/admin/users/:userId/edit': {
    id: 'admin_users_edit',
    text: 'Editar Utilizador',
    icon: PeopleIcon,
    module: 'administracao',
    permissions: { required: PERMISSIONS.ADMIN_USERS },
    showInSidebar: false,
  },

  '/offices-admin': {
    id: 'offices_admin',
    text: 'Ofícios',
    icon: OfficesIcon,
    module: 'administracao',
    permissions: { required: PERMISSIONS.OFFICES_VIEW },
    showInSidebar: true,
    submenu: {
      '/offices-admin/open': {
        id: 'offices_open',
        text: 'Abrir',
        icon: AddIcon,
        permissions: { required: PERMISSIONS.OFFICES_CREATE },
        showInSidebar: true,
      },
      '/offices-admin/close': {
        id: 'offices_close',
        text: 'Fechar',
        icon: CheckCircleIcon,
        permissions: { required: PERMISSIONS.OFFICES_CLOSE },
        showInSidebar: true,
      },
      '/offices-admin/replicate': {
        id: 'offices_replicate',
        text: 'Replicar',
        icon: DocumentsIcon,
        permissions: { required: PERMISSIONS.OFFICES_REPLICATE },
        showInSidebar: true,
      },
    },
  },

  '/requests': {
    id: 'requests',
    text: 'Pedidos Gestão',
    icon: RequestsIcon,
    module: 'administracao',
    permissions: { required: PERMISSIONS.REQUESTS_VIEW },
    showInSidebar: true,
    submenu: {
      '/requests/open': {
        id: 'requests_open',
        text: 'Abrir',
        icon: AddIcon,
        permissions: { required: PERMISSIONS.REQUESTS_CREATE },
        showInSidebar: true,
      },
      '/requests/close': {
        id: 'requests_close',
        text: 'Fechar',
        icon: CheckCircleIcon,
        permissions: { required: PERMISSIONS.REQUESTS_CLOSE },
        showInSidebar: true,
      },
      '/requests/replicate': {
        id: 'requests_replicate',
        text: 'Replicar',
        icon: DocumentsIcon,
        permissions: { required: PERMISSIONS.REQUESTS_REPLICATE },
        showInSidebar: true,
      },
    },
  },

  '/entities': {
    id: 'entities',
    text: 'Entidades',
    icon: EntitiesIcon,
    module: 'administracao',
    permissions: { required: PERMISSIONS.ENTITIES_VIEW },
    showInSidebar: true,
    submenu: {
      '/entities/list': {
        id: 'entities_list',
        text: 'Listar',
        icon: EntitiesIcon,
        permissions: { required: PERMISSIONS.ENTITIES_VIEW },
        showInSidebar: true,
      },
      '/entities/create': {
        id: 'entities_create',
        text: 'Criar',
        icon: AddIcon,
        permissions: { required: PERMISSIONS.ENTITIES_CREATE },
        showInSidebar: true,
      },
      '/entities/requests': {
        id: 'entities_requests',
        text: 'Pedidos',
        icon: RequestsIcon,
        permissions: { required: PERMISSIONS.ENTITIES_VIEW },
        showInSidebar: true,
      },
    },
  },

  // ==================== MÓDULO: ADMINISTRATIVO ====================

  '/epi': {
    id: 'epi',
    text: 'Gestão de EPI',
    icon: EPIIcon,
    module: 'administrativo',
    permissions: { required: PERMISSIONS.EPI_MANAGEMENT },
    showInSidebar: true,
  },

  '/inventory': {
    id: 'inventory',
    text: 'Inventário',
    icon: InventoryIcon,
    module: 'administrativo',
    permissions: { required: PERMISSIONS.INVENTORY_VIEW },
    showInSidebar: true,
    submenu: {
      '/inventory/stocks': {
        id: 'inventory_stocks',
        text: 'Stocks',
        icon: InventoryIcon,
        permissions: { required: PERMISSIONS.INVENTORY_VIEW },
        showInSidebar: true,
      },
      '/inventory/movements': {
        id: 'inventory_movements',
        text: 'Movimentos',
        icon: PaymentsIcon,
        permissions: { required: PERMISSIONS.INVENTORY_MOVEMENTS },
        showInSidebar: true,
      },
    },
  },

  '/offices': {
    id: 'offices',
    text: 'Gestão de Ofícios',
    icon: OfficesIcon,
    module: 'administrativo',
    permissions: { required: PERMISSIONS.OFFICES_VIEW },
    showInSidebar: true,
  },

  '/pedidos': {
    id: 'pedidos',
    text: 'Pedidos',
    icon: DocumentsIcon,
    module: 'administrativo',
    permissions: { required: PERMISSIONS.DOCS_VIEW_ALL },
    showInSidebar: true,
  },

  // ==================== ROTAS LEGACY (mantidas para compatibilidade) ====================

  '/documents': {
    id: 'documents',
    text: 'Documentos',
    icon: DocumentsIcon,
    module: null, // Sem módulo específico
    permissions: { required: PERMISSIONS.DOCS_VIEW_ALL },
    showInSidebar: false, // Desativado na sidebar (usar ofícios administrativos)
    submenu: {
      '/documents/all': {
        id: 'documents_all',
        text: 'Todos os Documentos',
        icon: DocumentsIcon,
        permissions: { required: PERMISSIONS.DOCS_VIEW_ALL },
        showInSidebar: false,
      },
      '/documents/my': {
        id: 'documents_my',
        text: 'Meus Documentos',
        icon: DocumentsIcon,
        permissions: { required: PERMISSIONS.DOCS_VIEW_OWNER },
        showInSidebar: false,
      },
      '/documents/assigned': {
        id: 'documents_assigned',
        text: 'Documentos Atribuídos',
        icon: DocumentsIcon,
        permissions: { required: PERMISSIONS.DOCS_VIEW_ASSIGNED },
        showInSidebar: false,
      },
    },
  },
};

/**
 * Obter configuração de uma rota pelo path
 * @param {string} path - Caminho da rota
 * @returns {object|null} Configuração da rota ou null se não encontrada
 */
export const getRouteConfig = (path) => {
  // Tentar match exato
  if (ROUTE_CONFIG[path]) {
    return ROUTE_CONFIG[path];
  }

  // Tentar match em submenus
  for (const routePath in ROUTE_CONFIG) {
    const route = ROUTE_CONFIG[routePath];
    if (route.submenu && route.submenu[path]) {
      return route.submenu[path];
    }
  }

  // Tentar match por prefixo (para rotas dinâmicas como /users/:id)
  const pathSegments = path.split('/').filter(Boolean);
  for (const routePath in ROUTE_CONFIG) {
    const routeSegments = routePath.split('/').filter(Boolean);

    if (routeSegments.length === pathSegments.length) {
      const matches = routeSegments.every((segment, i) => {
        return segment.startsWith(':') || segment === pathSegments[i];
      });

      if (matches) {
        return ROUTE_CONFIG[routePath];
      }
    }
  }

  return null;
};

/**
 * Obter permissão necessária para uma rota
 * @param {string} path - Caminho da rota
 * @returns {number|null} ID de permissão necessário ou null se não requer permissão
 */
export const getRoutePermission = (path) => {
  const config = getRouteConfig(path);
  return config?.permissions?.required || null;
};

/**
 * Verificar se uma rota deve ser mostrada no sidebar
 * @param {string} path - Caminho da rota
 * @returns {boolean}
 */
export const shouldShowInSidebar = (path) => {
  const config = getRouteConfig(path);
  return config?.showInSidebar || false;
};

/**
 * Obter todas as rotas que devem aparecer no sidebar (LEGACY)
 * @param {Function} hasPermission - Função para verificar se tem permissão
 * @returns {Array} Array de rotas filtradas por permissão
 */
export const getSidebarRoutes = (hasPermission) => {
  const routes = [];

  for (const path in ROUTE_CONFIG) {
    const route = ROUTE_CONFIG[path];

    if (route.showInSidebar) {
      // Verificar se tem permissão para a rota principal
      const requiredPermission = route.permissions?.required;

      if (!requiredPermission || hasPermission(requiredPermission)) {
        // Filtrar submenu por permissões
        let filteredSubmenu = null;

        if (route.submenu) {
          filteredSubmenu = {};
          for (const subPath in route.submenu) {
            const subRoute = route.submenu[subPath];
            const subPermission = subRoute.permissions?.required;

            if (!subPermission || hasPermission(subPermission)) {
              filteredSubmenu[subPath] = subRoute;
            }
          }

          // Só incluir submenu se tiver pelo menos 1 item
          if (Object.keys(filteredSubmenu).length === 0) {
            filteredSubmenu = null;
          }
        }

        routes.push({
          path,
          ...route,
          submenu: filteredSubmenu,
        });
      }
    }
  }

  return routes;
};

/**
 * Obter rotas filtradas para um módulo específico
 * @param {string} moduleId - ID do módulo (ex: 'operacao')
 * @param {Function} hasPermission - Função de verificação de permissões
 * @returns {Array} Array de rotas filtradas
 */
export const getSidebarRoutesForModule = (moduleId, hasPermission) => {
  const routes = [];

  for (const path in ROUTE_CONFIG) {
    const route = ROUTE_CONFIG[path];

    // Filtra por módulo
    if (route.module !== moduleId) continue;

    // Verifica se deve aparecer na sidebar
    if (!route.showInSidebar) continue;

    // Verifica permissões
    const requiredPermission = route.permissions?.required;
    if (requiredPermission && !hasPermission(requiredPermission)) continue;

    // Filtra submenu recursivamente
    let filteredSubmenu = null;
    if (route.submenu) {
      filteredSubmenu = {};
      for (const subPath in route.submenu) {
        const subRoute = route.submenu[subPath];

        if (!subRoute.showInSidebar) continue;

        const subPermission = subRoute.permissions?.required;
        if (!subPermission || hasPermission(subPermission)) {
          filteredSubmenu[subPath] = subRoute;
        }
      }

      // Se submenu ficou vazio, não inclui
      if (Object.keys(filteredSubmenu).length === 0) {
        filteredSubmenu = null;
      }
    }

    routes.push({
      path,
      ...route,
      submenu: filteredSubmenu,
    });
  }

  return routes;
};

export default ROUTE_CONFIG;
