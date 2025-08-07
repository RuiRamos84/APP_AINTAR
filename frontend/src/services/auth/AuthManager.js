// src/services/auth/AuthManager.js
import api from '../api';
import { AuthState } from './AuthState';
import { AlertManager } from './AlertManager';
import { TokenManager } from './TokenManager';
import { SessionManager } from './SessionManager';

export class AuthManager {
    constructor() {
        this.authState = new AuthState();
        this.alertManager = new AlertManager();
        this.tokenManager = new TokenManager(this.authState);
        this.sessionManager = new SessionManager(this.authState, this.alertManager, this.tokenManager);

        this.initialize();
    }

    initialize() {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);

                if (this.tokenManager.isTokenValid(user.access_token)) {
                    this.authState.setState({ user, isLoading: false });
                } else {
                    this.tokenManager.refreshToken(Date.now())
                        .then(newTokens => {
                            if (newTokens) {
                                this.authState.setState({ user: newTokens, isLoading: false });
                            } else {
                                this.authState.setState({ isLoading: false });
                            }
                        })
                        .catch(() => {
                            localStorage.removeItem("user");
                            this.authState.setState({ isLoading: false });
                        });
                }
            } catch (error) {
                localStorage.removeItem("user");
                this.authState.setState({ isLoading: false });
            }
        } else {
            this.authState.setState({ isLoading: false });
        }

        this.setupApiInterceptors();
    }

    setupApiInterceptors() {
        api.interceptors.request.use(
            (config) => {
                const { user, isLoggingOut } = this.authState.getState();

                if (isLoggingOut && !config.url.includes("/auth/logout")) {
                    return Promise.reject({ message: "Logout em curso" });
                }

                if (user?.access_token) {
                    config.headers["Authorization"] = `Bearer ${user.access_token}`;
                }

                this.sessionManager.updateActivity();
                return config;
            },
            (error) => Promise.reject(error)
        );
    }

    // Métodos públicos
    subscribe(listener) {
        return this.authState.subscribe(listener);
    }

    getUser() {
        return this.authState.getState().user;
    }

    isLoading() {
        return this.authState.getState().isLoading;
    }

    isLoggingOut() {
        return this.authState.getState().isLoggingOut;
    }

    async login(username, password) {
        this.authState.setState({ isLoading: true });

        try {
            const response = await api.post("/auth/login", { username, password });

            if (response.status === 200 && response.data) {
                const user = response.data;
                localStorage.setItem("user", JSON.stringify(user));
                localStorage.setItem("lastActivityTime", Date.now().toString());
                this.authState.setState({ user, isLoading: false });
                this.sessionManager.updateActivity();
                return user;
            }

            throw new Error("Resposta inválida do servidor");
        } catch (error) {
            this.authState.setState({ isLoading: false });

            if (error.code === "ERR_NETWORK") {
                throw new Error("Não foi possível ligar ao servidor.");
            }

            if (error.response?.status === 401) {
                throw new Error(error.response.data.error || "Utilizador ou palavra-passe incorrectos");
            }

            throw new Error(error.response?.data?.error || "Erro no login.");
        }
    }

    async logout() {
        const { isLoggingOut, user } = this.authState.getState();
        if (isLoggingOut) return;

        this.authState.setState({ isLoggingOut: true });

        try {
            if (user?.access_token) {
                try {
                    await api.post("/auth/logout", null, {
                        headers: { Authorization: `Bearer ${user.access_token}` }
                    });
                } catch (error) {
                    console.warn("Erro no logout do servidor");
                }
            }
        } finally {
            this.sessionManager.cleanup();
            localStorage.clear();
            this.authState.setState({
                user: null,
                isLoggingOut: false,
                isLoading: false,
                lastActivity: Date.now()
            });
        }
    }
}

export const authManager = new AuthManager();