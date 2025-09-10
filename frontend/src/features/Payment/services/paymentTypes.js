/**
 * ===== SISTEMA DE PAGAMENTOS - GESTÃO CENTRALIZADA DE PERMISSÕES =====
 * 
 * Este arquivo centraliza TODAS as regras de permissão do sistema de pagamentos,
 * garantindo consistência entre componentes e facilitando manutenção.
 * 
 * ESTRUTURA:
 * 1. Definições de tipos e estados
 * 2. Regras de permissão centralizadas
 * 3. Funções de verificação
 * 4. Metadados dos métodos
 * 5. Funções utilitárias
 * 
 * USAGE:
 * import { canUsePaymentMethod, getAvailableMethodsForUser } from './paymentTypes';
 */

/**
 * Métodos de pagamento disponíveis
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
 * 
 * TODAS as regras de permissão são definidas aqui.
 * Mudanças aqui afetam todo o sistema automaticamente.
 */

/**
 * Perfis com acesso administrativo total
 */
const ADMIN_PROFILES = ['0']; // Super admin

/**
 * Regras de permissão por método de pagamento
 * 
 * Para cada método:
 * - profiles: perfis que podem usar o método
 * - restrictedUsers: se definido, APENAS estes user IDs podem usar (sobrepõe profiles)
 * - description: descrição da regra para debug
 */
const PERMISSION_RULES = {
    [PAYMENT_METHODS.MBWAY]: {
        profiles: ['0', '1', '2', '3'], // Todos exceto perfil 4
        description: 'Disponível para administração, técnicos e municípios'
    },

    [PAYMENT_METHODS.MULTIBANCO]: {
        profiles: ['0', '1', '2', '3'], // Todos exceto perfil 4
        description: 'Disponível para administração, técnicos e municípios'
    },

    [PAYMENT_METHODS.BANK_TRANSFER]: {
        profiles: ['0', '1', '2', '3'], // Todos exceto perfil 4
        description: 'Disponível para administração, técnicos e municípios'
    },

    [PAYMENT_METHODS.CASH]: {
        profiles: ['0', '1'], // Apenas admin e perfil 1
        description: 'Restrito a administração e tesouraria',
        restrictedUsers: [12, 15] // User IDs específicos permitidos
    },

    [PAYMENT_METHODS.MUNICIPALITY]: {
        profiles: ['0', '2'], // Admin e municípios
        description: 'Restrito a administração e municípios'
    }
};

/**
 * Regras específicas para gestão de pagamentos
 */
const ADMIN_PERMISSIONS = {
    /**
     * Gestão completa de pagamentos (ver/aprovar todos)
     */
    MANAGE_PAYMENTS: {
        userIds: [12], // Apenas utilizador específico
        description: 'Gestão completa de todos os pagamentos'
    },

    /**
     * Processar pagamentos CASH específicos
     */
    PROCESS_CASH: {
        userIds: [12, 15], // Utilizadores específicos
        description: 'Autorização para processar pagamentos em numerário'
    }
};

/**
 * ===== FUNÇÕES DE VERIFICAÇÃO DE PERMISSÕES =====
 */

/**
 * Verifica se utilizador pode usar método específico
 * 
 * @param {string} userProfile - Perfil do utilizador ('0', '1', '2', '3', '4')
 * @param {string} paymentMethod - Método de pagamento (PAYMENT_METHODS)
 * @param {number} userId - ID do utilizador (opcional, necessário para algumas regras)
 * @returns {boolean} Se pode usar o método
 */
export const canUsePaymentMethod = (userProfile, paymentMethod, userId = null) => {
    if (!userProfile || !paymentMethod) return false;

    const rule = PERMISSION_RULES[paymentMethod];
    if (!rule) return false;

    // Se tem restrictedUsers, só esses podem (ignora profiles)
    if (rule.restrictedUsers) {
        return rule.restrictedUsers.includes(Number(userId));
    }

    // Admin sempre pode (se não tiver restrictedUsers)
    if (ADMIN_PROFILES.includes(String(userProfile))) {
        return true;
    }

    // Verificar perfil normal
    return rule.profiles.includes(String(userProfile));
};

/**
 * Obter métodos disponíveis para utilizador
 * 
 * @param {string} userProfile - Perfil do utilizador
 * @param {number} userId - ID do utilizador
 * @returns {Array<string>} Lista de métodos disponíveis
 */
export const getAvailableMethodsForUser = (userProfile, userId = null) => {
    if (!userProfile) return [];

    return Object.keys(PAYMENT_METHODS).filter(method =>
        canUsePaymentMethod(userProfile, method, userId)
    );
};

/**
 * Verifica se utilizador pode gerir pagamentos (ver/aprovar todos)
 * 
 * @param {number} userId - ID do utilizador
 * @returns {boolean} Se pode gerir pagamentos
 */
export const canManagePayments = (userId) => {
    return ADMIN_PERMISSIONS.MANAGE_PAYMENTS.userIds.includes(Number(userId));
};

/**
 * Verifica se utilizador pode processar pagamentos CASH
 * 
 * @param {number} userId - ID do utilizador
 * @returns {boolean} Se pode processar CASH
 */
export const canProcessCashPayments = (userId) => {
    return ADMIN_PERMISSIONS.PROCESS_CASH.userIds.includes(Number(userId));
};

/**
 * ===== METADATA DOS MÉTODOS DE PAGAMENTO =====
 */

/**
 * Labels em português para exibição
 */
