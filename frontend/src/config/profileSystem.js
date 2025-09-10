// config/profileSystem.js - Sistema de Perfis Centralizado

/**
 * SISTEMA DE PERFIS E PERMISSÕES
 * 
 * Centralizacao de todos os perfis, labels e correspondências
 * para consistência em todo o sistema.
 */

// ===== DEFINIÇÕES DOS PERFIS =====

export const USER_PROFILES = {
    ADMIN: '0',
    AINTAR: '1',
    MUNICIPIOS: '2',
    EXTERNOS: '3',
    JUNTAS: '4'
};

export const PROFILE_LABELS = {
    '0': 'Administrador',
    '1': 'AINTAR',
    '2': 'Municípios',
    '3': 'Utilizadores Externos',
    '4': 'Juntas de Freguesias'
};

export const PROFILE_DESCRIPTIONS = {
    '0': 'Acesso completo ao sistema',
    '1': 'Técnicos da AINTAR',
    '2': 'Utilizadores dos municípios associados',
    '3': 'Utilizadores externos com acesso limitado',
    '4': 'Utilizadores das juntas de freguesia'
};

export const PROFILE_COLORS = {
    '0': 'error',      // Vermelho - Admin
    '1': 'primary',    // Azul - AINTAR
    '2': 'success',    // Verde - Municípios
    '3': 'warning',    // Laranja - Externos
    '4': 'info'        // Ciano - Juntas
};

// ===== FUNÇÕES UTILITÁRIAS =====

/**
 * Obter label do perfil
 */
export const getProfileLabel = (profileId) => {
    return PROFILE_LABELS[String(profileId)] || `Perfil ${profileId}`;
};

/**
 * Obter descrição do perfil
 */
export const getProfileDescription = (profileId) => {
    return PROFILE_DESCRIPTIONS[String(profileId)] || 'Descrição não disponível';
};

/**
 * Obter cor do perfil para chips/badges
 */
export const getProfileColor = (profileId) => {
    return PROFILE_COLORS[String(profileId)] || 'default';
};

/**
 * Verificar se é admin
 */
export const isAdmin = (profileId) => {
    return String(profileId) === USER_PROFILES.ADMIN;
};

/**
 * Verificar se é AINTAR
 */
export const isAintar = (profileId) => {
    return String(profileId) === USER_PROFILES.AINTAR;
};

/**
 * Verificar se é município
 */
export const isMunicipality = (profileId) => {
    return String(profileId) === USER_PROFILES.MUNICIPIOS;
};

/**
 * Listar todos os perfis para selects/forms
 */
export const getAllProfiles = () => {
    return Object.entries(PROFILE_LABELS).map(([id, label]) => ({
        id,
        label,
        description: PROFILE_DESCRIPTIONS[id],
        color: PROFILE_COLORS[id]
    }));
};

// ===== INTEGRAÇÃO COM SISTEMA DE PERMISSÕES =====

/**
 * Mapeamento perfis → permissões de pagamento
 */
export const PAYMENT_PERMISSIONS_BY_PROFILE = {
    [USER_PROFILES.ADMIN]: {
        methods: ['MBWAY', 'MULTIBANCO', 'BANK_TRANSFER', 'CASH', 'MUNICIPALITY'],
        canManage: true,
        description: 'Todos os métodos + gestão completa'
    },
    [USER_PROFILES.AINTAR]: {
        methods: ['MBWAY', 'MULTIBANCO', 'BANK_TRANSFER', 'CASH'],
        canManage: false,
        description: 'Métodos digitais + numerário'
    },
    [USER_PROFILES.MUNICIPIOS]: {
        methods: ['MBWAY', 'MULTIBANCO', 'BANK_TRANSFER', 'MUNICIPALITY'],
        canManage: false,
        description: 'Métodos digitais + municípios'
    },
    [USER_PROFILES.EXTERNOS]: {
        methods: ['MBWAY', 'MULTIBANCO', 'BANK_TRANSFER'],
        canManage: false,
        description: 'Apenas métodos digitais'
    },
    [USER_PROFILES.JUNTAS]: {
        methods: [],
        canManage: false,
        description: 'Sem métodos de pagamento'
    }
};

/**
 * Obter métodos de pagamento por perfil
 */
export const getPaymentMethodsByProfile = (profileId) => {
    const profile = PAYMENT_PERMISSIONS_BY_PROFILE[String(profileId)];
    return profile ? profile.methods : [];
};

// ===== EXPORTAÇÕES PARA COMPATIBILIDADE =====

export default {
    USER_PROFILES,
    PROFILE_LABELS,
    PROFILE_DESCRIPTIONS,
    PROFILE_COLORS,
    getProfileLabel,
    getProfileDescription,
    getProfileColor,
    isAdmin,
    isAintar,
    isMunicipality,
    getAllProfiles,
    PAYMENT_PERMISSIONS_BY_PROFILE,
    getPaymentMethodsByProfile
};