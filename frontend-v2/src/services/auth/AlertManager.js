/**
 * AlertManager
 * Manages session timeout alerts and warnings
 * Uses Sonner + Material-UI for modern toast notifications
 */

import { toast } from 'sonner';
import { createElement } from 'react';
import { SessionWarningToast } from '@/shared/components/notifications';
import { notification } from '@/core/services/notification';

class AlertManager {
  constructor() {
    this.activeToastId = null;
  }

  /**
   * Show session warning alert (at 55 minutes)
   * @param {number} remainingTime - Remaining time in milliseconds
   * @param {Function} onContinue - Callback when user clicks continue
   * @param {Function} onLogout - Callback when user clicks logout
   * @returns {Promise}
   */
  async showSessionWarning(remainingTime, onContinue, onLogout) {
    // Fechar toast anterior se existir
    if (this.activeToastId) {
      toast.dismiss(this.activeToastId);
    }

    // Criar toast customizado com o componente SessionWarningToast
    this.activeToastId = toast.custom(
      (toastId) =>
        createElement(SessionWarningToast, {
          remainingTime,
          onContinue: () => {
            toast.dismiss(toastId);
            this.activeToastId = null;
            onContinue?.();
          },
          onLogout: () => {
            toast.dismiss(toastId);
            this.activeToastId = null;
            onLogout?.();
          },
          toastId,
        }),
      {
        duration: Infinity, // Não fecha automaticamente
        position: 'top-center',
        dismissible: false, // Não pode fechar clicando fora
      }
    );

    return { isConfirmed: false };
  }

  /**
   * Show session expired alert
   * @returns {Promise}
   */
  async showSessionExpired() {
    notification.error('A sua sessão expirou devido à inatividade.', {
      duration: 5000,
      position: 'top-center',
    });

    return { isConfirmed: true };
  }

  /**
   * Show info toast notification
   * @param {string} message - Message to display
   */
  showInfo(message) {
    notification.info(message, {
      duration: 3000,
      position: 'top-end',
    });
  }

  /**
   * Show loading notification
   * @param {string} text - Loading text
   */
  showLoading(text = 'A processar...') {
    notification.info(text, {
      duration: Infinity,
      position: 'top-center',
    });
  }

  /**
   * Close active toast
   */
  close() {
    if (this.activeToastId) {
      toast.dismiss(this.activeToastId);
      this.activeToastId = null;
    }
  }
}

export default AlertManager;
