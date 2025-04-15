import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { notifyError } from "../components/common/Toaster/ThemedToaster";

const PrivateRoute = ({ children, requiredProfil, allowedUserIds }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </div>
    );
  }

  // Verificar se o utilizador está autenticado
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se o utilizador tem o perfil necessário
  if (requiredProfil !== undefined && user.profil !== requiredProfil) {
    // Exibir uma mensagem de erro antes de redirecionar
    notifyError("Não tem permissão para aceder a esta área. Por favor, contacte o administrador.");

    // Redirecionar para a página inicial após um pequeno atraso
    setTimeout(() => {
      return <Navigate to="/" replace />;
    }, 2000); // 2 segundos de atraso para o utilizador ver a mensagem

    return null; // Retornar null para evitar renderização dupla
  }

  // Verificar se o utilizador tem o user_id permitido
  if (allowedUserIds && !allowedUserIds.includes(user.user_id)) {
    // Exibir uma mensagem de erro antes de redirecionar
    notifyError("Não tem permissão para aceder a esta área. Por favor, contacte o administrador.");

    // Redirecionar para a página inicial após um pequeno atraso
    setTimeout(() => {
      return <Navigate to="/" replace />;
    }, 2000); // 2 segundos de atraso para o utilizador ver a mensagem

    return null; // Retornar null para evitar renderização dupla
  }

  return children;
};

export default PrivateRoute;