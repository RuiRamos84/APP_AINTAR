import { useState, useMemo } from 'react';
import { Box, Button, Stack, Tabs, Tab, Chip, Typography } from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as GerarIcon,
  CheckCircle as ConfirmarIcon,
  NightShelter as PiqueteIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { usePiquete, useOcorrencias } from '../hooks/usePiquete';
import { useRhLookups } from '../hooks/useRhLookups';
import EstadoBadge from '../components/EstadoBadge';
import OcorrenciaModal from '../components/OcorrenciaModal';

const COLOR = '#E11D48';
const fmtDate = (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-PT') : '—';

const now = new Date();

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─── Escalas ────────────────────────────────────────────────────────────────
const EscalasTab = ({ lookups }) => {
  const [search, setSearch] = useState('');
  const [ano, setAno]       = useState(now.getFullYear());
  const [mes, setMes]       = useState(now.getMonth() + 1);

  const { escalas, isLoading, gerar, isGerando, confirmar, isConfirmando } = usePiquete({ ano, mes });
  const results = useSearch(escalas, search);

  const handleGerar = () => gerar({ ano, mes });

  const columns = useMemo(() => [
    { field: 'colaborador_nome', headerName: 'Colaborador', flex: 1, minWidth: 160 },
    {
      field: 'data_inicio', headerName: 'Semana Início', width: 130,
      renderCell: ({ value }) => fmtDate(value),
    },
    {
      field: 'data_fim', headerName: 'Semana Fim', width: 130,
      renderCell: ({ value }) => fmtDate(value),
    },
    {
      field: 'confirmado', headerName: 'Confirmado', width: 110,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip label={value ? 'Sim' : 'Não'} size="small"
            color={value ? 'success' : 'warning'} variant="filled" />
        </Box>
      ),
    },
    {
      field: 'estado_descr', headerName: 'Estado', width: 140,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <EstadoBadge descr={row.estado_descr} cor={row.estado_cor} />
        </Box>
      ),
    },
    {
      field: 'gerado_auto', headerName: 'Auto', width: 80,
      renderCell: ({ value }) => value ? 'Auto' : 'Manual',
    },
    {
      field: '_acoes', headerName: 'Acções', width: 130, sortable: false,
      renderCell: ({ row }) => (
        <Stack alignItems="center" sx={{ height: '100%' }}>
          {!row.confirmado && (
            <Button size="small" startIcon={<ConfirmarIcon />}
              disabled={isConfirmando}
              onClick={() => confirmar(row.pk)}>
              Confirmar
            </Button>
          )}
        </Stack>
      ),
    },
  ], [confirmar, isConfirmando]);

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar…" />
        <Stack direction="row" spacing={1}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 14 }}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('pt-PT', { month: 'long' })}
              </option>
            ))}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 14 }}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </Stack>
        <Button variant="outlined" startIcon={<GerarIcon />}
          disabled={isGerando} onClick={handleGerar}
          sx={{ borderColor: COLOR, color: COLOR }}>
          {isGerando ? 'A gerar…' : 'Gerar Escala'}
        </Button>
      </Stack>

      <DataGrid
        rows={results} columns={columns} loading={isLoading}
        autoHeight density="compact"
        pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{ border: 0 }}
      />
    </>
  );
};

// ─── Ocorrências ─────────────────────────────────────────────────────────────
const OcorrenciasTab = ({ lookups }) => {
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [escalaFk, setEscalaFk]   = useState(null);

  const { ocorrencias, isLoading, criar, isCriando, editar, isEditando } = useOcorrencias();
  const results = useSearch(ocorrencias, search);

  const openCreate = () => { setSelected(null); setEscalaFk(null); setModalOpen(true); };
  const openEdit   = (row) => { setSelected(row); setEscalaFk(row.tb_piquete_escala_fk); setModalOpen(true); };

  const handleSave = async (data) => {
    if (selected) await editar(data);
    else await criar(data);
    setModalOpen(false);
  };

  const columns = useMemo(() => [
    { field: 'colaborador_nome', headerName: 'Colaborador', flex: 1, minWidth: 160 },
    {
      field: 'semana_inicio', headerName: 'Semana', width: 130,
      renderCell: ({ value }) => fmtDate(value),
    },
    { field: 'tipo_descr', headerName: 'Tipo', width: 180 },
    { field: 'descr', headerName: 'Descrição', flex: 2, minWidth: 200 },
    { field: 'equipas_accionadas', headerName: 'Equipas', width: 160 },
    { field: 'created_by_nome', headerName: 'Registado por', width: 150 },
    {
      field: '_acoes', headerName: 'Acções', width: 90, sortable: false,
      renderCell: ({ row }) => (
        <Stack alignItems="center" sx={{ height: '100%' }}>
          <Button size="small" onClick={() => openEdit(row)}>Editar</Button>
        </Stack>
      ),
    },
  ], []);

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar…" />
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}>
          Registar
        </Button>
      </Stack>

      <DataGrid
        rows={results} columns={columns} loading={isLoading}
        autoHeight density="compact"
        pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{ border: 0 }}
      />

      <OcorrenciaModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        onSave={handleSave} isSaving={isCriando || isEditando}
        escalaFk={escalaFk} initial={selected} lookups={lookups}
      />
    </>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────
const PiquetePage = () => {
  const [tab, setTab] = useState(0);
  const { lookups } = useRhLookups();

  return (
    <ModulePage
      title="Piquete"
      subtitle="Escalas semanais e ocorrências de serviço de piquete"
      icon={PiqueteIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Piquete' }]}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Escalas" />
          <Tab label="Ocorrências" />
        </Tabs>
      </Box>

      <TabPanel value={tab} index={0}>
        <EscalasTab lookups={lookups} />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <OcorrenciasTab lookups={lookups} />
      </TabPanel>
    </ModulePage>
  );
};

export default PiquetePage;
