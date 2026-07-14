import { useState, useMemo, useCallback } from 'react';
import {
  Box, Button, Stack, Tabs, Tab, Typography, Card, CardContent,
  CardActionArea, Tooltip, Chip, CircularProgress, Alert,
  Switch, FormControlLabel, Grid, FormControl, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, List,
  ListItem, ListItemText, ListItemSecondaryAction,
} from '@mui/material';
import {
  AccessTime as PontoIcon,
  HowToReg as WorkflowIcon,
  LoginOutlined as EntradaIcon,
  LunchDining as AlmocoInicioIcon,
  FreeBreakfast as AlmocoFimIcon,
  LogoutOutlined as SaidaIcon,
  DirectionsWalk as SaidaTempIcon,
  KeyboardReturn as RegressoIcon,
  Map as MapIcon,
  FaceRetouchingNatural as FaceIcon,
  VerifiedUser as EnrollIcon,
  DeleteOutline as ResetIcon,
  AdminPanelSettings as AdminFaceIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useAuth } from '@/core/contexts/AuthContext';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { usePontoHoje, usePontoMes, usePontoMensal, usePontoActions, useFaceStatus, useResetFaceAdmin, useFaceUsers } from '../hooks/usePonto';
import { useColaboradorPerfil } from '../hooks/useGestaoColaboradores';
import EstadoBadge from '../components/EstadoBadge';
import WorkflowDialog from '../components/WorkflowDialog';
import FaceCaptureModal from '../components/FaceCaptureModal';
import FaceEnrollModal from '../components/FaceEnrollModal';
import PontoCalendar from '../components/PontoCalendar';
import PontoMapDialog from '../components/PontoMapDialog';
import { verifyFace } from '../services/rhService';

import { useLocais } from '../hooks/usePontoLocais';
import { RH_COLOR as COLOR, fmtTime, faceErrorMsg } from '../utils/rhUtils';
import { toast } from 'sonner';

const EVENTOS = [
  { pk: 1, label: 'Entrada',          icon: EntradaIcon,      color: '#16a34a' },
  { pk: 2, label: 'Início Almoço',    icon: AlmocoInicioIcon,  color: '#d97706' },
  { pk: 3, label: 'Fim Almoço',       icon: AlmocoFimIcon,     color: '#0891b2' },
  { pk: 4, label: 'Saída',            icon: SaidaIcon,         color: '#dc2626' },
  { pk: 5, label: 'Saída Temporária', icon: SaidaTempIcon,     color: '#7c3aed' },
  { pk: 6, label: 'Regresso',         icon: RegressoIcon,      color: '#0369a1' },
];

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─── Tab 1: Registo de hoje ─────────────────────────────────────────────────

