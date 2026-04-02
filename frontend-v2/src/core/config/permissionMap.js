/**
 * Permission Map
 * Mapeia nomes de permissões para IDs do ts_interface
 *
 * IMPORTANTE: Estes IDs correspondem aos pk REAIS da tabela ts_interface na BD.
 * Sincronizado com os dados actuais da ts_interface.
 */

/**
 * IDs de Permissões (ts_interface.pk)
 * Sincronizado com a estrutura real da BD (ts_interface)
 */
export const PERMISSIONS = {
  // ==================== ADMIN (10-110) ====================
  ADMIN_DASHBOARD: 10,         // admin.dashboard
  ADMIN_USERS: 20,             // admin.users (criar, editar, remover utilizadores)
  ADMIN_PAYMENTS: 30,          // admin.payments (aprovar pagamentos admin)
  ADMIN_CASH: 40,              // admin.cash (gerir caixa)
  ADMIN_DOCS_MANAGE: 50,       // admin.docs.manage (gerir todos os documentos)
  ADMIN_DOCS_REOPEN: 60,       // admin.docs.reopen (reabrir documentos)
  ADMIN_DB_MANAGE: 70,         // admin.db.manage (BD e backups)
  ADMIN_LOGS_VIEW: 80,         // admin.logs.view (logs de auditoria)
  ADMIN_REPORTS_VIEW: 90,      // admin.reports.view (relatórios avançados)
  ADMIN_SYSTEM_SETTINGS: 100,  // admin.system.settings (configurações críticas)
  ADMIN_CACHE_MANAGE: 110,     // admin.cache.manage (gerir cache)

  // ==================== TAREFAS (200-760) ====================
  TASKS_ALL: 200,              // tasks.all (gerir TODAS as tarefas do sistema)
  TASKS_VIEW: 201,             // tasks.view (visualizar sem gerir) [NOVO - a inserir na BD]
  TASKS_MANAGE: 750,           // tasks.manage (gerir tarefas atribuídas a si)
  TASKS_EDIT: 760,             // tasks.edit (editar tarefas) [NOVO - a inserir na BD]

  // ==================== EPI / EQUIPAMENTOS PROTECÇÃO (210-211) ====================
  EPI_MANAGE: 210,             // epi.manage (gerir EPIs - tudo-em-um)
  EPI_VIEW: 211,               // epi.view (visualizar EPIs) [NOVO - a inserir na BD]

  // ==================== CORRESPONDÊNCIA (220) ====================
  LETTERS_MANAGE: 220,         // letters.manage (gerir correspondência)

  // ==================== ACESSOS GERAIS (300-320) ====================
  INTERNAL_ACCESS: 300,        // internal.access (acesso à área interna)
  GLOBAL_ACCESS: 320,          // global.access (acesso global exceto admin)

  // ==================== OPERAÇÕES (310-314) ====================
  OPERATION_ACCESS: 310,       // operation.access (aceder ao módulo)
  OPERATION_EXECUTE: 311,      // operation.execute (executar - operador de campo)
  OPERATION_SUPERVISE: 312,    // operation.supervise (supervisionar)
  OPERATION_MANAGE: 313,       // operation.manage (configurar e gerir)
  OPERATION_ANALYTICS: 314,    // operation.analytics

  // ==================== DASHBOARD (400) ====================
  DASHBOARD_VIEW: 400,         // dashboard.view

  // ==================== DOCUMENTOS (500-562) ====================
  DOCS_VIEW_ALL: 500,          // docs.view.all (todos os documentos)
  DOCS_VIEW_OWNER: 510,        // docs.view.owner (apenas próprios)
  DOCS_VIEW_ASSIGNED: 520,     // docs.view.assigned (apenas atribuídos)
  DOCS_VIEW: 530,              // docs.view (visualização básica)
  DOCS_MODERN: 540,            // docs.modern (gestor moderno frontend-v2)
  DOCS_CREATE: 560,            // docs.create
  DOCS_EDIT: 561,              // docs.edit [NOVO - a inserir na BD]
  DOCS_DELETE: 562,            // docs.delete [NOVO - a inserir na BD]

  // ==================== PAV / PAVIMENTAÇÕES (600-601) ====================
  PAV_VIEW: 600,               // pav.view
  PAV_EDIT: 601,               // pav.edit (editar pavimentações) [NOVO - a inserir na BD]

  // ==================== PAGAMENTOS (700-880) ====================
  // Granularidade por método — cada um é uma permissão independente
  PAYMENTS_MBWAY: 700,         // payments.mbway (processar MB WAY)
  PAYMENTS_MULTIBANCO: 710,    // payments.multibanco (processar multibanco)
  PAYMENTS_BANK_TRANSFER: 720, // payments.bank_transfer (transferências bancárias)
  PAYMENTS_CASH: 730,          // payments.cash.action (numerário — sensível)
  PAYMENTS_MUNICIPALITY: 740,  // payments.municipality (pagamentos municípios)
  PAYMENTS_VIEW: 880,          // payments.view (ver sem processar) [NOVO - a inserir na BD]
  PAYMENTS_MANAGE: 890,        // payments.manage (gerir e processar pagamentos) [NOVO - a inserir na BD]

  // ==================== ENTIDADES (800-820) ====================
  ENTITIES_VIEW: 800,          // entities.view
  ENTITIES_CREATE: 810,        // entities.create
  ENTITIES_MANAGE: 820,        // entities.manage (editar e gerir)

  // ==================== FROTA / VEÍCULOS (830-831) ====================
  FLEET_VIEW: 830,             // fleet.view [NOVO - a inserir na BD]
  FLEET_EDIT: 831,             // fleet.edit [NOVO - a inserir na BD]

  // ==================== OBRAS (840-841) ====================
  OBRAS_VIEW: 840,             // obras.view [NOVO - a inserir na BD]
  OBRAS_EDIT: 841,             // obras.edit [NOVO - a inserir na BD]

  // ==================== TELEMETRIA (850-851) ====================
  TELEMETRY_VIEW: 850,         // telemetry.view [NOVO - a inserir na BD]
  TELEMETRY_EDIT: 851,         // telemetry.edit [NOVO - a inserir na BD]

  // ==================== EQUIPAMENTOS (860-861) ====================
  EQUIPAMENTOS_VIEW: 860,      // equipamentos.view [NOVO - a inserir na BD]
  EQUIPAMENTOS_EDIT: 861,      // equipamentos.edit [NOVO - a inserir na BD]

  // ==================== RECURSOS HUMANOS (900-902) ====================
  RH_VIEW: 900,               // rh.view (visualizar módulo RH)
  RH_PESSOAL_VIEW: 901,       // rh.pessoal.view (férias, faltas, horários, piquete)
  RH_PESSOAL_EDIT: 902,       // rh.pessoal.edit (gerir gestão pessoal)

  // ==================== AVALIAÇÕES (870-871) ====================
  AVAL_VIEW: 870,              // aval.view
  AVAL_EDIT: 871,              // aval.edit

  // ==================== DESPESAS OPERACIONAIS (910-911) ====================
  EXPENSES_VIEW: 910,          // expenses.view (ver despesas operacionais)
  EXPENSES_EDIT: 911,          // expenses.edit (gerir despesas)

  // ==================== ANÁLISES LABORATORIAIS (920-921) ====================
  ANALYSES_VIEW: 920,          // analyses.view (ver análises)
  ANALYSES_EDIT: 921,          // analyses.edit (gerir análises)

  // ==================== OFÍCIOS / CORRESPONDÊNCIA (1300-1340) ====================
  OFFICES_VIEW: 1300,          // offices.view (ver ofícios)
  OFFICES_CREATE: 1310,        // offices.create (criar ofícios)
  OFFICES_CLOSE: 1330,         // offices.close (fechar/assinar)
  OFFICES_REPLICATE: 1340,     // offices.replicate (replicar)
};

