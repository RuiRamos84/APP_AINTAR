import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { notifyError } from "../components/common/Toaster/ThemedToaster";

const PrivateRoute = ({ children, requiredProfil, allowedUserIds, requiredProfiles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    // Verificar perfil único (compatibilidade)
    if (requiredProfil !== undefined && user.profil !== requiredProfil) {
      notifyError("Não tem permissão para aceder a esta área.");
      window.location.href = "/";
    }

    // Verificar múltiplos perfis
    if (requiredProfiles && !requiredProfiles.includes(user.profil)) {
      notifyError("Não tem permissão para aceder a esta área.");
      window.location.href = "/";
    }

    // Verificar user_id
    if (allowedUserIds && !allowedUserIds.includes(Number(user.user_id))) {
      notifyError("Não tem permissão para aceder a esta área.");
      window.location.href = "/";
    }
  }, [user, requiredProfil, requiredProfiles, allowedUserIds]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
        <CircularProgress />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificações de permissão
  const hasRequiredProfile = requiredProfil === undefined || user.profil === requiredProfil;
  const hasRequiredProfiles = !requiredProfiles || requiredProfiles.includes(user.profil);
  const hasAllowedUserId = !allowedUserIds || allowedUserIds.includes(Number(user.user_id));

  if (!hasRequiredProfile || !hasRequiredProfiles || !hasAllowedUserId) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;