/**
 * RegisterPage
 * Página de registo de novos utilizadores
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
import { Link as RouterLink } from 'react-router-dom';
import { useRegister } from '../hooks';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';

export const RegisterPage = () => {
  const {
    formData,
    errors,
    submitError,
    isLoading,
    updateField,
    handleSubmit,
    getFieldError,
    hasError,
  } = useRegister();

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
              <PersonAddOutlinedIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Criar Conta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Preencha os dados abaixo para criar a sua conta
            </Typography>
          </Box>

          {/* Error Alert */}
          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Name Field */}
              <TextField
                fullWidth
                label="Nome Completo"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                error={hasError('name')}
                helperText={getFieldError('name')}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Email Field */}
              <TextField
                fullWidth
                label="Email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                error={hasError('email')}
                helperText={getFieldError('email')}
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
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                error={hasError('password')}
                helperText={
                  getFieldError('password') ||
                  'Mínimo 6 caracteres com maiúsculas, minúsculas e números'
                }
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Confirm Password Field */}
              <TextField
                fullWidth
                label="Confirmar Password"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                error={hasError('confirmPassword')}
                helperText={getFieldError('confirmPassword')}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Terms and Conditions */}
              <Typography variant="caption" color="text.secondary">
                Ao criar uma conta, concorda com os nossos{' '}
                <Link href="#" underline="hover" sx={{ color: 'primary.main' }}>
                  Termos de Serviço
                </Link>{' '}
                e{' '}
                <Link href="#" underline="hover" sx={{ color: 'primary.main' }}>
                  Política de Privacidade
                </Link>
              </Typography>

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
                {isLoading ? 'A criar conta...' : 'Criar Conta'}
              </Button>
            </Stack>
          </Box>

          {/* Divider */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OU
            </Typography>
          </Divider>

          {/* Login Link */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Já tem uma conta?{' '}
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                fontWeight="bold"
                underline="hover"
                sx={{ color: 'primary.main' }}
              >
                Entrar
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

export default RegisterPage;
