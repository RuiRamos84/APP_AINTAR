import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { usePermissionContext } from "../contexts/PermissionContext"; // NOVO IMPORT
import { notifyError } from "../components/common/Toaster/ThemedToaster";

const LoadingSpinner = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
    <CircularProgress />
  </Box>
);

const PrivateRoute = ({ children, requiredPermission, ...props }) => {
  const { user, isLoading } = useAuth();
  const { hasPermission, initialized } = usePermissionContext(); // NOVO HOOK
  const location = useLocation();

  // Loading states
  if (isLoading || !initialized) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Verificar acesso diretamente
  const hasAccess = requiredPermission ? hasPermission(requiredPermission) : true;

  // Verificar acesso
  if (requiredPermission && !hasAccess) {
    notifyError("Não tem permissão para aceder a esta área.");
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;