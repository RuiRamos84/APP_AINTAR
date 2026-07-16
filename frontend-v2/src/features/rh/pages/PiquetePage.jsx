import { useState, useMemo } from 'react';
import { Box, Button, Stack, Tabs, Tab, Chip, FormControl, Select, MenuItem, Alert } from '@mui/material';
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

const MESES = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('pt-PT', { month: 'long' }),
}));

// ─── Escalas (só DataGrid) ───────────────────────────────────────────────────
const EscalasTab = ({ search, escalas, isLoading, isError, onRetry, confirmar, isConfirmando, isAdmin, user, onEdit }) => {
  const results = useSearch(escalas, search);

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
              disabled={isConfirmando} onClick={() => confirmar(row.pk)}>
              Confirmar
            </Button>
          )}
          {isAdmin && (
            <Button size="small" color="inherit" startIcon={<EditIcon />}
              onClick={() => onEdit(row)}>
              Editar
            </Button>
          )}
        </Stack>
      ),
    },
  ], [confirmar, isConfirmando, user?.user_id, isAdmin, onEdit]);

  if (isError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}
        action={<Button color="inherit" size="small" onClick={onRetry}>Tentar novamente</Button>}>
        Erro ao carregar escalas de piquete.
      </Alert>
    );
  }

  return (
    <DataGrid
      rows={results} columns={columns} loading={isLoading}
      autoHeight density="compact"
      pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
      localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
      sx={{ border: 0 }}
    />
  );
};