/**
 * Obter nome da permissão pelo ID
 * @param {number} permissionId
 * @returns {string|null}
 */
export const getPermissionName = (permissionId) => {
  const entry = Object.entries(PERMISSIONS).find(([_, id]) => id === permissionId);
  return entry ? entry[0] : null;
};

/**
 * Obter ID da permissão pelo nome
 * @param {string} permissionName
 * @returns {number|null}
 */
export const getPermissionId = (permissionName) => {
  return PERMISSIONS[permissionName] || null;
};

/**
 * Perfis de utilizador pré-configurados
 */
export const USER_PROFILES = {
  SUPER_ADMIN: '0',
  OPERADOR: '1',
  TECNICO: '2',
  FINANCEIRO: '3',
  GESTOR: '4',
  ADMIN: '5',
};

/**
 * Grupos de Permissões — conjuntos comuns por perfil
 * Referência apenas. As permissões reais são controladas na BD (ts_interface + ts_client_interface).
 */
export const PERMISSION_GROUPS = {
  // Operador — executa tarefas de campo
  OPERADOR: [
    PERMISSIONS.INTERNAL_ACCESS,
    PERMISSIONS.OPERATION_ACCESS,
    PERMISSIONS.OPERATION_EXECUTE,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.DOCS_VIEW_ASSIGNED,
    PERMISSIONS.DASHBOARD_VIEW,
  ],

  // Técnico — operações + gestão técnica
  TECNICO: [
    PERMISSIONS.INTERNAL_ACCESS,
    PERMISSIONS.OPERATION_ACCESS,
    PERMISSIONS.OPERATION_EXECUTE,
    PERMISSIONS.OPERATION_SUPERVISE,
    PERMISSIONS.TASKS_ALL,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.TASKS_EDIT,
    PERMISSIONS.DOCS_VIEW,
    PERMISSIONS.DOCS_CREATE,
    PERMISSIONS.ENTITIES_VIEW,
    PERMISSIONS.TELEMETRY_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],

  // Financeiro — pagamentos (granular por método)
  FINANCEIRO: [
    PERMISSIONS.INTERNAL_ACCESS,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_MBWAY,
    PERMISSIONS.PAYMENTS_MULTIBANCO,
    PERMISSIONS.DOCS_VIEW,
    PERMISSIONS.ENTITIES_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ADMIN_REPORTS_VIEW,
  ],

  // Gestor — acesso amplo exceto administração
  GESTOR: [
    PERMISSIONS.INTERNAL_ACCESS,
    PERMISSIONS.GLOBAL_ACCESS,
    PERMISSIONS.OPERATION_ACCESS,
    PERMISSIONS.OPERATION_SUPERVISE,
    PERMISSIONS.OPERATION_MANAGE,
    PERMISSIONS.TASKS_ALL,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.TASKS_EDIT,
    PERMISSIONS.DOCS_VIEW_ALL,
    PERMISSIONS.DOCS_CREATE,
    PERMISSIONS.DOCS_EDIT,
    PERMISSIONS.ENTITIES_VIEW,
    PERMISSIONS.ENTITIES_CREATE,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_MANAGE,
    PERMISSIONS.FLEET_VIEW,
    PERMISSIONS.OBRAS_VIEW,
    PERMISSIONS.TELEMETRY_VIEW,
    PERMISSIONS.EQUIPAMENTOS_VIEW,
    PERMISSIONS.AVAL_VIEW,
    PERMISSIONS.RH_VIEW,
    PERMISSIONS.PAV_EDIT,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ADMIN_REPORTS_VIEW,
    PERMISSIONS.EPI_VIEW,
  ],

  // Admin — acesso completo
  ADMIN: Object.values(PERMISSIONS),
};

export default PERMISSIONS;
