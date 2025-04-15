import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Componente de tela de carregamento
 * 
 * @returns {React.ReactElement}
 */
const LoadingView = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="80vh"
  >
    <CircularProgress size={60} thickness={4} />
    <Typography variant="h6" sx={{ mt: 2 }}>
      Carregando dashboard...
    </Typography>
  </Box>
);

export default LoadingView;
