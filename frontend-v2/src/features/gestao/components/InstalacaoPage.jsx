/**
 * InstalacaoPage — Componente partilhado para ETAR e EE.
 * Inclui seletor de instalação + tabs: Volumes | Água | Energia | Despesas | Intervenções | Incumprimentos
 */
import { useState, useMemo } from 'react';
import {
  Box, Tabs, Tab, Typography, TextField, Drawer, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, LinearProgress, Grid, Chip, InputAdornment,
  MenuItem, Paper, Divider, Alert,
} from '@mui/material';
import {
  Add as AddIcon, Close as CloseIcon,
  Waves as VolumeIcon, WaterDrop as WaterIcon,
  ElectricBolt as EnergyIcon, Euro as ExpenseIcon,
  Build as IntervencoesIcon, Warning as IncumpIcon,
  Send as SendIcon, Person as PersonIcon,
  Category as CategoryIcon, CalendarMonth as CalendarIcon,
  Info as InfoIcon, Edit as EditIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import * as z from 'zod';
import { toast } from 'sonner';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import {
  useExpenseTypes, useAssociates, useSpotList, useWhoList, useAnaliseParams,
} from '@/core/hooks/useMetaData';
import { useInstalacao } from '../hooks/useInstalacao';
import {
  createInstalacaoDesmatacao, createInstalacaoRetiradaLamas,
  createInstalacaoReparacao, createInstalacaoVedacao,
  createInstalacaoQualidadeAmbiental,
} from '../services/etarEeService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') || str.includes(' ') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};
const toStr = (date) =>
  date instanceof Date && !isNaN(date.getTime()) ? format(date, 'yyyy-MM-dd') : '';

const formatDate = (str) => {
  const d = toDate(str);
  return d ? d.toLocaleDateString('pt-PT') : '—';
};
const formatCurrency = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? '—' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);
};
const formatNum = (v, suffix = '') => {
  const n = parseFloat(v);
  return isNaN(n) ? '—' : `${n.toLocaleString('pt-PT')} ${suffix}`.trim();
};

const Cell = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>{children}</Box>
);

const EMPTY_STATE = (msg) => (
  <Box sx={{ py: 6, textAlign: 'center' }}>
    <Typography color="text.secondary" variant="body2">{msg}</Typography>
  </Box>
);

// ─── Grid locale ──────────────────────────────────────────────────────────────

const GRID_LOCALE = {
  noRowsLabel: 'Sem registos',
  MuiTablePagination: {
    labelRowsPerPage: 'Linhas por página:',
    labelDisplayedRows: ({ from, to, count }) =>
      `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`,
  },
};

// ─── Add Dialog generic wrapper ───────────────────────────────────────────────

