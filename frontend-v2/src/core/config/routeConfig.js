/**
 * Route Configuration
 * Mapeamento centralizado de rotas → permissões, módulos e metadados
 *
 * IMPORTANTE: Este é o ficheiro central para definir TODAS as rotas privadas.
 * Permissões usam o campo `value` da tabela ts_interface da BD (ex: 'fleet.view').
 * O hasPermission() resolve automaticamente a string → pk via catálogo do MetadataContext.
 */

import {
  Dashboard as DashboardIcon,
  Grading as AvalIcon,
  People as PeopleIcon,
  Assignment as TasksIcon,
  Settings as SettingsIcon,
  Description as DocumentsIcon,
  Domain as EntitiesIcon,
  Payment as PaymentsIcon,
  Home as HomeIcon,
  AddCircleOutline as AddIcon,
  CheckCircle as CheckCircleIcon,
  AccountTree as ControlIcon,
  ForkRight as BranchIcon,
  InvertColors as SepticTankIcon,
  Science as AnalysisIcon,
  Factory as ETARIcon,
  ElectricBolt as EEIcon,
  Sensors as TelemetryIcon,
  AttachMoney as ExpensesIcon,
  Layers as PavementIcon,
  PeopleAlt as ClientIcon,
  Receipt as InvoiceIcon,
  GppBad as ViolationsIcon,
  Analytics as AnalyticsIcon,
  VpnKey as PermissionsIcon,
  Storage as SystemIcon,
  Article as OfficesIcon,
  RequestPage as RequestsIcon,
  Inventory as InventoryIcon,
  HealthAndSafety as EPIIcon,
  Hub as NetworkIcon,
  DirectionsCar as FleetIcon,
  GridView as InternalIcon,
  Handyman as EquipamentosIcon,
  Construction as ObrasIcon,
  ManageSearch as ActivityLogIcon,
  History as SessionLogIcon,
  Terminal as ActionsIcon,
  ContentCopy as ReplicateIcon,
  NoteAdd as CreateNoteIcon,
  Route as RouteIcon,
  SupervisorAccount as SupervisorIcon,
  Air as EmissoesIcon,
  CalendarMonth as PaymentPlanIcon,
  AssignmentTurnedIn as PedidosIcon,
  BuildCircle as MaintenanceIcon,
  Gavel as ContractIcon,
  ManageAccounts as GestPessoalIcon,
  BeachAccess as FeriasIcon,
  EventBusy as FaltasIcon,
  Schedule as HorariosIcon,
  NightShelter as PiqueteIcon,
} from '@mui/icons-material';

