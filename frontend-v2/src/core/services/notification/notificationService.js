/**
 * Notification Service
 * Sistema centralizado de notificações usando Sonner
 * Baseado no ThemedToaster do frontend antigo
 */

import { toast } from 'sonner';

const DEFAULT_DURATION = 5000;

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
  toast, // Exporta a função toast direta também
};

export default notification;
