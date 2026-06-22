import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Typography, Box, Chip, Divider,
  IconButton, Tooltip, Alert, TextField, FormControl,
  InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  Map as MapIcon,
  FaceRetouchingNatural as FaceIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Add as AddIcon,
  CheckCircle as CompleteIcon,
  Warning as IncompleteIcon,
  LoginOutlined as EntradaIcon,
  LunchDining as AlmocoInicioIcon,
  FreeBreakfast as AlmocoFimIcon,
  LogoutOutlined as SaidaIcon,
  DirectionsWalk as SaidaTempIcon,
  KeyboardReturn as RegressoIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { LoadingButton } from '@mui/lab';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { usePontoActions } from '../hooks/usePonto';
import { useFaltas } from '../hooks/useFaltas';
import { useRhLookups } from '../hooks/useRhLookups';
import FaltaFormModal from './FaltaFormModal';
import {
  RH_COLOR as COLOR,
  fmtTime,
  calcHorasDia,
  statusDia,
  STATUS_COR,
} from '../utils/rhUtils';

const EVENTOS_MAP = {
  1: { label: 'Entrada',          icon: EntradaIcon,       color: '#16a34a' },
  2: { label: 'Início Almoço',    icon: AlmocoInicioIcon,  color: '#d97706' },
  3: { label: 'Fim Almoço',       icon: AlmocoFimIcon,     color: '#0891b2' },
  4: { label: 'Saída',            icon: SaidaIcon,         color: '#dc2626' },
  5: { label: 'Saída Temporária', icon: SaidaTempIcon,     color: '#7c3aed' },
  6: { label: 'Regresso',         icon: RegressoIcon,      color: '#0369a1' },
};

const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── Linha de evento com edição inline (admin) ────────────────────────────────

