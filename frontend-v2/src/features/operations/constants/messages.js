/**
 * MENSAGENS DO MÓDULO DE OPERAÇÕES
 * Todas em Português de Portugal (pt-PT)
 */

export const MESSAGES = {
  UI: {
    TITLE: 'Operações',
    SUBTITLE: 'Gestão de tarefas operacionais',
    SEARCH_PLACEHOLDER: 'Pesquisar...',
    FILTER: 'Filtrar',
    SORT: 'Ordenar',
    REFRESH: 'Atualizar',
    EXPORT: 'Exportar',
    CLOSE: 'Fechar',
    CANCEL: 'Cancelar',
    SAVE: 'Guardar',
    EDIT: 'Editar',
    DELETE: 'Eliminar',
    CONFIRM: 'Confirmar',
    BACK: 'Voltar',
    VIEW_DETAILS: 'Ver detalhes',
  },

  LOADING: {
    DEFAULT: 'A carregar...',
    DATA: 'A carregar dados...',
    OPERATIONS: 'A carregar operações...',
    TASKS: 'A carregar tarefas...',
    METAS: 'A carregar metas...',
    ANALYTICS: 'A carregar análises...',
    UNIFIED_VIEW: 'A carregar vista unificada...',
    SAVING: 'A guardar...',
    COMPLETING: 'A concluir tarefa...',
    SYNCING: 'A sincronizar...',
  },

  ERROR: {
    DEFAULT: 'Ocorreu um erro',
    GENERIC: 'Algo correu mal. Por favor, tente novamente.',
    NETWORK: 'Erro de conexão. Verifique a sua ligação à internet.',
    UNAUTHORIZED: 'Não tem permissão para aceder a este recurso.',
    LOAD_OPERATIONS: 'Erro ao carregar operações',
    LOAD_TASKS: 'Erro ao carregar tarefas',
    LOAD_METAS: 'Erro ao carregar metas',
    LOAD_ANALYTICS: 'Erro ao carregar análises',
    COMPLETE_TASK: 'Erro ao concluir tarefa',
    REQUIRED_FIELD: 'Este campo é obrigatório',
    INVALID_NUMBER: 'Por favor, insira um número válido',
    INVALID_TEXT: 'Por favor, insira um texto válido',
    INVALID_SELECTION: 'Por favor, selecione uma opção',
  },

  SUCCESS: {
    DEFAULT: 'Operação realizada com sucesso',
    TASK_COMPLETED: 'Tarefa concluída com sucesso!',
    META_CREATED: 'Meta criada com sucesso!',
    META_UPDATED: 'Meta atualizada com sucesso!',
    DATA_SYNCED: 'Dados sincronizados com sucesso',
  },

  EMPTY: {
    NO_DATA: 'Sem dados disponíveis',
    NO_RESULTS: 'Nenhum resultado encontrado',
    NO_TASKS: 'Nenhuma tarefa disponível',
    NO_TASKS_TODAY: 'Nenhuma tarefa pendente para hoje',
    NO_METAS: 'Nenhuma meta disponível',
  },

  FORMS: {
    COMPLETE_TASK: 'Concluir Tarefa',
    TASK_DETAILS: 'Detalhes da Tarefa',
    NUMERIC_VALUE: 'Valor Numérico',
    NUMERIC_PLACEHOLDER: 'Ex: 42.5',
    OBSERVATIONS: 'Observações',
    OBSERVATIONS_PLACEHOLDER: 'Insira as observações da operação...',
    SELECT_OPTION: 'Selecione uma opção',
    OPERATION_SUCCESS: 'Operação concluída com sucesso',
    SAMPLE_COLLECTION: 'Recolha realizada',
    ANALYSIS_PARAMETERS: 'Parâmetros de Análise',
    LOCAL_MEASUREMENT: 'Valor medido no local',
    RESULT_RECORDED: 'Resultado já registado',
    AWAITING_LAB: 'Aguarda análise laboratorial',
    NO_ANALYSIS_PARAMS: 'Não há parâmetros de análise definidos para esta operação',
    FILL_ALL_ANALYSIS: 'Por favor, preencha todos os parâmetros de análise no local',
    CONFIRM_COLLECTION: 'Por favor, confirme que a recolha foi realizada',
  },

  ACTIONS: {
    COMPLETE: 'Concluir',
    COMPLETE_TASK: 'Concluir Tarefa',
    VIEW_TASK: 'Ver Tarefa',
    NAVIGATE: 'Navegar',
    CALL: 'Ligar',
    RETRY: 'Tentar novamente',
  },

  STATS: {
    TOTAL_OPERATIONS: 'Operações Totais',
    USER_TASKS: 'Minhas Tarefas',
    COMPLETED_TASKS: 'Tarefas Concluídas',
    PENDING_TASKS: 'Tarefas Pendentes',
    COMPLETION_RATE: 'Taxa de Conclusão',
  },

  SECTIONS: {
    DASHBOARD: 'Dashboard',
    MY_TASKS: 'Minhas Tarefas',
    MY_TASKS_TODAY: 'Minhas Tarefas do Dia',
    TEAM: 'Equipa',
    ANALYTICS: 'Analytics',
    COMPLETED_TASKS: 'Tarefas Concluídas',
  },

  OFFLINE: {
    YOU_ARE_OFFLINE: 'Está offline',
    WORKING_OFFLINE: 'A trabalhar em modo offline',
    PENDING_ACTIONS: 'ação pendente | ações pendentes',
    SYNC_NOW: 'Sincronizar Agora',
    SYNCING: 'A sincronizar...',
    SYNC_SUCCESS: 'Sincronização concluída',
    SYNC_ERROR: 'Erro na sincronização',
  },

  MOBILE: {
    PULL_TO_REFRESH: 'Puxe para atualizar',
    TASK_CARD: 'Cartão de Tarefa',
  },

  DIALOGS: {
    CONFIRM_COMPLETE: 'Tem a certeza que deseja concluir esta tarefa?',
    SAMPLE_IDENTIFICATION_TITLE: 'ATENÇÃO - IDENTIFICAÇÃO DE AMOSTRAS',
    SAMPLE_IDENTIFICATION_CONFIRM: 'Confirma que as amostras foram devidamente identificadas e recolhidas?',
  },
};

export const interpolate = (message, variables = {}) => {
  return message.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match);
};

export const plural = (count, message) => {
  const [singular, pluralForm] = message.split(' | ');
  return count === 1 ? singular : pluralForm;
};

export default MESSAGES;
