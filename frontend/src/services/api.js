import axios from "axios";
import Swal from "sweetalert2";
import config from "../config";
// import { sessionService } from './SessionService';
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
    if (user?.access_token) {
      config.headers["Authorization"] = `Bearer ${user.access_token}`;
    }
    // sessionService.updateActivity();
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Tratamento de 401 (não autenticado)
    if (error.response?.status === 401 && !error.config?._retry) {
      error.config._retry = true;
      try {
        const { refreshToken } = await import("./authService");
        const newTokens = await refreshToken(Date.now());

        if (newTokens?.access_token) {
          error.config.headers["Authorization"] = `Bearer ${newTokens.access_token}`;
          return api(error.config);
        }
      } catch (refreshError) {
        // Se falhar o refresh, fazer logout
        const { logout } = await import("./authService");
        await logout();
        window.location.href = "/login";
      }
    }

    // Tratamento global de outros erros HTTP (se não for tratado localmente)
    if (error.response && !error.config?.skipGlobalErrorHandler) {
      const { notification } = await import("../components/common/Toaster/ThemedToaster");

      switch (error.response.status) {
        case 403:
          // Permissão negada - mostrar sempre ao utilizador
          notification.error('🔒 Sem permissão para esta ação. Contacte o administrador.');
          break;
        case 404:
          // Recurso não encontrado - apenas se não for esperado
          if (!error.config?.expect404) {
            notification.error('❌ Recurso não encontrado.');
          }
          break;
        case 500:
          notification.error('⚠️ Erro no servidor. Contacte o suporte técnico.');
          break;
        case 503:
          notification.error('⚠️ Serviço temporariamente indisponível. Tente novamente.');
          break;
        // Outros códigos são tratados localmente
      }
    }

    return Promise.reject(error);
  }
);

const handleLogout = async () => {
  if (isLoggingOut) return;

  startLogout();
  try {
    const { logout } = await import("./authService");
    await logout();
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    finishLogout();
    localStorage.clear();
    window.location.href = "/login";
  }
};


export default api;