export const PAYMENT_METHOD_LABELS = {
    [PAYMENT_METHODS.MBWAY]: 'MB WAY',
    [PAYMENT_METHODS.MULTIBANCO]: 'Multibanco',
    [PAYMENT_METHODS.CASH]: 'Numerário',
    [PAYMENT_METHODS.BANK_TRANSFER]: 'Transferência',
    [PAYMENT_METHODS.MUNICIPALITY]: 'Municípios'
};

/**
 * Labels de estados de pagamento
 */
export const PAYMENT_STATUS_LABELS = {
    [PAYMENT_STATUS.CREATED]: 'Iniciado',
    [PAYMENT_STATUS.PENDING]: 'Pendente',
    [PAYMENT_STATUS.PENDING_VALIDATION]: 'Aguarda validação',
    [PAYMENT_STATUS.SUCCESS]: 'Pago',
    [PAYMENT_STATUS.DECLINED]: 'Rejeitado',
    [PAYMENT_STATUS.EXPIRED]: 'Expirado'
};

/**
 * Cores por estado para UI
 */
export const PAYMENT_STATUS_COLORS = {
    [PAYMENT_STATUS.CREATED]: 'info.main',
    [PAYMENT_STATUS.PENDING]: 'warning.main',
    [PAYMENT_STATUS.PENDING_VALIDATION]: 'info.light',
    [PAYMENT_STATUS.SUCCESS]: 'success.main',
    [PAYMENT_STATUS.DECLINED]: 'error.main',
    [PAYMENT_STATUS.EXPIRED]: 'error.light',
    // Cores para métodos
    'MBWAY': '#667eea',
    'MULTIBANCO': '#f093fb',
    'CASH': '#43e97b',
    'BANK_TRANSFER': '#4facfe',
    'MUNICIPALITY': '#fa709a'
};

/**
 * ===== FUNÇÕES UTILITÁRIAS =====
 */

/**
 * Mapear estado backend → frontend
 * 
 * @param {string} backendStatus - Estado vindo do backend
 * @returns {string} Estado normalizado
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
 * Obter informações completas de um método
 * 
 * @param {string} paymentMethod - Método de pagamento
 * @returns {Object} Informações do método
 */
export const getMethodInfo = (paymentMethod) => {
    const rule = PERMISSION_RULES[paymentMethod];
    if (!rule) return null;

    return {
        method: paymentMethod,
        label: PAYMENT_METHOD_LABELS[paymentMethod],
        profiles: rule.profiles,
        restrictedUsers: rule.restrictedUsers || null,
        description: rule.description,
        requiresSpecialPermission: !!rule.restrictedUsers
    };
};

/**
 * ===== FUNÇÕES DE COMPATIBILIDADE =====
 * 
 * Manter compatibilidade com código existente
 */

/**
 * @deprecated Use getAvailableMethodsForUser
 */
export const getAvailableMethodsForProfile = (userProfile) => {
    console.warn('getAvailableMethodsForProfile deprecated. Use getAvailableMethodsForUser');
    return getAvailableMethodsForUser(userProfile);
};

/**
 * ===== FUNÇÕES DE DEBUG/DESENVOLVIMENTO =====
 */

/**
 * Debug: listar todas as permissões do utilizador
 * 
 * @param {string} userProfile - Perfil do utilizador
 * @param {number} userId - ID do utilizador
 */
export const debugUserPermissions = (userProfile, userId = null) => {
    if (process.env.NODE_ENV !== 'development') return;

    console.group(`🔐 Permissões Pagamento - Perfil: ${userProfile}, User ID: ${userId}`);

    // Métodos de pagamento
    console.log('📱 Métodos de Pagamento:');
    Object.entries(PAYMENT_METHODS).forEach(([key, method]) => {
        const canUse = canUsePaymentMethod(userProfile, method, userId);
        const rule = PERMISSION_RULES[method];

        console.log(`  ${PAYMENT_METHOD_LABELS[method]}: ${canUse ? '✅' : '❌'}`, {
            profiles: rule.profiles,
            restrictedUsers: rule.restrictedUsers,
            description: rule.description
        });
    });

    // Permissões administrativas
    console.log('🛠️ Permissões Administrativas:');
    console.log(`  Gestão pagamentos: ${canManagePayments(userId) ? '✅' : '❌'}`);
    console.log(`  Processar CASH: ${canProcessCashPayments(userId) ? '✅' : '❌'}`);

    // Resumo
    const availableMethods = getAvailableMethodsForUser(userProfile, userId);
    console.log(`📊 Resumo: ${availableMethods.length} métodos disponíveis:`, availableMethods);

    console.groupEnd();
};

/**
 * Debug: listar todas as regras do sistema
 */
export const debugSystemRules = () => {
    if (process.env.NODE_ENV !== 'development') return;

    console.group('🔐 Sistema de Permissões - Todas as Regras');

    console.log('📋 Métodos de Pagamento:');
    Object.entries(PERMISSION_RULES).forEach(([method, rule]) => {
        console.log(`  ${PAYMENT_METHOD_LABELS[method]}:`, rule);
    });

    console.log('🛠️ Permissões Administrativas:');
    Object.entries(ADMIN_PERMISSIONS).forEach(([permission, rule]) => {
        console.log(`  ${permission}:`, rule);
    });

    console.groupEnd();
};

/**
 * ===== EXPORTAÇÕES =====
 */

// Exportação padrão com todas as funções principais
export default {
    // Constantes
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    PAYMENT_METHOD_LABELS,
    PAYMENT_STATUS_LABELS,
    PAYMENT_STATUS_COLORS,

    // Verificações principais
    canUsePaymentMethod,
    getAvailableMethodsForUser,
    canManagePayments,
    canProcessCashPayments,

    // Utilitários
    mapBackendStatus,
    getMethodInfo,

    // Debug
    debugUserPermissions,
    debugSystemRules
};