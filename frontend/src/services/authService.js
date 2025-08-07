import api from "./api";
import axios from "axios";
// import { resetLastActivity, resetTimers } from "./activityTracker";
import config from "../config";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const SessionAlert = Swal.mixin({
  customClass: {
    container: "session-alert-container",
  },
  backdrop: `
    rgba(0,0,123,0.4)
    url("/path-to-your-nyan-cat.gif")
    left top
    no-repeat
  `,
  allowOutsideClick: false,
});

export const initializeSessionManagement = () => {
  window.addEventListener("sessionWarning", () => {
    SessionAlert.fire({
      title: "Aviso de Inatividade",
      text: "Sua sessão irá expirar em 15 minutos. Deseja continuar?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Continuar sessão",
      cancelButtonText: "Fazer logout",
      timer: 900000,
      timerProgressBar: true,
    }).then((result) => {
      if (result.isConfirmed) {
        refreshToken(Date.now());
        // resetLastActivity();
        // resetTimers();
      } else if (result.dismiss === Swal.DismissReason.timer) {
        // User closed the modal
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        logout();
      }
    });
  });

  window.addEventListener("sessionExpired", () => {
    SessionAlert.fire({
      title: "Sessão Expirada",
      text: "Sua sessão expirou devido à inatividade.",
      icon: "info",
      confirmButtonText: "OK",
    }).then(() => {
      logout();
    });
  });
};

export const login = async (username, password) => {
  try {
    const response = await api.post("/auth/login", { username, password });
    if (response.status === 200 && response.data) {
      localStorage.setItem("user", JSON.stringify(response.data));
      return response.data;
    } else {
      throw new Error("Resposta inválida do servidor");
    }
  } catch (error) {
    if (error.code === "ERR_NETWORK") {
      throw new Error("Não foi possível conectar ao servidor.");
    } else if (error.response) {
      if (error.response.status === 401) {
        throw new Error(error.response.data.error || "Credenciais incorretas.");
      }
      throw new Error(error.response.data.error || "Erro ao fazer login.");
    } else {
      throw new Error("Ocorreu um erro inesperado.");
    }
  }
};

const refreshApi = axios.create({
  baseURL: config.API_BASE_URL,
});

let isRefreshingToken = false;

export const refreshToken = async (currentTime) => {
  if (isRefreshingToken) return null;

  try {
    isRefreshingToken = true;
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser?.refresh_token) throw new Error("No refresh token");

    const response = await refreshApi.post("/auth/refresh",
      { current_time: currentTime },
      {
        headers: { Authorization: `Bearer ${storedUser.refresh_token}` },
        _retry: true // Previne loop infinito
      }
    );

    if (response?.data) {
      const updatedUser = {
        ...storedUser,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    }
    return null;
  } catch (error) {
    localStorage.clear();
    throw error;
  } finally {
    isRefreshingToken = false;
  }
};

let isLoggingOut = false;

export const logout = async () => {
  if (isLoggingOut) return;
  isLoggingOut = true;

  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.access_token) {
      try {
        await api.post("/auth/logout", null, {
          headers: { Authorization: `Bearer ${user.access_token}` },
        });
      } catch (error) {
        console.warn(
          "Erro ao fazer logout no servidor, continuando com o logout local."
        );
      }
    }
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  } finally {
    localStorage.removeItem("user");
    localStorage.removeItem("lastActivityTime");
    localStorage.removeItem("metaData");
    // window.location.href = "/login"; // Força o redirecionamento
    isLoggingOut = false;
  }
};

export const decodeToken = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(base64));
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

export const checkTokenValidity = (accessToken) => {
  if (!accessToken) return false;

  const tokenParts = accessToken.split(".");
  if (tokenParts.length !== 3) {
    return false;
  }

  const payload = JSON.parse(atob(tokenParts[1]));
  const createdAt = payload.created_at * 1000; // Converter para milissegundos
  const expirationTime = createdAt + 1 * 60 * 1000; // 1 minuto após a criação (ajustado para o novo tempo de expiração)

  return Date.now() < expirationTime;
};

export const restartServer = async () => {
  try {
    const response = await api.post("/auth/restart");
    return response.data;
  } catch (error) {
    console.error("Erro ao reiniciar o servidor:", error);
    throw error;
  }
};
