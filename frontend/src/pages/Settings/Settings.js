import React from "react";
import { restartServer } from "../../services/authService";
import {
  notifySuccess,
  notifyError,
} from "../../components/common/Toaster/ThemedToaster";
import ReopenDocument from './ReopenDocument';

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
      <h1>Administração</h1>
      <ReopenDocument />
      {/* <button onClick={handleRestart}>Reiniciar Servidor</button> */}
    </div>
  );
};

export default Settings;