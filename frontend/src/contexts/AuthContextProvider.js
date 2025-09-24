import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissionContext } from './PermissionContext';
import { useRouteConfig } from '../components/common/Sidebar/useRouteConfig';
import AccessDenied from './AccessDenied';
import { useAuth } from './AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, isLoading } = useAuth();
  const { hasPermission, initialized } = usePermissionContext();
  const { permissionIdToNameMap } = useRouteConfig();
  const location = useLocation();

  if (isLoading || !initialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se uma permissão é necessária e o utilizador não a tem
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Usar o mapa para uma busca O(1) instantânea
    const permissionName = permissionIdToNameMap?.[requiredPermission];
    const permissionToShow = permissionName || `ID ${requiredPermission}`; // Fallback para o ID se o nome não for encontrado

    console.warn(`Acesso negado à rota. Permissão necessária: ${permissionToShow} (ID: ${requiredPermission})`);
    return <AccessDenied requiredPermission={permissionToShow} />;
  }

  // Se tudo estiver OK, renderiza o componente filho
  return children;
};

export default ProtectedRoute;