const AddDialog = ({ open, onClose, title, icon: Icon, isAdding, onSubmit: handleSubmit, children }) => (
  <Dialog open={open} onClose={isAdding ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
    <DialogTitle sx={{ pb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {Icon && <Icon color="primary" />}
          <Typography variant="h6" fontWeight={700}>{title}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={isAdding}><CloseIcon fontSize="small" /></IconButton>
      </Box>
      {isAdding && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}
    </DialogTitle>
    <form onSubmit={handleSubmit}>
      <DialogContent dividers sx={{ pt: 2.5 }}>{children}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={isAdding}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={isAdding} startIcon={<AddIcon />}>
          Registar
        </Button>
      </DialogActions>
    </form>
  </Dialog>
);

// ─── TAB: Características ─────────────────────────────────────────────────────

const InfoField = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" fontWeight={600}
      sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500} sx={{ mt: 0.25 }}
      color={value != null && value !== '' ? 'text.primary' : 'text.disabled'}>
      {value != null && value !== '' ? value : '—'}
    </Typography>
  </Box>
);

const SectionHeader = ({ title, color }) => (
  <Typography variant="subtitle2" fontWeight={700} color={color}
    sx={{ mb: 1.5, pb: 0.5, borderBottom: `2px solid ${alpha(color, 0.2)}` }}>
    {title}
  </Typography>
);

const CaracteristicasTab = ({ pk, type, color, details: d = {}, isLoading, updateDetails, isUpdating }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const startEdit = () => {
    setForm({
      nome:          d.nome || '',
      coord_m:       d.coord_m != null ? String(d.coord_m) : '',
      coord_p:       d.coord_p != null ? String(d.coord_p) : '',
      ener_cpe:      d.ener_cpe || '',
      ener_potencia: d.ener_potencia != null ? String(d.ener_potencia) : '',
      ener_val:      d.ener_val != null ? String(d.ener_val) : '',
      ...(type === 'etar' ? {
        apa_licenca:  d.apa_licenca || '',
        apa_data_ini: d.apa_data_ini ? String(d.apa_data_ini).split('T')[0] : '',
        apa_data_fim: d.apa_data_fim ? String(d.apa_data_fim).split('T')[0] : '',
      } : {}),
    });
    setEditing(true);
  };

  const handleSave = async () => {
    await updateDetails({
      pk,
      data: {
        nome:          form.nome || null,
        coord_m:       form.coord_m ? parseFloat(form.coord_m) : null,
        coord_p:       form.coord_p ? parseFloat(form.coord_p) : null,
        ener_entidade: null,
        ener_cpe:      form.ener_cpe || null,
        ener_potencia: form.ener_potencia ? parseFloat(form.ener_potencia) : null,
        ener_val:      form.ener_val ? parseInt(form.ener_val, 10) : null,
        ...(type === 'etar' ? {
          apa_licenca:  form.apa_licenca || null,
          apa_data_ini: form.apa_data_ini || null,
          apa_data_fim: form.apa_data_fim || null,
        } : {}),
      },
    });
    setEditing(false);
  };

  const set = (name) => (e) => setForm((p) => ({ ...p, [name]: e.target.value }));

  // Returns TextField in edit mode, InfoField in view mode
  const F = (name, label, ftype = 'text') => editing
    ? <TextField label={label} value={form[name] ?? ''} onChange={set(name)} size="small" fullWidth
        type={ftype} InputLabelProps={ftype === 'date' ? { shrink: true } : undefined} />
    : <InfoField label={label} value={d[name]} />;

  if (isLoading) return <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />;

  return (
    <Box>
      {/* Acções */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5, gap: 1 }}>
        {editing ? (
          <>
            <Button size="small" color="inherit" onClick={() => setEditing(false)} disabled={isUpdating}>Cancelar</Button>
            <Button size="small" variant="contained" onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? 'A guardar…' : 'Guardar Alterações'}
            </Button>
          </>
        ) : (
          <Button size="small" variant="outlined" onClick={startEdit} startIcon={<EditIcon />}>Editar</Button>
        )}
      </Box>
      {isUpdating && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Identificação */}
      <Box sx={{ mb: 3 }}>
        <SectionHeader title="Identificação" color={color} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>{F('nome', 'Nome')}</Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField label="Associado" value={d.ts_entity} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField label="Subsistema" value={d.subsistema} /></Grid>
          {type === 'etar' && (<>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField label="Tipo" value={d.tt_tipoetar} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField label="Nível de Tratamento" value={d.nivel_tratamento} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField label="Linha de Tratamento" value={d.linha_tratamento} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField label="Pop. Dimensionada" value={d.pop_dimen} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField label="Pop. Servida" value={d.pop_servida} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoField label="Água Tratada (m³/ano)" value={d.agua_tratada} /></Grid>
            {d.memo && <Grid size={12}><InfoField label="Notas" value={d.memo} /></Grid>}
          </>)}
        </Grid>
      </Box>

      {/* Licença APA — ETAR only */}
      {type === 'etar' && (
        <Box sx={{ mb: 3 }}>
          <SectionHeader title="Licença APA" color={color} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{F('apa_licenca', 'Nº Licença')}</Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              {editing
                ? <TextField label="Início" value={form.apa_data_ini || ''} onChange={set('apa_data_ini')} size="small" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                : <InfoField label="Início" value={formatDate(d.apa_data_ini)} />}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              {editing
                ? <TextField label="Fim" value={form.apa_data_fim || ''} onChange={set('apa_data_fim')} size="small" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                : <InfoField label="Fim" value={formatDate(d.apa_data_fim)} />}
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Energia */}
      <Box sx={{ mb: 3 }}>
        <SectionHeader title="Energia" color={color} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>{F('ener_cpe', 'CPE')}</Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>{F('ener_potencia', 'Potência (kVA)', 'number')}</Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>{F('ener_val', 'Valor Contrato (€)', 'number')}</Grid>
        </Grid>
      </Box>

      {/* Localização */}
      <Box sx={{ mb: 1 }}>
        <SectionHeader title="Localização" color={color} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>{F('coord_m', 'Longitude')}</Grid>
          <Grid size={{ xs: 12, sm: 6 }}>{F('coord_p', 'Latitude')}</Grid>
        </Grid>
      </Box>
    </Box>
  );
};

// ─── TAB: Volumes ─────────────────────────────────────────────────────────────

const volSchema = z.object({
  pndate: z.string().min(1, 'Data obrigatória'),
  pnval:  z.string().min(1, 'Valor obrigatório').refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Valor inválido'),
  pnspot: z.string().min(1, 'Tipo obrigatório'),
});
const volDefaults = { pndate: toStr(new Date()), pnval: '', pnspot: '' };

