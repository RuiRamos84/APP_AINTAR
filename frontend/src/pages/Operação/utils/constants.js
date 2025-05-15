// Constantes de configuração
export const CONFIG = {
    API_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    CACHE_DURATION: 3600000, // 1 hora
    PAGE_SIZE: 50,
    TOUCH_TARGET_SIZE: 48,
    SWIPE_THRESHOLD: 50,
    LONG_PRESS_DURATION: 500
};

// Estados de operações
export const OPERATION_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

// Tipos de vistas
export const VIEW_TYPES = {
    FOSSA: 'vbr_document_fossa',
    RAMAIS: 'vbr_document_ramais',
    CAIXAS: 'vbr_document_caixas',
    DESOBSTRUCAO: 'vbr_document_desobstrucao',
    PAVIMENTACAO: 'vbr_document_pavimentacao',
    REDE: 'vbr_document_rede'
};

// Permissões
export const PERMISSIONS = {
    VIEW_ALL: 'view_all',
    EDIT_OWN: 'edit_own',
    EDIT_ALL: 'edit_all',
    COMPLETE: 'complete',
    ADMIN: 'admin'
};

// Parâmetros booleanos
export const BOOLEAN_PARAMS = [
    "Gratuito",
    "Gratuita",
    "Existência de sanemanto até 20 m",
    "Existência de rede de água",
    "Urgência",
    "Existência de saneamento até 20 m"
];

// Mensagens de erro
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Erro de rede. Verifique sua conexão.',
    UNAUTHORIZED: 'Sem autorização para esta ação.',
    NOT_FOUND: 'Recurso não encontrado.',
    VALIDATION_ERROR: 'Dados inválidos.',
    GENERIC_ERROR: 'Ocorreu um erro. Tente novamente.'
};