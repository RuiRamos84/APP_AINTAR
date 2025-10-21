import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Error Boundary - Captura erros React e exibe UI de fallback
 * Previne que a aplicação inteira crashe por um erro isolado
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o estado para exibir a UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log do erro para console
    console.error('ErrorBoundary capturou erro:', error, errorInfo);

    // Atualiza estado com detalhes do erro
    this.setState({
      error,
      errorInfo
    });

    // Aqui você pode enviar para serviço de logging (Sentry, LogRocket, etc)
    if (window.logErrorToService) {
      window.logErrorToService(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            p: 3
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 500,
              textAlign: 'center',
              bgcolor: 'background.paper'
            }}
          >
            <ErrorOutlineIcon
              sx={{
                fontSize: 60,
                color: 'error.main',
                mb: 2
              }}
            />

            <Typography variant="h5" gutterBottom>
              Algo correu mal
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              Ocorreu um erro inesperado. Por favor, tente recarregar a página.
            </Typography>

            {/* Mostrar detalhes em desenvolvimento */}
            {this.props.showDetails && this.state.error && (
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: 200,
                  fontSize: '0.75rem'
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </Typography>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={this.handleReset}
                startIcon={<RefreshIcon />}
              >
                Tentar Novamente
              </Button>

              <Button
                variant="contained"
                onClick={() => window.location.reload()}
                startIcon={<RefreshIcon />}
              >
                Recarregar Página
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
