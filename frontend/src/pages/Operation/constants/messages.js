/**
 * MENSAGENS DO MÓDULO DE OPERAÇÕES
 *
 * Todas as mensagens devem estar em PORTUGUÊS DE PORTUGAL
 *
 * Organização:
 * - UI: Interface geral
 * - LOADING: Estados de carregamento
 * - ERROR: Mensagens de erro
 * - SUCCESS: Mensagens de sucesso
 * - EMPTY: Estados vazios
 * - FORMS: Formulários e validações
 * - ACTIONS: Ações do utilizador
 * - MOBILE: Específico para mobile
 */

export const MESSAGES = {
  // ============================================================
  // INTERFACE GERAL
  // ============================================================
  UI: {
    TITLE: 'Operações',
    SUBTITLE: 'Gestão de tarefas operacionais',
    SEARCH_PLACEHOLDER: 'Pesquisar...',
    FILTER: 'Filtrar',
    SORT: 'Ordenar',
    GROUP: 'Agrupar',
    REFRESH: 'Atualizar',
    EXPORT: 'Exportar',
    CLOSE: 'Fechar',
    CANCEL: 'Cancelar',
    SAVE: 'Guardar',
    EDIT: 'Editar',
    DELETE: 'Eliminar',
    CONFIRM: 'Confirmar',
    BACK: 'Voltar',
    NEXT: 'Seguinte',
    PREVIOUS: 'Anterior',
    VIEW_DETAILS: 'Ver detalhes',
    VIEW_ALL: 'Ver tudo',
  },

  // ============================================================
  // CARREGAMENTO
  // ============================================================
  LOADING: {
    DEFAULT: 'A carregar...',
    DATA: 'A carregar dados...',
    OPERATIONS: 'A carregar operações...',
    TASKS: 'A carregar tarefas...',
    METAS: 'A carregar metas...',
    ANALYTICS: 'A carregar análises...',
    UNIFIED_VIEW: 'A carregar vista unificada...',
    SAVING: 'A guardar...',
    DELETING: 'A eliminar...',
    UPDATING: 'A atualizar...',
    COMPLETING: 'A concluir tarefa...',
    EXPORTING: 'A exportar dados...',
    SYNCING: 'A sincronizar...',
  },

  // ============================================================
  // ERROS
  // ============================================================
  ERROR: {
    DEFAULT: 'Ocorreu um erro',
    GENERIC: 'Algo correu mal. Por favor, tente novamente.',
    NETWORK: 'Erro de conexão. Verifique a sua ligação à internet.',
    UNAUTHORIZED: 'Não tem permissão para aceder a este recurso.',
    NOT_FOUND: 'Recurso não encontrado.',
    TIMEOUT: 'O pedido demorou demasiado tempo. Tente novamente.',

    // Operações
    LOAD_OPERATIONS: 'Erro ao carregar operações',
    LOAD_TASKS: 'Erro ao carregar tarefas',
    LOAD_METAS: 'Erro ao carregar metas',
    LOAD_ANALYTICS: 'Erro ao carregar análises',

    // Ações
    CREATE_META: 'Erro ao criar meta',
    UPDATE_META: 'Erro ao atualizar meta',
    DELETE_META: 'Erro ao eliminar meta',
    COMPLETE_TASK: 'Erro ao concluir tarefa',
    EXPORT_DATA: 'Erro ao exportar dados',
    SYNC_DATA: 'Erro ao sincronizar dados',

    // Validações
    REQUIRED_FIELD: 'Este campo é obrigatório',
    INVALID_NUMBER: 'Por favor, insira um número válido',
    INVALID_TEXT: 'Por favor, insira um texto válido',
    INVALID_SELECTION: 'Por favor, selecione uma opção',
    TASK_VALIDATION: 'Não foi possível validar a tarefa',
  },

  // ============================================================
  // SUCESSO
  // ============================================================
  SUCCESS: {
    DEFAULT: 'Operação realizada com sucesso',
    DATA_UPDATED: 'Dados atualizados com sucesso',
    TASK_COMPLETED: 'Tarefa concluída com sucesso!',
    META_CREATED: 'Meta criada com sucesso!',
    META_UPDATED: 'Meta atualizada com sucesso!',
    META_DELETED: 'Meta eliminada com sucesso!',
    DATA_EXPORTED: 'Dados exportados com sucesso',
    DATA_SYNCED: 'Dados sincronizados com sucesso',
  },

  // ============================================================
  // ESTADOS VAZIOS
  // ============================================================
  EMPTY: {
    NO_DATA: 'Sem dados disponíveis',
    NO_RESULTS: 'Nenhum resultado encontrado',
    NO_TASKS: 'Nenhuma tarefa disponível',
    NO_TASKS_TODAY: '✅ Nenhuma tarefa pendente para hoje',
    NO_METAS: 'Nenhuma meta disponível',
    NO_OPERATIONS: 'Nenhuma operação disponível',
    NO_FILTERS: 'Selecione um associado para começar',
    NO_RECENT_ACTIVITY: 'Nenhuma atividade recente',
    CLEAR_FILTERS: 'Limpar filtros',
    SELECT_ASSOCIATE: 'Seleccione um associado',
    CHOOSE_ASSOCIATE: 'Escolha um associado para ver os dados',
  },

  // ============================================================
  // FORMULÁRIOS
  // ============================================================
  FORMS: {
    // Conclusão de tarefas
    COMPLETE_TASK: 'Concluir Tarefa',
    TASK_DETAILS: 'Detalhes da Tarefa',
    NUMERIC_VALUE: 'Valor Numérico',
    NUMERIC_PLACEHOLDER: 'Ex: 42.5',
    OBSERVATIONS: 'Observações',
    OBSERVATIONS_PLACEHOLDER: 'Insira as observações da operação...',
    SELECT_OPTION: 'Selecione uma opção',
    OPERATION_SUCCESS: 'Operação concluída com sucesso',
    SAMPLE_COLLECTION: 'Recolha realizada',

    // Análises
    ANALYSIS_PARAMETERS: 'Parâmetros de Análise',
    LOCAL_MEASUREMENT: 'Valor medido no local',
    RESULT_RECORDED: 'Resultado já registado',
    AWAITING_LAB: 'Aguarda análise laboratorial',
    NO_ANALYSIS_PARAMS: 'Não há parâmetros de análise definidos para esta operação',
    FORM: 'Forma',
    COMPLETE: 'Completo',
    SAMPLE_COLLECTION_LABEL: 'Recolha de amostra',

    // Validações
    FILL_ALL_FIELDS: 'Por favor, preencha todos os campos obrigatórios',
    FILL_ALL_ANALYSIS: 'Por favor, preencha todos os parâmetros de análise no local',
    CONFIRM_COLLECTION: 'Por favor, confirme que a recolha foi realizada',
  },

  // ============================================================
  // AÇÕES
  // ============================================================
  ACTIONS: {
    COMPLETE: 'Concluir',
    COMPLETE_TASK: 'Concluir Tarefa',
    VIEW_TASK: 'Ver Tarefa',
    EDIT_TASK: 'Editar Tarefa',
    DELETE_TASK: 'Eliminar Tarefa',
    CREATE_META: 'Criar Meta',
    EDIT_META: 'Editar Meta',
    DELETE_META: 'Eliminar Meta',
    NAVIGATE: 'Navegar',
    CALL: 'Ligar',
    EXPORT_EXCEL: 'Exportar para Excel',
    SYNC_OFFLINE: 'Sincronizar dados offline',
    RETRY: 'Tentar novamente',
  },

  // ============================================================
  // NAVEGAÇÃO E VISTAS
  // ============================================================
  VIEWS: {
    CURRENT: 'Vista Atual',
    ADAPTIVE: 'Vista Adaptativa',
    UNIFIED: 'Vista Unificada',
    MOBILE: 'Vista Mobile',
    DESKTOP: 'Vista Desktop',
    TABLET: 'Vista Tablet',
    CARDS: 'Cartões',
    LIST: 'Lista',
    TABLE: 'Tabela',
  },

  // ============================================================
  // DASHBOARD E ESTATÍSTICAS
  // ============================================================
  STATS: {
    TOTAL_OPERATIONS: 'Operações Totais',
    USER_TASKS: 'Minhas Tarefas',
    COMPLETED_TASKS: 'Tarefas Concluídas',
    PENDING_TASKS: 'Tarefas Pendentes',
    URGENT_TASKS: 'Tarefas Urgentes',
    EFFICIENCY: 'Eficiência',
    COMPLETION_RATE: 'Taxa de Conclusão',
    ACTIVE_OPERATORS: 'Operadores Ativos',
    RECENT_ACTIVITY: 'Atividade Recente',
  },

  // ============================================================
  // SECÇÕES
  // ============================================================
  SECTIONS: {
    DASHBOARD: 'Dashboard',
    MY_TASKS: 'Minhas Tarefas',
    MY_TASKS_TODAY: 'Minhas Tarefas do Dia',
    TEAM: 'Equipa',
    TEAM_MANAGEMENT: 'Gestão de Equipa',
    ANALYTICS: 'Analytics',
    ADVANCED_ANALYTICS: 'Analytics Avançados',
    GENERAL_SUMMARY: 'Resumo Geral',
    SUPERVISOR_VIEW: 'Visão Supervisor',
    PERFORMANCE: 'Performance Geral',
    TRENDS: 'Tendências',
    COMPLETED_TASKS: 'Tarefas Concluídas',
  },

  // ============================================================
  // FILTROS E ORDENAÇÃO
  // ============================================================
  FILTERS: {
    ALL: 'Todos',
    URGENT: 'Urgentes',
    TODAY: 'Hoje',
    MY_TASKS: 'Minhas Tarefas',
    COMPLETED: 'Concluídas',
    PENDING: 'Pendentes',
    ACTIVE_FILTERS: 'Filtros Ativos',
    CLEAR_ALL: 'Limpar Tudo',
    ADVANCED: 'Filtros Avançados',

    // Ordenação
    SORT_BY: 'Ordenar por',
    GROUP_BY: 'Agrupar por',
    SORT_ASC: 'Ascendente',
    SORT_DESC: 'Descendente',
  },

  // ============================================================
  // OFFLINE E SINCRONIZAÇÃO
  // ============================================================
  OFFLINE: {
    YOU_ARE_OFFLINE: 'Está offline',
    WORKING_OFFLINE: 'A trabalhar em modo offline',
    PENDING_ACTIONS: 'ação pendente | ações pendentes',
    SYNC_NOW: 'Sincronizar Agora',
    SYNCING: 'A sincronizar...',
    SYNC_SUCCESS: 'Sincronização concluída',
    SYNC_ERROR: 'Erro na sincronização',
    DATA_SAVED_LOCALLY: 'Dados guardados localmente',
  },

  // ============================================================
  // ESPECÍFICO MOBILE
  // ============================================================
  MOBILE: {
    SWIPE_TO_COMPLETE: 'Deslize para concluir',
    TAP_TO_EXPAND: 'Toque para expandir',
    PULL_TO_REFRESH: 'Puxe para atualizar',
    COMPACT_VIEW: 'Vista compacta',
    FULL_VIEW: 'Vista completa',
    TASK_CARD: 'Cartão de Tarefa',
    QUICK_ACTIONS: 'Ações Rápidas',
  },

  // ============================================================
  // CONFIRMAÇÕES E DIÁLOGOS
  // ============================================================
  DIALOGS: {
    CONFIRM_DELETE: 'Tem a certeza que deseja eliminar?',
    CONFIRM_COMPLETE: 'Tem a certeza que deseja concluir esta tarefa?',
    UNSAVED_CHANGES: 'Tem alterações não guardadas. Deseja continuar?',
    SAMPLE_IDENTIFICATION_TITLE: '⚠️ ATENÇÃO - IDENTIFICAÇÃO DE AMOSTRAS',
    SAMPLE_IDENTIFICATION_SUBTITLE: 'Esta tarefa inclui {count} amostra(s) para análise laboratorial.',
    SAMPLE_IDENTIFICATION_ACTION: 'IDENTIFIQUE AS AMOSTRAS COM OS SEGUINTES IDs:',
    SAMPLE_IDENTIFICATION_CONFIRM: 'Confirma que as amostras foram devidamente identificadas e recolhidas?',
  },

  // ============================================================
  // ACESSIBILIDADE
  // ============================================================
  ARIA: {
    CLOSE_DIALOG: 'Fechar diálogo',
    OPEN_MENU: 'Abrir menu',
    CLOSE_MENU: 'Fechar menu',
    LOADING: 'A carregar conteúdo',
    ERROR: 'Mensagem de erro',
    SUCCESS: 'Mensagem de sucesso',
    SEARCH: 'Campo de pesquisa',
    FILTER_BUTTON: 'Abrir filtros',
    REFRESH_BUTTON: 'Atualizar dados',
    EXPORT_BUTTON: 'Exportar dados',
    COMPLETE_TASK_BUTTON: 'Concluir tarefa',
    EDIT_BUTTON: 'Editar',
    DELETE_BUTTON: 'Eliminar',
    NAVIGATION_MENU: 'Menu de navegação',
  },

  // ============================================================
  // TIPOS DE OPERAÇÃO
  // ============================================================
  OPERATION_TYPES: {
    NUMERIC: 'Valor Numérico',
    TEXT: 'Texto/Observações',
    REFERENCE: 'Seleção',
    BOOLEAN: 'Confirmação',
    ANALYSIS: 'Análise',
    UNKNOWN: 'Tipo de ação não reconhecido',
  },

  // ============================================================
  // METADADOS
  // ============================================================
  META: {
    LOCATION: 'Localização',
    INSTALLATION_TYPE: 'Tipo de Instalação',
    OPERATION_MODE: 'Modo de Operação',
    ACTION: 'Ação',
    STATUS: 'Estado',
    ASSIGNED_TO: 'Atribuído a',
    CREATED_BY: 'Criado por',
    CREATED_AT: 'Criado em',
    UPDATED_AT: 'Atualizado em',
    COMPLETED_AT: 'Concluído em',
  },

  // ============================================================
  // NOTIFICAÇÕES
  // ============================================================
  NOTIFICATIONS: {
    NEW_TASK: 'Nova tarefa atribuída',
    TASK_UPDATED: 'Tarefa atualizada',
    TASK_COMPLETED: 'Tarefa concluída',
    TASK_OVERDUE: 'Tarefa atrasada',
    SYNC_REQUIRED: 'Sincronização necessária',
  },

  // ============================================================
  // AJUDA E INFORMAÇÃO
  // ============================================================
  INFO: {
    NO_TEAM_DATA: 'Nenhum dado de equipa disponível',
    NO_ANALYTICS_DATA: 'Dados de analytics não disponíveis',
    TRENDS_FUTURE: 'Métricas de tendência serão implementadas com mais dados históricos.',
    TEAM_STATS: 'Estatísticas da equipa e métricas de performance.',
  },
};

/**
 * Helper para interpolação de variáveis
 * Uso: interpolate(MESSAGES.DIALOGS.SAMPLE_IDENTIFICATION_SUBTITLE, { count: 3 })
 */
export const interpolate = (message, variables = {}) => {
  return message.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match);
};

/**
 * Helper para plurais
 * Uso: plural(count, MESSAGES.OFFLINE.PENDING_ACTIONS)
 */
export const plural = (count, message) => {
  const [singular, plural] = message.split(' | ');
  return count === 1 ? singular : plural;
};

export default MESSAGES;
