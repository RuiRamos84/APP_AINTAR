import {
  Engineering,
  Business,
  Payment,
  Dashboard,
  AdminPanelSettings,
  Description,
} from '@mui/icons-material';
import { PERMISSIONS } from './permissionMap.js';

/**
 * Configuração de módulos da aplicação AINTAR
 * Cada módulo representa uma área principal acessível via Top Navbar
 */
export const MODULES = {
  OPERACAO: {
    id: 'operacao',
    label: 'Operação',
    icon: Engineering,
    color: '#2196f3', // Azul
    order: 1,
    permissions: {
      // Acesso ao módulo (pelo menos UMA dessas permissões)
      required: [
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.TASKS_MY,
        PERMISSIONS.OPERATIONS_VIEW,
        PERMISSIONS.BRANCHES_VIEW,
        PERMISSIONS.SEPTIC_TANKS_VIEW,
      ]
    },
    description: 'Gestão de tarefas e operações de campo',
    defaultRoute: '/tasks',
  },

  GESTAO: {
    id: 'gestao',
    label: 'Gestão',
    icon: Business,
    color: '#4caf50', // Verde
    order: 2,
    permissions: {
      required: [
        PERMISSIONS.ETAR_VIEW,
        PERMISSIONS.EE_VIEW,
        PERMISSIONS.ANALYSES_VIEW,
        PERMISSIONS.TELEMETRY_VIEW,
        PERMISSIONS.EXPENSES_VIEW,
        PERMISSIONS.PAVEMENTS_VIEW,
      ]
    },
    description: 'Gestão de infraestruturas e análises técnicas',
    defaultRoute: '/etar',
  },

  PAGAMENTOS: {
    id: 'pagamentos',
    label: 'Pagamentos',
    icon: Payment,
    color: '#ff9800', // Laranja
    order: 3,
    permissions: {
      required: [
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.INVOICES_VIEW,
        PERMISSIONS.CLIENTS_VIEW,
      ]
    },
    description: 'Gestão de clientes, faturas e pagamentos',
    defaultRoute: '/clients',
  },

  DASHBOARDS: {
    id: 'dashboards',
    label: 'Dashboards',
    icon: Dashboard,
    color: '#9c27b0', // Roxo
    order: 4,
    permissions: {
      required: [
        PERMISSIONS.DASHBOARD_VIEW,
      ]
    },
    description: 'Analytics e relatórios',
    defaultRoute: '/dashboards/overview',
  },

  ADMINISTRACAO: {
    id: 'administracao',
    label: 'Administração',
    icon: AdminPanelSettings,
    color: '#f44336', // Vermelho
    order: 5,
    permissions: {
      required: [
        PERMISSIONS.ADMIN_DASHBOARD,
        PERMISSIONS.ADMIN_USERS,
        PERMISSIONS.SYSTEM_CONFIG,
      ]
    },
    description: 'Administração do sistema',
    defaultRoute: '/admin',
  },

  ADMINISTRATIVO: {
    id: 'administrativo',
    label: 'Administrativo',
    icon: Description,
    color: '#607d8b', // Cinza azulado
    order: 6,
    permissions: {
      required: [
        PERMISSIONS.EPI_MANAGEMENT,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.OFFICES_VIEW,
      ]
    },
    description: 'Gestão administrativa e inventário',
    defaultRoute: '/epi',
  },
};

/**
 * Retorna módulos acessíveis pelo utilizador com base nas suas permissões
 * @param {Function} hasPermission - Função de verificação de permissões
 * @param {Function} hasAnyPermission - Função para verificar se tem pelo menos uma permissão
 * @returns {Array} Array de módulos filtrados e ordenados
 */
export const getAccessibleModules = (hasPermission, hasAnyPermission) => {
  return Object.values(MODULES)
    .filter(module => {
      // Se não tem requisitos de permissão, permite
      if (!module.permissions?.required || module.permissions.required.length === 0) {
        return true;
      }

      // Verifica se tem pelo menos uma das permissões necessárias
      if (Array.isArray(module.permissions.required)) {
        return hasAnyPermission
          ? hasAnyPermission(module.permissions.required)
          : module.permissions.required.some(perm => hasPermission(perm));
      }

      // Permissão única
      return hasPermission(module.permissions.required);
    })
    .sort((a, b) => a.order - b.order);
};

/**
 * Obtém módulo por ID
 * @param {string} moduleId - ID do módulo
 * @returns {Object|undefined} Configuração do módulo
 */
export const getModuleById = (moduleId) => {
  return Object.values(MODULES).find(m => m.id === moduleId);
};

/**
 * Detecta módulo ativo baseado no pathname atual
 * @param {string} pathname - Current route path
 * @returns {string|null} Module ID ou null se não encontrado
 */
export const detectModuleFromPath = (pathname) => {
  // Mapeamento de prefixos de rota para módulos
  const pathModuleMap = {
    // OPERAÇÃO
    '/tasks': 'operacao',
    '/operations': 'operacao',
    '/branches': 'operacao',
    '/septic-tanks': 'operacao',

    // GESTÃO
    '/etar': 'gestao',
    '/ee': 'gestao',
    '/analyses': 'gestao',
    '/telemetry': 'gestao',
    '/expenses': 'gestao',
    '/pavements': 'gestao',

    // PAGAMENTOS
    '/clients': 'pagamentos',
    '/invoices': 'pagamentos',
    '/payments': 'pagamentos',
    '/sibs': 'pagamentos',

    // DASHBOARDS
    '/dashboards': 'dashboards',
    '/reports': 'dashboards',
    '/analytics': 'dashboards',

    // ADMINISTRAÇÃO
    '/admin': 'administracao',
    '/system': 'administracao',
    '/users': 'administracao',
    '/permissions': 'administracao',
    '/entities': 'administracao',
    '/offices-admin': 'administracao',
    '/requests': 'administracao',

    // ADMINISTRATIVO
    '/epi': 'administrativo',
    '/inventory': 'administrativo',
    '/offices': 'administrativo',
  };

  // Remove trailing slash
  const cleanPath = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;

  // Encontra primeiro match no pathname
  for (const [prefix, moduleId] of Object.entries(pathModuleMap)) {
    if (cleanPath.startsWith(prefix)) {
      return moduleId;
    }
  }

  // Default: null (será tratado no MainLayout)
  return null;
};

/**
 * Verifica se um caminho pertence a um módulo específico
 * @param {string} pathname - Current route path
 * @param {string} moduleId - Module ID to check
 * @returns {boolean} True se o pathname pertence ao módulo
 */
export const pathBelongsToModule = (pathname, moduleId) => {
  const detectedModule = detectModuleFromPath(pathname);
  return detectedModule === moduleId;
};
