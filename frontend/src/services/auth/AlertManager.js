// src/services/auth/AlertManager.js
import Swal from 'sweetalert2';

export class AlertManager {
    constructor() {
        this.alertConfig = {
            customClass: { container: "session-alert-container" },
            allowOutsideClick: false,
            backdrop: 'rgba(0,0,0,0.5)'
        };
    }

    formatTimeLeft(milliseconds) {
        const totalSeconds = Math.ceil(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    async showSessionWarning(warningTime) {
        let timerInterval;

        const result = await Swal.fire({
            ...this.alertConfig,
            title: "Aviso de Inactividade",
            html: `A sessão expira em <b></b>.<br/><br/>Continuar?`,
            icon: "warning",
            timer: warningTime,
            timerProgressBar: true,
            showCancelButton: true,
            confirmButtonText: "Continuar",
            cancelButtonText: "Logout",
            didOpen: () => {
                const b = Swal.getHtmlContainer().querySelector("b");
                timerInterval = setInterval(() => {
                    if (b) {
                        const timeLeft = Swal.getTimerLeft();
                        b.textContent = this.formatTimeLeft(timeLeft);
                    }
                }, 100);
            },
            willClose: () => clearInterval(timerInterval)
        });

        return {
            continue: result.isConfirmed,
            logout: result.dismiss === Swal.DismissReason.cancel ||
                result.dismiss === Swal.DismissReason.timer
        };
    }

    async showSessionExpired() {
        await Swal.fire({
            ...this.alertConfig,
            title: "Sessão Expirada",
            text: "Sessão expirou por inactividade.",
            icon: "warning",
            confirmButtonText: "OK"
        });
    }

    async showError(message) {
        await Swal.fire({
            ...this.alertConfig,
            title: "Erro",
            text: message,
            icon: "error",
            confirmButtonText: "OK"
        });
    }
}