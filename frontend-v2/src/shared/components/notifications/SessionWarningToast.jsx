/**
 * SessionWarningToast Component
 * Toast customizado para avisos de sessão com countdown timer
 * Usado com Sonner toast.custom() para uma UX moderna
 *
 * Features:
 * - Countdown timer visual
 * - Botões de ação Material-UI
 * - Design moderno e responsivo
 * - Integrado com Sonner
 */

import { useState, useEffect } from 'react';
import { Box, Button, Typography, LinearProgress, Paper } from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';

export const SessionWarningToast = ({ remainingTime, onContinue, onLogout, toastId }) => {
  const [timeLeft, setTimeLeft] = useState(remainingTime);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1000;
        return newTime >= 0 ? newTime : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // Calcular minutos e segundos
  const totalSeconds = Math.floor(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Calcular progresso (0-100%)
  const progress = (timeLeft / remainingTime) * 100;

  // Cor baseada no tempo restante
  const getColor = () => {
    if (progress > 50) return 'warning';
    if (progress > 20) return 'error';
    return 'error';
  };

  return (
    <Paper
      elevation={8}
      sx={{
        p: 3,
        minWidth: 400,
        maxWidth: 500,
        bgcolor: 'background.paper',
        border: '2px solid',
        borderColor: `${getColor()}.main`,
        borderRadius: 2,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <WarningIcon color={getColor()} sx={{ fontSize: 40 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Aviso de Inatividade
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A sua sessão está prestes a expirar
          </Typography>
        </Box>
      </Box>

      {/* Countdown Timer */}
      <Box
        sx={{
          textAlign: 'center',
          my: 3,
          p: 2,
          bgcolor: 'grey.100',
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Tempo restante:
        </Typography>
        <Typography
          variant="h2"
          fontWeight="bold"
          color={getColor()}
          sx={{ fontFamily: 'monospace' }}
        >
          {minutes}:{seconds.toString().padStart(2, '0')}
        </Typography>
      </Box>

      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={progress}
        color={getColor()}
        sx={{ mb: 3, height: 8, borderRadius: 1 }}
      />

      {/* Message */}
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
        Deseja continuar com a sessão?
      </Typography>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          startIcon={<CheckCircleIcon />}
          onClick={onContinue}
          sx={{ flex: 1 }}
        >
          Continuar Sessão
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          size="large"
          startIcon={<LogoutIcon />}
          onClick={onLogout}
          sx={{ flex: 1 }}
        >
          Terminar Sessão
        </Button>
      </Box>
    </Paper>
  );
};

export default SessionWarningToast;
