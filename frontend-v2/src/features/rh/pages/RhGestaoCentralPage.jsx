import { useState, useMemo, useCallback } from 'react';
import { useGridApiRef } from '@mui/x-data-grid';
import {
  Box, Button, Stack, Tabs, Tab, Chip, Typography, Alert,
  FormControl, Select, MenuItem, Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard as GestaoIcon,
  CheckCircle as AprovarIcon,
  Cancel as RejeitarIcon,
  BeachAccess as FeriasIcon,
  EventBusy as FaltaIcon,
  AccessTime as PontoIcon,
  Badge as PartIcon,
  CheckCircleOutline as OkIcon,
  HighlightOff as AbsentIcon,
  NightShelter as PiqueteIcon,
  Warning as AlertIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { usePendentes, useEquipa } from '../hooks/useGestaoCentral';
import { useRhLookups } from '../hooks/useRhLookups';
import EstadoBadge from '../components/EstadoBadge';
import { RH_COLOR as COLOR, fmtDate, fmtTime } from '../utils/rhUtils';

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIPO_CONFIG = {
  ferias:       { label: 'Férias',        icon: <FeriasIcon sx={{ fontSize: 16 }} />, color: '#0284c7', step: 1 },
  faltas:       { label: 'Falta',         icon: <FaltaIcon  sx={{ fontSize: 16 }} />, color: '#d97706', step: 1 },
  ponto:        { label: 'Mapa de Ponto', icon: <PontoIcon  sx={{ fontSize: 16 }} />, color: '#7c3aed', step: 1 },
  participacao: { label: 'Participação',  icon: <PartIcon   sx={{ fontSize: 16 }} />, color: COLOR,     step: 1 },
};

// Mapeamento de ts_estado_fk para acção de aprovação/rejeição
const APROVAR_FK  = 2;  // Aprovado pelo supervisor (nível 1)
const REJEITAR_FK = 4;  // Rejeitado

// ─── Bulk Toolbar (aparece quando há selecção) ────────────────────────────────

const BulkToolbar = ({ selected, tipo, onAprovar, onRejeitar, isBulking }) => {
  if (selected.length === 0) return null;
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        px: 2, py: 1,
        bgcolor: 'primary.50',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" fontWeight={600}>
        {selected.length} seleccionado{selected.length !== 1 ? 's' : ''}
      </Typography>
      <Button
        size="small"
        variant="contained"
        color="success"
        startIcon={isBulking ? <CircularProgress size={14} color="inherit" /> : <AprovarIcon />}
        disabled={isBulking}
        onClick={() => onAprovar(selected, tipo)}
        sx={{ whiteSpace: 'nowrap' }}
      >
        Aprovar todos
      </Button>
      <Button
        size="small"
        variant="outlined"
        color="error"
        startIcon={<RejeitarIcon />}
        disabled={isBulking}
        onClick={() => onRejeitar(selected, tipo)}
        sx={{ whiteSpace: 'nowrap' }}
      >
        Rejeitar todos
      </Button>
    </Stack>
  );
};

// ─── Tab Pendentes ────────────────────────────────────────────────────────────

