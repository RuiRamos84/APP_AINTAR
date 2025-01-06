import React from "react";
import { restartServer } from "../../services/authService";
import {
  notifySuccess,
  notifyError,
} from "../../components/common/Toaster/ThemedToaster";

const Settings = () => {
  const handleRestart = async () => {
    try {
      const response = await restartServer();
      notifySuccess(response.message);
    } catch (error) {
      notifyError("Erro ao reiniciar o servidor");
    }
  };

  return (
    <div>
      <h2>Configurações</h2>
      <button onClick={handleRestart}>Reiniciar Servidor</button>
    </div>
  );
};

export default Settings;