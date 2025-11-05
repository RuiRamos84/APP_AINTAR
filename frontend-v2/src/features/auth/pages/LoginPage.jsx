/**
 * LoginPage
 * Página de login da aplicação
 */

import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  Stack,
  Divider,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useLogin } from '../hooks';
import { useEffect, useState } from 'react';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export const LoginPage = () => {
  const location = useLocation();
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null);

  const {
    formData,
    errors,
    submitError,
    isLoading,
    updateField,
    handleSubmit,
    getFieldError,
    hasError,
  } = useLogin();

  // Verificar se vem de sessão expirada
  useEffect(() => {
    const expired = sessionStorage.getItem('session_expired');

    if (expired || location.state?.sessionExpired) {
      setSessionExpiredMessage('A sua sessão expirou por inatividade. Por favor, faça login novamente.');

      // Limpar flag
      sessionStorage.removeItem('session_expired');

      // Auto-remover mensagem após 8 segundos
      const timer = setTimeout(() => setSessionExpiredMessage(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 3,
            background: (theme) =>
              theme.palette.mode === 'light'
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                mb: 2,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Bem-vindo de volta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Entre com as suas credenciais para continuar
            </Typography>
          </Box>

          {/* Session Expired Alert */}
          {sessionExpiredMessage && (
            <Alert
              severity="warning"
              sx={{ mb: 3 }}
              onClose={() => setSessionExpiredMessage(null)}
            >
              {sessionExpiredMessage}
            </Alert>
          )}

          {/* Error Alert */}
          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Username Field */}
              <TextField
                fullWidth
                label="Username"
                autoComplete="username"
                autoFocus
                value={formData.username}
                onChange={(e) => updateField('username', e.target.value)}
                error={hasError('username')}
                helperText={getFieldError('username')}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Password Field */}
              <TextField
                fullWidth
                label="Password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                error={hasError('password')}
                helperText={getFieldError('password')}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Forgot Password Link */}
              <Box sx={{ textAlign: 'right' }}>
                <Link
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                  underline="hover"
                  sx={{ color: 'primary.main' }}
                >
                  Esqueceu-se da password?
                </Link>
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                {isLoading ? 'A entrar...' : 'Entrar'}
              </Button>
            </Stack>
          </Box>

          {/* Divider */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OU
            </Typography>
          </Divider>

          {/* Register Link */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Não tem uma conta?{' '}
              <Link
                component={RouterLink}
                to="/register"
                variant="body2"
                fontWeight="bold"
                underline="hover"
                sx={{ color: 'primary.main' }}
              >
                Criar conta
              </Link>
            </Typography>
          </Box>
        </Paper>

        {/* Footer */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 3,
            color: 'rgba(255, 255, 255, 0.7)',
          }}
        >
          © 2024 APP - Todos os direitos reservados
        </Typography>
      </Container>
    </Box>
  );
};

export default LoginPage;
