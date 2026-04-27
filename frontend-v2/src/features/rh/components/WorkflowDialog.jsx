import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Stack, Typography,
} from '@mui/material';

const ESTADOS = [
  { value: 2, label: 'Validado (Superior)' },
  { value: 3, label: 'Aprovado RH' },
  { value: 4, label: 'Rejeitado' },
];

const WorkflowDialog = ({ open, onClose, refPk, tipoRef, onConfirm, isLoading }) => {
  const [step, setStep]     = useState(1);
  const [estado, setEstado] = useState('');
  const [notas, setNotas]   = useState('');

  const handleConfirm = async () => {
    await onConfirm({ ref_pk: refPk, step, ts_estado_fk: Number(estado), notas: notas || null });
    setEstado('');
    setNotas('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Acção de Workflow</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Registo #{refPk} — {tipoRef}
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Nível</InputLabel>
            <Select value={step} label="Nível" onChange={e => setStep(e.target.value)}>
              <MenuItem value={1}>1 — Superior</MenuItem>
              <MenuItem value={2}>2 — Admin RH</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" required>
            <InputLabel>Decisão</InputLabel>
            <Select value={estado} label="Decisão" onChange={e => setEstado(e.target.value)}>
              {ESTADOS.map(e => (
                <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Notas (opcional)"
            multiline rows={2}
            size="small" fullWidth
            value={notas}
            onChange={e => setNotas(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained" onClick={handleConfirm}
          disabled={!estado || isLoading}
        >
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkflowDialog;