function EventoRow({ ev, isAdmin, onMapOpen, onSave, isSaving, dateStr }) {
  const [editing, setEditing] = useState(false);
  const [editTime, setEditTime] = useState('');
  const def  = EVENTOS_MAP[ev.tt_evento_fk] || {};
  const Icon = def.icon;

  const handleEditStart = () => {
    const t = fmtTime(ev.ts_registo) || '';
    setEditTime(t);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editTime) return;
    await onSave(ev.pk, `${dateStr}T${editTime}:00`);
    setEditing(false);
  };

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 1 }}>
      {/* Ícone */}
      <Box sx={{
        width: 32, height: 32, borderRadius: '50%',
        bgcolor: alpha(def.color || '#999', 0.12),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {Icon && <Icon sx={{ fontSize: 16, color: def.color }} />}
      </Box>

      {/* Nome */}
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 130 }}>
        {ev.evento_descr || def.label}
      </Typography>

      {/* Hora ou campo de edição */}
      {editing ? (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <TextField
            type="time"
            size="small"
            value={editTime}
            onChange={e => setEditTime(e.target.value)}
            sx={{ width: 110 }}
            inputProps={{ step: 60 }}
          />
          <Tooltip title="Guardar">
            <span>
              <IconButton size="small" color="primary" onClick={handleSave} disabled={isSaving}>
                <SaveIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Cancelar">
            <IconButton size="small" onClick={() => setEditing(false)}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : (
        <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ minWidth: 42 }}>
          {fmtTime(ev.ts_registo)}
        </Typography>
      )}

      {/* Badges + acções */}
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 'auto' }}>
        {ev.fonte === 'app+face' && (
          <Chip
            icon={<FaceIcon sx={{ fontSize: '12px !important' }} />}
            label="Face" size="small" color="success" variant="outlined"
            sx={{ height: 20, fontSize: 10 }}
          />
        )}
        {ev.fonte === 'correcao' && (
          <Chip label="Corrigido" size="small" color="warning" sx={{ height: 20, fontSize: 10 }} />
        )}
        {ev.tem_gps && (
          <Tooltip title="Ver localização GPS">
            <IconButton size="small" onClick={() => onMapOpen(ev)}>
              <MapIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
        {isAdmin && !editing && (
          <Tooltip title="Corrigir hora">
            <IconButton size="small" onClick={handleEditStart}>
              <EditIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}

// ─── Secção "Adicionar Evento" (admin) ───────────────────────────────────────

function AdicionarEventoForm({ dateStr, userFk, existingTypes, onAdicionado, isSaving }) {
  const [tipo, setTipo] = useState('');
  const [hora, setHora] = useState('');
  const [notas, setNotas] = useState('');

  const opcoesDisponiveis = Object.entries(EVENTOS_MAP)
    .filter(([fk]) => !existingTypes.has(Number(fk)))
    .map(([fk, def]) => ({ fk: Number(fk), label: def.label }));

  if (!opcoesDisponiveis.length) return null;

  const handleAdicionar = async () => {
    if (!tipo || !hora) return;
    await onAdicionado({
      user_fk: userFk,
      tt_evento_fk: Number(tipo),
      ts_registo: `${dateStr}T${hora}:00`,
      notas: notas || undefined,
    });
    setTipo('');
    setHora('');
    setNotas('');
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Typography variant="caption" fontWeight={700} color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
        Adicionar Evento em Falta
      </Typography>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Tipo de evento</InputLabel>
            <Select value={tipo} onChange={e => setTipo(e.target.value)} label="Tipo de evento">
              {opcoesDisponiveis.map(o => (
                <MenuItem key={o.fk} value={o.fk}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            type="time"
            size="small"
            label="Hora"
            value={hora}
            onChange={e => setHora(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 60 }}
            sx={{ width: 120 }}
          />
          <LoadingButton
            variant="contained"
            size="small"
            loading={isSaving}
            disabled={!tipo || !hora}
            startIcon={<AddIcon />}
            onClick={handleAdicionar}
            sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' }, alignSelf: 'center' }}
          >
            Adicionar
          </LoadingButton>
        </Stack>
        <TextField
          size="small"
          label="Notas (opcional)"
          value={notas}
          onChange={e => setNotas(e.target.value)}
          fullWidth
        />
      </Stack>
    </Box>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

const DiaDePontoModal = ({ open, onClose, dateStr, eventos, userFk, onMapOpen }) => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission('rh.admin');

  const { corrigir, isCorrigindo, adicionarAdmin, isAdicionandoAdmin } = usePontoActions(userFk);
  const { criar: criarFalta, isCriando: isCriandoFalta } = useFaltas();
  const { lookups } = useRhLookups();

  const [faltaOpen, setFaltaOpen] = useState(false);

  const sorted = useMemo(
    () => [...eventos].sort((a, b) => new Date(a.ts_registo) - new Date(b.ts_registo)),
    [eventos]
  );

  const status = statusDia(eventos);
  const horas  = calcHorasDia(eventos);
  const isPast = dateStr < todayStr();

  const existingTypes = useMemo(() => new Set(eventos.map(e => e.tt_evento_fk)), [eventos]);

  const dateLabel = dateStr
    ? new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : '';

  const handleCorrigir = async (pk, ts_registo) => {
    await corrigir({ pk, data: { ts_registo, notas: 'Correcção manual (responsável)' } });
  };

  const handleAdicionarAdmin = async (data) => {
    await adicionarAdmin(data);
  };

  const handleSaveFalta = async ({ pk, data: faltaData }) => {
    await criarFalta({ ...faltaData, user_fk: userFk });
    setFaltaOpen(false);
  };

  const showRegistarFalta = isPast && (status === 'vazio' || status === 'incompleto');

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        {/* Título */}
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ textTransform: 'capitalize', lineHeight: 1.3 }}
            >
              {dateLabel}
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
              {horas && (
                <Chip label={horas.str} size="small" variant="outlined" color="primary" />
              )}
              {status === 'completo' && (
                <Chip
                  icon={<CompleteIcon sx={{ fontSize: '14px !important' }} />}
                  label="Completo" size="small" color="success"
                />
              )}
              {status === 'incompleto' && (
                <Chip
                  icon={<IncompleteIcon sx={{ fontSize: '14px !important' }} />}
                  label="Incompleto" size="small" color="warning"
                />
              )}
              {status === 'vazio' && (
                <Chip label="Sem registos" size="small" color="default" variant="outlined" />
              )}
            </Stack>
          </Stack>
        </DialogTitle>

        <Divider />

        {/* Conteúdo */}
        <DialogContent sx={{ pt: 1.5 }}>
          {sorted.length === 0 ? (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
              Sem registos de ponto para este dia.
            </Alert>
          ) : (
            <Stack divider={<Divider />}>
              {sorted.map((ev) => (
                <EventoRow
                  key={ev.pk}
                  ev={ev}
                  isAdmin={isAdmin}
                  onMapOpen={onMapOpen}
                  onSave={handleCorrigir}
                  isSaving={isCorrigindo}
                  dateStr={dateStr}
                />
              ))}
            </Stack>
          )}

          {isAdmin && (
            <AdicionarEventoForm
              dateStr={dateStr}
              userFk={userFk}
              existingTypes={existingTypes}
              onAdicionado={handleAdicionarAdmin}
              isSaving={isAdicionandoAdmin}
            />
          )}
        </DialogContent>

        <Divider />

        {/* Acções */}
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          {showRegistarFalta && (
            <Button
              variant="outlined"
              color="warning"
              onClick={() => setFaltaOpen(true)}
              sx={{ mr: 'auto' }}
            >
              Registar Falta
            </Button>
          )}
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de falta (nested) */}
      <FaltaFormModal
        open={faltaOpen}
        onClose={() => setFaltaOpen(false)}
        onSave={handleSaveFalta}
        isSaving={isCriandoFalta}
        initial={{ tb_user_fk: userFk, data: dateStr, tt_tipo_falta_fk: 1, notas: '', comunicado_por: '', pk: null }}
        lookups={lookups}
      />
    </>
  );
};

export default DiaDePontoModal;
