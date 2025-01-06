import api from "./api";
import config from "../config";

let lastActivity = Date.now();
let inactivityTimer;
let warningTimer;
const INACTIVITY_TIMEOUT = config.INACTIVITY_TIMEOUT || 30 * 60 * 1000; // 30 minutos
const WARNING_TIME = config.WARNING_TIMEOUT || 15 * 60 * 1000; // 15 minutos
let heartbeatInterval = config.HEARTBEAT_INTERVAL;

let backoffTime = 1000; // Começa com 1 segundo

export function setupActivityTracking() {
  [
    "mousedown",
    "mousemove",
    "keydown",
    "touchstart",
    "scroll",
    "click",
  ].forEach((eventType) => {
    document.addEventListener(eventType, updateLastActivity, true);
  });
  resetTimers(); // Reseta os timers de inatividade ao iniciar
}


function updateLastActivity() {
  lastActivity = Date.now();
  resetTimers();
}

export function resetTimers() {
  // Limpar os timers anteriores para evitar múltiplos alertas
  clearTimeout(inactivityTimer);
  clearTimeout(warningTimer);

  // Configurar um aviso de sessão que será emitido `WARNING_TIME` antes de expirar a sessão
  warningTimer = setTimeout(() => {
    emitSessionWarning();
  }, INACTIVITY_TIMEOUT - WARNING_TIME);

  // Configurar o timer de inatividade para fazer logout
  inactivityTimer = setTimeout(() => {
    emitSessionExpired();
  }, INACTIVITY_TIMEOUT);
}

function emitSessionWarning() {
  const event = new CustomEvent("sessionWarning");
  window.dispatchEvent(event);
}

function emitSessionExpired() {
  const event = new CustomEvent("sessionExpired");
  window.dispatchEvent(event);
}

export function getTimeSinceLastActivity() {
  return Date.now() - lastActivity;
}

export function resetLastActivity() {
  lastActivity = Date.now();
  resetTimers();
}

export function setupHeartbeat() {
  const sendHeartbeat = async () => {
    try {
      if (!api.defaults.baseURL) {
        console.error("API baseURL não definida");
        return;
      }
      await api.post("/auth/heartbeat");
      console.log("Heartbeat enviado com sucesso");
      backoffTime = 1000; // Reset do tempo de backoff ao ter sucesso
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log(
          `Rate limit atingido. Tentando novamente em ${backoffTime / 1000} segundos`
        );
        setTimeout(sendHeartbeat, backoffTime);
        backoffTime *= 2; // Dobra o tempo de espera para a próxima tentativa
      } else {
        console.error("Erro ao enviar heartbeat:", error);
      }
    }
  };

  setInterval(sendHeartbeat, heartbeatInterval);
}
