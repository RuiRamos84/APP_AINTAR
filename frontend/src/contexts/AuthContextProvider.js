// contexts/AuthContextProvider.js
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { useRouteConfig } from "../hooks/useRouteConfig";
import { notifyError } from "../components/common/Toaster/ThemedToaster";

const LoadingSpinner = () => (
  <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
    <CircularProgress />
  </div>
);

const PrivateRoute = ({ children, ...props }) => {
  const { user, isLoading } = useAuth();
  const { canAccessRoute } = useRouteConfig();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Se tem props específicos, usar eles; senão usar a config da rota
  const hasAccess = Object.keys(props).length > 0
    ? canAccessRoute(location.pathname, props)
    : canAccessRoute(location.pathname);

  if (!hasAccess) {
    notifyError("Não tem permissão para aceder a esta área.");
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;