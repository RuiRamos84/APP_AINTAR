// As URLs base agora vêm diretamente das variáveis de ambiente
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

const config = {
  // Variáveis de ambiente
  API_BASE_URL,
  SOCKET_URL,

  // Tempos em milissegundos
  INACTIVITY_TIMEOUT: 60 * 60 * 1000, // 60 minutos
  WARNING_TIMEOUT: 55 * 60 * 1000, // 55 minutos
  TOKEN_REFRESH_INTERVAL: 14 * 60 * 1000, // 14 minutos
  HEARTBEAT_INTERVAL: 10 * 60 * 1000, // 5 minutos

  // Função para verificar se estamos em produção
  isProduction: () => {
    return process.env.NODE_ENV === "production";
  },
};

export default config;
