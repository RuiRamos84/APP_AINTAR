import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * ErrorBoundary
 *
 * Dois modos:
 * - variant="page"   (default) — cobre o ecrã inteiro, botão recarregar
 * - variant="module"           — cobre apenas a área do módulo, botão tentar novamente
 *
 * @example
 * // Wrapper global (App.jsx)
 * <ErrorBoundary>...</ErrorBoundary>
 *
 * // Wrapper por módulo
 * <ErrorBoundary variant="module" moduleName="Pagamentos">...</ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => window.location.reload();

  handleReset = () => this.setState({ hasError: false, error: null, errorInfo: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    const { variant = 'page', moduleName } = this.props;
    const isModule = variant === 'module';

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: isModule ? 320 : '100vh',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Paper
          elevation={isModule ? 0 : 3}
          variant={isModule ? 'outlined' : 'elevation'}
          sx={{
            p: isModule ? 4 : 5,
            textAlign: 'center',
            maxWidth: isModule ? 420 : 500,
            width: '100%',
            borderRadius: isModule ? 3 : 4,
            bgcolor: 'background.paper',
          }}
        >
          <ErrorOutlineIcon
            color="error"
            sx={{ fontSize: isModule ? 56 : 80, mb: 2, opacity: 0.8 }}
          />

          <Typography
            variant={isModule ? 'h6' : 'h4'}
            gutterBottom
            fontWeight="bold"
            color="text.primary"
          >
            {isModule
              ? `Erro no módulo${moduleName ? ` ${moduleName}` : ''}`
              : 'Oops! Algo correu mal.'}
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            {isModule
              ? 'Ocorreu um erro inesperado neste módulo. Pode tentar novamente sem recarregar a aplicação.'
              : 'Ocorreu um erro inesperado na aplicação. Por favor, tente recarregar a página.'}
          </Typography>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box
              sx={{
                mt: 1,
                mb: 2,
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 2,
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: 160,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
              }}
            >
              <Typography variant="caption" color="error" component="div">
                {this.state.error.toString()}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap', mt: 1 }}>
            {isModule && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
                sx={{ px: 3 }}
              >
                Tentar novamente
              </Button>
            )}
            <Button
              variant={isModule ? 'outlined' : 'contained'}
              color={isModule ? 'inherit' : 'primary'}
              startIcon={<RefreshIcon />}
              onClick={this.handleReload}
              sx={{ px: 3, color: isModule ? 'text.secondary' : undefined }}
            >
              Recarregar aplicação
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
}

export default ErrorBoundary;
