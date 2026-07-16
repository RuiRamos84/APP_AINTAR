import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Stack, Typography, Box,
} from '@mui/material';
import { fmtDate, fmtTime } from '../utils/rhUtils';

// Workflow de 3 níveis específico para Participações de Ausência —
// partilhado entre ParticipacaoPage (acção individual na lista) e
// ParticipacaoDetalheModal (revisão a partir da Gestão Centralizada).

const STEPS = [
  { value: 1, label: '1 — Chefe direto (Autorização dos Serviços)' },
  { value: 2, label: '2 — Admin RH (Validação processual)' },
  { value: 3, label: '3 — Presidência (Despacho final)' },
];

const WF_TRANSICOES = {
  1: [
    { value: 2, label: 'Validar (Autorizado)' },
    { value: 4, label: 'Rejeitar' },
  ],
  2: [
    { value: 5, label: 'Autorizar (passa à Presidência)' },
    { value: 4, label: 'Rejeitar' },
  ],
  3: [
    { value: 6, label: 'Despachar (Aprovado)' },
    { value: 7, label: 'Rejeitar (Presidência)' },
  ],
};

const ParticipacaoWfDialog = ({ open, onClose, target, onConfirm, isLoading, initialStep, isAdmin }) => {
  const [step, setStep]     = useState(initialStep ?? 1);
  const [estado, setEstado] = useState('');
  const [notas, setNotas]   = useState('');

  useEffect(() => {
    if (open) {
      // Clamp para nível 1 se o utilizador não tiver rh.admin — steps 2/3
      // não estarão disponíveis nas opções abaixo.
      setStep(isAdmin ? (initialStep ?? 1) : 1);
      setEstado('');
      setNotas('');
    }
  }, [open, initialStep, isAdmin]);

  // Steps 2/3 exigem rh.admin no backend — não mostrar ao supervisor para
  // evitar um 403 surpresa ao escolher um nível a que não tem acesso.
  const stepsVisiveis = isAdmin ? STEPS : STEPS.filter(s => s.value === 1);
  const opcoes = WF_TRANSICOES[step] || [];

  const handleConfirm = async () => {
    await onConfirm({ ref_pk: target?.pk, step, ts_estado_fk: Number(estado), notas: notas || null });
    setEstado(''); setNotas('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Workflow — Participação #{target?.pk}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Colaborador: <strong>{target?.colaborador_nome}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Período: {fmtDate(target?.data_inicio)}
              {target?.tipo === 'dia' && target?.data_fim !== target?.data_inicio
                ? ` a ${fmtDate(target?.data_fim)}`
                : ''}
              {target?.tipo === 'parcial'
                ? ` · ${fmtTime(target?.hora_inicio)} – ${fmtTime(target?.hora_fim)}`
                : ''}
            </Typography>
          </Box>

          <FormControl fullWidth size="small">
            <InputLabel>Nível de aprovação</InputLabel>
            <Select value={step} label="Nível de aprovação"
              disabled={!isAdmin}
              onChange={e => { setStep(e.target.value); setEstado(''); }}>
              {stepsVisiveis.map(s => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" required>
            <InputLabel>Decisão *</InputLabel>
            <Select value={estado} label="Decisão *"
              onChange={e => setEstado(e.target.value)}>
              {opcoes.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField label="Notas (opcional)" multiline rows={2}
            size="small" fullWidth value={notas}
            onChange={e => setNotas(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={handleConfirm}
          disabled={!estado || isLoading}>
          {isLoading ? 'A processar…' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ParticipacaoWfDialog;
