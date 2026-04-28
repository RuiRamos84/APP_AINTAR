import { useState, useMemo } from 'react';
import {
  Box, Button, Stack, Tabs, Tab, Typography, Card, CardContent,
  CardActionArea, Tooltip, Chip, CircularProgress, Alert,
  Switch, FormControlLabel, Grid, Divider, FormControl, Select, MenuItem,
} from '@mui/material';
import {
  AccessTime as PontoIcon,
  HowToReg as WorkflowIcon,
  Send as SubmeterIcon,
  LoginOutlined as EntradaIcon,
  LunchDining as AlmocoInicioIcon,
  FreeBreakfast as AlmocoFimIcon,
  LogoutOutlined as SaidaIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useAuth } from '@/core/contexts/AuthContext';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { usePontoHoje, usePontoMes, usePontoMensal, usePontoActions } from '../hooks/usePonto';
import EstadoBadge from '../components/EstadoBadge';
import WorkflowDialog from '../components/WorkflowDialog';

import { RH_COLOR as COLOR, fmtDate, fmtTime } from '../utils/rhUtils';

const EVENTOS = [
  { pk: 1, label: 'Entrada',       icon: EntradaIcon,     color: '#16a34a' },
  { pk: 2, label: 'Início Almoço', icon: AlmocoInicioIcon, color: '#d97706' },
  { pk: 3, label: 'Fim Almoço',    icon: AlmocoFimIcon,    color: '#0891b2' },
  { pk: 4, label: 'Saída',         icon: SaidaIcon,        color: '#dc2626' },
];


function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─── Tab 1: Registo de hoje ─────────────────────────────────────────────────

