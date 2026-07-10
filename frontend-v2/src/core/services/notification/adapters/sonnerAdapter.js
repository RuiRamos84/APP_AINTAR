/**
 * Sonner Adapter
 * Implementação de referência (produção) da interface de notificação.
 */

import { toast } from 'sonner';

const DEFAULT_DURATION = 5000;

const success = (message, options = {}) => {
  toast.success(message, { duration: DEFAULT_DURATION, ...options });
};

const error = (message, options = {}) => {
  toast.error(message, { duration: DEFAULT_DURATION, ...options });
};

const info = (message, options = {}) => {
  toast.info(message, { duration: DEFAULT_DURATION, ...options });
};

const warning = (message, options = {}) => {
  toast.warning(message, { duration: DEFAULT_DURATION, ...options });
};

const description = (message, descriptionText, options = {}) => {
  toast(message, { description: descriptionText, duration: DEFAULT_DURATION, ...options });
};

const loading = (
  promiseFn,
  loadingMessage = 'A carregar...',
  successMessageFn = () => 'Concluído com sucesso',
  errorMessage = 'Ocorreu um erro'
) => {
  return toast.promise(promiseFn(), {
    loading: loadingMessage,
    success: successMessageFn,
    error: errorMessage,
  });
};

const action = (message, actionLabel, actionFn, options = {}) => {
  toast(message, {
    action: { label: actionLabel, onClick: actionFn },
    duration: DEFAULT_DURATION,
    ...options,
  });
};

const custom = (content, options = {}) => {
  toast.custom(content, { duration: 10000, ...options });
};

export const sonnerAdapter = {
  success,
  error,
  info,
  warning,
  description,
  loading,
  action,
  custom,
  raw: toast,
};

export default sonnerAdapter;
