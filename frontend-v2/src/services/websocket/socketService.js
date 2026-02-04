/**
 * Socket.IO Service
 *
 * Serviço moderno para gestão de WebSocket usando Socket.IO
 *
 * Features:
 * - Conexão automática com JWT
 * - Reconexão automática
 * - Event emitters com tipagem
 * - Logging detalhado (apenas em DEV)
 * - Gestão de estado da conexão
 * - Suporte a múltiplas rooms
 */

import { io } from 'socket.io-client';

// Configuração
const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
const RECONNECTION_ATTEMPTS = 10;
const RECONNECTION_DELAY = 2000;

// Instância única do socket (singleton)
let socketInstance = null;
let connectionPromise = null;

/**
 * Obter token do localStorage através do AuthManager
 * @returns {string|null}
 */
const getAuthToken = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    return user?.access_token || null;
  } catch (error) {
    console.error('[SocketService] Error getting auth token:', error);
    return null;
  }
};

/**
 * Obter dados do utilizador do localStorage através do AuthManager
 * @returns {Object|null}
 */
const getUserData = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch (error) {
    console.error('[SocketService] Error getting user data:', error);
    return null;
  }
};

/**
 * Conectar ao servidor Socket.IO
 *
 * @param {number} userId - ID do utilizador
 * @param {string} token - Token de autenticação (opcional, lê do storage se não fornecido)
 * @returns {Promise<Socket>} Instância do socket conectado
 */
export const connectSocket = (userId, token = null) => {
  // Se já existe uma conexão ativa, retornar
  if (socketInstance?.connected) {
    return Promise.resolve(socketInstance);
  }

  // Se já está a conectar, retornar a promise existente
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    // Usar token fornecido ou tentar obter do storage
    const authToken = token || getAuthToken();
    const user = getUserData();

    if (!authToken) {
      const error = new Error('Token de autenticação não disponível');
      console.error('[SocketService]', error.message);
      connectionPromise = null;
      reject(error);
      return;
    }

    // Criar instância Socket.IO
    socketInstance = io(SOCKET_URL, {
      query: {
        token: authToken,
        userId: userId || user?.user_id,
      },
      transports: ['websocket'], // Força WebSocket (mais rápido)
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      timeout: 20000,
      autoConnect: true,
    });

    // Event: Conexão estabelecida
    socketInstance.on('connect', () => {
      connectionPromise = null;
      resolve(socketInstance);
    });

    // Event: Erro de conexão
    socketInstance.on('connect_error', (error) => {
      console.group('❌ ERRO DE CONEXÃO Socket.IO');
      console.error('📍 URL:', SOCKET_URL);
      console.error('🔍 Erro:', error.message);
      console.error('📋 Type:', error.type);
      console.error('📊 Code:', error.code);
      console.groupEnd();

      connectionPromise = null;
      reject(error);
    });

    // Event: Desconexão
    socketInstance.on('disconnect', (reason) => {
      if (import.meta.env.DEV) {
        console.group('🔌 Socket.IO DESCONECTADO');
        console.warn('📍 Razão:', reason);
        console.warn('🔄 Vai reconectar:', socketInstance.io.reconnection());
        console.groupEnd();
      }
    });

    // Event: Erro genérico
    socketInstance.on('error', (error) => {
      console.error('[SocketService] Socket error:', error);
    });

    // Event: Reconexão bem-sucedida
    socketInstance.on('reconnect', (attemptNumber) => {
      if (import.meta.env.DEV) {
        console.log(`[SocketService] ✅ Reconectado após ${attemptNumber} tentativa(s)`);
      }
    });

    // Event: Tentativa de reconexão
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      if (import.meta.env.DEV) {
        console.log(`[SocketService] 🔄 Tentativa de reconexão ${attemptNumber}/${RECONNECTION_ATTEMPTS}`);
      }
    });

    // Event: Falha na reconexão
    socketInstance.on('reconnect_failed', () => {
      console.error('[SocketService] ❌ Reconexão falhou após todas as tentativas');
    });
  });

  return connectionPromise;
};

/**
 * Desconectar do servidor Socket.IO
 *
 * @returns {Promise<void>}
 */
export const disconnectSocket = () => {
  return new Promise((resolve) => {
    if (!socketInstance) {
      resolve();
      return;
    }

    // Remover todos os listeners
    socketInstance.removeAllListeners();

    // Desconectar
    socketInstance.on('disconnect', () => {
      socketInstance = null;
      connectionPromise = null;
      resolve();
    });

    socketInstance.disconnect();

    // Fallback timeout (caso o evento disconnect não dispare)
    setTimeout(() => {
      if (socketInstance) {
        socketInstance = null;
        connectionPromise = null;
      }
      resolve();
    }, 1000);
  });
};

