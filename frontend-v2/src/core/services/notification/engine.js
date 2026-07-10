/**
 * Notification Engine Switch
 * Motor de toast ativo por omissão é 'sonner'. Scoped temporariamente para
 * 'sileo' dentro do módulo Sistema — ver features/admin/components/AdminNotificationLab.jsx.
 *
 * Para avançar com Sileo globalmente no futuro, basta mudar o valor por
 * omissão abaixo (ou remover o switch e apontar notificationService.js
 * diretamente para sileoAdapter) — nenhum call-site de notification.* muda.
 */

let activeEngine = 'sonner';

export const setActiveEngine = (engine) => {
  activeEngine = engine;
};

export const getActiveEngine = () => activeEngine;
