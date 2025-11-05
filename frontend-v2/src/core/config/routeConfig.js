/**
 * Route Configuration
 * Mapeamento centralizado de rotas → permissões e metadados
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
} from '@mui/icons-material';

/**
 * ROUTE_CONFIG
 * Estrutura:
 * - path: Caminho da rota (deve coincidir com o path em App.jsx)
 * - id: Identificador único da rota
 * - text: Texto para exibição (sidebar, breadcrumbs, etc.)
 * - icon: Ícone Material-UI (componente, não JSX)
 * - permissions: { required: number } - ID de permissão necessário (da BD)
 * - showInSidebar: boolean - Mostrar no menu lateral?
 * - submenu: objeto com sub-rotas (opcional)
 */
export const ROUTE_CONFIG = {
  '/dashboard': {
    id: 'dashboard',
    text: 'Dashboard',
    icon: DashboardIcon,
    permissions: null, // Sem permissão específica - qualquer utilizador autenticado
    showInSidebar: true,
  },

  '/settings': {
    id: 'settings',
    text: 'Definições',
    icon: SettingsIcon,
    permissions: null, // Sem permissão específica
    showInSidebar: true,
  },

  // ==================== PERFIL DO UTILIZADOR ====================

  '/profile': {
    id: 'profile',
    text: 'Meu Perfil',
    icon: PeopleIcon,
    permissions: null, // Qualquer utilizador autenticado
    showInSidebar: false, // Acedido via menu do utilizador, não sidebar
  },

  '/change-password': {
    id: 'change_password',
    text: 'Alterar Password',
    icon: SettingsIcon,
    permissions: null, // Qualquer utilizador autenticado
    showInSidebar: false, // Acedido via menu do utilizador, não sidebar
  },

  // ==================== ADMINISTRAÇÃO ====================

  '/admin': {
    id: 'admin',
    text: 'Administração',
    icon: AdminIcon,
    permissions: { required: 10 }, // ADMIN_DASHBOARD
    showInSidebar: true,
    submenu: {
      '/admin/dashboard': {
        id: 'admin_dashboard',
        text: 'Dashboard Admin',
        icon: DashboardIcon,
        permissions: { required: 10 }, // ADMIN_DASHBOARD
      },
      '/admin/users': {
        id: 'admin_users',
        text: 'Gestão de Utilizadores',
        icon: PeopleIcon,
        permissions: { required: 20 }, // ADMIN_USERS
      },
      '/admin/permissions': {
        id: 'admin_permissions',
        text: 'Gestão de Permissões',
        icon: AdminIcon,
        permissions: { required: 20 }, // ADMIN_USERS
      },
    },
  },

  '/users': {
    id: 'users',
    text: 'Utilizadores',
    icon: PeopleIcon,
    permissions: { required: 20 }, // ADMIN_USERS
    showInSidebar: true,
  },

  // ==================== PAGAMENTOS ====================

  '/payments': {
    id: 'payments',
    text: 'Validar Pagamentos',
    icon: PaymentsIcon,
    permissions: { required: 30 }, // ADMIN_PAYMENTS
    showInSidebar: true,
  },

  // ==================== TAREFAS ====================

  '/tasks': {
    id: 'tasks',
    text: 'Tarefas',
    icon: TasksIcon,
    permissions: { required: 200 }, // TASKS_VIEW
    showInSidebar: true,
    submenu: {
      '/tasks/all': {
        id: 'tasks_all',
        text: 'Todas as Tarefas',
        icon: TasksIcon,
        permissions: { required: 200 }, // TASKS_VIEW
      },
      '/tasks/my': {
        id: 'tasks_my',
        text: 'Minhas Tarefas',
        icon: TasksIcon,
        permissions: { required: 200 }, // TASKS_VIEW
      },
    },
  },

  // ==================== DOCUMENTOS ====================

  '/documents': {
    id: 'documents',
    text: 'Documentos',
    icon: DocumentsIcon,
    permissions: { required: 500 }, // DOCS_VIEW_ALL
    showInSidebar: true,
    submenu: {
      '/documents/all': {
        id: 'documents_all',
        text: 'Todos os Documentos',
        icon: DocumentsIcon,
        permissions: { required: 500 }, // DOCS_VIEW_ALL
      },
      '/documents/my': {
        id: 'documents_my',
        text: 'Meus Documentos',
        icon: DocumentsIcon,
        permissions: { required: 510 }, // DOCS_VIEW_OWNER
      },
      '/documents/assigned': {
        id: 'documents_assigned',
        text: 'Documentos Atribuídos',
        icon: DocumentsIcon,
        permissions: { required: 520 }, // DOCS_VIEW_ASSIGNED
      },
    },
  },

  // ==================== ENTIDADES ====================

  '/entities': {
    id: 'entities',
    text: 'Entidades',
    icon: EntitiesIcon,
    permissions: { required: 800 }, // ENTITIES_VIEW
    showInSidebar: true,
    submenu: {
      '/entities/all': {
        id: 'entities_all',
        text: 'Todas as Entidades',
        icon: EntitiesIcon,
        permissions: { required: 800 }, // ENTITIES_VIEW
      },
      '/entities/create': {
        id: 'entities_create',
        text: 'Criar Entidade',
        icon: EntitiesIcon,
        permissions: { required: 810 }, // ENTITIES_EDIT
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
 * Obter todas as rotas que devem aparecer no sidebar
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

export default ROUTE_CONFIG;
