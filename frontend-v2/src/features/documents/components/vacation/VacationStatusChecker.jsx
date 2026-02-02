import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  BeachAccess as VacationIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { documentsService } from '../../api/documentsService';

/**
 * Modal dialog for checking user vacation status before assigning work
 */
const VacationStatusChecker = ({
  open,
  onClose,
  onConfirm,
  userId,
  userName,
  title = 'Verificação de Disponibilidade',
}) => {
  const [vacationStatus, setVacationStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && userId) {
      const checkStatus = async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await documentsService.checkVacationStatus(userId);
          setVacationStatus(typeof result === 'object' ? result.vacation_status : result);
        } catch (err) {
          console.error('Erro ao verificar status de férias:', err);
          setError('Não foi possível verificar o status de disponibilidade');
          setVacationStatus(null);
        } finally {
          setLoading(false);
        }
      };
      checkStatus();
    }
  }, [open, userId]);

  const getStatusInfo = () => {
    if (error) {
      return {
        icon: <ErrorIcon color="error" sx={{ fontSize: 48 }} />,
        color: 'error',
        title: 'Erro na verificação',
        message: error,
        warning: 'Não foi possível verificar a disponibilidade. Prosseguir com cuidado.',
      };
    }
    if (vacationStatus === 1) {
      return {
        icon: <VacationIcon color="warning" sx={{ fontSize: 48 }} />,
        color: 'warning',
        title: 'Utilizador de férias',
        message: `${userName} encontra-se actualmente de férias`,
        warning: 'O utilizador pode não ver o pedido em tempo útil!',
      };
    }
    if (vacationStatus === 0) {
      return {
        icon: <CheckIcon color="success" sx={{ fontSize: 48 }} />,
        color: 'success',
        title: 'Utilizador disponível',
        message: `${userName} está disponível`,
        warning: null,
      };
    }
    return null;
  };

  const statusInfo = getStatusInfo();

  const handleConfirm = () => {
    onConfirm({
      userId,
      userName,
      vacationStatus,
      hasWarning: vacationStatus === 1 || error !== null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="primary" />
          {title}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" py={2}>
          {loading && (
            <Box py={3}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                A verificar disponibilidade de {userName}...
              </Typography>
            </Box>
          )}

          {!loading && statusInfo && (
            <>
              <Box mb={2}>{statusInfo.icon}</Box>

              <Typography variant="h6" gutterBottom>
                {statusInfo.title}
              </Typography>

              <Typography variant="body1" color="text.secondary" gutterBottom>
                {statusInfo.message}
              </Typography>

              <Box mt={2} mb={2}>
                <Chip label={userName} color={statusInfo.color} variant="outlined" />
              </Box>

              {statusInfo.warning && (
                <Alert
                  severity={statusInfo.color === 'success' ? 'info' : 'warning'}
                  sx={{ mt: 2, width: '100%' }}
                >
                  {statusInfo.warning}
                </Alert>
              )}

              {vacationStatus === 1 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Deseja prosseguir mesmo assim?
                </Typography>
              )}
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={statusInfo?.color === 'error' ? 'warning' : 'primary'}
          disabled={loading}
        >
          {vacationStatus === 1 ? 'Prosseguir Mesmo Assim' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VacationStatusChecker;
