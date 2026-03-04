/**
 * ForgotPasswordPage
 * Página de recuperação de password — envia email com link de reset
 */

import { useState } from 'react';
import {
  Box, Container, Paper, Typography, TextField,
  Button, Alert, Link, Stack,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LockResetIcon from '@mui/icons-material/LockReset';
import EmailIcon from '@mui/icons-material/Email';
import { passwordRecovery } from '@/services/userService';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await passwordRecovery(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Erro ao enviar email. Verifique o endereço e tente novamente.');
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
                bgcolor: 'primary.main',
                mb: 2,
              }}
            >
              <LockResetIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Recuperar Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Introduza o seu email e enviaremos um link para redefinir a password
            </Typography>
          </Box>

          {/* Estado: email enviado com sucesso */}
          {sent ? (
            <Stack spacing={3}>
              <Alert
                severity="success"
                icon={<EmailIcon />}
                sx={{ borderRadius: 2 }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Email enviado com sucesso!
                </Typography>
                <Typography variant="body2" mt={0.5}>
                  Verifique a sua caixa de entrada (e pasta de spam) para o link de recuperação.
                </Typography>
              </Alert>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={() => { setSent(false); setEmail(''); }}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Enviar novamente
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
                  label="Endereço de Email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !email.trim()}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'A enviar...' : 'Enviar link de recuperação'}
                </Button>
              </Stack>
            </Box>
          )}

          {/* Link de volta ao login */}
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

export default ForgotPasswordPage;
