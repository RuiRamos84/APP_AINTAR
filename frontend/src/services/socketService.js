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
      // console.log("Conectado ao servidor Socket.IO com ID:", socket.id, socket.io.engine.opts.query.userId);
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.error("Erro de conexão Socket.IO:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("Desconectado do Socket.IO. Razão:", reason);
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