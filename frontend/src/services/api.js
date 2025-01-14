import axios from "axios";
import Swal from "sweetalert2";
import config from "../config";
import { sessionService } from './SessionService';
// console.log("API Base URL:", process.env.REACT_APP_API_BASE_URL);

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isLoggingOut = false;
let isLoggedOut = false;

export const startLogout = () => {
  isLoggingOut = true;
};

export const finishLogout = () => {
  isLoggingOut = false;
  isLoggedOut = true;
};

export const resetLogoutState = () => {
  isLoggingOut = false;
  isLoggedOut = false;
};

api.interceptors.request.use(
  (config) => {
    if (isLoggedOut && !config.url.includes("/auth/logout")) {
      return Promise.reject({
        message: "Utilizador não autenticado. Requisição bloqueada.",
      });
    }

    if (isLoggingOut && !config.url.includes("/auth/logout")) {
      return Promise.reject({
        message: "Operação cancelada devido ao logout em andamento",
      });
    }

    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.access_token) {
      config.headers["Authorization"] = `Bearer ${user.access_token}`;
    }
    sessionService.updateActivity();
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      console.error(
        "Response error:",
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      console.error("Request error:", error.request);
    } else {
      console.error("Error:", error.message);
    }

    const originalRequest = error.config;

    if (originalRequest.url.includes("/auth/login") || isLoggingOut) {
      return Promise.reject(error);
    }

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const { refreshToken } = await import("./authService");
        const newTokens = await refreshToken(Date.now());
        if (newTokens) {
          api.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${newTokens.access_token}`;
          originalRequest.headers[
            "Authorization"
          ] = `Bearer ${newTokens.access_token}`;
          return api(originalRequest);
        } else {
          throw new Error("Falha ao atualizar o token");
        }
      } catch (refreshError) {
        console.error("Erro ao atualizar o token:", refreshError);
        await handleLogout();
        return Promise.reject(refreshError);
      }
    }

    if (error.response && error.response.status === 419) {
      await handleSessionExpired();
    }

    return Promise.reject(error);
  }
);

const handleLogout = async () => {
  if (!isLoggingOut) {
    startLogout();
    try {
      const { logout } = await import("./authService");
      await logout();
    } catch (error) {
      console.error("Erro durante o logout:", error);
    } finally {
      finishLogout();
      window.location.href = "/login";
    }
  }
};

const handleSessionExpired = async () => {
  if (!isLoggingOut) {
    await Swal.fire({
      icon: "warning",
      title: "Sessão Expirada",
      text: "Sua sessão expirou. Por favor, faça login novamente.",
      confirmButtonText: "OK",
    });
    await handleLogout();
    window.location.href = "/login";
  }
};

export default api;
