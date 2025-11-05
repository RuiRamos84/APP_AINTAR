/**
 * Configuração da API
 * Endpoints, timeouts e configurações de comunicação
 */

export const API_CONFIG = {
  // URL base da API (vem do .env)
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',

  // Timeout
  timeout: 30000, // 30 segundos

  // Retry
  retryAttempts: 3,
  retryDelay: 1000, // 1 segundo

  // Headers padrão
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },

  // Enviar cookies (para CSRF)
  withCredentials: true,

  // Endpoints da API
  endpoints: {
    // Autenticação
    auth: {
      login: '/auth/login',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      register: '/auth/register',
      resetPassword: '/auth/reset-password',
      verifyEmail: '/auth/verify-email',
      me: '/auth/me',
    },

    // Utilizadores
    users: '/users',

    // Documentos
    documents: '/documents',

    // Pagamentos
    payments: '/payments',

    // Operações
    operations: '/operations',

    // Emissões
    emissions: '/emissions',

    // EPIs
    epis: '/epis',

    // Entidades
    entities: '/entities',

    // Tarefas
    tasks: '/tasks',

    // Dashboard
    dashboard: '/dashboard',

    // Metadados
    metadata: '/metadata',
  },

  // WebSocket
  websocket: {
    url: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
    reconnectAttempts: 5,
    reconnectDelay: 1000,
  },
};
