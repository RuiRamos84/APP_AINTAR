import { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Grid, Divider, Typography, Switch, FormControlLabel,
  Tabs, Tab, Box, Chip, CircularProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  BeachAccess as FeriasIcon,
  Settings as ConfigIcon,
} from '@mui/icons-material';
import { useColaboradores } from '../hooks/useRhLookups';
import { useColaboradorConfig, useGestaoActions } from '../hooks/useGestaoColaboradores';

const currentYear = new Date().getFullYear();
const ANOS = [currentYear - 1, currentYear, currentYear + 1];

const TIPOS_CONTRATO = [
  'Efectivo', 'A Prazo', 'Estágio', 'Prestação de Serviços', 'Outro'
];

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// Converte qualquer formato de data (ISO, HTTP, Date) para YYYY-MM-DD
const toISODate = (v) => {
  if (!v) return '';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

// ─── Tab 1: Dados Pessoais / Perfil RH ───────────────────────────────────────
const PerfilTab = ({ colaborador, formRef }) => {
  const { colaboradores } = useColaboradores();

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      pk: 0,
      data_nascimento: '',
      data_admissao: '',
      categoria: '',
      tipo_contrato: '',
      num_mecanografico: '',
      departamento: '',
      superior_fk: '',
      dias_ferias_base: 22,
      elegivel_piquete: true,
      notas: '',
    },
  });

  useEffect(() => {
    if (colaborador) {
      reset({
        pk: colaborador.pk,
        data_nascimento: toISODate(colaborador.data_nascimento),
        data_admissao: toISODate(colaborador.data_admissao),
        categoria: colaborador.categoria || '',
        tipo_contrato: colaborador.tipo_contrato || '',
        num_mecanografico: colaborador.num_mecanografico || '',
        departamento: colaborador.departamento || '',
        superior_fk: colaborador.superior_fk || '',
        dias_ferias_base: colaborador.dias_ferias_base || 22,
        elegivel_piquete: colaborador.elegivel_piquete ?? true,
        notas: colaborador.notas_rh || '',
      });
    }
  }, [colaborador, reset]);

  const onSubmit = (data) => {
    const payload = {
      ...data,
      pk: colaborador.pk,
      dias_ferias_base: Number(data.dias_ferias_base),
      superior_fk: data.superior_fk ? Number(data.superior_fk) : null,
      data_nascimento: data.data_nascimento || null,
      data_admissao: data.data_admissao || null,
    };
    formRef.current?.(payload);
  };

  return (
    <form id="perfil-rh-form" onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
          Dados Pessoais
        </Typography>

        <Grid container spacing={2}>
          <Grid size={6}>
            <Controller name="data_nascimento" control={control}
              render={({ field }) => (
                <TextField {...field} label="Data de Nascimento" type="date"
                  size="small" fullWidth InputLabelProps={{ shrink: true }} />
              )}
            />
          </Grid>
          <Grid size={6}>
            <Controller name="data_admissao" control={control}
              render={({ field }) => (
                <TextField {...field} label="Data de Admissão" type="date"
                  size="small" fullWidth InputLabelProps={{ shrink: true }} />
              )}
            />
          </Grid>
          <Grid size={6}>
            <Controller name="num_mecanografico" control={control}
              render={({ field }) => (
                <TextField {...field} label="Nº Mecanográfico" size="small" fullWidth />
              )}
            />
          </Grid>
          <Grid size={6}>
            <Controller name="categoria" control={control}
              render={({ field }) => (
                <TextField {...field} label="Categoria / Cargo" size="small" fullWidth />
              )}
            />
          </Grid>
          <Grid size={6}>
            <Controller name="tipo_contrato" control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Contrato</InputLabel>
                  <Select {...field} label="Tipo de Contrato">
                    <MenuItem value="">—</MenuItem>
                    {TIPOS_CONTRATO.map(t => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid size={6}>
            <Controller name="departamento" control={control}
              render={({ field }) => (
                <TextField {...field} label="Departamento / Secção" size="small" fullWidth />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller name="superior_fk" control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Superior Hierárquico</InputLabel>
                  <Select {...field} label="Superior Hierárquico">
                    <MenuItem value="">— Nenhum —</MenuItem>
                    {colaboradores
                      .filter(c => c.pk !== colaborador?.pk)
                      .map(c => (
                        <MenuItem key={c.pk} value={c.pk}>{c.name}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
        </Grid>

        <Divider />
        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
          Configuração RH
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid size={4}>
            <Controller name="dias_ferias_base" control={control}
              render={({ field }) => (
                <TextField {...field} label="Dias Férias Base/Ano" type="number"
                  size="small" fullWidth
                  inputProps={{ min: 0, max: 60 }}
                  helperText="Valor padrão: 22 dias" />
              )}
            />
          </Grid>
          <Grid size={8}>
            <Controller name="elegivel_piquete" control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={!!field.value} onChange={e => field.onChange(e.target.checked)} />}
                  label="Elegível para Piquete"
                />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller name="notas" control={control}
              render={({ field }) => (
                <TextField {...field} label="Notas internas RH" multiline rows={2}
                  size="small" fullWidth />
              )}
            />
          </Grid>
        </Grid>

      </Stack>
    </form>
  );
};

// ─── Tab 2: Saldo de Férias por Ano ──────────────────────────────────────────
const SaldoTab = ({ colaborador }) => {
  const { configs, isLoading } = useColaboradorConfig(colaborador?.pk);
  const { guardarConfig, isGuardandoConfig, inicializarAno, isInicializando } = useGestaoActions();

  const [anoEdit, setAnoEdit] = useState(null);
  const [diasEdit, setDiasEdit] = useState('');
  const [transEdit, setTransEdit] = useState('');
  const [limiteEdit, setLimiteEdit] = useState('');
  const [notasEdit, setNotasEdit] = useState('');
  const [anoInit, setAnoInit] = useState(currentYear);

  const handleSaveConfig = async () => {
    if (!anoEdit) return;
    await guardarConfig({
      user_fk: colaborador.pk,
      ano: anoEdit,
      dias_total: Number(diasEdit),
      dias_transitados: transEdit !== '' ? Number(transEdit) : null,
      data_limite_transitados: limiteEdit || null,
      notas: notasEdit || null,
    });
    setAnoEdit(null);
  };

  const handleInitAno = async () => {
    await inicializarAno({ user_fk: colaborador.pk, ano: anoInit, force: false });
  };

  const isLimiteProximo = (limite) => {
    if (!limite) return false;
    const diff = (new Date(limite) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  const fmtDate = (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-PT') : null;

  if (isLoading) return <CircularProgress size={24} sx={{ mt: 2 }} />;

  return (
    <Stack spacing={3}>
      {/* Saldos existentes */}
      {configs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sem configuração anual registada. Use "Inicializar Saldo" abaixo.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {configs.map(cfg => {
            const trans = cfg.dias_transitados ?? 0;
            const transGoz = cfg.dias_transitados_gozados ?? 0;
            const transDisp = Math.max(trans - transGoz, 0);
            const limite = cfg.data_limite_transitados;
            const alerta = isLimiteProximo(limite);

            return (
              <Box key={cfg.pk}
                sx={{
                  p: 2, border: '1px solid', borderRadius: 2,
                  borderColor: alerta ? 'warning.main' : 'divider',
                  bgcolor: alerta ? 'warning.lighter' : 'background.paper',
                }}
              >
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                  <Box>
                    <Typography fontWeight={700} mb={1}>{cfg.ano}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                      <Chip label={`${cfg.dias_ferias_total} dias/ano`} size="small" color="primary" variant="outlined" />
                      <Chip label={`${cfg.dias_ferias_gozados ?? 0} gozados`} size="small" color="default" variant="outlined" />
                      {trans > 0 && (
                        <>
                          <Chip
                            label={`${transDisp} transitados disponíveis`}
                            size="small"
                            color={alerta ? 'warning' : 'info'}
                            variant="filled"
                          />
                          {limite && (
                            <Chip
                              label={`Prazo: ${fmtDate(limite)}`}
                              size="small"
                              color={alerta ? 'warning' : 'default'}
                              variant="outlined"
                            />
                          )}
                        </>
                      )}
                      <Chip
                        label={`${(cfg.dias_ferias_total + trans - (cfg.dias_ferias_gozados ?? 0) - transGoz)} disponíveis total`}
                        size="small"
                        color="success"
                        variant="filled"
                      />
                    </Stack>
                  </Box>
                  <Button size="small" onClick={() => {
                    setAnoEdit(cfg.ano);
                    setDiasEdit(cfg.dias_ferias_total);
                    setTransEdit(cfg.dias_transitados ?? 0);
                    setLimiteEdit(toISODate(cfg.data_limite_transitados));
                    setNotasEdit(cfg.notas || '');
                  }}>
                    Editar
                  </Button>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Formulário de edição */}
      {anoEdit && (
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'primary.light', borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="subtitle2" gutterBottom>A editar: {anoEdit}</Typography>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <TextField
                label="Dias férias do ano" type="number"
                value={diasEdit} onChange={e => setDiasEdit(e.target.value)}
                size="small" sx={{ width: 180 }} inputProps={{ min: 0, max: 60 }}
              />
              <TextField
                label="Dias transitados" type="number"
                value={transEdit} onChange={e => setTransEdit(e.target.value)}
                size="small" sx={{ width: 160 }}
                inputProps={{ min: 0 }}
                helperText="Do ano anterior"
              />
              <TextField
                label="Prazo transitados" type="date"
                value={limiteEdit} onChange={e => setLimiteEdit(e.target.value)}
                size="small" sx={{ width: 180 }}
                InputLabelProps={{ shrink: true }}
                helperText="Normalmente 30 Abr"
              />
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Notas" value={notasEdit} onChange={e => setNotasEdit(e.target.value)}
                size="small" sx={{ flex: 1 }}
              />
              <Button variant="contained" size="small" disabled={isGuardandoConfig} onClick={handleSaveConfig}>
                {isGuardandoConfig ? 'A guardar…' : 'Guardar'}
              </Button>
              <Button size="small" onClick={() => setAnoEdit(null)}>Cancelar</Button>
            </Stack>
          </Stack>
        </Box>
      )}

      <Divider />

      {/* Inicializar novo ano — calcula automaticamente transitados */}
      <Stack spacing={1}>
        <Typography variant="subtitle2">Inicializar saldo para ano</Typography>
        <Typography variant="caption" color="text.secondary">
          Calcula dias base por antiguidade e transita automaticamente o saldo remanescente do ano anterior (com prazo até 30 Abr).
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ width: 120 }}>
            <InputLabel>Ano</InputLabel>
            <Select value={anoInit} onChange={e => setAnoInit(e.target.value)} label="Ano">
              {ANOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" disabled={isInicializando} onClick={handleInitAno}>
            {isInicializando ? 'A inicializar…' : 'Inicializar Saldo'}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

// ─── Modal principal ──────────────────────────────────────────────────────────
const ColaboradorPerfilModal = ({ open, onClose, colaborador }) => {
  const [tab, setTab] = useState(0);
  const { guardarPerfil, isGuardandoPerfil } = useGestaoActions();
  // Ref que aponta para a função de submit do form activo
  const perfilSubmitRef = useRef(null);

  const handleSavePerfil = async (data) => {
    await guardarPerfil(data);
    onClose();
  };

  // Expõe a função onSave ao ref para que o DialogActions possa disparar
  perfilSubmitRef.current = handleSavePerfil;

  // Reset tab ao abrir
  useEffect(() => {
    if (open) setTab(0);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <PersonIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              {colaborador?.name || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Perfil RH e configuração de férias
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Perfil" />
          <Tab icon={<FeriasIcon fontSize="small" />} iconPosition="start" label="Saldo de Férias" />
        </Tabs>
      </Box>

      <DialogContent>
        <TabPanel value={tab} index={0}>
          <PerfilTab
            colaborador={colaborador}
            formRef={perfilSubmitRef}
          />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <SaldoTab colaborador={colaborador} />
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        {tab === 0 && (
          <Button
            type="submit"
            form="perfil-rh-form"
            variant="contained"
            disabled={isGuardandoPerfil}
          >
            {isGuardandoPerfil ? 'A guardar…' : 'Guardar Perfil'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ColaboradorPerfilModal;
