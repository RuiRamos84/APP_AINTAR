import { io } from "socket.io-client";

const socketUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
let socket = null;

export const connectSocket = (userId) => {
  if (socket) return Promise.resolve(socket);

  return new Promise((resolve, reject) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.access_token) {
      reject(new Error("No user data or token available"));
      return;
    }

    // console.log("Iniciando conexão Socket.IO...");
    socket = io(socketUrl, {
      query: { token: user.access_token, userId },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Conectado ao servidor Socket.IO com ID:", socket.id);
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      // console.error("Erro de conexão Socket.IO:", error);
      reject(error);
    });

    socket.on("disconnect", (reason) => {
      // console.log("Desconectado do servidor Socket.IO. Razão:", reason);
    });
  });
};

export const disconnectSocket = () => {
  return new Promise((resolve) => {
    if (socket) {
      // console.log("Iniciando desconexão do socket");

      const onDisconnect = () => {
        // console.log("Socket desconectado com sucesso");
        socket.off("disconnect", onDisconnect);
        socket = null;
        resolve();
      };

      socket.on("disconnect", onDisconnect);
      socket.disconnect();
    } else {
      // console.log("Nenhum socket para desconectar");
      resolve();
    }
  });
};

export const emitEvent = (eventName, data) => {
  if (socket && socket.connected) {
    socket.emit(eventName, data);
  } else {
    console.warn("Tentativa de emitir evento, mas o socket não está conectado");
  }
};

export const getSocket = () => socket;