const PendentesTab = ({ search, tipoFiltro, pendentes, isLoading, isError, isBulking, onBulkAction }) => {
  const apiRef = useGridApiRef();
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = useMemo(() => {
    if (!tipoFiltro) return pendentes;
    return pendentes.filter(p => p.tipo === tipoFiltro);
  }, [pendentes, tipoFiltro]);

  const results = useSearch(filtered, search);

  const selectedTipo = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const first = results.find(r => r.id === selectedIds[0]);
    return first?.tipo || null;
  }, [selectedIds, results]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    apiRef.current?.setRowSelectionModel([]);
  }, [apiRef]);

  const handleAprovar = useCallback((ids, tipo) => {
    const pks = ids.map(id => Number(id.split('-')[1]));
    onBulkAction({ tipo, pks, step: 1, ts_estado_fk: APROVAR_FK });
    clearSelection();
  }, [onBulkAction, clearSelection]);

  const handleRejeitar = useCallback((ids, tipo) => {
    const pks = ids.map(id => Number(id.split('-')[1]));
    onBulkAction({ tipo, pks, step: 1, ts_estado_fk: REJEITAR_FK });
    clearSelection();
  }, [onBulkAction, clearSelection]);

  const columns = useMemo(() => [
    {
      field: 'tipo', headerName: 'Tipo', width: 150,
      renderCell: ({ value }) => {
        const cfg = TIPO_CONFIG[value] || {};
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '100%' }}>
            <Chip
              icon={cfg.icon}
              label={cfg.label}
              size="small"
              sx={{ bgcolor: cfg.color + '18', color: cfg.color, fontWeight: 600, border: `1px solid ${cfg.color}40` }}
            />
          </Box>
        );
      },
    },
    {
      field: 'colaborador_nome', headerName: 'Colaborador', flex: 1, minWidth: 150,
    },
    {
      field: 'data_inicio', headerName: 'Início', width: 110,
      renderCell: ({ value, row }) => {
        if (row.tipo === 'ponto') return `${row.mes}/${row.ano}`;
        return fmtDate(value);
      },
    },
    {
      field: 'data_fim', headerName: 'Fim / Período', width: 130,
      renderCell: ({ value, row }) => {
        if (row.tipo === 'ponto') return '—';
        if (value === row.data_inicio) return '—';
        return fmtDate(value);
      },
    },
    {
      field: 'ts_estado_fk', headerName: 'Estado', width: 160,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <EstadoBadge descr={row.estado_descr} cor={row.estado_cor} />
        </Box>
      ),
    },
    {
      field: 'created_at', headerName: 'Submetido', width: 120,
      renderCell: ({ value }) => fmtDate(value),
    },
    {
      field: 'notas', headerName: 'Notas', flex: 1, minWidth: 120,
      renderCell: ({ value }) => (
        <Typography variant="caption" color="text.secondary" noWrap>{value || '—'}</Typography>
      ),
    },
  ], []);

  if (isError) return <Alert severity="error" sx={{ m: 2 }}>Erro ao carregar pendentes.</Alert>;

  return (
    <Box>
      <BulkToolbar
        selected={selectedIds}
        tipo={selectedTipo}
        onAprovar={handleAprovar}
        onRejeitar={handleRejeitar}
        isBulking={isBulking}
      />
      <DataGrid
        apiRef={apiRef}
        rows={results}
        columns={columns}
        loading={isLoading}
        autoHeight
        density="compact"
        checkboxSelection
        disableRowSelectionOnClick
        onRowSelectionModelChange={(newSelection) => setSelectedIds([...newSelection])}
        isRowSelectable={({ row }) => {
          if (selectedIds.length === 0) return true;
          // Só permite seleccionar o mesmo tipo (workflow é por tipo)
          const firstSelected = results.find(r => r.id === selectedIds[0]);
          return !firstSelected || row.tipo === firstSelected.tipo;
        }}
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{ border: 0 }}
      />
    </Box>
  );
};

// ─── Tab Equipa ───────────────────────────────────────────────────────────────

