/**
 * 🔑 CONFIGURAÇÃO DE PERMISSÕES - VERSÃO HÍBRIDA
 *
 * Estratégia:
 * 1. Constantes de IDs (evitar magic numbers)
 * 2. Metadados carregados da BD via API (PRIORIDADE)
 * 3. Fallback hardcoded se API falhar
 */

import permissionMetadataService from '../services/permissionMetadataService';

// ============================================================================
// CONSTANTES DE IDs (SEMPRE MANTÉM - Evita Magic Numbers)
// ============================================================================

export const PERMISSION_IDS = {
  // Administração (10-110)
  ADMIN_DASHBOARD: 10,
  ADMIN_USERS: 20,
  ADMIN_PAYMENTS: 30,
  ADMIN_CASH: 40,
  ADMIN_DOCS_MANAGE: 50,
  ADMIN_DOCS_REOPEN: 60,
  ADMIN_DB_MANAGE: 70,
  ADMIN_LOGS_VIEW: 80,
  ADMIN_REPORTS_VIEW: 90,
  ADMIN_SYSTEM_SETTINGS: 100,
  ADMIN_CACHE_MANAGE: 110,

  // Tarefas & Processos (200-220, 750)
  TASKS_ALL: 200,
  EPI_MANAGE: 210,
  LETTERS_MANAGE: 220,
  TASKS_MANAGE: 750,

  // Acessos (300-400)
  INTERNAL_ACCESS: 300,
  OPERATION_ACCESS: 310,
  OPERATION_EXECUTE: 311,
  OPERATION_SUPERVISE: 312,
  OPERATION_MANAGE: 313,
  GLOBAL_ACCESS: 320,
  DASHBOARD_VIEW: 400,

  // Documentos (500-560)
  DOCS_VIEW_ALL: 500,
  DOCS_VIEW_OWNER: 510,
  DOCS_VIEW_ASSIGNED: 520,
  DOCS_VIEW: 530,
  DOCS_MODERN: 540,
  DOCS_CREATE: 560,

  // PAV (600)
  PAV_VIEW: 600,

  // Pagamentos (700-740)
  PAYMENTS_MBWAY: 700,
  PAYMENTS_MULTIBANCO: 710,
  PAYMENTS_BANK_TRANSFER: 720,
  PAYMENTS_CASH_ACTION: 730,
  PAYMENTS_MUNICIPALITY: 740,

  // Entidades (800-820)
  ENTITIES_VIEW: 800,
  ENTITIES_CREATE: 810,
  ENTITIES_MANAGE: 820,
};

// ============================================================================
// METADADOS FALLBACK (Caso BD não responda)
// ============================================================================

const FALLBACK_METADATA = {
  [PERMISSION_IDS.ADMIN_DASHBOARD]: {
    id: 10,
    key: 'admin.dashboard',
    category: 'Administração',
    label: 'Dashboard Administrativo',
    description: 'Aceder ao painel de controlo da administração',
    icon: 'dashboard',
    requires: [],
    is_critical: false,
    is_sensitive: false,
  },
  [PERMISSION_IDS.ADMIN_USERS]: {
    id: 20,
    key: 'admin.users',
    category: 'Administração',
    label: 'Gerir Utilizadores',
    description: 'Criar, editar e remover utilizadores do sistema',
    icon: 'people',
    requires: [],
    is_critical: true,
    is_sensitive: false,
  },
  [PERMISSION_IDS.ADMIN_PAYMENTS]: {
    id: 30,
    key: 'admin.payments',
    category: 'Administração',
    label: 'Gerir Pagamentos',
    description: 'Visualizar e aprovar todos os pagamentos manuais',
    icon: 'payment',
    requires: [],
    is_critical: false,
    is_sensitive: false,
  },
  [PERMISSION_IDS.OPERATION_ACCESS]: {
    id: 310,
    key: 'operation.access',
    category: 'Acessos',
    label: 'Acesso a Operações',
    description: 'Aceder ao módulo de operações',
    icon: 'work',
    requires: [],
    is_critical: false,
    is_sensitive: false,
  },
  [PERMISSION_IDS.OPERATION_EXECUTE]: {
    id: 311,
    key: 'operation.execute',
    category: 'Acessos',
    label: 'Executar Operações',
    description: 'Executar e completar operações',
    icon: 'play_circle',
    requires: [310],
    is_critical: false,
    is_sensitive: false,
  },
  [PERMISSION_IDS.PAYMENTS_CASH_ACTION]: {
    id: 730,
    key: 'payments.cash.action',
    category: 'Pagamentos',
    label: 'Processar Numerário',
    description: 'Processar pagamentos em numerário',
    icon: 'local_atm',
    requires: [],
    is_critical: false,
    is_sensitive: true,
  },
  // ... adicionar mais conforme necessário (ou carregar tudo da BD)
};