const HojeTab = ({ userFk }) => {
  const theme = useTheme();
  const { hasPermission } = usePermissions();
  const [useGps, setUseGps]       = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const { eventosHoje, isLoading } = usePontoHoje(userFk);
  const { registar, isRegistando } = usePontoActions(userFk);

  const eventosMap = useMemo(() => {
    const m = {};
    eventosHoje.forEach(e => { m[e.tt_evento_fk] = e; });
    return m;
  }, [eventosHoje]);

  const handleRegistar = async (eventoFk) => {
    let lat = null, lon = null, prec = null;

    if (useGps) {
      setGpsLoading(true);
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
        );
        lat  = pos.coords.latitude;
        lon  = pos.coords.longitude;
        prec = Math.round(pos.coords.accuracy);
      } catch {
        // GPS falhou — continua sem coordenadas
      } finally {
        setGpsLoading(false);
      }
    }

    await registar({ tt_evento_fk: eventoFk, latitude: lat, longitude: lon, precisao: prec });
  };

  const hoje = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
          {hoje}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={useGps}
              onChange={e => setUseGps(e.target.checked)}
              size="small"
              disabled={!hasPermission('rh.admin')}
            />
          }
          label={<Typography variant="body2">GPS</Typography>}
        />
      </Stack>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {EVENTOS.map(ev => {
          const registado = eventosMap[ev.pk];
          const Icon = ev.icon;
          return (
            <Grid size={{ xs: 6, sm: 3 }} key={ev.pk}>
              <Card
                elevation={registado ? 0 : 2}
                sx={{
                  border: `2px solid ${registado ? ev.color : alpha(ev.color, 0.3)}`,
                  bgcolor: registado ? alpha(ev.color, 0.08) : 'background.paper',
                  borderRadius: 3,
                  transition: 'all 0.2s',
                }}
              >
                {registado ? (
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Icon sx={{ fontSize: 36, color: ev.color, mb: 1 }} />
                    <Typography variant="subtitle2" fontWeight={700} color={ev.color}>
                      {ev.label}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
                      {fmtTime(registado.ts_registo)}
                    </Typography>
                    {registado.fonte === 'correcao' && (
                      <Chip label="Corrigido" size="small" color="warning" sx={{ mt: 0.5 }} />
                    )}
                    {registado.tem_gps && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        📍 GPS
                      </Typography>
                    )}
                  </CardContent>
                ) : (
                  <CardActionArea
                    onClick={() => handleRegistar(ev.pk)}
                    disabled={isRegistando || gpsLoading || isLoading}
                    sx={{ py: 3, textAlign: 'center' }}
                  >
                    {(isRegistando || gpsLoading) ? (
                      <CircularProgress size={36} sx={{ color: ev.color }} />
                    ) : (
                      <Icon sx={{ fontSize: 36, color: alpha(ev.color, 0.5), mb: 1 }} />
                    )}
                    <Typography variant="subtitle2" color="text.secondary">
                      {ev.label}
                    </Typography>
                    <Typography variant="caption" color={alpha(ev.color, 0.7)}>
                      Toque para registar
                    </Typography>
                  </CardActionArea>
                )}
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {eventosHoje.length === 0 && !isLoading && (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
          Sem registos para hoje. Toque em <strong>Entrada</strong> para começar.
        </Alert>
      )}
    </Box>
  );
};

// ─── Tab 2: Histórico mensal ─────────────────────────────────────────────────

const HistoricoTab = ({ userFk }) => {
  const now = new Date();
  const [ano, setAno]   = useState(now.getFullYear());
  const [mes, setMes]   = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');

  const { registosMes, isLoading } = usePontoMes(userFk, ano, mes);
  const { mapas } = usePontoMensal({ user_fk: userFk, ano, mes });
  const { submeter, isSubmetendo } = usePontoActions(userFk);
  const results = useSearch(registosMes, search);

  const mapaDoMes = mapas.find(m => m.ano === ano && m.mes === mes);

  const diasUnicos = useMemo(() => [...new Set(registosMes.map(r => r.data))].length, [registosMes]);

  const columns = useMemo(() => [
    {
      field: 'data', headerName: 'Data', width: 110,
      renderCell: ({ value }) => fmtDate(value),
    },
    { field: 'evento_descr', headerName: 'Evento', width: 150 },
    {
      field: 'ts_registo', headerName: 'Hora', width: 90,
      renderCell: ({ value }) => fmtTime(value),
    },
    { field: 'fonte', headerName: 'Fonte', width: 100 },
    {
      field: 'tem_gps', headerName: 'GPS', width: 70,
      renderCell: ({ value }) => value ? '📍' : '—',
    },
    { field: 'notas', headerName: 'Notas', flex: 1 },
  ], []);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
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
              {[now.getFullYear() - 1, now.getFullYear()].map(y => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <SearchBar searchTerm={search} onSearch={setSearch} placeholder="Filtrar…" />
      </Stack>

      {/* Resumo do mês */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Chip label={`${diasUnicos} dias registados`} color="primary" variant="outlined" />
        {mapaDoMes && (
          <>
            <Chip label={`${mapaDoMes.total_horas ?? '?'}h totais`} color="info" variant="outlined" />
            <EstadoBadge descr={mapaDoMes.estado_descr} cor={mapaDoMes.estado_cor} />
          </>
        )}
        {!mapaDoMes && registosMes.length > 0 && (
          <Button
            variant="contained" size="small" startIcon={<SubmeterIcon />}
            disabled={isSubmetendo}
            onClick={() => submeter({ ano, mes })}
            sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}
          >
            {isSubmetendo ? 'A submeter…' : 'Submeter para Aprovação'}
          </Button>
        )}
      </Stack>

      <DataGrid
        rows={results.map((r, i) => ({ ...r, id: r.pk ?? i }))}
        columns={columns}
        loading={isLoading}
        autoHeight
        density="compact"
        pageSizeOptions={[25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{ border: 0 }}
      />
    </Box>
  );
};

// ─── Tab 3: Aprovação (Admin) ─────────────────────────────────────────────────

const AprovacaoTab = () => {
  const now = new Date();
  const [ano, setAno]       = useState(now.getFullYear());
  const [mes, setMes]       = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [wfOpen, setWfOpen] = useState(false);
  const [wfTarget, setWfTarget] = useState(null);

  const { mapas, isLoading } = usePontoMensal({ ano, mes });
  const { workflow, isWorkflow } = usePontoActions(null);
  const results = useSearch(mapas, search);

  const columns = useMemo(() => [
    { field: 'colaborador_nome', headerName: 'Colaborador', flex: 1, minWidth: 160 },
    { field: 'ano', headerName: 'Ano', width: 70 },
    { field: 'mes', headerName: 'Mês', width: 70 },
    { field: 'total_dias', headerName: 'Dias', width: 70, type: 'number' },
    { field: 'total_horas', headerName: 'Horas', width: 80, type: 'number' },
    {
      field: 'submetido_em', headerName: 'Submetido', width: 160,
      renderCell: ({ value }) => value ? new Date(value).toLocaleString('pt-PT') : '—',
    },
    {
      field: 'estado_descr', headerName: 'Estado', width: 160,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <EstadoBadge descr={row.estado_descr} cor={row.estado_cor} />
        </Box>
      ),
    },
    {
      field: '_acoes', headerName: 'Acções', width: 120, sortable: false,
      renderCell: ({ row }) => (
        <Stack alignItems="center" sx={{ height: '100%' }}>
          {row.ts_estado_fk <= 2 && (
            <Button size="small" startIcon={<WorkflowIcon />}
              onClick={() => { setWfTarget(row); setWfOpen(true); }}>
              Aprovar
            </Button>
          )}
        </Stack>
      ),
    },
  ], []);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
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
              {[now.getFullYear() - 1, now.getFullYear()].map(y => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <SearchBar searchTerm={search} onSearch={setSearch} placeholder="Pesquisar…" />
      </Stack>

      <DataGrid
        rows={results}
        columns={columns}
        loading={isLoading}
        autoHeight
        density="compact"
        pageSizeOptions={[25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{ border: 0 }}
      />

      <WorkflowDialog
        open={wfOpen} onClose={() => setWfOpen(false)}
        refPk={wfTarget?.pk} tipoRef="ponto"
        onConfirm={workflow} isLoading={isWorkflow}
      />
    </Box>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const PontoPage = () => {
  const [tab, setTab] = useState(0);
  const { user } = useAuth();
  const userFk = user?.user_id;

  return (
    <ModulePage
      title="Registo de Ponto"
      subtitle="Controlo de presença diário e aprovação de mapas mensais"
      icon={PontoIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Registo de Ponto' }]}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Hoje" />
          <Tab label="Histórico" />
          <Tab label="Aprovação" />
        </Tabs>
      </Box>

      <TabPanel value={tab} index={0}>
        {userFk
          ? <HojeTab userFk={userFk} />
          : <Alert severity="warning">Não foi possível identificar o utilizador.</Alert>
        }
      </TabPanel>
      <TabPanel value={tab} index={1}>
        {userFk
          ? <HistoricoTab userFk={userFk} />
          : <Alert severity="warning">Não foi possível identificar o utilizador.</Alert>
        }
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <AprovacaoTab />
      </TabPanel>
    </ModulePage>
  );
};

export default PontoPage;