const EquipaTab = ({ search, equipa, isLoading, isError }) => {
  const results = useSearch(equipa, search);

  const columns = useMemo(() => [
    { field: 'name', headerName: 'Colaborador', flex: 1, minWidth: 160 },
    { field: 'equipa_nome', headerName: 'Equipa', width: 180,
      renderCell: ({ value, row }) => value
        ? <span>{value} <Typography component="span" variant="caption" color="text.secondary">({row.equipa_codigo})</Typography></span>
        : <Typography variant="caption" color="text.disabled">—</Typography> },
    {
      field: 'entrada_hoje', headerName: 'Entrada Hoje', width: 120,
      renderCell: ({ value, row }) => {
        if (row.em_ferias_hoje) return <Chip label="Férias" size="small" color="info" variant="outlined" />;
        if (row.tem_falta_hoje) return <Chip label="Falta" size="small" color="warning" variant="outlined" />;
        if (!value) return (
          <Tooltip title="Sem registo de entrada">
            <AbsentIcon fontSize="small" color="error" />
          </Tooltip>
        );
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <OkIcon fontSize="small" color="success" />
            <Typography variant="caption">{fmtTime(value)}</Typography>
          </Stack>
        );
      },
    },
    {
      field: 'saida_hoje', headerName: 'Saída Hoje', width: 110,
      renderCell: ({ value }) => value
        ? <Typography variant="caption">{fmtTime(value)}</Typography>
        : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'dias_ferias_disponiveis', headerName: 'Férias Disp.', width: 110,
      renderCell: ({ value }) => (
        <Chip
          label={`${value ?? 0}d`}
          size="small"
          color={value > 5 ? 'success' : value > 0 ? 'warning' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'faltas_ano', headerName: 'Faltas Ano', width: 100,
      renderCell: ({ value }) => (
        <Chip
          label={value ?? 0}
          size="small"
          color={value === 0 ? 'default' : value <= 3 ? 'warning' : 'error'}
          variant={value === 0 ? 'outlined' : 'filled'}
        />
      ),
    },
    {
      field: 'piquete_semana_inicio', headerName: 'Piquete', width: 120,
      renderCell: ({ value }) => value
        ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <PiqueteIcon fontSize="small" color="secondary" />
            <Typography variant="caption">Semana {fmtDate(value)}</Typography>
          </Stack>
        )
        : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'horario_descr', headerName: 'Horário', flex: 1, minWidth: 130,
      renderCell: ({ value, row }) => value
        ? (
          <Stack justifyContent="center" sx={{ height: '100%' }}>
            <Typography variant="caption">{value}</Typography>
            {row.hora_entrada && (
              <Typography variant="caption" color="text.secondary">
                {row.hora_entrada?.slice(0, 5)} → {row.hora_saida?.slice(0, 5)}
              </Typography>
            )}
          </Stack>
        )
        : <Typography variant="caption" color="text.disabled">Sem horário</Typography>,
    },
  ], []);

  if (isError) return <Alert severity="error" sx={{ m: 2 }}>Erro ao carregar dados da equipa.</Alert>;

  return (
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
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const RhGestaoCentralPage = () => {
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission('rh.admin');

  const [tab, setTab]           = useState(0);
  const [search, setSearch]     = useState('');
  const [tipoFiltro, setTipo]   = useState('');

  const handleTabChange = (_, v) => { setTab(v); setSearch(''); };

  // Dados
  const { pendentes, isLoading: loadP, isError: errP, workflowBulk, isBulking } = usePendentes();
  const { equipa, isLoading: loadE, isError: errE } = useEquipa();
  const { lookups } = useRhLookups();
  const colabs = lookups?.colaboradores || [];

  // Contadores para badges nas tabs
  const totalPendentes = pendentes.length;
  const emFeriasHoje   = equipa.filter(c => c.em_ferias_hoje).length;
  const semEntrada     = equipa.filter(c => !c.entrada_hoje && !c.em_ferias_hoje && !c.tem_falta_hoje).length;

  const TabLabel = ({ label, count, color = 'error' }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {label}
      {count > 0 && (
        <Chip label={count} size="small" color={color}
          sx={{ height: 18, fontSize: 11, '& .MuiChip-label': { px: 0.8 } }} />
      )}
    </Box>
  );

  return (
    <ModulePage
      title="Gestão Centralizada RH"
      subtitle={isAdmin ? 'Painel de validação e supervisão de toda a equipa' : 'Painel de validação da sua equipa'}
      icon={GestaoIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Gestão Centralizada' }]}
    >
      {/* Barra: tabs esquerda | controlos direita */}
      <Stack
        direction="row"
        alignItems="center"
        sx={{ borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}
      >
        <Tabs value={tab} onChange={handleTabChange} sx={{ flex: '0 0 auto' }}>
          <Tab label={<TabLabel label="Pendentes" count={totalPendentes} />} />
          <Tab label={<TabLabel label="Equipa Hoje" count={semEntrada} color="warning" />} />
        </Tabs>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto', pr: 1, pb: 0.5 }}>
          <SearchBar searchTerm={search} onSearch={setSearch} />

          {/* Filtro de tipo (só na tab Pendentes) */}
          {tab === 0 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={tipoFiltro}
                onChange={e => setTipo(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">— Todos os tipos —</MenuItem>
                {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Badge de alertas na tab Equipa */}
          {tab === 1 && semEntrada > 0 && (
            <Chip
              icon={<AlertIcon />}
              label={`${semEntrada} sem entrada`}
              color="warning"
              variant="filled"
              size="small"
            />
          )}
          {tab === 1 && emFeriasHoje > 0 && (
            <Chip
              icon={<FeriasIcon />}
              label={`${emFeriasHoje} de férias`}
              color="info"
              variant="outlined"
              size="small"
            />
          )}
        </Stack>
      </Stack>

      {tab === 0 && (
        <Box sx={{ pt: 1 }}>
          <PendentesTab
            search={search}
            tipoFiltro={tipoFiltro}
            pendentes={pendentes}
            isLoading={loadP}
            isError={errP}
            isBulking={isBulking}
            onBulkAction={workflowBulk}
          />
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ pt: 1 }}>
          <EquipaTab
            search={search}
            equipa={equipa}
            isLoading={loadE}
            isError={errE}
          />
        </Box>
      )}
    </ModulePage>
  );
};

export default RhGestaoCentralPage;
