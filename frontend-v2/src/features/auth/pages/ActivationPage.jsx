/**
 * ActivationPage
 * Ativação de conta de utilizador via link de email
 * Rota: /activation/:id/:activation_code
 */

import { useEffect, useState } from 'react';
import {
  Box, Container, Paper, Typography, Button,
  CircularProgress, Alert, Stack, LinearProgress,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { activateUser } from '@/services/userService';

const REDIRECT_DELAY = 8; // segundos até redirecionar para login

const ActivationPage = () => {
  const { id, activation_code } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);

  useEffect(() => {
    const activate = async () => {
      try {
        const res = await activateUser(id, activation_code);
        setMessage(res?.mensagem || 'Conta ativada com sucesso!');
        setStatus('success');
      } catch {
        setMessage('Não foi possível ativar a conta. O link pode ter expirado ou já foi utilizado.');
        setStatus('error');
      }
    };
    activate();
  }, [id, activation_code]);

  // Countdown para redirecionar após sucesso
  useEffect(() => {
    if (status !== 'success') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate]);

  const iconColor = status === 'success' ? 'success.main' : status === 'error' ? 'error.main' : 'primary.main';

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
            textAlign: 'center',
            background: (theme) =>
              theme.palette.mode === 'light'
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Ícone de estado */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: iconColor,
              mb: 3,
              transition: 'background-color 0.4s ease',
            }}
          >
            {status === 'loading' && <CircularProgress size={36} sx={{ color: 'white' }} />}
            {status === 'success' && <CheckCircleIcon sx={{ fontSize: 42, color: 'white' }} />}
            {status === 'error' && <ErrorOutlineIcon sx={{ fontSize: 42, color: 'white' }} />}
          </Box>

          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {status === 'loading' && 'A ativar conta...'}
            {status === 'success' && 'Conta ativada!'}
            {status === 'error' && 'Ativação falhada'}
          </Typography>

          <Typography variant="body1" color="text.secondary" mb={3}>
            {status === 'loading' && 'Estamos a processar a sua ativação. Por favor, aguarde.'}
            {(status === 'success' || status === 'error') && message}
          </Typography>

          <Stack spacing={2}>
            {status === 'success' && (
              <>
                <Alert severity="success" sx={{ borderRadius: 2, textAlign: 'left' }}>
                  Pode agora fazer login e começar a utilizar a aplicação.
                </Alert>

                {/* Barra de progresso do countdown */}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Redireccionando para o login em {countdown}s...
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={((REDIRECT_DELAY - countdown) / REDIRECT_DELAY) * 100}
                    sx={{ mt: 1, borderRadius: 1 }}
                  />
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<HowToRegIcon />}
                  onClick={() => navigate('/login')}
                  sx={{ borderRadius: 2, textTransform: 'none', py: 1.5, fontWeight: 600 }}
                >
                  Ir para o Login agora
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <Alert severity="error" sx={{ borderRadius: 2, textAlign: 'left' }}>
                  Se o problema persistir, contacte o administrador do sistema.
                </Alert>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{ borderRadius: 2, textTransform: 'none', py: 1.5 }}
                >
                  Ir para o Login
                </Button>
              </>
            )}
          </Stack>
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

export default ActivationPage;