// ============================================================================
// TEMPLATES DE PERMISSÕES (MANTÉM - Funcionalidade do Frontend)
// ============================================================================

export const PERMISSION_TEMPLATES = {
  'Operador Básico': {
    description: 'Executar operações e ver documentos atribuídos',
    icon: 'work',
    color: '#38A169',
    permissions: [
      PERMISSION_IDS.INTERNAL_ACCESS,
      PERMISSION_IDS.DASHBOARD_VIEW,
      PERMISSION_IDS.OPERATION_ACCESS,
      PERMISSION_IDS.OPERATION_EXECUTE,
      PERMISSION_IDS.DOCS_VIEW_ASSIGNED,
      PERMISSION_IDS.TASKS_MANAGE,
    ],
  },
  'Gestor de Documentos': {
    description: 'Gestão completa de documentos',
    icon: 'folder_shared',
    color: '#2C7A7B',
    permissions: [
      PERMISSION_IDS.INTERNAL_ACCESS,
      PERMISSION_IDS.DASHBOARD_VIEW,
      PERMISSION_IDS.DOCS_VIEW_ALL,
      PERMISSION_IDS.DOCS_MODERN,
      PERMISSION_IDS.DOCS_CREATE,
      PERMISSION_IDS.ADMIN_DOCS_MANAGE,
    ],
  },
  'Técnico Financeiro': {
    description: 'Processar todos os tipos de pagamentos',
    icon: 'payments',
    color: '#D69E2E',
    permissions: [
      PERMISSION_IDS.INTERNAL_ACCESS,
      PERMISSION_IDS.DASHBOARD_VIEW,
      PERMISSION_IDS.PAYMENTS_MBWAY,
      PERMISSION_IDS.PAYMENTS_MULTIBANCO,
      PERMISSION_IDS.PAYMENTS_BANK_TRANSFER,
      PERMISSION_IDS.PAYMENTS_CASH_ACTION,
      PERMISSION_IDS.ADMIN_PAYMENTS,
    ],
  },
  'Supervisor': {
    description: 'Supervisionar operações e relatórios',
    icon: 'supervisor_account',
    color: '#805AD5',
    permissions: [
      PERMISSION_IDS.INTERNAL_ACCESS,
      PERMISSION_IDS.DASHBOARD_VIEW,
      PERMISSION_IDS.OPERATION_ACCESS,
      PERMISSION_IDS.OPERATION_SUPERVISE,
      PERMISSION_IDS.DOCS_VIEW_ALL,
      PERMISSION_IDS.TASKS_ALL,
      PERMISSION_IDS.ADMIN_REPORTS_VIEW,
    ],
  },
  'Backoffice': {
    description: 'Gestão de entidades, documentos e tarefas',
    icon: 'business_center',
    color: '#2D3748',
    permissions: [
      PERMISSION_IDS.INTERNAL_ACCESS,
      PERMISSION_IDS.DASHBOARD_VIEW,
      PERMISSION_IDS.DOCS_VIEW_ASSIGNED,
      PERMISSION_IDS.DOCS_CREATE,
      PERMISSION_IDS.TASKS_MANAGE,
      PERMISSION_IDS.ENTITIES_VIEW,
      PERMISSION_IDS.ENTITIES_CREATE,
      PERMISSION_IDS.ENTITIES_MANAGE,
      PERMISSION_IDS.LETTERS_MANAGE,
    ],
  },
};

// ============================================================================
// FUNÇÕES HELPER
// ============================================================================

/**
 * Obtém metadados de uma permissão
 * PRIORIDADE: Cache Global (BD) > Objeto Passado > Fallback > Default
 *
 * @param {number} permissionId - ID da permissão
 * @param {Object} permissionFromDB - Objeto com dados da BD (opcional)
 * @returns {Object} Metadados da permissão
 */
