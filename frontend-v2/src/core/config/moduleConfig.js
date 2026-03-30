import {
  Engineering,
  AccountTree,
  Payment,
  Analytics,
  AdminPanelSettings,
  BusinessCenter,
  Inbox,
  Badge,
} from '@mui/icons-material';

// Sem import de PERMISSIONS — strings da BD resolvidas dinamicamente pelo permissionService

/**
 * Configuração de módulos da aplicação AINTAR
 * Cada módulo representa uma área principal acessível via Top Navbar
 *
 * permissions.required: array de strings (value da ts_interface).
 * O módulo aparece na navbar se o utilizador tiver PELO MENOS UMA das permissões.
 */
export const MODULES = {
  OPERACAO: {
    id: 'operacao',
    label: 'Operação',
    icon: Engineering,
    color: '#2196f3',
    order: 1,
    permissions: {
      required: [
        'tasks.manage',        // tasks.manage — gerir tarefas atribuídas
        'operation.access',    // operation.access — aceder ao módulo
      ]
    },
    description: 'Operações de campo e controlo operacional',
    defaultRoute: '/operation/tasks',
  },

  GESTAO: {
    id: 'gestao',
    label: 'Gestão',
    icon: AccountTree,
    color: '#4caf50',
    order: 2,
    permissions: {
      required: [
        'operation.access',    // ETAR, EE, Despesas
        'equipamentos.view',   // Equipamentos
        'obras.view',          // Obras
        'fleet.view',          // Frota
        'telemetry.view',      // Telemetria
      ]
    },
    description: 'Gestão de infraestruturas e análises técnicas',
    defaultRoute: '/etar',
  },

  PEDIDOS: {
    id: 'pedidos',
    label: 'Pedidos',
    icon: Inbox,
    color: '#ff5722',
    order: 3,
    permissions: {
      required: [
        'docs.view.all',      // Pedidos
        'pav.view',           // Pavimentações
        'tasks.view',         // Área interna
        'entities.view',      // Entidades
      ]
    },
    description: 'Gestão de pedidos, pavimentações e requisições',
    defaultRoute: '/pedidos',
  },

  RH: {
    id: 'rh',
    label: 'Recursos Humanos',
    icon: Badge,
    color: '#e91e63',
    order: 4,
    permissions: {
      required: [
        'epi.view',
        'rh.view',
        'aval.view',
      ]
    },
    description: 'Avaliações de desempenho, recursos humanos e gestão de EPI',
    defaultRoute: '/epi',
  },

  PAGAMENTOS: {
    id: 'pagamentos',
    label: 'Pagamentos',
    icon: Payment,
    color: '#ff9800',
    order: 5,
    permissions: {
      required: [
        'payments.manage',       // Tesouraria — gestão completa
      ]
    },
    description: 'Processamento de pagamentos e gestão financeira',
    defaultRoute: '/payments',
  },

  DASHBOARDS: {
    id: 'dashboards',
    label: 'Dashboards',
    icon: Analytics,
    color: '#9c27b0',
    order: 6,
    permissions: {
      required: [
        'dashboard.view',
      ]
    },
    description: 'Analytics e relatórios',
    defaultRoute: '/dashboards/overview',
  },

  ADMINISTRATIVO: {
    id: 'administrativo',
    label: 'Interno',
    icon: BusinessCenter,
    color: '#607d8b',
    order: 7,
    permissions: {
      required: [
        'tasks.view',        // Tarefas administrativas
        'letters.manage',    // Emissões / Ofícios
      ]
    },
    description: 'Tarefas administrativas e emissões',
    defaultRoute: '/tasks',
  },

  ADMINISTRACAO: {
    id: 'administracao',
    label: 'Sistema',
    icon: AdminPanelSettings,
    color: '#f44336',
    order: 8,
    permissions: {
      required: [
        'admin.users',
        'admin.system.settings',
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
    '/entities': 'pedidos',

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
