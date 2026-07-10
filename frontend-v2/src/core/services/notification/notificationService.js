/**
 * Notification Service
 * Sistema centralizado de notificações — ponto único de entrada para todos os toasts.
 *
 * Uso:
 *   import notification from '@/core/services/notification'
 *   notification.success('Guardado!')
 *   notification.apiError(err, 'Fallback se sem mensagem')
 *
 * Nunca usar { toast } from 'sonner' ou { sileo } from 'sileo' diretamente
 * fora dos adapters em ./adapters — este ficheiro só conhece a interface
 * comum e delega no motor ativo (ver ./engine.js).
 */

import { getActiveEngine } from './engine';
import { sonnerAdapter } from './adapters/sonnerAdapter';
import { sileoAdapter } from './adapters/sileoAdapter';

const ADAPTERS = { sonner: sonnerAdapter, sileo: sileoAdapter };

// Statuses que indicam erro de negócio (warning laranja) vs erro técnico (vermelho)
const BUSINESS_STATUSES = new Set([400, 403, 404, 409, 422]);

const activeAdapter = () => ADAPTERS[getActiveEngine()] ?? sonnerAdapter;

/**
 * Notificação de sucesso
 */
export const notifySuccess = (message, options = {}) => {
  activeAdapter().success(message, options);
};

/**
 * Notificação de erro
 */
export const notifyError = (message, options = {}) => {
  activeAdapter().error(message, options);
};

/**
 * Notificação informativa
 */
export const notifyInfo = (message, options = {}) => {
  activeAdapter().info(message, options);
};

/**
 * Notificação de aviso
 */
export const notifyWarning = (message, options = {}) => {
  activeAdapter().warning(message, options);
};

/**
 * Notificação com descrição adicional
 */
export const notifyDescription = (message, description, options = {}) => {
  activeAdapter().description(message, description, options);
};

/**
 * Notificação de carregamento com promessa
 */
export const notifyLoading = async (
  promiseFn,
  loadingMessage = 'A carregar...',
  successMessageFn = () => 'Concluído com sucesso',
  errorMessage = 'Ocorreu um erro'
) => {
  return activeAdapter().loading(promiseFn, loadingMessage, successMessageFn, errorMessage);
};

/**
 * Notificação com ação customizada
 */
export const notifyAction = (message, actionLabel, actionFn, options = {}) => {
  activeAdapter().action(message, actionLabel, actionFn, options);
};

/**
 * Notificação customizada
 */
export const notifyCustom = (content, options = {}) => {
  activeAdapter().custom(content, options);
};

/**
 * Routing inteligente de erros de API:
 *  - Status 400/403/404/409/422 → regra de negócio → warning (laranja)
 *  - Qualquer outro / sem status  → erro técnico    → error (vermelho)
 *
 * O interceptor do AuthManager já extrai `error.response?.data?.error`
 * e coloca em `error.message`, por isso basta ler `err.message`.
 */
export const notifyApiError = (err, fallback = 'Ocorreu um erro inesperado.') => {
  const message = err?.message || fallback;
  const status = err?.status ?? err?.response?.status;

  if (status && BUSINESS_STATUSES.has(status)) {
    activeAdapter().warning(message);
  } else {
    activeAdapter().error(message);
  }
};

/**
 * Objeto consolidado com todas as funções de notificação
 */
export const notification = {
  success: notifySuccess,
  error: notifyError,
  info: notifyInfo,
  warning: notifyWarning,
  description: notifyDescription,
  loading: notifyLoading,
  action: notifyAction,
  custom: notifyCustom,
  apiError: notifyApiError,
  toast: sonnerAdapter.raw, // Acesso direto para casos especiais (dismiss, custom, etc.) — sempre sonner
};

export default notification;
