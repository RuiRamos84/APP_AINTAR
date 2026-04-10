/**
 * Notification Service
 * Sistema centralizado de notificações — ponto único de entrada para todos os toasts.
 *
 * Uso:
 *   import notification from '@/core/services/notification'
 *   notification.success('Guardado!')
 *   notification.apiError(err, 'Fallback se sem mensagem')
 *
 * Nunca usar { toast } from 'sonner' diretamente fora deste ficheiro.
 */

import { toast } from 'sonner';

const DEFAULT_DURATION = 5000;

// Statuses que indicam erro de negócio (warning laranja) vs erro técnico (vermelho)
const BUSINESS_STATUSES = new Set([400, 403, 404, 409, 422]);

/**
 * Notificação de sucesso
 */
export const notifySuccess = (message, options = {}) => {
  toast.success(message, {
    duration: DEFAULT_DURATION,
    ...options,
  });
};

/**
 * Notificação de erro
 */
export const notifyError = (message, options = {}) => {
  toast.error(message, {
    duration: DEFAULT_DURATION,
    ...options,
  });
};

/**
 * Notificação informativa
 */
export const notifyInfo = (message, options = {}) => {
  toast.info(message, {
    duration: DEFAULT_DURATION,
    ...options,
  });
};

/**
 * Notificação de aviso
 */
export const notifyWarning = (message, options = {}) => {
  toast.warning(message, {
    duration: DEFAULT_DURATION,
    ...options,
  });
};

/**
 * Notificação com descrição adicional
 */
export const notifyDescription = (message, description, options = {}) => {
  toast(message, {
    description,
    duration: DEFAULT_DURATION,
    ...options,
  });
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
  try {
    const result = await toast.promise(promiseFn(), {
      loading: loadingMessage,
      success: successMessageFn,
      error: errorMessage,
    });
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Notificação com ação customizada
 */
export const notifyAction = (message, actionLabel, actionFn, options = {}) => {
  toast(message, {
    action: {
      label: actionLabel,
      onClick: actionFn,
    },
    duration: DEFAULT_DURATION,
    ...options,
  });
};

/**
 * Notificação customizada
 */
export const notifyCustom = (content, options = {}) => {
  toast.custom(content, {
    duration: 10000,
    ...options,
  });
};

/**
 * Routing inteligente de erros de API:
 *  - Status 400/403/404/409/422 → regra de negócio → warning (laranja)
 *  - Qualquer outro / sem status  → erro técnico    → error (vermelho)
 *
 * O interceptor do AuthManager já extrai `error.response?.data?.erro`
 * e coloca em `error.message`, por isso basta ler `err.message`.
 */
export const notifyApiError = (err, fallback = 'Ocorreu um erro inesperado.') => {
  const message = err?.message || fallback;
  const status  = err?.status ?? err?.response?.status;

  if (status && BUSINESS_STATUSES.has(status)) {
    toast.warning(message, { duration: DEFAULT_DURATION });
  } else {
    toast.error(message, { duration: DEFAULT_DURATION });
  }
};

/**
 * Objeto consolidado com todas as funções de notificação
 */
export const notification = {
  success:  notifySuccess,
  error:    notifyError,
  info:     notifyInfo,
  warning:  notifyWarning,
  description: notifyDescription,
  loading:  notifyLoading,
  action:   notifyAction,
  custom:   notifyCustom,
  apiError: notifyApiError,
  toast,    // Acesso direto para casos especiais (dismiss, custom, etc.)
};

export default notification;