// ─── Ocorrências (só DataGrid) ───────────────────────────────────────────────
const OcorrenciasTab = ({ search, ocorrencias, isLoading, onEdit }) => {
  const results = useSearch(ocorrencias, search);

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
          <Button size="small" onClick={() => onEdit(row)}>Editar</Button>
        </Stack>
      ),
    },
  ], [onEdit]);

  return (
    <DataGrid
      rows={results} columns={columns} loading={isLoading}
      autoHeight density="compact"
      pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
      localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
      sx={{ border: 0 }}
    />
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────
const PiquetePage = () => {
  const now = new Date();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const isAdmin = hasPermission('rh.admin');

  // Filtros
  const [tab, setTab]       = useState(0);
  const [search, setSearch] = useState('');
  const [mes, setMes]       = useState(now.getMonth() + 1);
  const [ano, setAno]       = useState(now.getFullYear());

  // Modal — Escalas
  const [escalaOpen, setEscalaOpen]   = useState(false);
  const [regrasOpen, setRegrasOpen]   = useState(false);
  const [selectedEscala, setSelectedEscala] = useState(null);

  // Modal — Ocorrências
  const [ocorrenciaOpen, setOcorrenciaOpen] = useState(false);
  const [selectedOcorrencia, setSelectedOcorrencia] = useState(null);
  const [escalaFk, setEscalaFk] = useState(null);

  // Hooks de dados
  const {
    escalas, isLoading: isLoadingEscalas, isError: isErrorEscalas, refetch: refetchEscalas,
    gerar, isGerando,
    confirmar, isConfirmando,
    criar: criarEscala, isCriando: isCriandoEscala,
    editar: editarEscala, isEditando: isEditandoEscala,
  } = usePiquete({ ano, mes });

  const { regras, save: saveRegras, isSaving: isSavingRegras } = usePiqueteRegras();

  const {
    ocorrencias, isLoading: isLoadingOcorrencias,
    criar: criarOcorrencia, isCriando: isCriandoOcorrencia,
    editar: editarOcorrencia, isEditando: isEditandoOcorrencia,
  } = useOcorrencias();

  const { lookups } = useRhLookups();

  const anos = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const handleTabChange = (_, v) => { setTab(v); setSearch(''); };

  // Handlers de modal — Escalas
  const openCreateEscala = () => { setSelectedEscala(null); setEscalaOpen(true); };
  const openEditEscala   = (row) => { setSelectedEscala(row); setEscalaOpen(true); };
  const handleSaveEscala = async (data) => {
    if (selectedEscala) await editarEscala(data);
    else await criarEscala(data);
    setEscalaOpen(false);
  };

  // Handlers de modal — Ocorrências
  const openCreateOcorrencia = () => { setSelectedOcorrencia(null); setEscalaFk(null); setOcorrenciaOpen(true); };
  const openEditOcorrencia   = (row) => { setSelectedOcorrencia(row); setEscalaFk(row.tb_piquete_escala_fk); setOcorrenciaOpen(true); };
  const handleSaveOcorrencia = async (data) => {
    if (selectedOcorrencia) await editarOcorrencia(data);
    else await criarOcorrencia(data);
    setOcorrenciaOpen(false);
  };

  return (
    <ModulePage
      title="Piquete"
      subtitle="Escalas semanais e ocorrências de serviço de piquete"
      icon={PiqueteIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Piquete' }]}
    >
      {/* Barra: tabs esquerda | controlos + botões direita */}
      <Stack
        direction="row"
        alignItems="center"
        sx={{ borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}
      >
        <Tabs value={tab} onChange={handleTabChange} sx={{ flex: '0 0 auto' }}>
          <Tab label="Escalas" />
          <Tab label="Ocorrências" />
        </Tabs>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ ml: 'auto', pr: 1, pb: 0.5 }}
        >
          <SearchBar searchTerm={search} onSearch={setSearch} />

          {/* Mês/Ano apenas na tab Escalas */}
          {tab === 0 && (
            <>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <Select value={mes} onChange={e => setMes(Number(e.target.value))}>
                  {MESES.map(m => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select value={ano} onChange={e => setAno(Number(e.target.value))}>
                  {anos.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </>
          )}

          {/* Botões de acção — Escalas */}
          {tab === 0 && (
            <>
              {isAdmin && (
                <>
                  <Button variant="outlined" size="small"
                    startIcon={<ConfigIcon />}
                    onClick={() => setRegrasOpen(true)}>
                    Regras
                  </Button>
                  <Button variant="contained" size="small"
                    startIcon={<GerarIcon />}
                    disabled={isGerando}
                    onClick={() => gerar({ ano, mes })}
                    sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' }, whiteSpace: 'nowrap' }}>
                    {isGerando ? 'A gerar…' : 'Gerar Escala'}
                  </Button>
                </>
              )}
              <Button variant="contained" size="small"
                startIcon={<AddIcon />}
                onClick={openCreateEscala}
                sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' }, whiteSpace: 'nowrap' }}>
                Manual
              </Button>
            </>
          )}

          {/* Botões de acção — Ocorrências */}
          {tab === 1 && (
            <Button variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateOcorrencia}
              sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' }, whiteSpace: 'nowrap' }}>
              Registar
            </Button>
          )}
        </Stack>
      </Stack>

      <TabPanel value={tab} index={0}>
        <EscalasTab
          search={search}
          escalas={escalas}
          isLoading={isLoadingEscalas}
          isError={isErrorEscalas}
          onRetry={refetchEscalas}
          confirmar={confirmar}
          isConfirmando={isConfirmando}
          isAdmin={isAdmin}
          user={user}
          onEdit={openEditEscala}
        />
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <OcorrenciasTab
          search={search}
          ocorrencias={ocorrencias}
          isLoading={isLoadingOcorrencias}
          onEdit={openEditOcorrencia}
        />
      </TabPanel>

      {/* Modais */}
      <EscalaModal
        open={escalaOpen}
        onClose={() => setEscalaOpen(false)}
        initial={selectedEscala}
        onSave={handleSaveEscala}
        lookups={lookups}
        isLoading={isCriandoEscala || isEditandoEscala}
      />
      <PiqueteRegrasModal
        open={regrasOpen}
        onClose={() => setRegrasOpen(false)}
        regras={regras}
        onSave={async (data) => { await saveRegras(data); setRegrasOpen(false); }}
        isSaving={isSavingRegras}
      />
      <OcorrenciaModal
        open={ocorrenciaOpen}
        onClose={() => setOcorrenciaOpen(false)}
        onSave={handleSaveOcorrencia}
        isSaving={isCriandoOcorrencia || isEditandoOcorrencia}
        escalaFk={escalaFk}
        initial={selectedOcorrencia}
        lookups={lookups}
      />
    </ModulePage>
  );
};

export default PiquetePage;
