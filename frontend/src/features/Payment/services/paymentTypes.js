/**
 * Métodos de pagamento
 */
export const PAYMENT_METHODS = {
    MBWAY: 'MBWAY',
    MULTIBANCO: 'MULTIBANCO',
    CASH: 'CASH',
    BANK_TRANSFER: 'BANK_TRANSFER',
    MUNICIPALITY: 'MUNICIPALITY'
};

/**
 * Estados de pagamento (alinhados com backend)
 */
export const PAYMENT_STATUS = {
    CREATED: 'CREATED',
    PENDING: 'PENDING',
    PENDING_VALIDATION: 'PENDING_VALIDATION',
    SUCCESS: 'SUCCESS',
    DECLINED: 'DECLINED',
    EXPIRED: 'EXPIRED',
    // Aliases para compatibilidade
    PAID: 'SUCCESS',
    FAILED: 'DECLINED',
    UNKNOWN: 'PENDING'
};

/**
 * ===== GESTÃO CENTRALIZADA DE PERMISSÕES =====
 */

/**
 * Perfis especiais com acesso total
 */
const ADMIN_PROFILES = ['0']; // Super admin

/**
 * Regras de permissão por método
 */
const PERMISSION_RULES = {
    [PAYMENT_METHODS.MBWAY]: {
        profiles: ['0', '1', '2', '3'],
        description: 'Disponível para todos os perfis'
    },
    [PAYMENT_METHODS.MULTIBANCO]: {
        profiles: ['0', '1', '2', '3'],
        description: 'Disponível para todos os perfis'
    },
    [PAYMENT_METHODS.BANK_TRANSFER]: {
        profiles: ['0', '1', '2', '3'],
        description: 'Disponível para todos os perfis'
    },
    [PAYMENT_METHODS.CASH]: {
        profiles: ['0', '1'], // Apenas admin e perfil 1
        description: 'Restrito a administração e tesouraria',
        restrictedUsers: [12, 15] // User ID específico permitido
    },
    [PAYMENT_METHODS.MUNICIPALITY]: {
        profiles: ['0', '2'],
        description: 'Restrito a admin e municípios'
    }
};

/**
 * ===== FUNÇÕES DE VERIFICAÇÃO =====
 */

/**
 * Verifica se utilizador pode usar método específico
 */
export const canUsePaymentMethod = (userProfile, paymentMethod, userId = null) => {
    if (!userProfile || !paymentMethod) return false;

    const rule = PERMISSION_RULES[paymentMethod];
    if (!rule) return false;

    // Admin sempre pode (excepto se tiver restrictedUsers definidos)
    if (ADMIN_PROFILES.includes(String(userProfile)) && !rule.restrictedUsers) {
        return true;
    }

    // Se tem restrictedUsers, só esses podem
    if (rule.restrictedUsers) {
        return rule.restrictedUsers.includes(Number(userId));
    }

    // Senão, verificar perfil normal
    return rule.profiles.includes(String(userProfile));
};

/**
 * Métodos disponíveis para perfil/utilizador
 */
export const getAvailableMethodsForUser = (userProfile, userId = null) => {
    if (!userProfile) return [];

    return Object.keys(PAYMENT_METHODS).filter(method => 
        canUsePaymentMethod(userProfile, method, userId)
    );
};

/**
 * Verifica se utilizador tem permissões de administração de pagamentos
 */
/**
 * Gestão de pagamentos (ver/aprovar todos)
 */
export const canManagePayments = (userId) => {
    const PAYMENT_ADMIN_IDS = [12];
    return PAYMENT_ADMIN_IDS.includes(Number(userId));
};

/**
 * Processar pagamentos CASH específicos
 */
export const canProcessCashPayments = (userId) => {
    const CASH_PROCESSOR_IDS = [12, 15];
    return CASH_PROCESSOR_IDS.includes(Number(userId));
};


/**
 * ===== METADATA DOS MÉTODOS =====
 */

/**
 * Labels em português
 */
export const PAYMENT_METHOD_LABELS = {
    [PAYMENT_METHODS.MBWAY]: 'MB WAY',
    [PAYMENT_METHODS.MULTIBANCO]: 'Multibanco',
    [PAYMENT_METHODS.CASH]: 'Numerário',
    [PAYMENT_METHODS.BANK_TRANSFER]: 'Transferência',
    [PAYMENT_METHODS.MUNICIPALITY]: 'Municípios'
};

export const PAYMENT_STATUS_LABELS = {
    [PAYMENT_STATUS.CREATED]: 'Iniciado',
    [PAYMENT_STATUS.PENDING]: 'Pendente',
    [PAYMENT_STATUS.PENDING_VALIDATION]: 'Aguarda validação',
    [PAYMENT_STATUS.SUCCESS]: 'Pago',
    [PAYMENT_STATUS.DECLINED]: 'Rejeitado',
    [PAYMENT_STATUS.EXPIRED]: 'Expirado'
};

/**
 * Cores por estado
 */
export const PAYMENT_STATUS_COLORS = {
    [PAYMENT_STATUS.CREATED]: 'info.main',
    [PAYMENT_STATUS.PENDING]: 'warning.main',
    [PAYMENT_STATUS.PENDING_VALIDATION]: 'info.light',
    [PAYMENT_STATUS.SUCCESS]: 'success.main',
    [PAYMENT_STATUS.DECLINED]: 'error.main',
    [PAYMENT_STATUS.EXPIRED]: 'error.light'
};

/**
 * ===== FUNÇÕES DE COMPATIBILIDADE =====
 */

/**
 * @deprecated Use getAvailableMethodsForUser
 */
export const getAvailableMethodsForProfile = (userProfile) => {
    console.warn('getAvailableMethodsForProfile deprecated. Use getAvailableMethodsForUser');
    return getAvailableMethodsForUser(userProfile);
};

/**
 * Mapear estado backend → frontend
 */
export const mapBackendStatus = (backendStatus) => {
    const mapping = {
        'CREATED': PAYMENT_STATUS.CREATED,
        'PENDING': PAYMENT_STATUS.PENDING,
        'PENDING_VALIDATION': PAYMENT_STATUS.PENDING_VALIDATION,
        'SUCCESS': PAYMENT_STATUS.SUCCESS,
        'DECLINED': PAYMENT_STATUS.DECLINED,
        'EXPIRED': PAYMENT_STATUS.EXPIRED,
        // Compatibilidade
        'PAID': PAYMENT_STATUS.SUCCESS,
        'FAILED': PAYMENT_STATUS.DECLINED
    };
    return mapping[backendStatus] || PAYMENT_STATUS.PENDING;
};

/**
 * ===== UTILITÁRIOS DE DEBUG =====
 */

/**
 * Debug: listar permissões do utilizador
 */
export const debugUserPermissions = (userProfile, userId = null) => {
    console.group(`Permissões Pagamento - Perfil: ${userProfile}, User ID: ${userId}`);
    
    Object.entries(PAYMENT_METHODS).forEach(([key, method]) => {
        const canUse = canUsePaymentMethod(userProfile, method, userId);
        const rule = PERMISSION_RULES[method];
        
        console.log(`${PAYMENT_METHOD_LABELS[method]}: ${canUse ? '✅' : '❌'}`, {
            profiles: rule.profiles,
            description: rule.description
        });
    });
    
    console.log(`Gestão pagamentos: ${canManagePayments(userId) ? '✅' : '❌'}`);
    console.groupEnd();
};