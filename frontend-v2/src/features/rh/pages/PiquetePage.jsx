import { useState, useMemo } from 'react';
import { Box, Button, Stack, Tabs, Tab, Chip, Typography, FormControl, Select, MenuItem } from '@mui/material';
import {
  Add as AddIcon,
  Refresh as GerarIcon,
  Settings as ConfigIcon,
  CheckCircle as ConfirmarIcon,
  Edit as EditIcon,
  NightShelter as PiqueteIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useAuth } from '@/core/contexts/AuthContext';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { usePiquete, usePiqueteRegras, useOcorrencias } from '../hooks/usePiquete';
import { useRhLookups } from '../hooks/useRhLookups';
import EstadoBadge from '../components/EstadoBadge';
import EscalaModal from '../components/EscalaModal';
import PiqueteRegrasModal from '../components/PiqueteRegrasModal';
import OcorrenciaModal from '../components/OcorrenciaModal';

import { RH_COLOR as COLOR, fmtDate } from '../utils/rhUtils';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─── Escalas ────────────────────────────────────────────────────────────────
const EscalasTab = ({ lookups }) => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission('rh.admin') || user?.profile === 0;

  const now = new Date();
  const [search, setSearch] = useState('');
  const [ano, setAno]       = useState(now.getFullYear());
  const [mes, setMes]       = useState(now.getMonth() + 1);

  const [modalOpen, setModalOpen]   = useState(false);
  const [regrasOpen, setRegrasOpen] = useState(false);
  const [selected, setSelected]     = useState(null);

  const {
    escalas, isLoading, gerar, isGerando, confirmar, isConfirmando,
    criar, isCriando, editar, isEditando
  } = usePiquete({ ano, mes });
  
  const { regras, save: saveRegras, isSaving: isSavingRegras } = usePiqueteRegras();
  const results = useSearch(escalas, search);

  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit   = (row) => { setSelected(row); setModalOpen(true); };

  const handleSave = async (data) => {
    if (selected) await editar(data);
    else await criar(data);
    setModalOpen(false);
  };

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
      field: '_acoes', headerName: 'Acções', width: 200, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
          {!row.confirmado && row.tb_user_fk === user?.user_id && (
            <Button size="small" startIcon={<ConfirmarIcon />}
              disabled={isConfirmando}
              onClick={() => confirmar(row.pk)}>
              Confirmar
            </Button>
          )}
          {isAdmin && (
            <Button size="small" color="inherit" startIcon={<EditIcon />}
              onClick={() => openEdit(row)}>
              Editar
            </Button>
          )}
        </Stack>
      ),
    },
  ], [confirmar, isConfirmando, user?.user_id, isAdmin]);

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        <SearchBar searchTerm={search} onSearch={setSearch} placeholder="Pesquisar…" />
        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={mes} onChange={e => setMes(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('pt-PT', { month: 'long' })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <Select value={ano} onChange={e => setAno(Number(e.target.value))}>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" spacing={1}>
          {isAdmin && (
            <>
              <Button variant="outlined" startIcon={<ConfigIcon />} onClick={() => setRegrasOpen(true)} size="small">
                Regras
              </Button>
              <Button variant="contained" startIcon={<GerarIcon />} disabled={isGerando} onClick={() => gerar({ ano, mes })} size="small"
                sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}>
                {isGerando ? 'A gerar…' : 'Gerar Escala'}
              </Button>
            </>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} size="small"
            sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}>
            Manual
          </Button>
        </Stack>
      </Stack>

      <DataGrid
        rows={results} columns={columns} loading={isLoading}
        autoHeight density="compact"
        pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{ border: 0 }}
      />
      <EscalaModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        initial={selected} onSave={handleSave}
        lookups={lookups} isLoading={isCriando || isEditando}
      />
      <PiqueteRegrasModal
        open={regrasOpen}
        onClose={() => setRegrasOpen(false)}
        regras={regras}
        onSave={async (data) => {
          await saveRegras(data);
          setRegrasOpen(false);
        }}
        isSaving={isSavingRegras}
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
        <SearchBar searchTerm={search} onSearch={setSearch} placeholder="Pesquisar…" />
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
