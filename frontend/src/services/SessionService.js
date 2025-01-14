// services/SessionService.js
import api from './api';
import { refreshToken } from './authService';
import config from '../config';
import Swal from 'sweetalert2';

class SessionService {
    constructor() {
        this.INACTIVITY_TIMEOUT = config.INACTIVITY_TIMEOUT;
        this.WARNING_TIME = config.WARNING_TIMEOUT;
        this.REFRESH_INTERVAL = config.TOKEN_REFRESH_INTERVAL;
        this.HEARTBEAT_INTERVAL = config.HEARTBEAT_INTERVAL;

        this.timers = {
            inactivity: null,
            warning: null,
            refresh: null,
            heartbeat: null
        };
        this.isRefreshing = false;
        this.lastActivity = Date.now();
    }

    formatTimeLeft(milliseconds) {
        const totalSeconds = Math.ceil(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    initialize(onSessionWarning, onSessionExpired) {
        const handleSessionWarning = async () => {
            let timerInterval;
            const result = await Swal.fire({
                title: "Aviso de Inatividade",
                html: `Sua sessão irá expirar em <b></b>.<br/><br/>Deseja continuar?`,
                icon: "warning",
                timer: this.WARNING_TIME,
                timerProgressBar: true,
                showCancelButton: true,
                confirmButtonText: "Continuar sessão",
                cancelButtonText: "Fazer logout",
                allowOutsideClick: false,
                didOpen: () => {
                    const b = Swal.getHtmlContainer().querySelector("b");
                    timerInterval = setInterval(() => {
                        if (b) {
                            const timeLeft = Swal.getTimerLeft();
                            b.textContent = this.formatTimeLeft(timeLeft);
                        }
                    }, 100);
                },
                willClose: () => {
                    clearInterval(timerInterval);
                }
            });

            if (result.isConfirmed) {
                await onSessionWarning();
            } else if (result.dismiss === Swal.DismissReason.timer || result.dismiss === Swal.DismissReason.cancel) {
                await onSessionExpired();
            }
        };

        this.setupActivityListeners();
        this.setupTokenRefresh();
        this.setupHeartbeat();

        window.addEventListener('sessionWarning', handleSessionWarning);
        window.addEventListener('sessionExpired', async () => {
            await Swal.fire({
                title: "Sessão Expirada",
                text: "Sua sessão expirou devido à inatividade.",
                icon: "warning",
                confirmButtonText: "OK",
                allowOutsideClick: false
            });
            await onSessionExpired();
        });

        this.resetTimers();

        return () => {
            this.cleanup();
            window.removeEventListener('sessionWarning', handleSessionWarning);
            window.removeEventListener('sessionExpired', onSessionExpired);
        };
    }

    setupActivityListeners() {
        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(event =>
            document.addEventListener(event, () => this.updateActivity(), true)
        );
    }

    async updateActivity() {
        this.lastActivity = Date.now();
        localStorage.setItem("lastActivityTime", this.lastActivity);
        this.resetTimers();
    }

    needsTokenRefresh() {
        const timeSinceLastActivity = Date.now() - this.lastActivity;
        return timeSinceLastActivity > (this.REFRESH_INTERVAL * 0.8); // 80% do intervalo
    }

    resetTimers() {
        Object.values(this.timers).forEach(timer => {
            if (timer) {
                clearTimeout(timer);
                clearInterval(timer);
            }
        });

        this.timers.warning = setTimeout(
            () => window.dispatchEvent(new Event('sessionWarning')),
            this.WARNING_TIME
        );

        this.timers.inactivity = setTimeout(
            () => window.dispatchEvent(new Event('sessionExpired')),
            this.INACTIVITY_TIMEOUT
        );
    }

    setupTokenRefresh() {
        this.timers.refresh = setInterval(async () => {
            await this.handleTokenRefresh();
        }, this.REFRESH_INTERVAL);
    }

    setupHeartbeat() {
        this.timers.heartbeat = setInterval(async () => {
            try {
                await api.post('/auth/heartbeat');
            } catch (error) {
                if (error?.response?.status === 401) {
                    await this.handleTokenRefresh();
                }
            }
        }, this.HEARTBEAT_INTERVAL);
    }

    async handleTokenRefresh() {
        if (this.isRefreshing || !this.needsTokenRefresh()) return;

        this.isRefreshing = true;
        try {
            const currentUser = JSON.parse(localStorage.getItem("user"));
            if (!currentUser) throw new Error('No user data');

            const result = await refreshToken(Date.now());
            if (!result) throw new Error('Token refresh failed');
            this.resetTimers();
            return result;
        } catch (error) {
            window.dispatchEvent(new Event('sessionExpired'));
        } finally {
            this.isRefreshing = false;
        }
    }

    cleanup() {
        Object.values(this.timers).forEach(timer => {
            if (timer) {
                clearTimeout(timer);
                clearInterval(timer);
            }
        });

        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(event =>
            document.removeEventListener(event, () => this.updateActivity(), true)
        );
    }
}

export const sessionService = new SessionService();