const HojeTab = ({ userFk }) => {
  const theme = useTheme();
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [faceOpen, setFaceOpen]       = useState(false);
  const [enrollOpen, setEnrollOpen]   = useState(false);
  const [pendingEvento, setPendingEvento] = useState(null);
  const { eventosHoje, isLoading } = usePontoHoje(userFk);
  const { registar, isRegistando } = usePontoActions(userFk);
  const { enrolled: faceEnrolled, refetch: refetchFaceStatus } = useFaceStatus(userFk);
  const { perfil } = useColaboradorPerfil(userFk);
  const gpsObrigatorio = perfil?.gps_obrigatorio ?? true;

  const eventosMap = useMemo(() => {
    const m = {};
    eventosHoje.forEach(e => { m[e.tt_evento_fk] = e; });
    return m;
  }, [eventosHoje]);

  // Dia encerrado quando Saída (evento 4) já foi registada
  const diaEncerrado = useMemo(() => Boolean(eventosMap[4]), [eventosMap]);

  // Último evento registado (para gerir eventos repetíveis 5 e 6)
  const lastEventFk = useMemo(() => {
    if (!eventosHoje.length) return null;
    return [...eventosHoje]
      .sort((a, b) => String(a.ts_registo).localeCompare(String(b.ts_registo)))
      .at(-1)?.tt_evento_fk ?? null;
  }, [eventosHoje]);

  // Última ocorrência de Saída Temporária e Regresso (para mostrar hora no card)
  const lastSaidaTemp = useMemo(() =>
    [...eventosHoje]
      .filter(e => e.tt_evento_fk === 5)
      .sort((a, b) => String(b.ts_registo).localeCompare(String(a.ts_registo)))[0] ?? null,
    [eventosHoje],
  );
  const lastRegresso = useMemo(() =>
    [...eventosHoje]
      .filter(e => e.tt_evento_fk === 6)
      .sort((a, b) => String(b.ts_registo).localeCompare(String(a.ts_registo)))[0] ?? null,
    [eventosHoje],
  );

  // ─── Passo 1: clique no evento → abre câmara ──────────────────────────────

  const handleRegistar = useCallback((eventoFk) => {
    if (!faceEnrolled) {
      toast.error('É necessário registar o seu rosto antes de efectuar registos de ponto. Clique em "Registar Rosto".');
      return;
    }
    setPendingEvento(eventoFk);
    setFaceOpen(true);
  }, [faceEnrolled]);

  // ─── Passo 2: câmara captou descritor → verificar no backend ─────────────

  const handleFaceCapture = useCallback(async (descriptor) => {
    setFaceOpen(false);

    let faceVerified = false;
    let faceScore    = null;

    try {
      const res = await verifyFace({ descriptor });
      faceVerified = res?.verified ?? false;
      faceScore    = res?.score ?? null;
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro na verificação facial.');
      setPendingEvento(null);
      return;
    }

    if (!faceVerified) {
      toast.error(faceErrorMsg(faceScore));
      setPendingEvento(null);
      return;
    }

    // ─── Passo 3: face OK → obter GPS → registar ─────────────────────────

    let lat = null, lon = null, prec = null;
    if (gpsObrigatorio) {
      setGpsLoading(true);
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            timeout: 15000,
            enableHighAccuracy: true,
          })
        );
        lat  = pos.coords.latitude;
        lon  = pos.coords.longitude;
        prec = Math.round(pos.coords.accuracy);
      } catch {
        toast.warning('GPS indisponível — registo efectuado sem localização');
      } finally {
        setGpsLoading(false);
      }
    }

    await registar({
      tt_evento_fk:  pendingEvento,
      latitude:      lat,
      longitude:     lon,
      precisao:      prec,
      face_verified: faceVerified,
      face_score:    faceScore,
    });

    setPendingEvento(null);
  }, [pendingEvento, gpsObrigatorio, registar]);

  const handleFaceClose = useCallback(() => {
    setFaceOpen(false);
    setPendingEvento(null);
  }, []);

  const handleEnrollSuccess = useCallback(() => {
    setEnrollOpen(false);
    refetchFaceStatus();
  }, [refetchFaceStatus]);

  const hoje = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }} flexWrap="wrap" gap={1}>
        <Typography variant="h6" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
          {hoje}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {faceEnrolled === false && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<EnrollIcon />}
              color="warning"
              onClick={() => setEnrollOpen(true)}
            >
              Registar Rosto
            </Button>
          )}
          {faceEnrolled === true && (
            <Chip icon={<FaceIcon />} label="Rosto Registado" color="success" size="small" variant="outlined" />
          )}
          <Tooltip title={gpsObrigatorio ? 'GPS activo — definido pelo departamento RH' : 'GPS desactivado pelo departamento RH'}>
            <FormControlLabel
              control={
                <Switch
                  checked={gpsObrigatorio}
                  size="small"
                  disabled
                />
              }
              label={
                <Typography variant="body2" color={gpsObrigatorio ? 'text.primary' : 'text.disabled'}>
                  GPS
                </Typography>
              }
            />
          </Tooltip>
        </Stack>
      </Stack>

      {faceEnrolled === false && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          O reconhecimento facial ainda não está configurado. Clique em <strong>Registar Rosto</strong> para activar os registos de ponto.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {EVENTOS.map(ev => {
          const Icon = ev.icon;
          const isRepetivel = ev.pk === 5 || ev.pk === 6;

          // Disponibilidade do evento — sequência + dia encerrado
          const isAtivo = (() => {
            if (eventosMap[ev.pk]) return false;        // já registado (ev. únicos)
            if (diaEncerrado) return false;             // dia encerrado após Saída
            if (isRepetivel) {
              return ev.pk === 5
                ? [1, 3, 6].includes(lastEventFk)      // Saída Temp: após Entrada/FimAlmoço/Regresso
                : lastEventFk === 5;                    // Regresso: apenas após Saída Temp
            }
            if (ev.pk === 1) return true;               // Entrada: sempre disponível se não registada
            if (!eventosMap[1]) return false;           // resto requer Entrada
            if (ev.pk === 3 && !eventosMap[2]) return false; // Fim Almoço requer Início Almoço
            return true;
          })();

          const baseDisabled = isRegistando || gpsLoading || isLoading || faceEnrolled === null || !faceEnrolled;
          const disabled = baseDisabled || !isAtivo;

          const registado = isRepetivel ? null : eventosMap[ev.pk];
          const lastOccurrence = ev.pk === 5 ? lastSaidaTemp : ev.pk === 6 ? lastRegresso : null;

          return (
            <Grid size={{ xs: 6, sm: 3 }} key={ev.pk}>
              <Card
                elevation={registado ? 0 : 2}
                sx={{
                  border: `2px solid ${registado || (isRepetivel && !isAtivo && lastOccurrence)
                    ? alpha(ev.color, 0.4)
                    : isAtivo ? ev.color : alpha(ev.color, 0.3)}`,
                  bgcolor: registado ? alpha(ev.color, 0.08) : 'background.paper',
                  borderRadius: 3,
                  transition: 'all 0.2s',
                }}
              >
                {registado ? (
                  /* Evento único já registado — mostra hora, sem botão */
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
                    {registado.fonte === 'app+face' && (
                      <Chip icon={<FaceIcon sx={{ fontSize: '14px !important' }} />} label="Face OK" size="small" color="success" sx={{ mt: 0.5 }} />
                    )}
                    {registado.tem_gps && (
                      <Typography variant="caption" color="text.secondary" display="block">📍 GPS</Typography>
                    )}
                  </CardContent>
                ) : (
                  /* Evento disponível (ou repetível) — sempre mostra botão */
                  <CardActionArea
                    onClick={() => handleRegistar(ev.pk)}
                    disabled={disabled}
                    sx={{ py: 3, textAlign: 'center' }}
                  >
                    {(isRegistando || gpsLoading) && pendingEvento === ev.pk ? (
                      <CircularProgress size={36} sx={{ color: ev.color }} />
                    ) : (
                      <Icon sx={{
                        fontSize: 36, mb: 1,
                        color: isAtivo && faceEnrolled ? ev.color : alpha(ev.color, 0.25),
                      }} />
                    )}
                    <Typography variant="subtitle2" color={isAtivo ? 'text.primary' : 'text.disabled'}>
                      {ev.label}
                    </Typography>
                    {/* Última hora registada para eventos repetíveis */}
                    {isRepetivel && lastOccurrence ? (
                      <Typography variant="caption" color={alpha(ev.color, 0.8)} fontWeight={600}>
                        Último: {fmtTime(lastOccurrence.ts_registo)}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color={isAtivo && faceEnrolled ? alpha(ev.color, 0.7) : 'text.disabled'}>
                        {!faceEnrolled
                          ? 'Rosto não registado'
                          : isAtivo
                            ? 'Toque para registar'
                            : diaEncerrado
                              ? 'Dia encerrado'
                              : ev.pk === 3 && !eventosMap[2]
                                ? 'Requer Início Almoço'
                                : !eventosMap[1] && ev.pk !== 1
                                  ? 'Requer Entrada'
                                  : 'Indisponível'}
                      </Typography>
                    )}
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

      {/* Modal de captura facial (verificação) */}
      <FaceCaptureModal
        open={faceOpen}
        onClose={handleFaceClose}
        onCapture={handleFaceCapture}
        title={`Verificação Facial — ${EVENTOS.find(e => e.pk === pendingEvento)?.label ?? ''}`}
      />

      {/* Modal de enrollment */}
      <FaceEnrollModal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        onSuccess={handleEnrollSuccess}
      />

    </Box>
  );
};

// ─── Tab 2: Histórico mensal ─────────────────────────────────────────────────

const HistoricoTab = ({ userFk, mes, ano }) => {
  const [mapTarget, setMapTarget] = useState(null);

  const { registosMes, isLoading } = usePontoMes(userFk, ano, mes);
  const { mapas } = usePontoMensal({ user_fk: userFk, ano, mes });
  const { submeter, isSubmetendo } = usePontoActions(userFk);
  const { locais } = useLocais();

  const mapaDoMes = mapas.find(m => m.ano === ano && m.mes === mes);

  if (isLoading) return <Box sx={{ pt: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <PontoCalendar
        registosMes={registosMes}
        mapaDoMes={mapaDoMes}
        ano={ano}
        mes={mes}
        onSubmeter={submeter}
        isSubmetendo={isSubmetendo}
        onMapOpen={setMapTarget}
        userFk={userFk}
      />
      <PontoMapDialog
        registo={mapTarget}
        locais={locais}
        onClose={() => setMapTarget(null)}
      />
    </Box>
  );
};

// ─── Tab 3: Aprovação (Admin) ─────────────────────────────────────────────────

const AprovacaoTab = ({ search, mes, ano }) => {
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

// ─── Tab 4: Gestão Facial (Admin) ────────────────────────────────────────────

const GestaoFacialTab = ({ search }) => {
  const [confirmUser, setConfirmUser] = useState(null);

  const { users, isLoading } = useFaceUsers();
  const resetAdmin = useResetFaceAdmin();
  const results = useSearch(users, search);

  return (
    <Box>
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        O reset remove todos os descritores faciais do colaborador. Ele terá de fazer novo registo antes de poder registar ponto.
      </Alert>

      {isLoading ? (
        <CircularProgress sx={{ mt: 3, display: 'block', mx: 'auto' }} />
      ) : (
        <List sx={{ mt: 1 }}>
          {results.map((u) => (
            <ListItem
              key={u.user_fk}
              divider
              sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <ListItemText
                primary={u.name}
                secondary={
                  u.enrolled
                    ? `${u.template_count} descritores registados`
                    : 'Sem rosto registado'
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
              <ListItemSecondaryAction>
                {u.enrolled ? (
                  <Chip
                    icon={<FaceIcon />}
                    label="Registado"
                    color="success"
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                ) : (
                  <Chip
                    label="Sem rosto"
                    color="default"
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                )}
                <Tooltip title="Remover registo facial deste colaborador">
                  <span>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={<ResetIcon />}
                      disabled={!u.enrolled || resetAdmin.isPending}
                      onClick={() => setConfirmUser(u)}
                    >
                      Reset
                    </Button>
                  </span>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Confirmação de reset admin */}
      <Dialog open={!!confirmUser} onClose={() => setConfirmUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Reset Facial</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Vai remover o registo facial de <strong>{confirmUser?.name}</strong>.
            O colaborador terá de fazer novo registo antes de poder registar ponto.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUser(null)} color="inherit">Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={resetAdmin.isPending}
            onClick={async () => {
              await resetAdmin.mutateAsync(confirmUser.user_fk);
              setConfirmUser(null);
            }}
          >
            {resetAdmin.isPending ? 'A remover…' : 'Confirmar Reset'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const MESES = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('pt-PT', { month: 'long' }),
}));

const PontoPage = () => {
  const now    = new Date();
  const [tab, setTab]   = useState(0);
  const [search, setSearch] = useState('');
  const [mes, setMes]   = useState(now.getMonth() + 1);
  const [ano, setAno]   = useState(now.getFullYear());

  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const userFk  = user?.user_id;
  const isAdmin = hasPermission('rh.admin');

  const anos = [now.getFullYear() - 1, now.getFullYear()];

  const handleTabChange = (_, v) => { setTab(v); setSearch(''); };

  // Controlos do lado direito da barra de tabs
  const showSearch  = tab === 2 || tab === 3; // Aprovação e Gestão Facial
  const showMesAno  = tab === 1 || tab === 2;

  return (
    <ModulePage
      title="Registo de Ponto"
      subtitle="Controlo de presença diário e aprovação de mapas mensais"
      icon={PontoIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Registo de Ponto' }]}
    >
      {/* Barra de tabs + controlos lado direito */}
      <Stack
        direction="row"
        alignItems="center"
        sx={{ borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}
      >
        <Tabs value={tab} onChange={handleTabChange} sx={{ flex: '0 0 auto' }}>
          <Tab label="Hoje" />
          <Tab label="Histórico" />
          <Tab label="Aprovação" />
          {isAdmin && (
            <Tab
              label="Gestão Facial"
              icon={<AdminFaceIcon fontSize="small" />}
              iconPosition="start"
            />
          )}
        </Tabs>

        {(showSearch || showMesAno) && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ ml: 'auto', pr: 1, pb: 0.5 }}
          >
            {showSearch && <SearchBar searchTerm={search} onSearch={setSearch} />}
            {showMesAno && (
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
          </Stack>
        )}
      </Stack>

      <TabPanel value={tab} index={0}>
        {userFk
          ? <HojeTab userFk={userFk} />
          : <Alert severity="warning">Não foi possível identificar o utilizador.</Alert>
        }
      </TabPanel>
      <TabPanel value={tab} index={1}>
        {userFk
          ? <HistoricoTab userFk={userFk} mes={mes} ano={ano} />
          : <Alert severity="warning">Não foi possível identificar o utilizador.</Alert>
        }
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <AprovacaoTab search={search} mes={mes} ano={ano} />
      </TabPanel>
      {isAdmin && (
        <TabPanel value={tab} index={3}>
          <GestaoFacialTab search={search} />
        </TabPanel>
      )}
    </ModulePage>
  );
};

export default PontoPage;