export const getPermissionMetadata = (permissionId, permissionFromDB = null) => {
  // 1ª PRIORIDADE: Cache global (já carregado da BD)
  const cachedMetadata = permissionMetadataService.getMetadata(permissionId);
  if (cachedMetadata) {
    return cachedMetadata;
  }

  // 2ª PRIORIDADE: Objeto passado diretamente (dados da BD)
  if (permissionFromDB && permissionFromDB.label) {
    return {
      id: permissionFromDB.pk || permissionId,
      key: permissionFromDB.name || permissionFromDB.value || `unknown.${permissionId}`,
      category: permissionFromDB.category || 'Outros',
      label: permissionFromDB.label || `Permissão ${permissionId}`,
      description: permissionFromDB.description || 'Sem descrição',
      icon: permissionFromDB.icon || 'help_outline',
      requires: permissionFromDB.requires || [],
      is_critical: permissionFromDB.is_critical || false,
      is_sensitive: permissionFromDB.is_sensitive || false,
      sort_order: permissionFromDB.sort_order || 0,
    };
  }

  // 3ª PRIORIDADE: Fallback hardcoded
  if (FALLBACK_METADATA[permissionId]) {
    return FALLBACK_METADATA[permissionId];
  }

  // Default se não encontrar nada
  return {
    id: permissionId,
    key: `unknown.${permissionId}`,
    category: 'Outros',
    label: `Permissão ${permissionId}`,
    description: 'Permissão sem descrição',
    icon: 'help_outline',
    requires: [],
    is_critical: false,
    is_sensitive: false,
    sort_order: 999,
  };
};

/**
 * Agrupa permissões por categoria
 * Usa dados da BD quando disponíveis
 *
 * @param {Array} permissions - Array de permissões da API
 * @returns {Object} Permissões agrupadas por categoria
 */
export const groupPermissionsByCategory = (permissions = []) => {
  const grouped = {};

  permissions.forEach(perm => {
    // Obter metadados da permissão
    // Se vier da BD com label, usa direto; senão usa fallback
    const metadata = getPermissionMetadata(perm.pk || perm.id, perm);
    const category = metadata.category || 'Outros';

    if (!grouped[category]) {
      grouped[category] = [];
    }

    // Merge dos dados originais com metadados processados
    grouped[category].push({
      ...perm,
      ...metadata,
      // Garantir que pk seja consistente
      pk: perm.pk || perm.id || metadata.id,
      id: perm.pk || perm.id || metadata.id,
    });
  });

  // Ordenar categorias por ordem definida
  const categoryOrder = {
    'Administração': 1,
    'Acessos': 2,
    'Documentos': 3,
    'Pagamentos': 4,
    'Tarefas': 5,
    'Entidades': 6,
    'Equipamentos': 7,
    'Correspondência': 8,
    'Outros': 99,
  };

  const ordered = {};
  Object.keys(grouped)
    .sort((a, b) => (categoryOrder[a] || 99) - (categoryOrder[b] || 99))
    .forEach(category => {
      // Ordenar permissões dentro da categoria por sort_order, depois por pk
      ordered[category] = grouped[category].sort((a, b) => {
        const orderA = a.sort_order !== undefined ? a.sort_order : 999;
        const orderB = b.sort_order !== undefined ? b.sort_order : 999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return (a.pk || a.id) - (b.pk || b.id);
      });
    });

  return ordered;
};

/**
 * Obtém dependências de uma permissão
 */
export const getPermissionDependencies = (permissionId) => {
  const metadata = getPermissionMetadata(permissionId);
  return metadata.requires || [];
};

/**
 * Valida se uma permissão pode ser atribuída (verifica dependências)
 */
export const validatePermissionAssignment = (permissionId, currentPermissions = []) => {
  const dependencies = getPermissionDependencies(permissionId);
  const missingDependencies = dependencies.filter(dep => !currentPermissions.includes(dep));

  return {
    isValid: missingDependencies.length === 0,
    missingDependencies,
  };
};

/**
 * Resolve dependências automaticamente
 */
export const resolvePermissionDependencies = (permissionIds = []) => {
  const resolved = new Set(permissionIds);
  let changed = true;

  while (changed) {
    changed = false;
    [...resolved].forEach(id => {
      const deps = getPermissionDependencies(id);
      deps.forEach(dep => {
        if (!resolved.has(dep)) {
          resolved.add(dep);
          changed = true;
        }
      });
    });
  }

  return Array.from(resolved).sort((a, b) => a - b);
};

/**
 * Obtém permissões que dependem de uma específica
 */
export const getPermissionDependents = (permissionId, allPermissions = []) => {
  return allPermissions.filter(id => {
    const deps = getPermissionDependencies(id);
    return deps.includes(permissionId);
  });
};

/**
 * Calcula diferenças entre duas listas de permissões
 */
export const getPermissionChanges = (original = [], modified = []) => {
  const added = modified.filter(id => !original.includes(id));
  const removed = original.filter(id => !modified.includes(id));

  return {
    added,
    removed,
    hasChanges: added.length > 0 || removed.length > 0,
    addedCount: added.length,
    removedCount: removed.length,
  };
};
