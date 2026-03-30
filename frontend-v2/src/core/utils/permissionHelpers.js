/**
 * Permission Helpers
 * Funções auxiliares para gestão de permissões e dependências
 *
 * FONTE ÚNICA DE VERDADE: ts_interface (BD)
 * As dependências entre permissões são lidas do campo `requires`
 * de cada interface carregada via MetadataContext (/metaData).
 * Não existe mapeamento hardcoded de dependências neste ficheiro.
 */

import { PERMISSIONS } from '../config/permissionMap';

/**
 * Templates de permissões pré-definidos.
 * Os IDs referenciam os pk da tabela ts_interface (BD).
 * Usado para atribuição rápida de conjuntos comuns de permissões.
 */
export const PERMISSION_TEMPLATES = {
  'Operador Básico': {
    description: 'Executar tarefas e ver documentos atribuídos',
    icon: 'work',
    color: '#38A169',
    permissions: [
      PERMISSIONS.INTERNAL_ACCESS,
      PERMISSIONS.OPERATION_ACCESS,
      PERMISSIONS.OPERATION_EXECUTE,
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_MANAGE,
      PERMISSIONS.DOCS_VIEW_ASSIGNED,
      PERMISSIONS.DASHBOARD_VIEW,
    ],
  },
  'Gestor de Documentos': {
    description: 'Gestão completa de documentos',
    icon: 'folder_shared',
    color: '#2C7A7B',
    permissions: [
      PERMISSIONS.DOCS_VIEW_ALL,
      PERMISSIONS.DOCS_CREATE,
      PERMISSIONS.DOCS_EDIT,
      PERMISSIONS.DOCS_DELETE,
    ],
  },
  'Gestor de Tarefas': {
    description: 'Gestão completa de tarefas',
    icon: 'task',
    color: '#805AD5',
    permissions: [
      PERMISSIONS.TASKS_ALL,
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_MANAGE,
      PERMISSIONS.TASKS_EDIT,
    ],
  },
  'Administrador': {
    description: 'Acesso completo à área administrativa',
    icon: 'admin_panel_settings',
    color: '#D69E2E',
    permissions: [
      PERMISSIONS.ADMIN_DASHBOARD,
      PERMISSIONS.ADMIN_USERS,
      PERMISSIONS.ADMIN_PAYMENTS,
      PERMISSIONS.ADMIN_LOGS_VIEW,
      PERMISSIONS.ADMIN_REPORTS_VIEW,
      PERMISSIONS.INTERNAL_ACCESS,
    ],
  },
  'Gestor de Entidades': {
    description: 'Gestão de entidades e contactos',
    icon: 'business',
    color: '#2D3748',
    permissions: [
      PERMISSIONS.ENTITIES_VIEW,
      PERMISSIONS.ENTITIES_CREATE,
      PERMISSIONS.ENTITIES_MANAGE,
    ],
  },
  'Financeiro — Básico': {
    description: 'Visualização de pagamentos e processar MB/MBWay',
    icon: 'payments',
    color: '#2B6CB0',
    permissions: [
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PAYMENTS_MBWAY,
      PERMISSIONS.PAYMENTS_MULTIBANCO,
      PERMISSIONS.ENTITIES_VIEW,
      PERMISSIONS.DOCS_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
    ],
  },
  'Financeiro — Completo': {
    description: 'Todos os métodos de pagamento incluindo numerário e municípios',
    icon: 'account_balance',
    color: '#744210',
    permissions: [
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PAYMENTS_MBWAY,
      PERMISSIONS.PAYMENTS_MULTIBANCO,
      PERMISSIONS.PAYMENTS_BANK_TRANSFER,
      PERMISSIONS.PAYMENTS_CASH,
      PERMISSIONS.PAYMENTS_MUNICIPALITY,
      PERMISSIONS.ENTITIES_VIEW,
      PERMISSIONS.DOCS_VIEW,
      PERMISSIONS.ADMIN_REPORTS_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
    ],
  },
};


/**
 * Obtém todas as dependências de uma permissão (recursivo).
 * Lê o campo `requires` diretamente dos metadados carregados da BD.
 *
 * @param {number} permissionId - ID da permissão (ts_interface.pk)
 * @param {Array} interfaces - Lista de interfaces carregada do MetadataContext
 * @param {Set} visited - Set interno para evitar loops cíclicos
 * @returns {Array<number>} Array de IDs de permissões necessárias
 */
