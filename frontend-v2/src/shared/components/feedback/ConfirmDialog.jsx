/**
 * ConfirmDialog - Dialog de confirmação reutilizável
 *
 * Substitui window.confirm() por um dialog MUI estilizado
 *
 * @example
 * <ConfirmDialog
 *   open={open}
 *   title="Encerrar tarefa?"
 *   message="Esta ação irá arquivar a tarefa."
 *   confirmText="Encerrar"
 *   confirmColor="warning"
 *   onConfirm={handleConfirm}
 *   onCancel={handleCancel}
 * />
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const iconMap = {
  warning: WarningIcon,
  info: InfoIcon,
  error: ErrorIcon,
  success: SuccessIcon,
};

const colorMap = {
  warning: 'warning.main',
  info: 'info.main',
  error: 'error.main',
  success: 'success.main',
};

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = 'primary',
  type = 'warning',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const theme = useTheme();
  const Icon = iconMap[type] || WarningIcon;
  const iconColor = colorMap[type] || 'warning.main';

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      {/* Header com cor */}
      <Box
        sx={{
          bgcolor: alpha(theme.palette[type]?.main || theme.palette.warning.main, 0.1),
          pt: 3,
          pb: 2,
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette[type]?.main || theme.palette.warning.main, 0.15),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: 32, color: iconColor }} />
        </Box>
        <Typography variant="h6" fontWeight={600} textAlign="center">
          {title}
        </Typography>
      </Box>

      {/* Mensagem */}
      <DialogContent sx={{ pt: 2, pb: 1, px: 3 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {message}
        </Typography>
      </DialogContent>

      {/* Botões */}
      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onCancel}
          disabled={loading}
          fullWidth
          sx={{ color: 'text.secondary' }}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
          fullWidth
        >
          {loading ? 'A processar...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmColor: PropTypes.oneOf(['primary', 'secondary', 'error', 'warning', 'info', 'success']),
  type: PropTypes.oneOf(['warning', 'info', 'error', 'success']),
  loading: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ConfirmDialog;
