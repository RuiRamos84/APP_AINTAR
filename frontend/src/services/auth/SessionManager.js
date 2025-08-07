// src/services/auth/SessionManager.js
import api from '../api';

// Configurações de timeout
const INACTIVITY_TIMEOUT = 60 * 60 * 1000;     // 60 min
const WARNING_TIMEOUT = 5 * 60 * 1000;         // 5 min  
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 min
const HEARTBEAT_INTERVAL = 10 * 60 * 1000;     // 10 min

export class SessionManager {
    constructor(authState, alertManager, tokenManager) {
        this.authState = authState;
        this.alertManager = alertManager;
        this.tokenManager = tokenManager;

        this.INACTIVITY_TIMEOUT = INACTIVITY_TIMEOUT;
        this.WARNING_TIME = WARNING_TIMEOUT;
        this.REFRESH_INTERVAL = TOKEN_REFRESH_INTERVAL;
        this.HEARTBEAT_INTERVAL = HEARTBEAT_INTERVAL;

        this.setupActivityListeners();
        this.setupVisibilityListener();
    }

    setupActivityListeners() {
        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(event => {
            document.addEventListener(event, () => this.updateActivity(), { passive: true });
        });
    }

    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    updateActivity() {
        const now = Date.now();
        this.authState.setState({ lastActivity: now });
        localStorage.setItem("lastActivityTime", now.toString());
        this.resetTimers();
    }

    resetTimers() {
        this.authState.clearTimers();

        const warningTimer = setTimeout(
            () => this.handleSessionWarning(),
            this.INACTIVITY_TIMEOUT - this.WARNING_TIME
        );

        const inactivityTimer = setTimeout(
            () => this.handleSessionExpiry(),
            this.INACTIVITY_TIMEOUT
        );

        const refreshTimer = setInterval(
            () => this.handleTokenRefresh(),
            this.REFRESH_INTERVAL
        );

        const heartbeatTimer = setInterval(
            () => this.sendHeartbeat(),
            this.HEARTBEAT_INTERVAL
        );

        this.authState.setState({
            timers: {
                warning: warningTimer,
                inactivity: inactivityTimer,
                refresh: refreshTimer,
                heartbeat: heartbeatTimer
            }
        });
    }

    async handleSessionWarning() {
        const result = await this.alertManager.showSessionWarning(this.WARNING_TIME);

        if (result.continue) {
            try {
                await this.tokenManager.refreshToken(Date.now());
                this.updateActivity();
            } catch (error) {
                await this.handleSessionExpiry();
            }
        } else if (result.logout) {
            await this.handleSessionExpiry();
        }
    }

    async handleSessionExpiry() {
        this.authState.clearTimers();
        await this.alertManager.showSessionExpired();
        window.location.reload();
    }

    async handleTokenRefresh() {
        const { lastActivity } = this.authState.getState();
        const timeSinceLastActivity = Date.now() - lastActivity;

        if (timeSinceLastActivity > (this.REFRESH_INTERVAL * 0.8)) {
            try {
                await this.tokenManager.refreshToken(Date.now());
            } catch (error) {
                await this.handleSessionExpiry();
            }
        }
    }

    async sendHeartbeat() {
        try {
            await api.post('/auth/heartbeat');
        } catch (error) {
            if (error?.response?.status === 401) {
                try {
                    await this.tokenManager.refreshToken(Date.now());
                } catch {
                    await this.handleSessionExpiry();
                }
            }
        }
    }

    async handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            const lastActivityTime = parseInt(localStorage.getItem("lastActivityTime") || Date.now());
            const inactiveTime = Date.now() - lastActivityTime;

            if (inactiveTime >= this.INACTIVITY_TIMEOUT) {
                await this.handleSessionExpiry();
            } else if (inactiveTime >= (this.INACTIVITY_TIMEOUT - this.WARNING_TIME)) {
                await this.handleSessionWarning();
            } else {
                try {
                    await api.post('/auth/heartbeat');
                } catch (error) {
                    if (error?.response?.status === 401) {
                        await this.handleSessionExpiry();
                    }
                }
            }
        }
    }

    cleanup() {
        this.authState.clearTimers();

        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(event => {
            document.removeEventListener(event, () => this.updateActivity());
        });

        document.removeEventListener('visibilitychange', () => this.handleVisibilityChange());
    }
}