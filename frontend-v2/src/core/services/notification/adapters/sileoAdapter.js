/**
 * Sileo Adapter (experimental)
 * Mapeia a mesma interface do sonnerAdapter para a API do Sileo
 * (https://sileo.aaryan.design). Sileo usa objetos { title, description, ... }
 * em vez de (message, options) — o mapeamento message -> title fica isolado aqui.
 *
 * Ativo apenas quando engine.js aponta para 'sileo' — hoje, só dentro do
 * módulo Sistema. `custom()` não tem equivalente direto na API do Sileo
 * (sem render de ReactNode arbitrário), por isso cai num fallback com aviso.
 */

import { sileo } from 'sileo';

const DEFAULT_DURATION = 5000;

const success = (message, options = {}) => {
  sileo.success({ title: message, duration: DEFAULT_DURATION, ...options });
};

const error = (message, options = {}) => {
  sileo.error({ title: message, duration: DEFAULT_DURATION, ...options });
};

const info = (message, options = {}) => {
  sileo.info({ title: message, duration: DEFAULT_DURATION, ...options });
};

const warning = (message, options = {}) => {
  sileo.warning({ title: message, duration: DEFAULT_DURATION, ...options });
};

const description = (message, descriptionText, options = {}) => {
  sileo.show({
    title: message,
    description: descriptionText,
    duration: DEFAULT_DURATION,
    ...options,
  });
};

const loading = (
  promiseFn,
  loadingMessage = 'A carregar...',
  successMessageFn = () => 'Concluído com sucesso',
  errorMessage = 'Ocorreu um erro'
) => {
  return sileo.promise(promiseFn, {
    loading: { title: loadingMessage },
    success: (data) => ({
      title: typeof successMessageFn === 'function' ? successMessageFn(data) : successMessageFn,
    }),
    error: { title: errorMessage },
  });
};

const action = (message, actionLabel, actionFn, options = {}) => {
  sileo.action({
    title: message,
    button: { title: actionLabel, onClick: actionFn },
    duration: DEFAULT_DURATION,
    ...options,
  });
};

const custom = (content, options = {}) => {
  console.warn(
    '[sileoAdapter] notification.custom() sem equivalente no Sileo — a usar fallback "show".'
  );
  sileo.show({
    title: typeof content === 'string' ? content : 'Notificação',
    duration: 10000,
    ...options,
  });
};

export const sileoAdapter = {
  success,
  error,
  info,
  warning,
  description,
  loading,
  action,
  custom,
};

export default sileoAdapter;
