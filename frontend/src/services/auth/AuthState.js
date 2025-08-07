// src/services/auth/AuthState.js
export class AuthState {
    constructor() {
        this.state = {
            user: null,
            isLoading: true,
            isRefreshing: false,
            isLoggingOut: false,
            lastActivity: Date.now(),
            timers: {
                inactivity: null,
                warning: null,
                refresh: null,
                heartbeat: null
            }
        };
        this.listeners = new Set();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.listeners.forEach(listener => listener(this.state));
    }

    getState() {
        return this.state;
    }

    clearTimers() {
        Object.values(this.state.timers).forEach(timer => {
            if (timer) {
                clearTimeout(timer);
                clearInterval(timer);
            }
        });
        this.setState({
            timers: {
                inactivity: null,
                warning: null,
                refresh: null,
                heartbeat: null
            }
        });
    }
}
