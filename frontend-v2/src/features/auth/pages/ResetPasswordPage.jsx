/**
 * ResetPasswordPage
 * Página de redefinição de password — recebe token via URL
 * Rota: /reset-password/:token
 */

import { useState } from 'react';
import {
  Box, Container, Paper, Typography, TextField,
  Button, Alert, Link, Stack, InputAdornment, IconButton,
} from '@mui/material';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import LockResetIcon from '@mui/icons-material/LockReset';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { resetPassword } from '@/services/userService';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const passwordsMatch = newPassword === confirmPassword;
  const isValid = newPassword.length >= 6 && passwordsMatch && confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      await resetPassword({ token, newPassword });
      setDone(true);
      // Redireciona para login após 4 segundos
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      setError(err.message || 'Erro ao redefinir a password. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

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
                bgcolor: done ? 'success.main' : 'primary.main',
                mb: 2,
                transition: 'background-color 0.3s ease',
              }}
            >
              {done
                ? <CheckCircleIcon sx={{ fontSize: 32, color: 'white' }} />
                : <LockResetIcon sx={{ fontSize: 32, color: 'white' }} />
              }
            </Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {done ? 'Password redefinida!' : 'Nova Password'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {done
                ? 'Vai ser redirecionado para o login em instantes...'
                : 'Introduza e confirme a sua nova password'
              }
            </Typography>
          </Box>

          {done ? (
            <Stack spacing={3}>
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Password alterada com sucesso. Pode agora fazer login com a nova password.
              </Alert>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => navigate('/login')}
                sx={{ borderRadius: 2, textTransform: 'none', py: 1.5 }}
              >
                Ir para o Login
              </Button>
            </Stack>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                {error && (
                  <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="Nova Password"
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                  helperText="Mínimo 6 caracteres"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <TextField
                  fullWidth
                  label="Confirmar Nova Password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  error={confirmPassword.length > 0 && !passwordsMatch}
                  helperText={confirmPassword.length > 0 && !passwordsMatch ? 'As passwords não coincidem' : ''}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !isValid}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'A guardar...' : 'Guardar nova password'}
                </Button>
              </Stack>
            </Box>
          )}

          {!done && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                underline="hover"
                sx={{ color: 'primary.main', fontWeight: 600 }}
              >
                ← Voltar ao login
              </Link>
            </Box>
          )}
        </Paper>

        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'rgba(255,255,255,0.7)' }}
        >
          © 2024 APP — Todos os direitos reservados
        </Typography>
      </Container>
    </Box>
  );
};

export default ResetPasswordPage;
