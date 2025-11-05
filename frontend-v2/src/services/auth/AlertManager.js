/**
 * AlertManager
 * Manages session timeout alerts and warnings
 * Uses SweetAlert2 for UI (can be replaced with MUI Dialog)
 */

class AlertManager {
  /**
   * Show session warning alert (at 55 minutes)
   * @param {number} remainingTime - Remaining time in milliseconds
   * @param {Function} onContinue - Callback when user clicks continue
   * @param {Function} onLogout - Callback when user clicks logout
   * @returns {Promise}
   */
  async showSessionWarning(remainingTime, onContinue, onLogout) {
    // Calculate minutes and seconds
    const totalSeconds = Math.floor(remainingTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const result = await this.showAlert({
      title: 'Aviso de Inatividade',
      html: `
        <div>
          <p>A sua sessão irá expirar em:</p>
          <h2 style="color: #f44336; font-size: 2rem; margin: 1rem 0;">
            ${minutes}:${seconds.toString().padStart(2, '0')}
          </h2>
          <p>Deseja continuar com a sessão?</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continuar Sessão',
      cancelButtonText: 'Fazer Logout',
      confirmButtonColor: '#1976d2',
      cancelButtonColor: '#d33',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    if (result.isConfirmed) {
      onContinue?.();
    } else {
      onLogout?.();
    }

    return result;
  }

  /**
   * Show session expired alert
   * @returns {Promise}
   */
  async showSessionExpired() {
    return this.showAlert({
      title: 'Sessão Expirada',
      text: 'A sua sessão expirou devido à inatividade.',
      icon: 'warning',
      confirmButtonText: 'OK',
      confirmButtonColor: '#1976d2',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
  }

  /**
   * Show info toast notification
   * @param {string} message - Message to display
   */
  showInfo(message) {
    if (typeof window !== 'undefined' && window.Swal) {
      const Toast = window.Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', window.Swal.stopTimer);
          toast.addEventListener('mouseleave', window.Swal.resumeTimer);
        }
      });

      Toast.fire({
        icon: 'success',
        title: message
      });
    } else {
      // Fallback to console log
      console.log('[SessionManager]', message);
    }
  }

  /**
   * Show generic alert
   * @param {Object} options - SweetAlert2 options
   * @returns {Promise}
   */
  async showAlert(options) {
    // Check if SweetAlert2 is available
    if (typeof window !== 'undefined' && window.Swal) {
      return window.Swal.fire(options);
    }

    // Fallback to native confirm/alert
    if (options.showCancelButton) {
      const result = window.confirm(`${options.title}\n\n${options.text || options.html}`);
      return { isConfirmed: result };
    } else {
      window.alert(`${options.title}\n\n${options.text}`);
      return { isConfirmed: true };
    }
  }

  /**
   * Show loading alert
   * @param {string} text - Loading text
   */
  showLoading(text = 'A processar...') {
    if (typeof window !== 'undefined' && window.Swal) {
      window.Swal.fire({
        title: text,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
          window.Swal.showLoading();
        },
      });
    }
  }

  /**
   * Close any open alert
   */
  close() {
    if (typeof window !== 'undefined' && window.Swal) {
      window.Swal.close();
    }
  }
}

export default AlertManager;
