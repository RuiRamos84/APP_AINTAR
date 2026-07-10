import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, IconButton, LinearProgress,
} from '@mui/material';
import { Close as CloseIcon, ReportProblem as ReportIcon } from '@mui/icons-material';
import { useMyVehicle } from '../hooks/useMyVehicle';

const BreakdownReportModal = ({ open, onClose, tbVehicle }) => {
  const { reportIssue, isReporting } = useMyVehicle();
  const [memo, setMemo] = useState('');
  const [km, setKm] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setMemo('');
    setKm('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!memo.trim()) {
      setError('Descreva a avaria.');
      return;
    }
    try {
      await reportIssue({
        tb_vehicle: tbVehicle,
        memo: memo.trim(),
        km: km ? parseInt(km, 10) : undefined,
      });
      handleClose();
    } catch {
      // Erro tratado pelo toast no hook
    }
  };

  return (
    <Dialog open={open} onClose={isReporting ? undefined : handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReportIcon color="warning" />
            <Typography variant="h6" fontWeight={700}>Reportar Avaria</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={isReporting}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {isReporting && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          label="Descrição da avaria"
          fullWidth
          required
          multiline
          minRows={3}
          value={memo}
          onChange={(e) => { setMemo(e.target.value); setError(''); }}
          error={!!error}
          helperText={error}
        />
        <TextField
          label="Km atual (opcional)"
          type="number"
          fullWidth
          value={km}
          onChange={(e) => setKm(e.target.value)}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleClose} color="inherit" disabled={isReporting}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" color="warning" disabled={isReporting} startIcon={<ReportIcon />}>
          Reportar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BreakdownReportModal;
