/**
 * Permission Helpers
 * Funções auxiliares para gestão de permissões e dependências
 */

import { PERMISSIONS } from '../config/permissionMap';

/**
 * Templates de permissões pré-definidos
 * Facilitam a atribuição rápida de conjuntos comuns de permissões
 */
export const PERMISSION_TEMPLATES = {
  'Operador Básico': {
    description: 'Executar tarefas e ver documentos atribuídos',
    icon: 'work',
    color: '#38A169',
    permissions: [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.DOCS_VIEW_ASSIGNED,
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
      PERMISSIONS.DOCS_ASSIGN,
    ],
  },
  'Gestor de Tarefas': {
    description: 'Gestão completa de tarefas',
    icon: 'task',
    color: '#805AD5',
    permissions: [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.TASKS_EDIT,
      PERMISSIONS.TASKS_DELETE,
      PERMISSIONS.TASKS_ASSIGN,
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
    ],
  },
  'Gestor de Entidades': {
    description: 'Gestão de entidades e contactos',
    icon: 'business',
    color: '#2D3748',
    permissions: [
      PERMISSIONS.ENTITIES_VIEW,
      PERMISSIONS.ENTITIES_EDIT,
    ],
  },
};

/**
 * Mapeamento de dependências de permissões
 * Define quais permissões requerem outras permissões
 *
 * Exemplo: Para ter TASKS_EDIT, é necessário ter TASKS_VIEW
 */
export const PERMISSION_DEPENDENCIES = {
  // Tarefas - hierarquia de permissões
  [PERMISSIONS.TASKS_CREATE]: [PERMISSIONS.TASKS_VIEW],
  [PERMISSIONS.TASKS_EDIT]: [PERMISSIONS.TASKS_VIEW],
  [PERMISSIONS.TASKS_DELETE]: [PERMISSIONS.TASKS_VIEW],
  [PERMISSIONS.TASKS_ASSIGN]: [PERMISSIONS.TASKS_VIEW],

  // Documentos - hierarquia de permissões
  [PERMISSIONS.DOCS_CREATE]: [PERMISSIONS.DOCS_VIEW_OWNER],
  [PERMISSIONS.DOCS_EDIT]: [PERMISSIONS.DOCS_VIEW_OWNER],
  [PERMISSIONS.DOCS_DELETE]: [PERMISSIONS.DOCS_VIEW_OWNER],
  [PERMISSIONS.DOCS_ASSIGN]: [PERMISSIONS.DOCS_VIEW_OWNER],
  [PERMISSIONS.DOCS_APPROVE]: [PERMISSIONS.DOCS_VIEW_OWNER],

  // Entidades - hierarquia de permissões
  [PERMISSIONS.ENTITIES_EDIT]: [PERMISSIONS.ENTITIES_VIEW],
  [PERMISSIONS.ENTITIES_DELETE]: [PERMISSIONS.ENTITIES_VIEW],

  // Admin Users requer Dashboard Admin
  [PERMISSIONS.ADMIN_USERS]: [PERMISSIONS.ADMIN_DASHBOARD],
  [PERMISSIONS.ADMIN_PAYMENTS]: [PERMISSIONS.ADMIN_DASHBOARD],
};

/**
 * Obtém todas as dependências de uma permissão (recursivo)
 *
 * @param {number} permissionId - ID da permissão
 * @param {Set} visited - Set de permissões já visitadas (evita loops)
 * @returns {Array<number>} Array de IDs de permissões necessárias
 */
export const getPermissionDependencies = (permissionId, visited = new Set()) => {
  // Evitar loops infinitos
  if (visited.has(permissionId)) {
    return [];
  }
  visited.add(permissionId);

  const directDependencies = PERMISSION_DEPENDENCIES[permissionId] || [];
  const allDependencies = [...directDependencies];

  // Recursivamente obter dependências das dependências
  directDependencies.forEach(dep => {
    const subDeps = getPermissionDependencies(dep, visited);
    allDependencies.push(...subDeps);
  });

  // Remover duplicados
  return [...new Set(allDependencies)];
};

/**
 * Obtém todas as permissões que dependem de uma permissão específica
 * Útil para remover em cascata
 *
 * @param {number} permissionId - ID da permissão
 * @param {Array<number>} currentPermissions - Permissões atuais do utilizador
 * @returns {Array<number>} Array de IDs que dependem desta permissão
 */
export const getPermissionDependents = (permissionId, currentPermissions = []) => {
  const dependents = [];

  // Para cada permissão nas permissões atuais
  currentPermissions.forEach(pId => {
    const deps = getPermissionDependencies(pId);
    // Se esta permissão depende da que queremos remover
    if (deps.includes(permissionId)) {
      dependents.push(pId);
    }
  });

  return dependents;
};

/**
 * Resolve dependências de um array de permissões
 * Adiciona automaticamente todas as dependências necessárias
 *
 * @param {Array<number>} permissions - Array de IDs de permissões
 * @returns {Array<number>} Array com permissões + dependências resolvidas
 */
export const resolvePermissionDependencies = (permissions) => {
  const resolved = new Set(permissions);

  permissions.forEach(permId => {
    const deps = getPermissionDependencies(permId);
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
