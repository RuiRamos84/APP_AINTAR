// config.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

const config = {
  // Variáveis de ambiente
  API_BASE_URL,
  SOCKET_URL,

  // Tempos em milissegundos
  INACTIVITY_TIMEOUT: 60 * 60 * 1000,  // 60 minutos total
  WARNING_TIMEOUT: 5 * 60 * 1000,      // Últimos 5 minutos para aviso
  TOKEN_REFRESH_INTERVAL: 14 * 60 * 1000, // 14 minutos
  HEARTBEAT_INTERVAL: 10 * 60 * 1000, // 10 minutos

  isProduction: () => {
    return process.env.NODE_ENV === "production";
  },
};

export default config;
