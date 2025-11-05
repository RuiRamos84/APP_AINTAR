/**
 * AuthState
 * Reactive state container for authentication
 * Pattern: Observer - notifies subscribers of state changes
 */

class AuthState {
  constructor() {
    this.state = {
      user: null,              // Current authenticated user or null
      isLoading: true,         // Initial loading state
      isRefreshing: false,     // Token refresh in progress
      isLoggingOut: false,     // Logout operation in progress
      lastActivity: Date.now(),// Timestamp of last user activity
      timers: {
        inactivity: null,      // Timeout for session expiry (60 min)
        warning: null,         // Timeout for session warning (55 min)
        refresh: null,         // Interval for token refresh (50 min)
        heartbeat: null        // Interval for heartbeat (10 min)
      }
    };

    this.listeners = [];
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Update state and notify listeners
   */
  setState(updates) {
    this.state = {
      ...this.state,
      ...updates,
      timers: {
        ...this.state.timers,
        ...(updates.timers || {})
      }
    };
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.getState());
    });
  }

  /**
   * Clear all timers
   */
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

export default AuthState;
