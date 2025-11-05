/**
 * SessionManager
 * Manages user session, inactivity detection, and automatic token refresh
 */

import AlertManager from './AlertManager';

// Session configuration
const INACTIVITY_TIMEOUT = 60 * 60 * 1000;      // 60 minutes
const WARNING_TIMEOUT = 5 * 60 * 1000;           // 5 minutes (shows warning at 55 min)
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000;   // Refresh token every 50 min
const HEARTBEAT_INTERVAL = 10 * 60 * 1000;       // Send heartbeat every 10 min

class SessionManager {
  constructor(authState, tokenManager, logoutCallback, heartbeatCallback) {
    this.authState = authState;
    this.tokenManager = tokenManager;
    this.logoutCallback = logoutCallback;
    this.heartbeatCallback = heartbeatCallback;
    this.alertManager = new AlertManager();

    // Bind methods
    this.updateActivity = this.updateActivity.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Start session management
   */
  start() {
    this.setupActivityListeners();
    this.setupVisibilityListener();
    this.startTimers();
    this.updateActivity(); // Initial activity update
  }

  /**
   * Stop session management
   */
  stop() {
    this.removeActivityListeners();
    this.removeVisibilityListener();
    this.authState.clearTimers();
  }

  /**
   * Setup activity listeners
   */
  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

    events.forEach(event => {
      document.addEventListener(event, this.updateActivity, { passive: true });
    });
  }

  /**
   * Remove activity listeners
   */
  removeActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

    events.forEach(event => {
      document.removeEventListener(event, this.updateActivity);
    });
  }

  /**
   * Setup visibility change listener (tab switching)
   */
  setupVisibilityListener() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Remove visibility change listener
   */
  removeVisibilityListener() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Handle tab visibility change
   */
  async handleVisibilityChange() {
    if (!document.hidden) {
      const lastActivity = this.authState.getState().lastActivity;
      const inactiveTime = Date.now() - lastActivity;

      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        try {
          await this.refreshToken();
          this.updateActivity();
          this.alertManager.showInfo('Sessão renovada com sucesso!');
        } catch (error) {
          await this.handleSessionExpired();
        }
      } else if (inactiveTime >= (INACTIVITY_TIMEOUT - WARNING_TIMEOUT)) {
        this.showSessionWarning();
      } else {
        try {
          await this.refreshToken();
          await this.sendHeartbeat();
        } catch (error) {
          // Ignore
        }
      }
    }
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    const now = Date.now();

    this.authState.setState({ lastActivity: now });
    localStorage.setItem('lastActivityTime', now.toString());

    this.resetTimers();
  }

  /**
   * Start all timers
   */
  startTimers() {
    // Warning timer (55 minutes)
    const warningTimer = setTimeout(() => {
      this.showSessionWarning();
    }, INACTIVITY_TIMEOUT - WARNING_TIMEOUT);

    // Inactivity timer (60 minutes)
    const inactivityTimer = setTimeout(() => {
      this.handleSessionExpired();
    }, INACTIVITY_TIMEOUT);

    // Token refresh interval (50 minutes)
    const refreshTimer = setInterval(async () => {
      await this.refreshToken();
    }, TOKEN_REFRESH_INTERVAL);

    // Heartbeat interval (10 minutes)
    const heartbeatTimer = setInterval(async () => {
      await this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL);

    this.authState.setState({
      timers: {
        warning: warningTimer,
        inactivity: inactivityTimer,
        refresh: refreshTimer,
        heartbeat: heartbeatTimer
      }
    });
  }

  /**
   * Reset all timers
   */
  resetTimers() {
    this.authState.clearTimers();
    this.startTimers();
  }

  /**
   * Show session warning
   */
  async showSessionWarning() {
    const remainingTime = WARNING_TIMEOUT;

    await this.alertManager.showSessionWarning(
      remainingTime,
      async () => {
        // User chose to continue - refresh token and reset timers
        await this.refreshToken();
        this.updateActivity();
      },
      async () => {
        // User chose to logout
        await this.logoutCallback();
      }
    );
  }

  /**
   * Handle session expired
   */
  async handleSessionExpired() {
    sessionStorage.setItem('session_expired', 'inactivity');
    await this.alertManager.showSessionExpired();
    await this.logoutCallback();
  }

  /**
   * Refresh access token
   */
  async refreshToken() {
    const state = this.authState.getState();
    if (state.isRefreshing) return;

    try {
      await this.tokenManager.refreshToken(Date.now());
    } catch (error) {
      if (error.message?.includes('refresh') || error.response?.status === 401) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Send heartbeat to server
   */
  async sendHeartbeat() {
    try {
      if (this.heartbeatCallback) {
        await this.heartbeatCallback();
      }
    } catch (error) {
      // Ignore
    }
  }
}

export default SessionManager;
