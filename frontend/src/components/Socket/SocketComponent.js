import React from "react";
import { useSocket } from "../../contexts/SocketContext";

const SocketComponent = ({ children }) => {
  const { isConnected } = useSocket();

  return (
    <>
      {isConnected && <div style={{ display: "none" }}>Socket Connected</div>}
      {children}
    </>
  );
};

export default SocketComponent;