// Sem import de PERMISSIONS — as permissões são strings da BD resolvidas dinamicamente


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

  // ==================== MÓDULO: INTERNO ====================

  '/tasks': {
    id: 'tasks',
    text: 'Tarefas',
    icon: TasksIcon,
    module: 'administrativo',
    permissions: { required: 'tasks.view' },
    showInSidebar: true,
  },

  '/operation/tasks': {
    id: 'operation_tasks',
    text: 'Minhas Tarefas',
    icon: TasksIcon,
    module: 'operacao',
    permissions: { required: 'operation.access' },
    showInSidebar: true,
  },

  '/operation': {
    id: 'operation',
    text: 'Operação',
    icon: TasksIcon,
    module: 'operacao',
    permissions: { required: 'operation.access' },
    showInSidebar: false,
  },

  '/operation/control': {
    id: 'operation_control',
    text: 'Controlo Operacional',
    icon: ControlIcon,
    module: 'operacao',
    permissions: { required: 'operation.supervise' },
    showInSidebar: true,
  },

  '/operation/metadata': {
    id: 'operation_metadata',
    text: 'Gestão de Voltas',
    icon: RouteIcon,
    module: 'operacao',
    permissions: { required: 'operation.supervise' },
    showInSidebar: true,
  },

  '/operation/supervisor': {
    id: 'operation_supervisor',
    text: 'Supervisão',
    icon: SupervisorIcon,
    module: 'operacao',
    permissions: { required: 'operation.supervise' },
    showInSidebar: true,
  },

  '/tasks/control': {
    id: 'tasks_control',
    text: 'Controlo de Tarefas',
    icon: ControlIcon,
    module: 'operacao',
    permissions: { required: 'tasks.view' },
    showInSidebar: false,
  },

  // '/branches' e '/septic-tanks' removidos - não implementados

  // ==================== MÓDULO: GESTÃO ====================
  // Ordem: ETAR, EE, Equipamentos, Obras, Análises, Gestão de Frota, Despesas, Telemetria

  '/etar': {
    id: 'etar',
    text: 'ETAR',
    icon: ETARIcon,
    module: 'gestao',
    permissions: { required: 'operation.access' },
    showInSidebar: true,
  },

  '/ee': {
    id: 'ee',
    text: 'Estações Elevatórias',
    icon: EEIcon,
    module: 'gestao',
    permissions: { required: 'operation.access' },
    showInSidebar: true,
  },

  '/equipamentos': {
    id: 'equipamentos',
    text: 'Equipamentos',
    icon: EquipamentosIcon,
    module: 'gestao',
    permissions: { required: 'equipamentos.view' },
    showInSidebar: true,
  },

  '/obras': {
    id: 'obras',
    text: 'Obras',
    icon: ObrasIcon,
    module: 'gestao',
    permissions: { required: 'obras.view' },
    showInSidebar: true,
  },

  '/analyses': {
    id: 'analyses',
    text: 'Análises',
    icon: AnalysisIcon,
    module: 'gestao',
    permissions: { required: 'admin.reports.view' },
    showInSidebar: true,
  },

  '/fleet': {
    id: 'fleet',
    text: 'Gestão de Frota',
    icon: FleetIcon,
    module: 'gestao',
    permissions: { required: 'fleet.view' },
    showInSidebar: true,
  },

  '/expenses': {
    id: 'expenses',
    text: 'Despesas',
    icon: ExpensesIcon,
    module: 'gestao',
    permissions: { required: 'operation.access' },
    showInSidebar: true,
    submenu: {
      '/expenses/network': {
        id: 'expenses_network',
        text: 'Rede',
        icon: NetworkIcon,
        permissions: { required: 'operation.access' },
        showInSidebar: true,
      },
      '/expenses/branches': {
        id: 'expenses_branches',
        text: 'Ramais',
        icon: BranchIcon,
        permissions: { required: 'operation.access' },
        showInSidebar: true,
      },
      '/expenses/maintenance': {
        id: 'expenses_maintenance',
        text: 'Manutenção',
        icon: MaintenanceIcon,
        permissions: { required: 'operation.access' },
        showInSidebar: true,
      },
      '/expenses/equipment': {
        id: 'expenses_equipment',
        text: 'Equipamentos',
        icon: InventoryIcon,
        permissions: { required: 'operation.access' },
        showInSidebar: true,
      },
    },
  },

  '/telemetry': {
    id: 'telemetry',
    text: 'Telemetria',
    icon: TelemetryIcon,
    module: 'gestao',
    permissions: { required: 'telemetry.view' },
    showInSidebar: true,
  },

  '/emissoes': {
    id: 'emissoes',
    text: 'Emissões',
    icon: EmissoesIcon,
    module: 'administrativo',
    permissions: { required: 'letters.manage' },
    showInSidebar: true,
  },

  // ==================== MÓDULO: PAGAMENTOS ====================
  // Ordem: SIBS/Pagamentos, Faturas, Clientes/contratos

  '/payments': {
    id: 'payments',
    text: 'SIBS/Pagamentos',
    icon: PaymentsIcon,
    module: 'pagamentos',
    permissions: { required: 'payments.manage' },
    showInSidebar: true,
  },

  '/invoices': {
    id: 'invoices',
    text: 'Faturas',
    icon: InvoiceIcon,
    module: 'pagamentos',
    permissions: { required: 'payments.manage' },
    showInSidebar: true,
    submenu: {
      '/invoices/issued': {
        id: 'invoices_issued',
        text: 'Emitidas',
        icon: CheckCircleIcon,
        permissions: { required: 'payments.manage' },
        showInSidebar: true,
      },
      '/invoices/payment-plans': {
        id: 'invoices_payment_plans',
        text: 'Planos de Pagamento',
        icon: PaymentPlanIcon,
        permissions: { required: 'payments.manage' },
        showInSidebar: true,
      },
    },
  },

  '/clients': {
    id: 'clients',
    text: 'Clientes',
    icon: ClientIcon,
    module: 'pagamentos',
    permissions: { required: 'payments.manage' },
    showInSidebar: true,
    submenu: {
      '/clients': {
        id: 'clients_list',
        text: 'Entidades',
        icon: ClientIcon,
        permissions: { required: 'payments.manage' },
        showInSidebar: true,
      },
      '/clients/contracts': {
        id: 'clients_contracts',
        text: 'Contratos',
        icon: ContractIcon,
        permissions: { required: 'payments.manage' },
        showInSidebar: true,
      },
    },
  },

  // ==================== MÓDULO: DASHBOARDS ====================

  '/dashboards/overview': {
    id: 'dashboards_overview',
    text: 'Visão Geral',
    icon: DashboardIcon,
    module: 'dashboards',
    permissions: { required: 'dashboard.view' },
    showInSidebar: true,
  },

  '/dashboards/requests': {
    id: 'dashboards_requests',
    text: 'Pedidos',
    icon: RequestsIcon,
    module: 'dashboards',
    permissions: { required: 'dashboard.view' },
    showInSidebar: true,
  },

  '/dashboards/branches': {
    id: 'dashboards_branches',
    text: 'Ramais',
    icon: BranchIcon,
    module: 'dashboards',
    permissions: { required: 'pav.view' },
    showInSidebar: true,
  },

  '/dashboards/septic-tanks': {
    id: 'dashboards_septic_tanks',
    text: 'Fossas',
    icon: SepticTankIcon,
    module: 'dashboards',
    permissions: { required: 'operation.access' },
    showInSidebar: true,
  },

  '/dashboards/installations': {
    id: 'dashboards_installations',
    text: 'Instalações/Operações',
    icon: ETARIcon,
    module: 'dashboards',
    permissions: { required: 'operation.access' },
    showInSidebar: true,
  },

  '/dashboards/violations': {
    id: 'dashboards_violations',
    text: 'Incumprimentos',
    icon: ViolationsIcon,
    module: 'dashboards',
    permissions: { required: 'operation.access' },
    showInSidebar: true,
  },

  '/dashboards/analyses': {
    id: 'dashboards_analyses',
    text: 'Análises',
    icon: AnalysisIcon,
    module: 'dashboards',
    permissions: { required: 'dashboard.view' },
    showInSidebar: true,
  },

  // ==================== MÓDULO: ADMINISTRAÇÃO ====================

  '/admin': {
    id: 'admin',
    text: 'Sistema',
    icon: SystemIcon,
    module: 'administracao',
    permissions: { required: 'admin.system.settings' },
    showInSidebar: true,
    submenu: {
      '/admin/config': {
        id: 'admin_config',
        text: 'Configurações',
        icon: SettingsIcon,
        permissions: { required: 'admin.system.settings' },
        showInSidebar: true,
      },
      '/admin/activity-logs': {
        id: 'admin_activity_logs',
        text: 'Logs de Atividade',
        icon: ActivityLogIcon,
        permissions: { required: 'admin.logs.view' },
        showInSidebar: true,
      },
      '/admin/session-logs': {
        id: 'admin_session_logs',
        text: 'Logs de Sessões',
        icon: SessionLogIcon,
        permissions: { required: 'admin.logs.view' },
        showInSidebar: true,
      },
      '/admin/actions': {
        id: 'admin_actions',
        text: 'Ações',
        icon: ActionsIcon,
        permissions: { required: 'admin.system.settings' },
        showInSidebar: true,
      },
    },
  },

  '/admin/users': {
    id: 'admin_users',
    text: 'Utilizadores',
    icon: PeopleIcon,
    module: 'administracao',
    permissions: { required: 'admin.users' },
    showInSidebar: true,
    submenu: {
      '/admin/users/list': {
        id: 'admin_users_list',
        text: 'Lista',
        icon: PeopleIcon,
        permissions: { required: 'admin.users' },
        showInSidebar: true,
      },
      '/admin/permissions': {
        id: 'admin_permissions',
        text: 'Permissões',
        icon: PermissionsIcon,
        permissions: { required: 'admin.users' },
        showInSidebar: true,
      },
    },
  },

  '/admin/users/new': {
    id: 'admin_users_create',
    text: 'Criar Utilizador',
    icon: PeopleIcon,
    module: 'administracao',
    permissions: { required: 'admin.users' },
    showInSidebar: false,
  },

  '/admin/users/:userId/edit': {
    id: 'admin_users_edit',
    text: 'Editar Utilizador',
    icon: PeopleIcon,
    module: 'administracao',
    permissions: { required: 'admin.users' },
    showInSidebar: false,
  },

  '/offices-admin': {
    id: 'offices_admin',
    text: 'Ofícios',
    icon: OfficesIcon,
    module: 'administracao',
    permissions: { required: 'letters.manage' },
    showInSidebar: true,
  },

  '/requests': {
    id: 'requests',
    text: 'Pedidos Gestão',
    icon: RequestsIcon,
    module: 'pedidos',
    permissions: { required: 'docs.view.all' },
    showInSidebar: false,
    submenu: {
      '/requests/open': {
        id: 'requests_open',
        text: 'Abrir',
        icon: CreateNoteIcon,
        permissions: { required: 'docs.create' },
        showInSidebar: true,
      },
      '/requests/close': {
        id: 'requests_close',
        text: 'Fechar',
        icon: CheckCircleIcon,
        permissions: { required: 'docs.view.all' },
        showInSidebar: true,
      },
      '/requests/replicate': {
        id: 'requests_replicate',
        text: 'Replicar',
        icon: ReplicateIcon,
        permissions: { required: 'admin.docs.manage' },
        showInSidebar: true,
      },
    },
  },

  '/entities': {
    id: 'entities',
    text: 'Entidades',
    icon: EntitiesIcon,
    module: 'pedidos',
    permissions: { required: 'entities.view' },
    showInSidebar: true,
  },

  // ==================== MÓDULO: PEDIDOS ====================
  // Ordem: Pedidos, Pavimentações, Requisição Interna

  '/pedidos': {
    id: 'pedidos',
    text: 'Pedidos',
    icon: PedidosIcon,
    module: 'pedidos',
    permissions: { required: 'docs.view.all' },
    showInSidebar: true,
  },

  '/pavements': {
    id: 'pavements',
    text: 'Pavimentações',
    icon: PavementIcon,
    module: 'pedidos',
    permissions: { required: 'pav.view' },
    showInSidebar: true,
  },

  '/internal': {
    id: 'internal',
    text: 'Área Interna',
    icon: InternalIcon,
    module: 'pedidos',
    permissions: { required: 'tasks.view' },
    showInSidebar: false,
  },

  '/internal/requisicao': {
    id: 'internal_requisicao',
    text: 'Requisição Interna',
    icon: RequestsIcon,
    module: 'pedidos',
    permissions: { required: 'tasks.view' },
    showInSidebar: true,
  },

  // ==================== MÓDULO: RECURSOS HUMANOS ====================
  // Ordem: EPI (topo), Gestão Pessoal (submenu), Avaliação, Análise de Avaliações

  '/epi': {
    id: 'epi',
    text: 'Gestão de EPI',
    icon: EPIIcon,
    module: 'rh',
    permissions: { required: 'epi.view' },
    showInSidebar: true,
  },

  '/rh/pessoal': {
    id: 'rh_pessoal',
    text: 'Gestão Pessoal',
    icon: GestPessoalIcon,
    module: 'rh',
    permissions: { required: 'rh.view' },
    showInSidebar: true,
    submenu: {
      '/rh/pessoal/ferias': {
        id: 'rh_ferias',
        text: 'Férias',
        icon: FeriasIcon,
        permissions: { required: 'rh.view' },
        showInSidebar: true,
      },
      '/rh/pessoal/faltas': {
        id: 'rh_faltas',
        text: 'Faltas e Justificações',
        icon: FaltasIcon,
        permissions: { required: 'rh.view' },
        showInSidebar: true,
      },
      '/rh/pessoal/horarios': {
        id: 'rh_horarios',
        text: 'Horários',
        icon: HorariosIcon,
        permissions: { required: 'rh.view' },
        showInSidebar: true,
      },
      '/rh/pessoal/piquete': {
        id: 'rh_piquete',
        text: 'Piquete',
        icon: PiqueteIcon,
        permissions: { required: 'rh.view' },
        showInSidebar: true,
      },
    },
  },

  '/aval': {
    id: 'aval',
    text: 'Avaliação',
    icon: AvalIcon,
    module: 'rh',
    permissions: { required: 'aval.view' },
    showInSidebar: true,
  },

  '/aval/analytics': {
    id: 'aval_analytics',
    text: 'Análise de Avaliações',
    icon: AnalyticsIcon,
    module: 'rh',
    permissions: { required: 'aval.view' },
    showInSidebar: true,
  },

  '/aval/admin': {
    id: 'aval_admin',
    text: 'Configuração de Avaliações',
    icon: AvalIcon,
    module: 'administracao',
    permissions: { required: 'admin.users' },
    showInSidebar: true,
  },

  '/offices': {
    id: 'offices',
    text: 'Gestão de Ofícios',
    icon: OfficesIcon,
    module: 'administrativo',
    permissions: { required: 'letters.manage' },
    showInSidebar: false,
  },

  // ==================== ROTAS LEGACY (mantidas para compatibilidade) ====================

  '/documents': {
    id: 'documents',
    text: 'Documentos',
    icon: DocumentsIcon,
    module: null, // Sem módulo específico
    permissions: { required: 'docs.view.all' },
    showInSidebar: false, // Desativado na sidebar (usar ofícios administrativos)
    submenu: {
      '/documents/all': {
        id: 'documents_all',
        text: 'Todos os Documentos',
        icon: DocumentsIcon,
        permissions: { required: 'docs.view.all' },
        showInSidebar: false,
      },
      '/documents/my': {
        id: 'documents_my',
        text: 'Meus Documentos',
        icon: DocumentsIcon,
        permissions: { required: 'docs.view.owner' },
        showInSidebar: false,
      },
      '/documents/assigned': {
        id: 'documents_assigned',
        text: 'Documentos Atribuídos',
        icon: DocumentsIcon,
        permissions: { required: 'docs.view.assigned' },
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