const VolumeTab = ({ pk, color, data, isLoading, addVolume, isAdding }) => {
  const [open, setOpen] = useState(false);
  const { data: spots = [] } = useSpotList();
  const spotMap = useMemo(() => Object.fromEntries(spots.map((s) => [s.pk, s.value])), [spots]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(volSchema), defaultValues: volDefaults,
  });

  const onSubmit = async (vals) => {
    await addVolume({ pnpk: pk, pndate: vals.pndate, pnval: parseFloat(vals.pnval), pnspot: parseInt(vals.pnspot, 10) });
    reset(volDefaults);
    setOpen(false);
  };

  const cols = [
    { field: 'data', headerName: 'Data', width: 110, renderCell: ({ value }) => <Cell><Typography variant="body2">{formatDate(value)}</Typography></Cell> },
    {
      field: 'tt_readspot', headerName: 'Tipo', width: 160,
      renderCell: ({ value }) => <Cell><Chip label={spotMap[value] || value || '—'} size="small" color="primary" variant="outlined" /></Cell>,
    },
    {
      field: 'valor', headerName: 'Volume (m³)', flex: 1, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>{formatNum(value, 'm³')}</Typography></Cell>,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setOpen(true)}>
          Nova Leitura
        </Button>
      </Box>
      <DataGrid rows={data} columns={cols} loading={isLoading} autoHeight getRowHeight={() => 'auto'}
        disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        sx={{ borderRadius: 2, '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 } }}
        localeText={GRID_LOCALE} />

      <AddDialog open={open} onClose={() => { setOpen(false); reset(volDefaults); }} title="Nova Leitura de Volume"
        icon={VolumeIcon} isAdding={isAdding} onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <Controller name="pndate" control={control} render={({ field }) => (
              <DatePicker label="Data" value={toDate(field.value)} onChange={(d) => field.onChange(toStr(d))}
                slots={{ openPickerIcon: CalendarIcon }}
                slotProps={{ textField: { fullWidth: true, error: !!errors.pndate, helperText: errors.pndate?.message } }} />
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <Controller name="pnspot" control={control} render={({ field }) => (
              <TextField {...field} select label="Tipo de Leitura" fullWidth error={!!errors.pnspot} helperText={errors.pnspot?.message}>
                {spots.map((s) => <MenuItem key={s.pk} value={String(s.pk)}>{s.value}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid size={12}>
            <Controller name="pnval" control={control} render={({ field }) => (
              <TextField {...field} label="Volume (m³)" type="number" fullWidth inputProps={{ min: 0, step: '0.001' }}
                error={!!errors.pnval} helperText={errors.pnval?.message} />
            )} />
          </Grid>
        </Grid>
      </AddDialog>
    </Box>
  );
};

// ─── TAB: Água ────────────────────────────────────────────────────────────────

const waterSchema = z.object({
  pndate: z.string().min(1, 'Data obrigatória'),
  pnval:  z.string().min(1, 'Leitura obrigatória').refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Valor inválido'),
});
const waterDefaults = { pndate: toStr(new Date()), pnval: '' };

const WaterTab = ({ pk, color, data, isLoading, addWaterVolume, isAdding }) => {
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(waterSchema), defaultValues: waterDefaults,
  });

  const onSubmit = async (vals) => {
    await addWaterVolume({ pnpk: pk, pndate: vals.pndate, pnval: parseFloat(vals.pnval) });
    reset(waterDefaults);
    setOpen(false);
  };

  // Compute diasDecorridos and volumeConsumido from consecutive readings
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const sorted = [...data].sort((a, b) => new Date(a.data) - new Date(b.data));
    return sorted.map((row, i) => {
      if (i === 0) return { ...row, diasDecorridos: null, volumeConsumido: null };
      const prev = sorted[i - 1];
      const dias = Math.round((new Date(row.data) - new Date(prev.data)) / (1000 * 60 * 60 * 24));
      const consumo = parseFloat(row.valor) - parseFloat(prev.valor);
      return { ...row, diasDecorridos: dias, volumeConsumido: isNaN(consumo) ? null : consumo };
    });
  }, [data]);

  const cols = [
    { field: 'data', headerName: 'Data', width: 110, renderCell: ({ value }) => <Cell><Typography variant="body2">{formatDate(value)}</Typography></Cell> },
    { field: 'valor', headerName: 'Leitura (m³)', flex: 1, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>{formatNum(value, 'm³')}</Typography></Cell> },
    { field: 'diasDecorridos', headerName: 'Dias', width: 80, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Cell><Typography variant="body2" sx={{ ml: 'auto' }}>{value ?? '—'}</Typography></Cell> },
    { field: 'volumeConsumido', headerName: 'Consumo (m³)', width: 130, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} color="primary" sx={{ ml: 'auto' }}>{value !== null ? formatNum(value, 'm³') : '—'}</Typography></Cell> },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setOpen(true)}>
          Nova Leitura
        </Button>
      </Box>
      <DataGrid rows={processedData} columns={cols} loading={isLoading} autoHeight getRowHeight={() => 'auto'}
        disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        sx={{ borderRadius: 2, '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 } }}
        localeText={GRID_LOCALE} />

      <AddDialog open={open} onClose={() => { setOpen(false); reset(waterDefaults); }} title="Nova Leitura de Água"
        icon={WaterIcon} isAdding={isAdding} onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="pndate" control={control} render={({ field }) => (
              <DatePicker label="Data" value={toDate(field.value)} onChange={(d) => field.onChange(toStr(d))}
                slotProps={{ textField: { fullWidth: true, error: !!errors.pndate, helperText: errors.pndate?.message } }} />
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="pnval" control={control} render={({ field }) => (
              <TextField {...field} label="Leitura do Contador (m³)" type="number" fullWidth inputProps={{ min: 0, step: '0.001' }}
                error={!!errors.pnval} helperText={errors.pnval?.message} />
            )} />
          </Grid>
        </Grid>
      </AddDialog>
    </Box>
  );
};

// ─── TAB: Energia ─────────────────────────────────────────────────────────────

const energySchema = z.object({
  pndate:      z.string().min(1, 'Data obrigatória'),
  pnval_vazio: z.string().min(1, 'Obrigatório').refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Valor inválido'),
  pnval_ponta: z.string().min(1, 'Obrigatório').refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Valor inválido'),
  pnval_cheia: z.string().min(1, 'Obrigatório').refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Valor inválido'),
});
const energyDefaults = { pndate: toStr(new Date()), pnval_vazio: '', pnval_ponta: '', pnval_cheia: '' };

const EnergyTab = ({ pk, color, data, isLoading, addEnergy, isAdding }) => {
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(energySchema), defaultValues: energyDefaults,
  });

  const onSubmit = async (vals) => {
    await addEnergy({
      pnpk: pk,
      pndate: vals.pndate,
      pnval_vazio: parseFloat(vals.pnval_vazio),
      pnval_ponta: parseFloat(vals.pnval_ponta),
      pnval_cheia: parseFloat(vals.pnval_cheia),
    });
    reset(energyDefaults);
    setOpen(false);
  };

  const cols = [
    { field: 'data', headerName: 'Data', width: 110, renderCell: ({ value }) => <Cell><Typography variant="body2">{formatDate(value)}</Typography></Cell> },
    { field: 'valor_vazio', headerName: 'Vazio (kWh)', flex: 1, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Cell><Typography variant="body2" sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell> },
    { field: 'valor_ponta', headerName: 'Ponta (kWh)', flex: 1, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Cell><Typography variant="body2" sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell> },
    { field: 'valor_cheia', headerName: 'Cheia (kWh)', flex: 1, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Cell><Typography variant="body2" sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell> },
    {
      field: '_total', headerName: 'Total (kWh)', width: 130, align: 'right', headerAlign: 'right',
      valueGetter: (_, row) => (parseFloat(row.valor_vazio || 0) + parseFloat(row.valor_ponta || 0) + parseFloat(row.valor_cheia || 0)),
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={700} color="primary" sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell>,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setOpen(true)}>
          Nova Leitura
        </Button>
      </Box>
      <DataGrid rows={data} columns={cols} loading={isLoading} autoHeight getRowHeight={() => 'auto'}
        disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        sx={{ borderRadius: 2, '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 } }}
        localeText={GRID_LOCALE} />

      <AddDialog open={open} onClose={() => { setOpen(false); reset(energyDefaults); }} title="Nova Leitura de Energia"
        icon={EnergyIcon} isAdding={isAdding} onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <Controller name="pndate" control={control} render={({ field }) => (
              <DatePicker label="Data" value={toDate(field.value)} onChange={(d) => field.onChange(toStr(d))}
                slotProps={{ textField: { fullWidth: true, error: !!errors.pndate, helperText: errors.pndate?.message } }} />
            )} />
          </Grid>
          {['pnval_vazio', 'pnval_ponta', 'pnval_cheia'].map((name, i) => (
            <Grid key={name} size={{ xs: 12, sm: 4 }}>
              <Controller name={name} control={control} render={({ field }) => (
                <TextField {...field} label={['Vazio (kWh)', 'Ponta (kWh)', 'Cheia (kWh)'][i]} type="number" fullWidth
                  inputProps={{ min: 0, step: '0.001' }} error={!!errors[name]} helperText={errors[name]?.message} />
              )} />
            </Grid>
          ))}
        </Grid>
      </AddDialog>
    </Box>
  );
};

// ─── TAB: Despesas ────────────────────────────────────────────────────────────

const expSchema = z.object({
  pndate:         z.string().min(1, 'Data obrigatória'),
  pntt_expensedest: z.string().min(1, 'Destino obrigatório'),
  pnval:          z.string().min(1, 'Valor obrigatório').refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Valor deve ser positivo'),
  pnts_associate: z.string().optional(),
  pnmemo:         z.string().optional(),
});
const expDefaults = { pndate: toStr(new Date()), pntt_expensedest: '', pnval: '', pnts_associate: '', pnmemo: '' };

const ExpensesTab = ({ pk, color, data, isLoading, addExpense, isAdding }) => {
  const [open, setOpen] = useState(false);
  const { data: expTypes = [] } = useExpenseTypes();
  const { data: associates = [] } = useAssociates();
  const expMap   = useMemo(() => Object.fromEntries(expTypes.map((t) => [t.pk, t.value])), [expTypes]);
  const assocMap = useMemo(() => Object.fromEntries(associates.map((a) => [a.pk, a.name])), [associates]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(expSchema), defaultValues: expDefaults,
  });

  const onSubmit = async (vals) => {
    await addExpense({
      pntt_expensedest: parseInt(vals.pntt_expensedest, 10),
      pndate: vals.pndate,
      pnval: parseFloat(vals.pnval),
      pntt_instalacao: pk,
      pnts_associate: vals.pnts_associate ? parseInt(vals.pnts_associate, 10) : null,
      pnmemo: vals.pnmemo || null,
    });
    reset(expDefaults);
    setOpen(false);
  };

  const totalValue = useMemo(() => data.reduce((s, e) => s + (parseFloat(e.valor) || 0), 0), [data]);

  const cols = [
    { field: 'data', headerName: 'Data', width: 110, renderCell: ({ value }) => <Cell><Typography variant="body2">{formatDate(value)}</Typography></Cell> },
    { field: 'tt_expensedest', headerName: 'Destino', width: 170,
      renderCell: ({ value }) => <Cell><Chip label={expMap[value] || '—'} size="small" color="primary" variant="outlined" sx={{ maxWidth: '100%' }} /></Cell> },
    { field: 'valor', headerName: 'Valor', width: 120, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>{formatCurrency(value)}</Typography></Cell> },
    { field: 'ts_associate', headerName: 'Associado', flex: 1, minWidth: 140,
      renderCell: ({ value }) => <Cell><Typography variant="body2">{assocMap[value] || '—'}</Typography></Cell> },
    { field: 'memo', headerName: 'Descrição', flex: 2, minWidth: 180,
      renderCell: ({ value }) => <Cell><Typography variant="body2" color="text.secondary" noWrap>{value || '—'}</Typography></Cell> },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setOpen(true)}>
          Nova Despesa
        </Button>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Chip label={`${data.length} registo${data.length !== 1 ? 's' : ''}`} size="small" variant="outlined" />
          {totalValue > 0 && <Chip label={`Total: ${formatCurrency(totalValue)}`} size="small" color="primary" variant="outlined" />}
        </Box>
      </Box>
      <DataGrid rows={data} columns={cols} loading={isLoading} autoHeight getRowHeight={() => 'auto'}
        disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        sx={{ borderRadius: 2, '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 } }}
        localeText={GRID_LOCALE} />

      <AddDialog open={open} onClose={() => { setOpen(false); reset(expDefaults); }} title="Nova Despesa"
        icon={ExpenseIcon} isAdding={isAdding} onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <Controller name="pndate" control={control} render={({ field }) => (
              <DatePicker label="Data" value={toDate(field.value)} onChange={(d) => field.onChange(toStr(d))}
                slotProps={{ textField: { fullWidth: true, error: !!errors.pndate, helperText: errors.pndate?.message } }} />
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <Controller name="pntt_expensedest" control={control} render={({ field }) => (
              <TextField {...field} select label="Destino" fullWidth error={!!errors.pntt_expensedest} helperText={errors.pntt_expensedest?.message}
                InputProps={{ startAdornment: <InputAdornment position="start"><CategoryIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> }}>
                {expTypes.map((t) => <MenuItem key={t.pk} value={String(t.pk)}>{t.value}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <Controller name="pnval" control={control} render={({ field }) => (
              <TextField {...field} label="Valor (€)" type="number" fullWidth inputProps={{ min: 0.01, step: '0.01' }}
                error={!!errors.pnval} helperText={errors.pnval?.message} />
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <Controller name="pnts_associate" control={control} render={({ field }) => (
              <TextField {...field} select label="Associado (opcional)" fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> }}>
                <MenuItem value="">— Nenhum —</MenuItem>
                {associates.map((a) => <MenuItem key={a.pk} value={String(a.pk)}>{a.name}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid size={12}>
            <Controller name="pnmemo" control={control} render={({ field }) => (
              <TextField {...field} label="Descrição (opcional)" fullWidth multiline rows={2} />
            )} />
          </Grid>
        </Grid>
      </AddDialog>
    </Box>
  );
};

// ─── TAB: Intervenções ────────────────────────────────────────────────────────

const intervSchema = z.object({
  pnts_associate: z.string().optional(),
  pnmemo: z.string().min(5, 'A descrição deve ter pelo menos 5 caracteres'),
});
const intervDefaults = { pnts_associate: '', pnmemo: '' };

const INTERVENCOES = [
  { key: 'desmatacao',  label: 'Desmatação',             fn: createInstalacaoDesmatacao,        desc: 'Remoção de vegetação e mato no perímetro da instalação' },
  { key: 'lamas',       label: 'Retirada de Lamas',       fn: createInstalacaoRetiradaLamas,     desc: 'Limpeza e remoção de lamas acumuladas' },
  { key: 'reparacao',   label: 'Reparação',               fn: createInstalacaoReparacao,         desc: 'Pedido de reparação civil ou mecânica' },
  { key: 'vedacao',     label: 'Vedação',                 fn: createInstalacaoVedacao,           desc: 'Intervenção em gradeamento ou vedação do perímetro' },
  { key: 'qualidade',   label: 'Qualidade Ambiental',     fn: createInstalacaoQualidadeAmbiental, desc: 'Análise laboratorial ou controlo de qualidade ambiental' },
];

const IntervencaoCard = ({ intervencao, pk, associates }) => {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(intervSchema), defaultValues: intervDefaults,
  });

  const onSubmit = async ({ pnts_associate, pnmemo }) => {
    setSubmitting(true);
    setSuccess(false);
    try {
      await intervencao.fn({ pnpk_instalacao: pk, pnts_associate: pnts_associate ? parseInt(pnts_associate, 10) : null, pnmemo });
      toast.success(`Pedido de ${intervencao.label} submetido!`);
      reset(intervDefaults);
      setSuccess(true);
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>{intervencao.label}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{intervencao.desc}</Typography>
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>Pedido submetido com sucesso.</Alert>}
      <form onSubmit={handleSubmit(onSubmit)}>
        {submitting && <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} />}
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="pnts_associate" control={control} render={({ field }) => (
              <TextField {...field} select label="Associado (opcional)" fullWidth size="small" disabled={submitting}>
                <MenuItem value="">— Nenhum —</MenuItem>
                {associates.map((a) => <MenuItem key={a.pk} value={String(a.pk)}>{a.name}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid size={12}>
            <Controller name="pnmemo" control={control} render={({ field }) => (
              <TextField {...field} label="Descrição" multiline rows={3} fullWidth size="small" disabled={submitting}
                error={!!errors.pnmemo} helperText={errors.pnmemo?.message || `${field.value.length} car.`} />
            )} />
          </Grid>
          <Grid size={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="small" color="inherit" onClick={() => { reset(intervDefaults); setSuccess(false); }} disabled={submitting}>Limpar</Button>
            <Button type="submit" variant="contained" size="small" disabled={submitting} startIcon={<SendIcon />}>
              Submeter
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

const IntervencoesTab = ({ pk }) => {
  const { data: associates = [] } = useAssociates();
  return (
    <Grid container spacing={2}>
      {INTERVENCOES.map((iv) => (
        <Grid key={iv.key} size={{ xs: 12, md: 6 }}>
          <IntervencaoCard intervencao={iv} pk={pk} associates={associates} />
        </Grid>
      ))}
    </Grid>
  );
};

// ─── TAB: Incumprimentos (ETAR only) ─────────────────────────────────────────

const SEVERITY = (falha) => {
  if (falha >= 100) return { label: 'Crítico',   color: 'error' };
  if (falha >= 50)  return { label: 'Elevado',    color: 'error' };
  if (falha >= 20)  return { label: 'Moderado',   color: 'warning' };
  return               { label: 'Baixo',      color: 'success' };
};

const incumpSchema = z.object({
  data_incump:     z.string().min(1, 'Data obrigatória'),
  tt_analiseparam: z.string().min(1, 'Parâmetro obrigatório'),
  resultado:       z.string().min(1, 'Resultado obrigatório').refine((v) => !isNaN(parseFloat(v)), 'Valor inválido'),
  limite:          z.string().min(1, 'Limite obrigatório').refine((v) => !isNaN(parseFloat(v)), 'Valor inválido'),
  operador1:       z.string().optional(),
  operador2:       z.string().optional(),
});
const incumpDefaults = { data_incump: toStr(new Date()), tt_analiseparam: '', resultado: '', limite: '', operador1: '', operador2: '' };

const IncumprimentosTab = ({ pk, color, data, isLoading, addIncumprimento, isAdding }) => {
  const [open, setOpen] = useState(false);
  const { data: params = [] } = useAnaliseParams();
  const { data: who = [] }    = useWhoList();
  const paramMap = useMemo(() => Object.fromEntries(params.map((p) => [p.pk, p.value])), [params]);
  const whoMap   = useMemo(() => Object.fromEntries(who.map((w) => [w.pk, w.name || w.value])), [who]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(incumpSchema), defaultValues: incumpDefaults,
  });

  const onSubmit = async (vals) => {
    await addIncumprimento({
      tb_instalacao:   pk,
      tt_analiseparam: parseInt(vals.tt_analiseparam, 10),
      resultado:       parseFloat(vals.resultado),
      limite:          parseFloat(vals.limite),
      data_incump:     vals.data_incump,
      operador1:       vals.operador1 ? parseInt(vals.operador1, 10) : null,
      operador2:       vals.operador2 ? parseInt(vals.operador2, 10) : null,
    });
    reset(incumpDefaults);
    setOpen(false);
  };

  const cols = [
    { field: 'data', headerName: 'Data', width: 110, renderCell: ({ value }) => <Cell><Typography variant="body2">{formatDate(value)}</Typography></Cell> },
    { field: 'tt_analiseparam', headerName: 'Parâmetro', width: 160,
      renderCell: ({ value }) => <Cell><Chip label={paramMap[value] || value || '—'} size="small" variant="outlined" /></Cell> },
    { field: 'resultado', headerName: 'Resultado', width: 110, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell> },
    { field: 'limite', headerName: 'Limite', width: 100, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Cell><Typography variant="body2" sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell> },
    {
      field: '_falha', headerName: 'Excesso', width: 110,
      valueGetter: (_, row) => {
        const res = parseFloat(row.resultado), lim = parseFloat(row.limite);
        if (isNaN(res) || isNaN(lim) || lim === 0) return null;
        return ((res - lim) / lim) * 100;
      },
      renderCell: ({ value }) => {
        if (value === null) return <Cell>—</Cell>;
        const sev = SEVERITY(value);
        return <Cell><Chip label={`${value.toFixed(1)}%`} size="small" color={sev.color} /></Cell>;
      },
    },
    { field: '_severity', headerName: 'Gravidade', width: 110,
      valueGetter: (_, row) => {
        const res = parseFloat(row.resultado), lim = parseFloat(row.limite);
        if (isNaN(res) || isNaN(lim) || lim === 0) return null;
        return SEVERITY(((res - lim) / lim) * 100);
      },
      renderCell: ({ value }) => value
        ? <Cell><Chip label={value.label} size="small" color={value.color} variant="outlined" /></Cell>
        : <Cell>—</Cell>,
    },
    { field: 'operador1', headerName: 'Operador 1', flex: 1, minWidth: 130,
      renderCell: ({ value }) => <Cell><Typography variant="body2">{whoMap[value] || '—'}</Typography></Cell> },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} size="small" color="error" onClick={() => setOpen(true)}>
          Registar Incumprimento
        </Button>
      </Box>
      <DataGrid rows={data} columns={cols} loading={isLoading} autoHeight getRowHeight={() => 'auto'}
        disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        sx={{ borderRadius: 2, '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 } }}
        localeText={{ ...GRID_LOCALE, noRowsLabel: 'Sem incumprimentos registados' }} />

      <AddDialog open={open} onClose={() => { setOpen(false); reset(incumpDefaults); }} title="Registar Incumprimento"
        icon={IncumpIcon} isAdding={isAdding} onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <Controller name="data_incump" control={control} render={({ field }) => (
              <DatePicker label="Data" value={toDate(field.value)} onChange={(d) => field.onChange(toStr(d))}
                slotProps={{ textField: { fullWidth: true, error: !!errors.data_incump, helperText: errors.data_incump?.message } }} />
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <Controller name="tt_analiseparam" control={control} render={({ field }) => (
              <TextField {...field} select label="Parâmetro" fullWidth error={!!errors.tt_analiseparam} helperText={errors.tt_analiseparam?.message}>
                {params.map((p) => <MenuItem key={p.pk} value={String(p.pk)}>{p.value}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="resultado" control={control} render={({ field }) => (
              <TextField {...field} label="Resultado" type="number" fullWidth inputProps={{ step: 'any' }}
                error={!!errors.resultado} helperText={errors.resultado?.message} />
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="limite" control={control} render={({ field }) => (
              <TextField {...field} label="Limite" type="number" fullWidth inputProps={{ step: 'any' }}
                error={!!errors.limite} helperText={errors.limite?.message} />
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="operador1" control={control} render={({ field }) => (
              <TextField {...field} select label="Operador 1 (opcional)" fullWidth>
                <MenuItem value="">— Nenhum —</MenuItem>
                {who.map((w) => <MenuItem key={w.pk} value={String(w.pk)}>{w.name || w.value}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="operador2" control={control} render={({ field }) => (
              <TextField {...field} select label="Operador 2 (opcional)" fullWidth>
                <MenuItem value="">— Nenhum —</MenuItem>
                {who.map((w) => <MenuItem key={w.pk} value={String(w.pk)}>{w.name || w.value}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
        </Grid>
      </AddDialog>
    </Box>
  );
};

// ─── InstalacaoPage (principal) ───────────────────────────────────────────────

const TABS_ETAR = [
  { label: 'Volumes',        icon: VolumeIcon },
  { label: 'Água',           icon: WaterIcon },
  { label: 'Energia',        icon: EnergyIcon },
  { label: 'Despesas',       icon: ExpenseIcon },
  { label: 'Intervenções',   icon: IntervencoesIcon },
  { label: 'Incumprimentos', icon: IncumpIcon },
];

const TABS_EE = TABS_ETAR.slice(0, 5);

/**
 * @param {Object}   props
 * @param {'etar'|'ee'} props.type        - Tipo de instalação
 * @param {Array}    props.entityList     - Lista da metadata (etar[] ou ee[])
 * @param {string}   props.title          - Título da página
 * @param {React.ComponentType} props.icon
 * @param {string}   props.color
 * @param {Array}    props.breadcrumbs
 */
const InstalacaoPage = ({ type, entityList, title, icon: PageIcon, color, breadcrumbs }) => {
  const [selectedAssociado, setSelectedAssociado] = useState('');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pk = selected?.pk ?? null;

  const {
    volumes, waterVolumes, energy, expenses, incumprimentos,
    isLoadingVolumes, isLoadingWater, isLoadingEnergy, isLoadingExpenses, isLoadingIncump,
    addVolume, isAddingVolume,
    addWaterVolume, isAddingWater,
    addEnergy, isAddingEnergy,
    addExpense, isAddingExpense,
    addIncumprimento, isAddingIncump,
    details, isLoadingDetails, updateDetails, isUpdatingDetails,
  } = useInstalacao(pk, type);

  const tabs = type === 'etar' ? TABS_ETAR : TABS_EE;

  // Unique ts_entity values (Associados), sorted
  const associados = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const item of entityList) {
      if (item.ts_entity && !seen.has(item.ts_entity)) {
        seen.add(item.ts_entity);
        result.push(item.ts_entity);
      }
    }
    return result.sort((a, b) => a.localeCompare(b, 'pt'));
  }, [entityList]);

  // Installations filtered by selected associado
  const instalacoes = useMemo(() => {
    if (!selectedAssociado) return [];
    return entityList
      .filter((item) => item.ts_entity === selectedAssociado)
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
  }, [entityList, selectedAssociado]);

  const handleAssociadoChange = (e) => {
    setSelectedAssociado(e.target.value);
    setSelected(null);
    setTab(0);
  };

  const handleInstalacaoChange = (e) => {
    const pkVal = parseInt(e.target.value, 10);
    setSelected(entityList.find((item) => item.pk === pkVal) || null);
    setTab(0);
  };

  const selectorActions = (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
      <TextField
        select size="small" label="Associado"
        value={selectedAssociado}
        onChange={handleAssociadoChange}
        sx={{ minWidth: 160 }}
      >
        <MenuItem value=""><em>— Selecionar —</em></MenuItem>
        {associados.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
      </TextField>
      <TextField
        select size="small"
        label={type === 'etar' ? 'ETAR' : 'Est. Elevatória'}
        value={selected ? String(selected.pk) : ''}
        onChange={handleInstalacaoChange}
        disabled={!selectedAssociado}
        sx={{ minWidth: 220 }}
      >
        <MenuItem value=""><em>— Selecionar —</em></MenuItem>
        {instalacoes.map((i) => <MenuItem key={i.pk} value={String(i.pk)}>{i.nome}</MenuItem>)}
      </TextField>
      <Tooltip title="Características da instalação" arrow>
        <span>
          <IconButton
            size="small" color="primary"
            disabled={!selected}
            onClick={() => setDrawerOpen(true)}
            sx={{ border: '1px solid', borderColor: selected ? 'primary.main' : 'divider', borderRadius: 1.5 }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );

  return (
    <ModulePage title={title} icon={PageIcon} color={color} breadcrumbs={breadcrumbs} actions={selectorActions}>
      {!selected ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <PageIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography color="text.secondary">
            {!selectedAssociado
              ? 'Selecione um Associado e depois a instalação para aceder aos registos.'
              : `Selecione uma ${type === 'etar' ? 'ETAR' : 'Estação Elevatória'} para aceder aos registos.`}
          </Typography>
        </Box>
      ) : (
        <Box>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
              sx={{ '& .MuiTab-root': { minHeight: 48 } }}>
              {tabs.map(({ label, icon: TIcon }) => (
                <Tab key={label} label={label} icon={<TIcon fontSize="small" />} iconPosition="start"
                  sx={{ gap: 0.5, textTransform: 'none', fontWeight: 600 }} />
              ))}
            </Tabs>
          </Box>

          {/* Conteúdo dos tabs */}
          {tab === 0 && (
            <VolumeTab pk={pk} color={color} data={volumes} isLoading={isLoadingVolumes}
              addVolume={addVolume} isAdding={isAddingVolume} />
          )}
          {tab === 1 && (
            <WaterTab pk={pk} color={color} data={waterVolumes} isLoading={isLoadingWater}
              addWaterVolume={addWaterVolume} isAdding={isAddingWater} />
          )}
          {tab === 2 && (
            <EnergyTab pk={pk} color={color} data={energy} isLoading={isLoadingEnergy}
              addEnergy={addEnergy} isAdding={isAddingEnergy} />
          )}
          {tab === 3 && (
            <ExpensesTab pk={pk} color={color} data={expenses} isLoading={isLoadingExpenses}
              addExpense={addExpense} isAdding={isAddingExpense} />
          )}
          {tab === 4 && <IntervencoesTab pk={pk} />}
          {tab === 5 && type === 'etar' && (
            <IncumprimentosTab pk={pk} color={color} data={incumprimentos} isLoading={isLoadingIncump}
              addIncumprimento={addIncumprimento} isAdding={isAddingIncump} />
          )}
        </Box>
      )}

      {/* Drawer de Características */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 0 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              Características
            </Typography>
            {selected && (
              <Typography variant="caption" color="text.secondary">{selected.nome}</Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ p: 2.5, overflowY: 'auto' }}>
          <CaracteristicasTab pk={pk} type={type} color={color}
            details={details} isLoading={isLoadingDetails}
            updateDetails={updateDetails} isUpdating={isUpdatingDetails} />
        </Box>
      </Drawer>
    </ModulePage>
  );
};

export default InstalacaoPage;
