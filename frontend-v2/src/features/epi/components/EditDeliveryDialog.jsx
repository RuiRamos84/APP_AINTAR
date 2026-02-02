/**
 * EditDeliveryDialog - Editar entrega de EPI/Fardamento
 *
 * Dialog para editar data, quantidade, tamanho e observações de uma entrega
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
} from '@mui/material';
import { useEpi } from '../hooks/useEpi';

const EditDeliveryDialog = ({ open, onClose, delivery, onSuccess }) => {
  const { updateDelivery, loading } = useEpi();
  const [editData, setEditData] = useState({
    pndata: '',
    pnquantity: 1,
    pndim: '',
    pnmemo: '',
  });

  // Preencher dados ao abrir
  useEffect(() => {
    if (delivery) {
      const dateOnly = delivery.data ? delivery.data.split('T')[0] : '';
      setEditData({
        pndata: dateOnly,
        pnquantity: delivery.quantity || 1,
        pndim: delivery.dim || '',
        pnmemo: delivery.memo || '',
      });
    }
  }, [delivery]);

  // Handlers
  const handleSave = async () => {
    if (!delivery) return;

    try {
      await updateDelivery(delivery.pk, editData);
      onSuccess?.();
      onClose();
    } catch {
      // Erro já tratado no hook
    }
  };

  const handleSizeChange = (value) => {
    setEditData((prev) => ({
      ...prev,
      pndim: value.toUpperCase(),
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar Entrega</DialogTitle>
      <DialogContent>
        {delivery && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Tipo: <strong>{delivery.tt_epiwhat}</strong>
          </Typography>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="date"
              label="Data"
              value={editData.pndata}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  pndata: e.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="number"
              label="Quantidade"
              value={editData.pnquantity}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  pnquantity: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Tamanho"
              value={editData.pndim}
              onChange={(e) => handleSizeChange(e.target.value)}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Observações"
              value={editData.pnmemo}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  pnmemo: e.target.value,
                }))
              }
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? 'A guardar...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDeliveryDialog;
