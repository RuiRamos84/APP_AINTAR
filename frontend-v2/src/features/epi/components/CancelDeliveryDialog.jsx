/**
 * CancelDeliveryDialog - Anular entrega de EPI/Fardamento
 *
 * Dialog para confirmar anulação de uma entrega
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Box,
} from '@mui/material';
import { Warning } from '@mui/icons-material';
import { useEpi } from '../hooks/useEpi';
import { getCurrentDate } from '../services/epiService';

const CancelDeliveryDialog = ({ open, onClose, delivery, onSuccess }) => {
  const { returnDelivery, loading } = useEpi();
  const [memo, setMemo] = useState('');

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setMemo('');
    }
  }, [open]);

  // Handlers
  const handleConfirm = async () => {
    if (!delivery) return;

    try {
      await returnDelivery(delivery.pk, {
        pndata: getCurrentDate(),
        pnmemo: memo,
      });
      onSuccess?.();
      onClose();
    } catch {
      // Erro já tratado no hook
    }
  };

  // Formatação de data
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-PT');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color="error" />
        Anular Entrega
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Esta ação não pode ser revertida. A entrega será marcada como anulada mas permanecerá no
          histórico.
        </Alert>

        {delivery && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Tipo:</strong> {delivery.tt_epiwhat}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Data:</strong> {formatDate(delivery.data)}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Quantidade:</strong> {delivery.quantity}
            </Typography>
            {delivery.dim && (
              <Typography variant="body2">
                <strong>Tamanho:</strong> {delivery.dim}
              </Typography>
            )}
          </Box>
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Motivo da Anulação (opcional)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Ex: Entregue por engano, tamanho errado, etc."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained" color="error" disabled={loading}>
          {loading ? 'A anular...' : 'Confirmar Anulação'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancelDeliveryDialog;
