/**
 * Permission Configuration
 * Numeric permission IDs used throughout the application
 * These IDs must match the backend permission system
 */

export const PERMISSION_IDS = {
  // Administration (10-110)
  ADMIN_DASHBOARD: 10,
  ADMIN_USERS: 20,
  ADMIN_PAYMENTS: 30,
  ADMIN_REPORTS: 40,
  ADMIN_SYSTEM: 50,

  // Tasks & Operations (200-320)
  TASKS_VIEW: 200,
  TASKS_CREATE: 210,
  TASKS_EDIT: 220,
  TASKS_DELETE: 230,
  OPERATION_ACCESS: 310,
  OPERATION_EXECUTE: 311,
  OPERATION_SUPERVISE: 312,

  // Documents (500-560)
  DOCS_VIEW_ALL: 500,
  DOCS_VIEW_OWNER: 510,
  DOCS_VIEW_ASSIGNED: 520,
  DOCS_MODERN: 540,
  DOCS_CREATE: 560,

  // Entities (800-820)
  ENTITIES_VIEW: 800,
  ENTITIES_CREATE: 810,
  ENTITIES_MANAGE: 820,
};

/**
 * Permission metadata (for display purposes)
 */
export const PERMISSION_METADATA = {
  [PERMISSION_IDS.ADMIN_DASHBOARD]: {
    name: 'Admin Dashboard',
    description: 'Access to administration dashboard',
    category: 'Administration',
  },
  [PERMISSION_IDS.ADMIN_USERS]: {
    name: 'User Management',
    description: 'Manage users and permissions',
    category: 'Administration',
  },
  [PERMISSION_IDS.TASKS_VIEW]: {
    name: 'View Tasks',
    description: 'View all tasks',
    category: 'Tasks',
  },
  [PERMISSION_IDS.TASKS_CREATE]: {
    name: 'Create Tasks',
    description: 'Create new tasks',
    category: 'Tasks',
  },
  [PERMISSION_IDS.DOCS_VIEW_ALL]: {
    name: 'View All Documents',
    description: 'View all documents in the system',
    category: 'Documents',
  },
  [PERMISSION_IDS.DOCS_CREATE]: {
    name: 'Create Documents',
    description: 'Create new documents',
    category: 'Documents',
  },
  [PERMISSION_IDS.ENTITIES_VIEW]: {
    name: 'View Entities',
    description: 'View entities',
    category: 'Entities',
  },
  [PERMISSION_IDS.ENTITIES_CREATE]: {
    name: 'Create Entities',
    description: 'Create new entities',
    category: 'Entities',
  },
};

/**
 * Get permission name by ID
 * @param {number} permissionId
 * @returns {string}
 */
export const getPermissionName = (permissionId) => {
  return PERMISSION_METADATA[permissionId]?.name || `Permission ${permissionId}`;
};

/**
 * Get permission description by ID
 * @param {number} permissionId
 * @returns {string}
 */
export const getPermissionDescription = (permissionId) => {
  return PERMISSION_METADATA[permissionId]?.description || '';
};

export default PERMISSION_IDS;