export const getPermissionDependencies = (permissionId, interfaces = [], visited = new Set()) => {
  if (visited.has(permissionId)) return [];
  visited.add(permissionId);

  const iface = interfaces.find(i => i.pk === permissionId);
  const directDependencies = iface?.requires || [];
  const allDependencies = [...directDependencies];

  directDependencies.forEach(dep => {
    const subDeps = getPermissionDependencies(dep, interfaces, visited);
    allDependencies.push(...subDeps);
  });

  return [...new Set(allDependencies)];
};

/**
 * Obtém todas as permissões que dependem de uma permissão específica.
 * Usado para remoção em cascata: ao remover X, remover tudo que requer X.
 *
 * @param {number} permissionId - ID da permissão a remover
 * @param {Array<number>} currentPermissions - Permissões atuais do utilizador
 * @param {Array} interfaces - Lista de interfaces carregada do MetadataContext
 * @returns {Array<number>} Array de IDs que dependem desta permissão
 */
export const getPermissionDependents = (permissionId, currentPermissions = [], interfaces = []) => {
  const dependents = [];

  currentPermissions.forEach(pId => {
    const deps = getPermissionDependencies(pId, interfaces);
    if (deps.includes(permissionId)) {
      dependents.push(pId);
    }
  });

  return dependents;
};

/**
 * Resolve dependências de um array de permissões.
 * Adiciona automaticamente todas as dependências em falta (campo `requires` da BD).
 *
 * @param {Array<number>} permissions - Array de IDs de permissões
 * @param {Array} interfaces - Lista de interfaces carregada do MetadataContext
 * @returns {Array<number>} Array com permissões + dependências resolvidas
 */
export const resolvePermissionDependencies = (permissions, interfaces = []) => {
  const resolved = new Set(permissions);

  permissions.forEach(permId => {
    const deps = getPermissionDependencies(permId, interfaces);
    deps.forEach(dep => resolved.add(dep));
  });

  return Array.from(resolved);
};

/**
 * Calcula as mudanças entre dois arrays de permissões
 * Útil para mostrar um resumo antes de guardar
 *
 * @param {Array<number>} oldPermissions - Permissões antigas
 * @param {Array<number>} newPermissions - Permissões novas
 * @returns {Object} { added: [], removed: [], unchanged: [], hasChanges: boolean }
 */
export const getPermissionChanges = (oldPermissions = [], newPermissions = []) => {
  const oldSet = new Set(oldPermissions);
  const newSet = new Set(newPermissions);

  const added = newPermissions.filter(p => !oldSet.has(p));
  const removed = oldPermissions.filter(p => !newSet.has(p));
  const unchanged = oldPermissions.filter(p => newSet.has(p));

  return {
    added,
    removed,
    unchanged,
    hasChanges: added.length > 0 || removed.length > 0,
  };
};

/**
 * Agrupa permissões por categoria baseado nos metadados
 *
 * @param {Array} interfaces - Array de interfaces/permissões da BD
 * @returns {Object} Permissões agrupadas por categoria
 */
export const groupPermissionsByCategory = (interfaces = []) => {
  const grouped = {};

  interfaces.forEach(perm => {
    const category = perm.category || 'Outros';

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(perm);
  });

  // Ordenar cada categoria por pk
  Object.keys(grouped).forEach(category => {
    grouped[category].sort((a, b) => (a.pk || 0) - (b.pk || 0));
  });

  return grouped;
};

/**
 * Obtém o nome de uma permissão pelo ID
 *
 * @param {number} permissionId - ID da permissão
 * @param {Array} interfaces - Array de interfaces da BD
 * @returns {string} Nome da permissão
 */
export const getPermissionLabel = (permissionId, interfaces = []) => {
  const perm = interfaces.find(i => i.pk === permissionId);
  return perm?.label || perm?.value || `Permissão ${permissionId}`;
};

/**
 * Verifica se uma permissão é crítica
 *
 * @param {number} permissionId - ID da permissão
 * @param {Array} interfaces - Array de interfaces da BD
 * @returns {boolean}
 */
export const isPermissionCritical = (permissionId, interfaces = []) => {
  const perm = interfaces.find(i => i.pk === permissionId);
  return perm?.is_critical || false;
};

/**
 * Verifica se uma permissão é sensível
 *
 * @param {number} permissionId - ID da permissão
 * @param {Array} interfaces - Array de interfaces da BD
 * @returns {boolean}
 */
export const isPermissionSensitive = (permissionId, interfaces = []) => {
  const perm = interfaces.find(i => i.pk === permissionId);
  return perm?.is_sensitive || false;
};