/**
 * Emitir evento para o servidor
 *
 * @param {string} eventName - Nome do evento
 * @param {Object} data - Dados a enviar
 * @returns {boolean} True se emitido com sucesso
 */
export const emitEvent = (eventName, data = {}) => {
  if (!socketInstance?.connected) {
    console.warn('[SocketService] Tentativa de emitir evento sem conexão ativa:', eventName);
    return false;
  }

  // Enriquecer dados com informações do utilizador
  const user = getUserData();
  const enhancedData = {
    ...data,
    sessionId: data.sessionId || user?.session_id,
    userId: data.userId || user?.user_id,
    timestamp: data.timestamp || new Date().toISOString(),
  };


  socketInstance.emit(eventName, enhancedData);
  return true;
};

/**
 * Registar listener para um evento
 *
 * @param {string} eventName - Nome do evento
 * @param {Function} callback - Função callback
 * @returns {Function} Função para remover o listener
 */
export const onEvent = (eventName, callback) => {
  if (!socketInstance) {
    console.warn('[SocketService] Tentativa de registar listener sem socket ativo:', eventName);
    return () => {};
  }


  socketInstance.on(eventName, callback);

  // Retornar função de cleanup
  return () => {
    if (socketInstance) {
      socketInstance.off(eventName, callback);
    }
  };
};

/**
 * Remover listener de um evento
 *
 * @param {string} eventName - Nome do evento
 * @param {Function} callback - Função callback (opcional, remove todos se não fornecido)
 */
export const offEvent = (eventName, callback) => {
  if (socketInstance) {
    if (callback) {
      socketInstance.off(eventName, callback);
    } else {
      socketInstance.off(eventName);
    }
  }
};

/**
 * Entrar numa sala (room)
 *
 * @param {string} roomName - Nome da sala
 */
export const joinRoom = (roomName) => {
  if (!socketInstance?.connected) {
    console.warn('[SocketService] Cannot join room, socket not connected');
    return false;
  }

  emitEvent('join', { room: roomName });
  return true;
};

/**
 * Sair de uma sala (room)
 *
 * @param {string} roomName - Nome da sala
 */
export const leaveRoom = (roomName) => {
  if (!socketInstance?.connected) {
    console.warn('[SocketService] Cannot leave room, socket not connected');
    return false;
  }

  emitEvent('leave', { room: roomName });
  return true;
};

/**
 * Obter instância atual do socket
 *
 * @returns {Socket|null}
 */
export const getSocket = () => socketInstance;

/**
 * Obter ID do socket atual
 *
 * @returns {string|null}
 */
export const getSocketId = () => socketInstance?.id || null;

/**
 * Verificar se o socket está conectado
 *
 * @returns {boolean}
 */
export const isSocketConnected = () => socketInstance?.connected || false;

/**
 * Reconectar manualmente
 *
 * @returns {Promise<Socket>}
 */
export const reconnectSocket = () => {
  if (socketInstance) {
    return new Promise((resolve, reject) => {
      socketInstance.once('connect', () => resolve(socketInstance));
      socketInstance.once('connect_error', reject);
      socketInstance.connect();
    });
  }

  const user = getUserData();
  return connectSocket(user?.user_id);
};

// Event names constants (para evitar typos)
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',

  // Notifications
  NEW_NOTIFICATION: 'new_notification',
  NOTIFICATION_UPDATE: 'notification_update',
  NOTIFICATION_COUNT: 'notification_count',
  NOTIFICATIONS_CLEARED: 'notifications_cleared',

  // Documents
  DOCUMENT_TRANSFERRED: 'document_transferred',
  DOCUMENT_UPDATE: 'document_update',

  // Payments
  PAYMENT_STATUS_UPDATE: 'payment_status_update',

  // Tasks
  TASK_NOTIFICATION: 'task_notification',
  TASK_NOTIFICATIONS: 'task_notifications',
  TASK_UPDATE: 'task_update',

  // System
  SYSTEM_MESSAGE: 'system_message',
  USER_STATUS_CHANGE: 'user_status_change',

  // Actions
  JOIN: 'join',
  LEAVE: 'leave',
  MARK_NOTIFICATION_READ: 'mark_notification_read',
  MARK_ALL_NOTIFICATIONS_READ: 'mark_all_notifications_read',
  GET_NOTIFICATIONS: 'get_notifications',
  GET_TASK_NOTIFICATIONS: 'get_task_notifications',
};

export default {
  connectSocket,
  disconnectSocket,
  emitEvent,
  onEvent,
  offEvent,
  joinRoom,
  leaveRoom,
  getSocket,
  getSocketId,
  isSocketConnected,
  reconnectSocket,
  SOCKET_EVENTS,
};
