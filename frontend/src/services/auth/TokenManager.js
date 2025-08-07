// src/services/auth/TokenManager.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

export class TokenManager {
    constructor(authState) {
        this.authState = authState;
        this.refreshApi = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000
        });
    }

    isTokenValid(token) {
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.created_at * 1000 + (1 * 60 * 1000);
            return Date.now() < expirationTime;
        } catch {
            return false;
        }
    }

    async refreshToken(currentTime) {
        const { isRefreshing } = this.authState.getState();
        if (isRefreshing) return null;

        this.authState.setState({ isRefreshing: true });

        try {
            const storedUser = JSON.parse(localStorage.getItem("user"));
            if (!storedUser?.refresh_token) throw new Error("No refresh token");

            const response = await this.refreshApi.post("/auth/refresh",
                { current_time: currentTime },
                { headers: { Authorization: `Bearer ${storedUser.refresh_token}` } }
            );

            if (response?.data) {
                const updatedUser = {
                    ...storedUser,
                    access_token: response.data.access_token,
                    refresh_token: response.data.refresh_token
                };

                localStorage.setItem("user", JSON.stringify(updatedUser));
                this.authState.setState({ user: updatedUser });
                return updatedUser;
            }
            return null;
        } catch (error) {
            localStorage.clear();
            throw error;
        } finally {
            this.authState.setState({ isRefreshing: false });
        }
    }
}