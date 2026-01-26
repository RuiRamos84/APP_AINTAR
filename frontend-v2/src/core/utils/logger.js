/**
 * Sistema de Logging Centralizado
 * Controla logs de desenvolvimento vs produção
 */

// Configuração de ambiente
const isDevelopment = import.meta.env.DEV;
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'warn'; // 'debug', 'info', 'warn', 'error', 'none'

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

const currentLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.warn;

/**
 * Logger centralizado
 */
export const logger = {
  /**
   * Debug - Informações detalhadas para debugging
   */
  debug: (context, message, data) => {
    if (isDevelopment && currentLevel <= LOG_LEVELS.debug) {
      console.log(`[${context}] ${message}`, data || '');
    }
  },

  /**
   * Info - Informações gerais
   */
  info: (context, message, data) => {
    if (isDevelopment && currentLevel <= LOG_LEVELS.info) {
      console.log(`ℹ️ [${context}] ${message}`, data || '');
    }
  },

  /**
   * Warning - Avisos importantes
   */
  warn: (context, message, data) => {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(`⚠️ [${context}] ${message}`, data || '');
    }
  },

  /**
   * Error - Erros críticos (sempre mostra)
   */
  error: (context, message, error) => {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(`❌ [${context}] ${message}`, error || '');
    }
  },

  /**
   * Socket - Logs específicos de socket (apenas em debug)
   */
  socket: (message, data) => {
    if (isDevelopment && currentLevel <= LOG_LEVELS.debug) {
      console.log(`🔌 [Socket] ${message}`, data || '');
    }
  },

  /**
   * Auth - Logs de autenticação (apenas em debug)
   */
  auth: (message, data) => {
    if (isDevelopment && currentLevel <= LOG_LEVELS.debug) {
      console.log(`🔐 [Auth] ${message}`, data || '');
    }
  },
};

export default logger;
