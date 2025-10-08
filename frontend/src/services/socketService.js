import { io } from "socket.io-client";

const socketUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
let socket = null;

export const connectSocket = (userId) => {
  if (socket) return Promise.resolve(socket);

  return new Promise((resolve, reject) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.access_token) {
      reject(new Error("Dados de utilizador ou token indisponíveis"));
      return;
    }

    socket = io(socketUrl, {
      query: {
        token: user.access_token,
        userId: userId
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.group("✅ Socket.IO CONECTADO COM SUCESSO");
      console.log("🔗 Socket ID:", socket.id);
      console.log("🌐 URL:", socketUrl);
      console.log("🚀 Transport usado:", socket.io.engine.transport.name);
      console.log("👤 User ID:", userId);
      console.log("🎯 Query params:", socket.io.engine.opts.query);
      console.log("🔄 Reconexão ativa:", socket.io.reconnection());
      console.groupEnd();
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.group("❌ ERRO DE CONEXÃO Socket.IO");
      console.error("📍 URL tentada:", socketUrl);
      console.error("🔍 Erro completo:", error);
      console.error("📋 Mensagem:", error.message);
      console.error("🧰 Tipo:", error.type);
      console.error("📊 Código:", error.code);
      console.groupEnd();
      reject(error);
    });

    socket.on("disconnect", (reason) => {
      console.group("🔌 Socket.IO DESCONECTADO");
      console.warn("📍 Razão:", reason);
      console.warn("🔄 Vai tentar reconectar:", socket.io.reconnection());
      console.groupEnd();
    });
  });
};

export const disconnectSocket = () => {
  return new Promise((resolve) => {
    if (socket) {
      socket.on("disconnect", () => {
        socket.off("disconnect");
        socket = null;
        resolve();
      });
      socket.disconnect();
    } else {
      resolve();
    }
  });
};

export const emitEvent = (eventName, data) => {
  if (socket && socket.connected) {
    // Obter dados do utilizador para incluir sessionId se necessário
    const user = JSON.parse(localStorage.getItem("user"));
    const enhancedData = {
      ...data,
      sessionId: data.sessionId || user?.session_id
    };
    socket.emit(eventName, enhancedData);
  } else {
    console.warn("Tentativa de emitir evento, mas o socket não está conectado");
  }
};

export const getSocket = () => socket;
export const getSocketId = () => socket?.id;
export default socket;