// services/SessionService.js
import api from './api';
import { refreshToken } from './authService';
import config from '../config';
import Swal from 'sweetalert2';

/**
 * Classe responsável por gerenciar a sessão do usuário
 * - Controla tempos de inatividade
 * - Gerencia avisos de expiração
 * - Atualiza tokens
 * - Monitora atividade do usuário
 */
class SessionService {
    /**
     * Inicializa o serviço de sessão com as configurações definidas
     */
    constructor() {
        // Configurações de tempo obtidas do config
        this.INACTIVITY_TIMEOUT = config.INACTIVITY_TIMEOUT; // Tempo total até expiração (60 min)
        this.WARNING_TIME = config.WARNING_TIMEOUT;          // Tempo de aviso antes da expiração (5 min)
        this.REFRESH_INTERVAL = config.TOKEN_REFRESH_INTERVAL; // Intervalo de refresh do token
        this.HEARTBEAT_INTERVAL = config.HEARTBEAT_INTERVAL;  // Intervalo de verificação de conexão

        // Timers para controle de diferentes aspectos da sessão
        this.timers = {
            inactivity: null,  // Timer para controle de inatividade
            warning: null,     // Timer para aviso de expiração
            refresh: null,     // Timer para refresh do token
            heartbeat: null    // Timer para verificação de conexão
        };

        // Estado do serviço
        this.isRefreshing = false;
        this.lastActivity = Date.now();

        // Bind do método de visibilidade para poder remover o listener depois
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.setupVisibilityListener();
    }

    /**
     * Formata o tempo restante em formato MM:SS
     * @param {number} milliseconds - Tempo em milissegundos
     * @returns {string} Tempo formatado
     */
    formatTimeLeft(milliseconds) {
        const totalSeconds = Math.ceil(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Inicializa o serviço de sessão
     * @param {Function} onSessionWarning - Callback para aviso de sessão
     * @param {Function} onSessionExpired - Callback para expiração de sessão
     */
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
                // Primeiro mostra a mensagem de expiração
                await Swal.fire({
                    title: "Sessão Expirada",
                    text: "Sua sessão expirou devido à inatividade.",
                    icon: "warning",
                    confirmButtonText: "OK",
                    allowOutsideClick: false
                });
                // Depois recarrega a página
                window.location.reload();
            }
        };

        this.setupActivityListeners();
        this.setupTokenRefresh();
        this.setupHeartbeat();

        window.addEventListener('sessionWarning', handleSessionWarning);
        window.addEventListener('sessionExpired', async () => {
            // Primeiro executa o callback de expiração
            await onSessionExpired();
            // Depois mostra a mensagem
            await Swal.fire({
                title: "Sessão Expirada",
                text: "Sua sessão expirou devido à inatividade.",
                icon: "warning",
                confirmButtonText: "OK",
                allowOutsideClick: false
            });
            // Só recarrega após o usuário clicar em OK
            window.location.reload();
        });

        this.resetTimers();

        return () => {
            this.cleanup();
            window.removeEventListener('sessionWarning', handleSessionWarning);
            window.removeEventListener('sessionExpired', onSessionExpired);
        };
    }

    /**
     * Configura listeners para eventos de atividade do usuário
     */
    setupActivityListeners() {
        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(event =>
            document.addEventListener(event, () => this.updateActivity(), true)
        );
    }

    /**
     * Atualiza o timestamp da última atividade do usuário
     */
    async updateActivity() {
        this.lastActivity = Date.now();
        localStorage.setItem("lastActivityTime", this.lastActivity);
        this.resetTimers();
    }

    /**
     * Verifica se o token precisa ser atualizado
     * @returns {boolean} True se o token precisa ser atualizado
     */
    needsTokenRefresh() {
        const timeSinceLastActivity = Date.now() - this.lastActivity;
        return timeSinceLastActivity > (this.REFRESH_INTERVAL * 0.8); // 80% do intervalo
    }

    /**
     * Reseta todos os timers de sessão
     */
    resetTimers() {
        Object.values(this.timers).forEach(timer => {
            if (timer) {
                clearTimeout(timer);
                clearInterval(timer);
            }
        });

        // Warning começa 5 minutos antes do timeout
        this.timers.warning = setTimeout(
            () => window.dispatchEvent(new Event('sessionWarning')),
            this.INACTIVITY_TIMEOUT - this.WARNING_TIME // 55 minutos
        );

        // Timeout total após 60 minutos
        this.timers.inactivity = setTimeout(
            () => window.dispatchEvent(new Event('sessionExpired')),
            this.INACTIVITY_TIMEOUT // 60 minutos
        );
    }

    /**
     * Configura o intervalo de atualização do token
     */
    setupTokenRefresh() {
        this.timers.refresh = setInterval(async () => {
            await this.handleTokenRefresh();
        }, this.REFRESH_INTERVAL);
    }

    /**
     * Configura o intervalo de verificação de conexão
     */
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

    /**
     * Gerencia a atualização do token
     */
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

    /**
     * Gerencia mudanças de visibilidade da página
     */
    async handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            const lastActivityTime = parseInt(localStorage.getItem("lastActivityTime") || Date.now());
            const inactiveTime = Date.now() - lastActivityTime;

            // Verifica o tempo de inatividade quando a página volta a ficar visível
            if (inactiveTime >= this.INACTIVITY_TIMEOUT) {
                window.dispatchEvent(new Event('sessionExpired'));
            } else if (inactiveTime >= (this.INACTIVITY_TIMEOUT - this.WARNING_TIME)) {
                window.dispatchEvent(new Event('sessionWarning'));
            }

            // Verifica se o token ainda é válido
            try {
                await api.post('/auth/heartbeat');
            } catch (error) {
                if (error?.response?.status === 401) {
                    window.dispatchEvent(new Event('sessionExpired'));
                }
            }
        }
    }

    /**
     * Configura o listener para mudanças de visibilidade
     */
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    /**
     * Limpa todos os timers e listeners
     */
    cleanup() {
        // Limpa todos os timers
        Object.values(this.timers).forEach(timer => {
            if (timer) {
                clearTimeout(timer);
                clearInterval(timer);
            }
        });

        // Remove os listeners de eventos de atividade
        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(event =>
            document.removeEventListener(event, () => this.updateActivity(), true)
        );

        // Remove o listener de visibilidade
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}

// Exporta uma instância única do serviço
export const sessionService = new SessionService();