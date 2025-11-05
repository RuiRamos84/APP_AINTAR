/**
 * Configuração da Aplicação
 * Configurações globais e constantes
 */

export const APP_CONFIG = {
  // Informações da aplicação
  name: 'Aplicação Frontend',
  version: '2.0.0',
  description: 'Aplicação moderna e modular',

  // Localização
  locale: 'pt-PT',
  timezone: 'Europe/Lisbon',

  // Formatos
  dateFormat: 'dd/MM/yyyy',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
  timeFormat: 'HH:mm',

  // Paginação
  pagination: {
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    maxPageSize: 100,
  },

  // Sessão
  session: {
    timeout: 30 * 60 * 1000, // 30 minutos
    warningTime: 5 * 60 * 1000, // Avisar 5 minutos antes
    refreshInterval: 5 * 60 * 1000, // Refresh token a cada 5 minutos
  },

  // Upload de ficheiros
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxFiles: 5,
  },

  // Notificações
  notifications: {
    duration: 5000, // 5 segundos
    maxVisible: 3,
    position: {
      vertical: 'top',
      horizontal: 'right',
    },
  },

  // Tema
  theme: {
    defaultMode: 'light', // 'light' | 'dark'
    allowToggle: true,
  },

  // Features (feature flags)
  features: {
    darkMode: true,
    notifications: true,
    offline: false,
    analytics: false,
  },
};
