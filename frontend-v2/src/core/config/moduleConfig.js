import {
  Engineering,
  AccountTree,        // Gestão: hierarquia de infraestrutura
  Payment,
  Analytics,          // Dashboards: mais visual que Dashboard genérico
  AdminPanelSettings,
  BusinessCenter,     // Interno: área administrativa interna
  Inbox,              // Pedidos: caixa de entrada de pedidos
  Badge,              // Recursos Humanos: crachá/identificação pessoal
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
      required: [
        PERMISSIONS.TASKS_MY,
        PERMISSIONS.OPERATIONS_VIEW,
        PERMISSIONS.BRANCHES_VIEW,
        PERMISSIONS.SEPTIC_TANKS_VIEW,
      ]
    },
    description: 'Operações de campo e controlo operacional',
    defaultRoute: '/operation/tasks',
  },

  GESTAO: {
    id: 'gestao',
    label: 'Gestão',
    icon: AccountTree,
    color: '#4caf50', // Verde
    order: 2,
    permissions: {
      required: [
        PERMISSIONS.ETAR_VIEW,
        PERMISSIONS.EE_VIEW,
        PERMISSIONS.ANALYSES_VIEW,
        PERMISSIONS.TELEMETRY_VIEW,
        PERMISSIONS.EXPENSES_VIEW,
        PERMISSIONS.EQUIPAMENTOS_VIEW,
        PERMISSIONS.OBRAS_VIEW,
        PERMISSIONS.ADMIN_USERS, // Frota (permissão temporária)
      ]
    },
    description: 'Gestão de infraestruturas e análises técnicas',
    defaultRoute: '/etar',
  },

  PEDIDOS: {
    id: 'pedidos',
    label: 'Pedidos',
    icon: Inbox,
    color: '#ff5722', // Laranja profundo
    order: 3,
    permissions: {
      required: [
        PERMISSIONS.DOCS_VIEW_ALL,
        PERMISSIONS.PAVEMENTS_VIEW,
        PERMISSIONS.TASKS_VIEW,
      ]
    },
    description: 'Gestão de pedidos, pavimentações e requisições',
    defaultRoute: '/pedidos',
  },

  RH: {
    id: 'rh',
    label: 'Recursos Humanos',
    icon: Badge,
    color: '#e91e63', // Rosa
    order: 4,
    permissions: {
      // Avaliação é acessível a todos — módulo visível a todos os autenticados
      required: []
    },
    description: 'Avaliações de desempenho, recursos humanos e gestão de EPI',
    defaultRoute: '/epi',
  },

  PAGAMENTOS: {
    id: 'pagamentos',
    label: 'Pagamentos',
    icon: Payment,
    color: '#ff9800', // Laranja
    order: 5,
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
    icon: Analytics,
    color: '#9c27b0', // Roxo
    order: 6,
    permissions: {
      required: [
        PERMISSIONS.DASHBOARD_VIEW,
      ]
    },
    description: 'Analytics e relatórios',
    defaultRoute: '/dashboards/overview',
  },

  ADMINISTRATIVO: {
    id: 'administrativo',
    label: 'Interno',
    icon: BusinessCenter,
    color: '#607d8b', // Cinza azulado
    order: 7,
    permissions: {
      required: [
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.EMISSIONS_VIEW,
      ]
    },
    description: 'Tarefas administrativas e emissões',
    defaultRoute: '/tasks',
  },

  ADMINISTRACAO: {
    id: 'administracao',
    label: 'Sistema',
    icon: AdminPanelSettings,
    color: '#f44336', // Vermelho
    order: 8,
    permissions: {
      required: [
        PERMISSIONS.ADMIN_DASHBOARD,
        PERMISSIONS.ADMIN_USERS,
        PERMISSIONS.SYSTEM_CONFIG,
      ]
    },
    description: 'Administração do sistema, utilizadores e logs',
    defaultRoute: '/admin',
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
    '/operation': 'operacao',

    // GESTÃO
    '/etar': 'gestao',
    '/ee': 'gestao',
    '/analyses': 'gestao',
    '/telemetry': 'gestao',
    '/expenses': 'gestao',
    '/equipamentos': 'gestao',
    '/fleet': 'gestao',

    // PEDIDOS
    '/pedidos': 'pedidos',
    '/pavements': 'pedidos',
    '/internal': 'pedidos',

    // RECURSOS HUMANOS
    '/epi': 'rh',
    '/aval': 'rh',
    '/rh': 'rh',

    // PAGAMENTOS
    '/clients': 'pagamentos',
    '/invoices': 'pagamentos',
    '/payments': 'pagamentos',
    '/sibs': 'pagamentos',

    // DASHBOARDS
    '/dashboards': 'dashboards',
    '/reports': 'dashboards',
    '/analytics': 'dashboards',

    // ADMINISTRATIVO (Interno)
    '/tasks': 'administrativo',
    '/emissoes': 'administrativo',
    '/inventory': 'administrativo',

    // ADMINISTRAÇÃO (Sistema)
    '/admin': 'administracao',
    '/system': 'administracao',
    '/users': 'administracao',
    '/permissions': 'administracao',
    '/entities': 'administracao',
    '/offices-admin': 'administracao',
    '/requests': 'administracao',
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
