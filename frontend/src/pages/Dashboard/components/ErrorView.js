import React from 'react';
import { Box, Paper, Typography, Button, alpha, useTheme } from '@mui/material';

/**
 * Componente para exibição de erro
 * 
 * @param {Object} props - Propriedades do componente
 * @param {string} props.error - Mensagem de erro
 * @param {Function} props.onRetry - Função chamada ao clicar no botão de tentar novamente
 * @returns {React.ReactElement}
 */
const ErrorView = ({ error, onRetry }) => {
  const theme = useTheme();
  
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      height="80vh"
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 500,
          textAlign: "center",
          bgcolor: alpha(theme.palette.error.light, 0.1),
          border: `1px solid ${theme.palette.error.light}`,
        }}
      >
        <Typography variant="h5" color="error" gutterBottom>
          Erro
        </Typography>
        <Typography>{error}</Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 3 }}
          onClick={onRetry}
        >
          Tentar novamente
        </Button>
      </Paper>
    </Box>
  );
};

export default ErrorView;
