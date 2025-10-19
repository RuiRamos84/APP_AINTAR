import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  useTheme
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * Componente de diálogo de confirmação reutilizável
 *
 * @param {boolean} open - Se o diálogo está aberto
 * @param {function} onClose - Callback quando o diálogo é fechado
 * @param {function} onConfirm - Callback quando o usuário confirma
 * @param {string} title - Título do diálogo
 * @param {string} message - Mensagem do diálogo
 * @param {string} confirmText - Texto do botão de confirmação (padrão: "Confirmar")
 * @param {string} cancelText - Texto do botão de cancelar (padrão: "Cancelar")
 * @param {string} severity - Tipo de confirmação: "warning", "error", "info", "success" (padrão: "warning")
 * @param {boolean} isDarkMode - Se está em dark mode
 */
const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  severity = 'warning',
  isDarkMode = false
}) => {
  const theme = useTheme();

  const getIcon = () => {
    switch (severity) {
      case 'error':
        return <ErrorIcon sx={{ fontSize: 60, color: 'error.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: 60, color: 'warning.main' }} />;
      case 'info':
        return <InfoIcon sx={{ fontSize: 60, color: 'info.main' }} />;
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />;
      default:
        return <WarningIcon sx={{ fontSize: 60, color: 'warning.main' }} />;
    }
  };

  const getColor = () => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      default:
        return 'warning';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDarkMode ? theme.palette.background.paper : undefined,
        }
      }}
    >
      <DialogTitle
        sx={{
          textAlign: 'center',
          pt: 3,
          color: isDarkMode ? 'white' : undefined
        }}
      >
        {getIcon()}
        <div style={{ marginTop: 8 }}>{title}</div>
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          sx={{
            textAlign: 'center',
            color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
          }}
        >
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : undefined,
            color: isDarkMode ? 'white' : undefined,
            '&:hover': {
              borderColor: isDarkMode ? 'white' : undefined,
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : undefined
            }
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          variant="contained"
          color={getColor()}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
