import { useState, useMemo } from 'react';
import {
  Box, Button, Stack, Chip, Typography, Alert, Tooltip, IconButton, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  EventBusy as FaltasIcon,
  HowToReg as WfIcon,
  WarningAmber as AvisoIcon,
  Schedule as HoraIcon,
  CalendarMonth as DiaIcon,
  AttachFile as AnexoIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useAuth } from '@/core/contexts/AuthContext';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { useParticipacoes } from '../hooks/useParticipacao';
import EstadoBadge from '../components/EstadoBadge';
import ParticipacaoFormModal from '../components/ParticipacaoFormModal';
import { RH_COLOR as COLOR, fmtDate, fmtTime } from '../utils/rhUtils';

// ---------------------------------------------------------------------------
// Workflow dialog — 3 níveis específicos para participações
// ---------------------------------------------------------------------------

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

const ParticipacaoWfDialog = ({ open, onClose, target, onConfirm, isLoading }) => {
  const [step, setStep]     = useState(1);
  const [estado, setEstado] = useState('');
  const [notas, setNotas]   = useState('');

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
              onChange={e => { setStep(e.target.value); setEstado(''); }}>
              {STEPS.map(s => (
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ParticipacaoPage = () => {
  const { user }         = useAuth();
  const { hasPermission } = usePermissions();
  const isAdmin          = hasPermission('rh.admin');
  const userFk           = user?.user_id;

  const [search, setSearch]   = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [wfOpen, setWfOpen]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [wfTarget, setWfTarget] = useState(null);

  // Admins vêem todos; utilizadores normais apenas os próprios
  const params = useMemo(
    () => isAdmin ? {} : { user_fk: userFk },
    [isAdmin, userFk],
  );

  const {
    participacoes, isLoading, isError,
    criar, isCriando, editar, isEditando,
    workflow, isWorkflow,
    uploadAnexos, isUploading,
  } = useParticipacoes(params);

  const results = useSearch(participacoes, search);

  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit   = (row) => { setSelected(row); setModalOpen(true); };
  const openWf     = (row) => { setWfTarget(row); setWfOpen(true); };

  const handleSave = async (formData, files = []) => {
    let pk;
    if (selected) {
      await editar(formData);
      pk = selected.pk;
    } else {
      const result = await criar(formData);
      pk = result?.pk;
    }
    if (files.length > 0 && pk) {
      await uploadAnexos({ pk, files });
    }
    setModalOpen(false);
  };

  const columns = useMemo(() => [
    ...(isAdmin ? [{ field: 'colaborador_nome', headerName: 'Colaborador', flex: 1, minWidth: 150 }] : []),
    {
      field: 'tipo', headerName: 'Tipo', width: 130,
      renderCell: ({ value }) => (
        <Chip
          icon={value === 'parcial' ? <HoraIcon sx={{ fontSize: '14px !important' }} /> : <DiaIcon sx={{ fontSize: '14px !important' }} />}
          label={value === 'parcial' ? 'Parcial' : 'Dia(s)'}
          size="small"
          color={value === 'parcial' ? 'secondary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'data_inicio', headerName: 'Início', width: 110,
      renderCell: ({ value }) => fmtDate(value),
    },
    {
      field: '_periodo', headerName: 'Período', width: 130, sortable: false,
      renderCell: ({ row }) => row.tipo === 'parcial'
        ? `${fmtTime(row.hora_inicio)} – ${fmtTime(row.hora_fim)}`
        : row.data_fim !== row.data_inicio
          ? `até ${fmtDate(row.data_fim)}`
          : '—',
    },
    {
      field: 'motivo_artigo', headerName: 'Artigo', width: 140,
      renderCell: ({ value, row }) => value
        ? <Chip label={value} size="small" variant="outlined" title={row.motivo_descricao} />
        : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    {
      field: 'pre_aviso_dias', headerName: 'Pré-aviso', width: 110,
      renderCell: ({ value }) => {
        if (value === null || value === undefined) return '—';
        const color = value >= 5 ? 'success' : value >= 0 ? 'warning' : 'error';
        const label = value >= 5 ? `${value}d ✓` : value === 0 ? 'Mesmo dia' : `${value}d`;
        return <Chip label={label} size="small" color={color} variant="outlined"
          icon={value < 5 ? <AvisoIcon sx={{ fontSize: '14px !important' }} /> : undefined} />;
      },
    },
    {
      field: 'ts_estado_fk', headerName: 'Estado', width: 170,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <EstadoBadge descr={row.estado_descricao} cor={row.estado_cor} />
        </Box>
      ),
    },
    { field: 'data_participacao', headerName: 'Comunicado', width: 110,
      renderCell: ({ value }) => fmtDate(value) },
    {
      field: 'documentos', headerName: 'Anexos', width: 80, sortable: false,
      renderCell: ({ value, row }) => {
        const n = Array.isArray(value) ? value.length : 0;
        return (
          <Tooltip title={n > 0 ? `${n} anexo(s) — clique para ver` : 'Sem anexos'}>
            <span>
              <IconButton
                size="small"
                disabled={n === 0}
                onClick={() => openEdit(row)}
                sx={{ opacity: n > 0 ? 1 : 0.3 }}
              >
                <Badge badgeContent={n || null} color="primary">
                  <AnexoIcon sx={{ fontSize: 18 }} />
                </Badge>
              </IconButton>
            </span>
          </Tooltip>
        );
      },
    },
    {
      field: '_acoes', headerName: 'Acções', width: 160, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: '100%' }}>
          {row.ts_estado_fk <= 2 && (
            <Button size="small" onClick={() => openEdit(row)}>Editar</Button>
          )}
          {(isAdmin || hasPermission('rh.validate')) && (
            <Button size="small" color="secondary" startIcon={<WfIcon />}
              onClick={() => openWf(row)}>
              WF
            </Button>
          )}
        </Stack>
      ),
    },
  ], [isAdmin, hasPermission]);

  return (
    <ModulePage
      title="Participações de Ausências"
      subtitle="Faltas, ausências parciais e justificações"
      icon={FaltasIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Participações' }]}
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <SearchBar searchTerm={search} onSearch={setSearch} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' }, whiteSpace: 'nowrap' }}>
            Nova Participação
          </Button>
        </Stack>
      }
    >
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>Erro ao carregar participações.</Alert>
      )}

      <DataGrid
        rows={results}
        columns={columns}
        loading={isLoading}
        autoHeight
        density="compact"
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{ border: 0 }}
      />

      <ParticipacaoFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        isSaving={isCriando || isEditando || isUploading}
        initial={selected}
      />

      <ParticipacaoWfDialog
        open={wfOpen}
        onClose={() => setWfOpen(false)}
        target={wfTarget}
        onConfirm={workflow}
        isLoading={isWorkflow}
      />
    </ModulePage>
  );
};

export default ParticipacaoPage;
