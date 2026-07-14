import { useState, useMemo } from 'react';
import {
  Box, Button, Stack, Chip, Typography, Alert, Tooltip, IconButton, Badge,
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
import ParticipacaoWfDialog from '../components/ParticipacaoWfDialog';
import { RH_COLOR as COLOR, fmtDate, fmtTime } from '../utils/rhUtils';

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
    removeAnexo, isRemovendo,
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
        onRemoveAnexo={removeAnexo}
        isRemovendoAnexo={isRemovendo}
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
