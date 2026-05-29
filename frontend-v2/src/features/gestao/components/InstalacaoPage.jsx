/**
 * InstalacaoPage — Componente partilhado para ETAR e EE.
 * Inclui seletor de instalação + tabs: Volumes | Água | Energia | Despesas | Intervenções | Incumprimentos
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Tabs, Tab, Typography, TextField, Drawer, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, LinearProgress, Grid, Chip, InputAdornment,
  MenuItem, Paper, Divider, Alert, Stack, Collapse, Badge,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon, Close as CloseIcon,
  Waves as VolumeIcon, WaterDrop as WaterIcon,
  ElectricBolt as EnergyIcon, Euro as ExpenseIcon,
  Build as IntervencoesIcon, Warning as IncumpIcon,
  Send as SendIcon, Person as PersonIcon,
  Category as CategoryIcon, CalendarMonth as CalendarIcon,
  Info as InfoIcon, Edit as EditIcon,
  History as HistoryIcon,
  Schedule as ScheduleIcon, FlashOn as FlashOnIcon,
  CheckCircle as CheckCircleIcon,
  Image as ImageIcon,
  PrecisionManufacturing as EquipamentosTabIcon,
  Construction as ObrasTabIcon,
  Block as DescargaIcon,
  InsertChart as ChartIcon,
  TableChart as ExcelIcon,
  FilterList as FilterListIcon,
  RestartAlt as ResetIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import { InstalacaoEquipamentosTab } from '@/features/equipamentos';
import { getMeta as getEquipamentosMeta } from '@/features/equipamentos/services/equipamentoService';
import { InstalacaoObrasTab } from '@/features/obras';
import { useEffect, useRef } from 'react';
import {
  DataGrid,
  GridToolbarContainer, GridToolbarColumnsButton, GridToolbarDensitySelector,
  GridToolbarExport, GridToolbarQuickFilter,
  useGridApiRef, gridFilteredSortedRowEntriesSelector,
} from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import * as z from 'zod';
import notification from '@/core/services/notification';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import {
  useExpenseTypes, useAssociates, useSpotList, useWhoList, useAnaliseParams,
} from '@/core/hooks/useMetaData';
import { useInstalacao } from '../hooks/useInstalacao';
import {
  createInstalacaoDesmatacao, createInstalacaoRetiradaLamas,
  createInstalacaoReparacao, createInstalacaoVedacao,
  createInstalacaoQualidadeAmbiental,
  createDescargaInterdita,
} from '../services/etarEeService';
import DirectTaskForm from '../../operations/components/DirectTaskForm';
import { operationService } from '../../operations/services/operationService';
import AnnexesSection from '../../operations/components/AnnexesSection';
import { SearchBar } from '@/shared/components/data/SearchBar/SearchBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') || str.includes(' ') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};
const toStr = (date) =>
  date instanceof Date && !isNaN(date.getTime()) ? format(date, 'yyyy-MM-dd') : '';

// Normaliza qualquer formato de data para YYYY-MM-DD para comparação segura
// Suporta: "YYYY-MM-DD", "YYYY-MM-DDTHH:MM:SS", timestamps, etc.
const dateStr = (d) => {
  if (!d) return '';
  const s = String(d);
  // ISO format: extrair apenas a parte da data sem conversão de fuso horário
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Fallback: tentar converter com Date
  try {
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  } catch { /* */ }
  return '';
};

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

// valueGetter para colunas de data: devolve timestamp numérico para ordenação nativa do DataGrid
const dateValueGetter = (v) => (v ? new Date(v).getTime() : -1);

// ─── Chart/export helpers ─────────────────────────────────────────────────────

const exportToExcel = (rows, columns, filename) => {
  const sheet = rows.map(r =>
    Object.fromEntries(columns.map(c => [c.label, c.fn ? c.fn(r) : r[c.key]]))
  );
  const ws = XLSX.utils.json_to_sheet(sheet);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const TabActionBar = ({ onAdd, addLabel, addColor, extra, filtersOpen, onToggleFilters, activeFilterCount = 0 }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      {addLabel && (
        <Button variant="contained" color={addColor || 'primary'} startIcon={<AddIcon />} size="small" onClick={onAdd}>
          {addLabel}
        </Button>
      )}
      {extra}
    </Box>
    {onToggleFilters && (
      <Tooltip title={filtersOpen ? 'Fechar filtros' : 'Filtrar'}>
        <IconButton onClick={onToggleFilters} size="small" color={activeFilterCount > 0 ? 'primary' : 'default'}>
          <Badge badgeContent={activeFilterCount} color="primary">
            <FilterListIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
    )}
  </Box>
);

// Portuguese locale for DataGrid filter panel
const GRID_FILTER_LOCALE = {
  toolbarFilters: 'Filtros',
  toolbarFiltersLabel: 'Mostrar filtros',
  toolbarFiltersTooltipHide: 'Ocultar filtros',
  toolbarFiltersTooltipShow: 'Mostrar filtros',
  toolbarColumns: 'Colunas',
  toolbarDensity: 'Densidade',
  toolbarExport: 'Exportar CSV',
  filterPanelAddFilter: 'Adicionar filtro',
  filterPanelRemoveAll: 'Remover todos',
  filterPanelDeleteIconLabel: 'Remover',
  filterPanelLogicOperator: 'Operador lógico',
  filterPanelOperator: 'Operador',
  filterPanelOperatorAnd: 'E',
  filterPanelOperatorOr: 'Ou',
  filterPanelColumns: 'Coluna',
  filterPanelInputLabel: 'Valor',
  filterPanelInputPlaceholder: 'Filtrar por valor',
  filterOperatorContains: 'contém',
  filterOperatorDoesNotContain: 'não contém',
  filterOperatorEquals: 'igual a',
  filterOperatorDoesNotEqual: 'diferente de',
  filterOperatorStartsWith: 'começa com',
  filterOperatorEndsWith: 'termina com',
  filterOperatorIsEmpty: 'está vazio',
  filterOperatorIsNotEmpty: 'não está vazio',
  filterOperatorIsAnyOf: 'é um de',
  toolbarQuickFilterPlaceholder: 'Pesquisar…',
  toolbarQuickFilterLabel: 'Pesquisar',
  toolbarQuickFilterDeleteIconLabel: 'Limpar pesquisa',
  columnMenuSortAsc: 'Ordenar crescente',
  columnMenuSortDesc: 'Ordenar decrescente',
  columnMenuFilter: 'Filtrar',
  columnMenuHideColumn: 'Ocultar coluna',
  columnMenuManageColumns: 'Gerir colunas',
};

// ─── Tab filter panel (estilo DocumentFilters) ────────────────────────────────

/**
 * config: Array<{ key, label, type: 'select'|'date', options?: [{value,label}], md?: number }>
 * filters: Record<string, string>
 * onChange: (newFilters) => void
 */
const TabFilterPanel = ({ open, onToggle, config, filters, onChange, onChart, onExport }) => {
  const theme = useTheme();

  const handleChange = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  const handleReset = () =>
    onChange(Object.fromEntries(config.map((f) => [f.key, ''])));

  const hasActive = config.some((f) => filters[f.key]);

  return (
    <Collapse in={open}>
      <Paper
        elevation={0}
        sx={{
          p: 2, mb: 1.5, borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.6),
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {config.map((field) => (
            <Grid key={field.key} size={{ xs: 12, sm: 6, md: field.md ?? (field.type === 'date' ? 1.75 : 2) }}>
              <TextField
                {...(field.type === 'select'
                  ? { select: true }
                  : { type: 'date', slotProps: { inputLabel: { shrink: true } } }
                )}
                label={field.label}
                value={filters[field.key] ?? ''}
                onChange={handleChange(field.key)}
                fullWidth
                size="small"
                sx={filters[field.key] ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main } } : {}}
              >
                {field.type === 'select' && [
                  <MenuItem key="" value="">Todos</MenuItem>,
                  ...(field.options ?? []).map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  )),
                ]}
              </TextField>
            </Grid>
          ))}

          <Grid size={{ xs: 12, sm: 12, md: 'auto' }} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, ml: 'auto' }}>
            {onChart  && <Button size="small" variant="outlined" startIcon={<ChartIcon />} onClick={onChart}>Gráfico</Button>}
            {onExport && <Button size="small" variant="outlined" color="success" startIcon={<ExcelIcon />} onClick={onExport}>Excel</Button>}
            {(onChart || onExport) && <Divider orientation="vertical" flexItem />}
            {hasActive && (
              <Tooltip title="Limpar filtros">
                <IconButton onClick={handleReset} size="small" color="error">
                  <ResetIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Fechar">
              <IconButton onClick={onToggle} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>
    </Collapse>
  );
};

const DataGridToolbar = () => (
  <GridToolbarContainer>
    <GridToolbarColumnsButton />
    <GridToolbarDensitySelector />
    <GridToolbarExport />
    <Box sx={{ flex: 1 }} />
    <GridToolbarQuickFilter debounceMs={300} placeholder="Pesquisar…" />
  </GridToolbarContainer>
);

// ─── Chart / export ───────────────────────────────────────────────────────────

const INST_PALETTE = [
  '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#3F51B5', '#E91E63', '#009688', '#FF5722',
];

const fmtChartVal = (val) => {
  if (val == null) return '';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k';
  return n.toLocaleString('pt-PT', { maximumFractionDigits: 2 });
};

const InstalacaoDataChart = ({ open, onClose, title, data, series, yUnit = '', stacked = false }) => {
  const theme = useTheme();
  const [chartType, setChartType] = useState('area');
  const margin = { top: 10, right: 20, left: 10, bottom: 60 };

  const tooltipProps = {
    contentStyle: {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 8,
      boxShadow: theme.shadows[4],
      fontSize: 13,
    },
    labelStyle: { color: theme.palette.text.primary, fontWeight: 600 },
    itemStyle: { color: theme.palette.text.secondary },
    formatter: (v, name) => [`${fmtChartVal(v)}${yUnit ? ' ' + yUnit : ''}`, name],
  };

  const xAxisProps = {
    dataKey: 'date',
    tick: { fill: theme.palette.text.secondary, fontSize: 11 },
    angle: -35,
    textAnchor: 'end',
    interval: Math.max(0, Math.floor((data?.length ?? 0) / 12) - 1),
  };

  const yAxisProps = {
    tick: { fill: theme.palette.text.secondary, fontSize: 11 },
    tickFormatter: (v) => fmtChartVal(v) + (yUnit ? ` ${yUnit}` : ''),
    width: 70,
  };

  const grid = <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />;
  const legend = <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />;

  const renderChart = () => {
    if (!data?.length) return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem dados para apresentar.</Typography>
      </Box>
    );

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data} margin={margin}>
            {grid}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <ReTooltip {...tooltipProps} />
            {legend}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label}
                fill={s.color ?? INST_PALETTE[i % INST_PALETTE.length]}
                stackId={stacked ? 'stack' : undefined}
                radius={!stacked && series.length === 1 ? [4, 4, 0, 0] : undefined}
                maxBarSize={stacked ? undefined : 40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    const ChartCmp = chartType === 'area' ? AreaChart : LineChart;
    return (
      <ResponsiveContainer width="100%" height={380}>
        <ChartCmp data={data} margin={margin}>
          <defs>
            {series.map((s, i) => {
              const c = s.color ?? INST_PALETTE[i % INST_PALETTE.length];
              return (
                <linearGradient key={i} id={`ig_${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          {grid}
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <ReTooltip {...tooltipProps} />
          {legend}
          {series.map((s, i) => {
            const c = s.color ?? INST_PALETTE[i % INST_PALETTE.length];
            return chartType === 'area' ? (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
                stroke={c} strokeWidth={2.5} fill={`url(#ig_${i})`}
                dot={{ r: 3, fill: c, strokeWidth: 0 }} activeDot={{ r: 6 }}
              />
            ) : (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                stroke={c} strokeWidth={2.5} connectNulls
                dot={data.length <= 40 ? { r: 3, fill: c, strokeWidth: 0 } : false}
                activeDot={{ r: 6 }}
              />
            );
          })}
        </ChartCmp>
      </ResponsiveContainer>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ChartIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>{title}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup value={chartType} exclusive size="small"
              onChange={(_, v) => { if (v) setChartType(v); }}
              sx={{ '& .MuiToggleButton-root': { py: 0.3, px: 0.8, border: 'none', borderRadius: 1.5 } }}>
              <Tooltip title="Barras">
                <ToggleButton value="bar"><BarChartIcon fontSize="small" /></ToggleButton>
              </Tooltip>
              <Tooltip title="Área">
                <ToggleButton value="area"><LineChartIcon fontSize="small" /></ToggleButton>
              </Tooltip>
              <Tooltip title="Linhas">
                <ToggleButton value="line"><LineChartIcon fontSize="small" sx={{ opacity: 0.6 }} /></ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2, bgcolor: alpha(theme.palette.primary.main, 0.01) }}>
        {renderChart()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

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
  const apiRef = useGridApiRef();
  const [open, setOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [chartSeries, setChartSeries] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ tipo: '', dateFrom: '', dateTo: '' });
  const { data: spots = [] } = useSpotList();

  const filterConfig = useMemo(() => [
    { key: 'tipo', label: 'Tipo de Leitura', type: 'select', md: 3,
      options: spots.map((s) => ({ value: s.value, label: s.value })) },
    { key: 'dateFrom', label: 'Data início', type: 'date' },
    { key: 'dateTo',   label: 'Data fim',    type: 'date' },
  ], [spots]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length, [filters],
  );

  // Calcula diferença de leituras agrupando por tipo (tt_readspot)
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Agrupar por tipo de leitura
    const bySpot = {};
    data.forEach((r) => {
      const key = r.tt_readspot || '__sem_tipo__';
      if (!bySpot[key]) bySpot[key] = [];
      bySpot[key].push(r);
    });
    // Para cada grupo, ordenar por data e calcular diferenças
    const result = [];
    Object.values(bySpot).forEach((group) => {
      const sorted = [...group].sort((a, b) => new Date(a.data) - new Date(b.data));
      sorted.forEach((row, i) => {
        if (i === 0) {
          result.push({ ...row, diasDecorridos: null, volumeConsumido: null });
        } else {
          const prev = sorted[i - 1];
          const dias = Math.round((new Date(row.data) - new Date(prev.data)) / (1000 * 60 * 60 * 24));
          const consumo = parseFloat(row.valor) - parseFloat(prev.valor);
          result.push({ ...row, diasDecorridos: dias, volumeConsumido: isNaN(consumo) ? null : consumo });
        }
      });
    });
    return result;
  }, [data]);

  const filteredData = useMemo(() => processedData.filter((r) => {
    if (filters.tipo && r.tt_readspot !== filters.tipo) return false;
    const d = dateStr(r.data);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo   && d > filters.dateTo)   return false;
    return true;
  }), [processedData, filters]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(volSchema), defaultValues: volDefaults,
  });

  const onSubmit = async (vals) => {
    await addVolume({ pnpk: pk, pndate: vals.pndate, pnval: parseFloat(vals.pnval), pnspot: parseInt(vals.pnspot, 10) });
    reset(volDefaults);
    setOpen(false);
  };

  const getFiltered = () => {
    try { return gridFilteredSortedRowEntriesSelector(apiRef).map(e => e.model); }
    catch { return filteredData; }
  };

  const handleChart = () => {
    const rows = getFiltered()
      .filter(r => r.volumeConsumido !== null)
      .sort((a, b) => new Date(a.data) - new Date(b.data));
    const tipos = [...new Set(rows.map(r => r.tt_readspot || 'Sem Tipo'))];
    const byDate = {};
    rows.forEach(r => {
      const d = formatDate(r.data);
      if (!byDate[d]) byDate[d] = { date: d };
      const dias = r.diasDecorridos > 0 ? r.diasDecorridos : 1;
      byDate[d][r.tt_readspot || 'Sem Tipo'] = Math.round((r.volumeConsumido / dias) * 10) / 10;
    });
    setChartSeries(tipos.map((t, i) => ({ key: t, label: t, color: INST_PALETTE[i % INST_PALETTE.length] })));
    setChartData(Object.values(byDate));
    setChartOpen(true);
  };

  const handleExport = () => exportToExcel(getFiltered(), [
    { key: 'data',           label: 'Data',          fn: r => formatDate(r.data) },
    { key: 'tt_readspot',    label: 'Tipo',           fn: r => r.tt_readspot || '' },
    { key: 'valor',          label: 'Leitura (m³)',   fn: r => parseFloat(r.valor) || 0 },
    { key: 'diasDecorridos', label: 'Dias',           fn: r => r.diasDecorridos ?? '' },
    { key: 'volumeConsumido',label: 'Consumo (m³)',   fn: r => r.volumeConsumido ?? '' },
  ], `volumes_${pk}`);

  const cols = [
    { field: 'data', headerName: 'Data', width: 110,
      valueGetter: dateValueGetter,
      renderCell: ({ row }) => <Cell><Typography variant="body2">{formatDate(row.data)}</Typography></Cell> },
    { field: 'tt_readspot', headerName: 'Tipo', width: 150,
      valueGetter: (v) => v || '',
      renderCell: ({ row }) => <Cell><Chip label={row.tt_readspot || '—'} size="small" color="primary" variant="outlined" /></Cell> },
    { field: 'valor', headerName: 'Leitura (m³)', width: 130, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>{formatNum(value, 'm³')}</Typography></Cell> },
    { field: 'diasDecorridos', headerName: 'Dias', width: 75, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" sx={{ ml: 'auto' }}>{value ?? '—'}</Typography></Cell> },
    { field: 'volumeConsumido', headerName: 'Consumo (m³)', flex: 1, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} color="primary" sx={{ ml: 'auto' }}>{value !== null ? formatNum(value, 'm³') : '—'}</Typography></Cell> },
  ];

  return (
    <Box>
      <TabActionBar addLabel="Nova Leitura" onAdd={() => setOpen(true)}
        filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen((o) => !o)} activeFilterCount={activeFilterCount} />
      <TabFilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)}
        config={filterConfig} filters={filters} onChange={setFilters}
        onChart={handleChart} onExport={handleExport} />
      <DataGrid apiRef={apiRef} rows={filteredData} columns={cols} loading={isLoading} autoHeight getRowHeight={() => 'auto'}
        disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'data', sort: 'asc' }] } }}
        slots={{ toolbar: DataGridToolbar }}
        sx={{ borderRadius: 2, '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 } }}
        localeText={{ ...GRID_LOCALE, ...GRID_FILTER_LOCALE }} />
      <InstalacaoDataChart open={chartOpen} onClose={() => setChartOpen(false)} title="Volumes Tratados (Média Diária)"
        data={chartData} series={chartSeries} yUnit="m³/dia" />

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

const WATER_FILTER_CONFIG = [
  { key: 'dateFrom', label: 'Data início', type: 'date' },
  { key: 'dateTo',   label: 'Data fim',    type: 'date' },
];

const WaterTab = ({ pk, color, data, isLoading, addWaterVolume, isAdding }) => {
  const apiRef = useGridApiRef();
  const [open, setOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(waterSchema), defaultValues: waterDefaults,
  });

  const onSubmit = async (vals) => {
    await addWaterVolume({ pnpk: pk, pndate: vals.pndate, pnval: parseFloat(vals.pnval) });
    reset(waterDefaults);
    setOpen(false);
  };

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length, [filters],
  );

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

  const filteredData = useMemo(() => processedData.filter((r) => {
    const d = dateStr(r.data);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo   && d > filters.dateTo)   return false;
    return true;
  }), [processedData, filters]);

  const getFiltered = () => {
    try { return gridFilteredSortedRowEntriesSelector(apiRef).map(e => e.model); }
    catch { return filteredData; }
  };

  const handleChart = () => {
    const rows = getFiltered().filter(r => r.volumeConsumido !== null);
    setChartData(rows.map(r => {
      const dias = r.diasDecorridos > 0 ? r.diasDecorridos : 1;
      return { date: formatDate(r.data), 'Consumo (m³/dia)': Math.round((r.volumeConsumido / dias) * 10) / 10 };
    }));
    setChartOpen(true);
  };

  const handleExport = () => exportToExcel(getFiltered(), [
    { key: 'data', label: 'Data', fn: r => formatDate(r.data) },
    { key: 'valor', label: 'Leitura (m³)', fn: r => parseFloat(r.valor) || 0 },
    { key: 'diasDecorridos', label: 'Dias', fn: r => r.diasDecorridos ?? '' },
    { key: 'volumeConsumido', label: 'Consumo (m³)', fn: r => r.volumeConsumido ?? '' },
  ], `agua_${pk}`);

  const cols = [
    { field: 'data', headerName: 'Data', width: 110,
      valueGetter: dateValueGetter,
      renderCell: ({ row }) => <Cell><Typography variant="body2">{formatDate(row.data)}</Typography></Cell> },
    { field: 'valor', headerName: 'Leitura (m³)', flex: 1, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>{formatNum(value, 'm³')}</Typography></Cell> },
    { field: 'diasDecorridos', headerName: 'Dias', width: 80, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" sx={{ ml: 'auto' }}>{value ?? '—'}</Typography></Cell> },
    { field: 'volumeConsumido', headerName: 'Consumo (m³)', width: 130, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} color="primary" sx={{ ml: 'auto' }}>{value !== null ? formatNum(value, 'm³') : '—'}</Typography></Cell> },
  ];

  return (
    <Box>
      <TabActionBar addLabel="Nova Leitura" onAdd={() => setOpen(true)}
        filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen((o) => !o)} activeFilterCount={activeFilterCount} />
      <TabFilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)}
        config={WATER_FILTER_CONFIG} filters={filters} onChange={setFilters}
        onChart={handleChart} onExport={handleExport} />
      <DataGrid apiRef={apiRef} rows={filteredData} columns={cols} loading={isLoading} autoHeight getRowHeight={() => 'auto'}
        disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'data', sort: 'asc' }] } }}
        slots={{ toolbar: DataGridToolbar }}
        sx={{ borderRadius: 2, '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 } }}
        localeText={{ ...GRID_LOCALE, ...GRID_FILTER_LOCALE }} />
      <InstalacaoDataChart open={chartOpen} onClose={() => setChartOpen(false)} title="Consumo de Água (Média Diária)"
        data={chartData} series={[{ key: 'Consumo (m³/dia)', label: 'Consumo (m³/dia)', color: '#42a5f5' }]} yUnit="m³/dia" />

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

const ENERGY_FILTER_CONFIG = [
  { key: 'dateFrom', label: 'Data início', type: 'date' },
  { key: 'dateTo',   label: 'Data fim',    type: 'date' },
];

const EnergyTab = ({ pk, color, data, isLoading, addEnergy, isAdding }) => {
  const apiRef = useGridApiRef();
  const [open, setOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
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

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length, [filters],
  );

  const filteredData = useMemo(() => data.filter((r) => {
    const d = dateStr(r.data);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo   && d > filters.dateTo)   return false;
    return true;
  }), [data, filters]);

  const getFiltered = () => {
    try { return gridFilteredSortedRowEntriesSelector(apiRef).map(e => e.model); }
    catch { return filteredData; }
  };

  const handleChart = () => {
    const rows = getFiltered();
    setChartData(rows.sort((a, b) => new Date(a.data) - new Date(b.data)).map(r => ({
      date: formatDate(r.data),
      'Vazio': parseFloat(r.valor_vazio) || 0,
      'Ponta': parseFloat(r.valor_ponta) || 0,
      'Cheia': parseFloat(r.valor_cheia) || 0,
    })));
    setChartOpen(true);
  };

  const handleExport = () => exportToExcel(getFiltered(), [
    { key: 'data', label: 'Data', fn: r => formatDate(r.data) },
    { key: 'valor_vazio', label: 'Vazio (kWh)', fn: r => parseFloat(r.valor_vazio) || 0 },
    { key: 'valor_ponta', label: 'Ponta (kWh)', fn: r => parseFloat(r.valor_ponta) || 0 },
    { key: 'valor_cheia', label: 'Cheia (kWh)', fn: r => parseFloat(r.valor_cheia) || 0 },
    { key: '_total', label: 'Total (kWh)', fn: r => (parseFloat(r.valor_vazio||0)+parseFloat(r.valor_ponta||0)+parseFloat(r.valor_cheia||0)) },
  ], `energia_${pk}`);

  const cols = [
    { field: 'data', headerName: 'Data', width: 110,
      valueGetter: dateValueGetter,
      renderCell: ({ row }) => <Cell><Typography variant="body2">{formatDate(row.data)}</Typography></Cell> },
    { field: 'valor_vazio', headerName: 'Vazio (kWh)', flex: 1, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell> },
    { field: 'valor_ponta', headerName: 'Ponta (kWh)', flex: 1, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell> },
    { field: 'valor_cheia', headerName: 'Cheia (kWh)', flex: 1, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell> },
    {
      field: '_total', headerName: 'Total (kWh)', width: 130, align: 'right', headerAlign: 'right', type: 'number',
      valueGetter: (_, row) => (parseFloat(row.valor_vazio || 0) + parseFloat(row.valor_ponta || 0) + parseFloat(row.valor_cheia || 0)),
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={700} color="primary" sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell>,
    },
  ];

  return (
    <Box>
      <TabActionBar addLabel="Nova Leitura" onAdd={() => setOpen(true)}
        filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen((o) => !o)} activeFilterCount={activeFilterCount} />
      <TabFilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)}
        config={ENERGY_FILTER_CONFIG} filters={filters} onChange={setFilters}
        onChart={handleChart} onExport={handleExport} />
      <DataGrid apiRef={apiRef} rows={filteredData} columns={cols} loading={isLoading} autoHeight getRowHeight={() => 'auto'}
        disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'data', sort: 'asc' }] } }}
        slots={{ toolbar: DataGridToolbar }}
        sx={{ borderRadius: 2, '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 } }}
        localeText={{ ...GRID_LOCALE, ...GRID_FILTER_LOCALE }} />
      <InstalacaoDataChart open={chartOpen} onClose={() => setChartOpen(false)} title="Consumo de Energia"
        data={chartData} stacked
        series={[
          { key: 'Vazio', label: 'Vazio', color: '#4fc3f7' },
          { key: 'Ponta', label: 'Ponta', color: '#ef5350' },
          { key: 'Cheia', label: 'Cheia', color: '#66bb6a' },
        ]}
        yUnit="kWh" />

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
  const apiRef = useGridApiRef();
  const [open, setOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ destino: '', associado: '', dateFrom: '', dateTo: '' });
  const { data: expTypes = [] } = useExpenseTypes();
  const { data: associates = [] } = useAssociates();

  const filterConfig = useMemo(() => [
    { key: 'destino', label: 'Destino', type: 'select', md: 2.5,
      options: expTypes.map((t) => ({ value: t.value, label: t.value })) },
    { key: 'associado', label: 'Associado', type: 'select', md: 2.5,
      options: associates.map((a) => ({ value: a.name, label: a.name })) },
    { key: 'dateFrom', label: 'Data início', type: 'date' },
    { key: 'dateTo',   label: 'Data fim',    type: 'date' },
  ], [expTypes, associates]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length, [filters],
  );

  const filteredData = useMemo(() => data.filter((r) => {
    if (filters.destino   && r.tt_expensedest !== filters.destino)   return false;
    if (filters.associado && r.ts_associate   !== filters.associado) return false;
    const d = dateStr(r.data);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo   && d > filters.dateTo)   return false;
    return true;
  }), [data, filters]);

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

  const getFiltered = () => {
    try { return gridFilteredSortedRowEntriesSelector(apiRef).map(e => e.model); }
    catch { return filteredData; }
  };

  const handleChart = () => {
    const rows = getFiltered();
    setChartData(rows.sort((a, b) => new Date(a.data) - new Date(b.data))
      .map(r => ({ date: formatDate(r.data), 'Valor (€)': parseFloat(r.valor) || 0 })));
    setChartOpen(true);
  };

  const handleExport = () => exportToExcel(getFiltered(), [
    { key: 'data', label: 'Data', fn: r => formatDate(r.data) },
    { key: 'tt_expensedest', label: 'Destino', fn: r => r.tt_expensedest || '' },
    { key: 'valor', label: 'Valor (€)', fn: r => parseFloat(r.valor) || 0 },
    { key: 'ts_associate', label: 'Associado', fn: r => r.ts_associate || '' },
    { key: 'memo', label: 'Descrição', fn: r => r.memo || '' },
  ], `despesas_${pk}`);

  const cols = [
    { field: 'data', headerName: 'Data', width: 110,
      valueGetter: dateValueGetter,
      renderCell: ({ row }) => <Cell><Typography variant="body2">{formatDate(row.data)}</Typography></Cell> },
    { field: 'tt_expensedest', headerName: 'Destino', width: 170,
      renderCell: ({ row }) => <Cell><Chip label={row.tt_expensedest || '—'} size="small" color="primary" variant="outlined" sx={{ maxWidth: '100%' }} /></Cell> },
    { field: 'valor', headerName: 'Valor', width: 120, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>{formatCurrency(value)}</Typography></Cell> },
    { field: 'ts_associate', headerName: 'Associado', flex: 1, minWidth: 140,
      renderCell: ({ row }) => <Cell><Typography variant="body2">{row.ts_associate || '—'}</Typography></Cell> },
    { field: 'memo', headerName: 'Descrição', flex: 2, minWidth: 180,
      renderCell: ({ value }) => <Cell><Typography variant="body2" color="text.secondary" noWrap>{value || '—'}</Typography></Cell> },
  ];

  return (
    <Box>
      <TabActionBar addLabel="Nova Despesa" onAdd={() => setOpen(true)}
        filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen((o) => !o)} activeFilterCount={activeFilterCount} />
      <TabFilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)}
        config={filterConfig} filters={filters} onChange={setFilters}
        onChart={handleChart} onExport={handleExport} />
      <DataGrid apiRef={apiRef} rows={filteredData} columns={cols} loading={isLoading} autoHeight getRowHeight={() => 'auto'}
        disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'data', sort: 'asc' }] } }}
        slots={{ toolbar: DataGridToolbar }}
        sx={{ borderRadius: 2, '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 } }}
        localeText={{ ...GRID_LOCALE, ...GRID_FILTER_LOCALE }} />
      <InstalacaoDataChart open={chartOpen} onClose={() => setChartOpen(false)} title="Despesas"
        data={chartData} series={[{ key: 'Valor (€)', label: 'Valor (€)', color: '#ffa726' }]} yUnit="€" />

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
      notification.success(`Pedido de ${intervencao.label} submetido!`);
      reset(intervDefaults);
      setSuccess(true);
    } catch (e) {
      notification.error(`Erro: ${e.message}`);
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

const SEVERITY_OPTIONS = [
  { value: 'critico',  label: 'Crítico'  },
  { value: 'elevado',  label: 'Elevado'  },
  { value: 'moderado', label: 'Moderado' },
  { value: 'baixo',    label: 'Baixo'    },
];

const severityKey = (r) => {
  const res = parseFloat(r.resultado), lim = parseFloat(r.limite);
  if (isNaN(res) || isNaN(lim) || lim === 0) return null;
  const pct = ((res - lim) / lim) * 100;
  if (pct >= 100) return 'critico';
  if (pct >= 50)  return 'elevado';
  if (pct >= 20)  return 'moderado';
  return 'baixo';
};

const IncumprimentosTab = ({ pk, color, data, isLoading, addIncumprimento, isAdding }) => {
  const apiRef = useGridApiRef();
  const [open, setOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ parametro: '', gravidade: '', dateFrom: '', dateTo: '' });
  const { data: params = [] } = useAnaliseParams();
  const { data: who = [] }    = useWhoList();
  const filterConfig = useMemo(() => [
    { key: 'parametro', label: 'Parâmetro', type: 'select', md: 2.5,
      options: params.map((p) => ({ value: p.value, label: p.value })) },
    { key: 'gravidade', label: 'Gravidade', type: 'select', md: 2,
      options: SEVERITY_OPTIONS },
    { key: 'dateFrom', label: 'Data início', type: 'date' },
    { key: 'dateTo',   label: 'Data fim',    type: 'date' },
  ], [params]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length, [filters],
  );

  const filteredData = useMemo(() => data.filter((r) => {
    if (filters.parametro && r.tt_analiseparam !== filters.parametro) return false;
    if (filters.gravidade && severityKey(r)      !== filters.gravidade) return false;
    const d = dateStr(r.data);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo   && d > filters.dateTo)   return false;
    return true;
  }), [data, filters]);

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

  const getFiltered = () => {
    try { return gridFilteredSortedRowEntriesSelector(apiRef).map(e => e.model); }
    catch { return filteredData; }
  };

  const handleChart = () => {
    const rows = getFiltered();
    setChartData(rows.sort((a, b) => new Date(a.data) - new Date(b.data)).map(r => ({
      date: formatDate(r.data),
      'Resultado': parseFloat(r.resultado) || 0,
      'Limite': parseFloat(r.limite) || 0,
    })));
    setChartOpen(true);
  };

  const handleExport = () => exportToExcel(getFiltered(), [
    { key: 'data', label: 'Data', fn: r => formatDate(r.data) },
    { key: 'tt_analiseparam', label: 'Parâmetro', fn: r => r.tt_analiseparam || '' },
    { key: 'resultado', label: 'Resultado', fn: r => parseFloat(r.resultado) || 0 },
    { key: 'limite', label: 'Limite', fn: r => parseFloat(r.limite) || 0 },
    { key: '_excesso', label: 'Excesso (%)', fn: r => {
      const res = parseFloat(r.resultado), lim = parseFloat(r.limite);
      return (!isNaN(res) && !isNaN(lim) && lim > 0) ? (((res - lim) / lim) * 100).toFixed(1) : '';
    }},
    { key: 'operador1', label: 'Operador', fn: r => r.operador1 || '' },
  ], `incumprimentos_${pk}`);

  const cols = [
    { field: 'data', headerName: 'Data', width: 110,
      valueGetter: dateValueGetter,
      renderCell: ({ row }) => <Cell><Typography variant="body2">{formatDate(row.data)}</Typography></Cell> },
    { field: 'tt_analiseparam', headerName: 'Parâmetro', width: 160,
      valueGetter: (v) => v || '',
      renderCell: ({ row }) => <Cell><Chip label={row.tt_analiseparam || '—'} size="small" variant="outlined" /></Cell> },
    { field: 'resultado', headerName: 'Resultado', width: 110, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>{formatNum(value)}</Typography></Cell> },
    { field: 'limite', headerName: 'Limite', width: 100, align: 'right', headerAlign: 'right', type: 'number',
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
    {
      field: '_severity', headerName: 'Gravidade', width: 110,
      // valueGetter devolve número (nível de gravidade) para ordenação correcta
      // 0=Baixo, 1=Moderado, 2=Elevado, 3=Crítico
      valueGetter: (_, row) => {
        const res = parseFloat(row.resultado), lim = parseFloat(row.limite);
        if (isNaN(res) || isNaN(lim) || lim === 0) return -1;
        const pct = ((res - lim) / lim) * 100;
        if (pct >= 100) return 3;
        if (pct >= 50)  return 2;
        if (pct >= 20)  return 1;
        return 0;
      },
      renderCell: ({ value }) => {
        if (value < 0) return <Cell>—</Cell>;
        const sev = [
          { label: 'Baixo',    color: 'success' },
          { label: 'Moderado', color: 'warning' },
          { label: 'Elevado',  color: 'error'   },
          { label: 'Crítico',  color: 'error'   },
        ][value];
        return <Cell><Chip label={sev.label} size="small" color={sev.color} variant="outlined" /></Cell>;
      },
    },
    { field: 'operador1', headerName: 'Operador 1', flex: 1, minWidth: 130,
      renderCell: ({ row }) => <Cell><Typography variant="body2">{row.operador1 || '—'}</Typography></Cell> },
  ];

  return (
    <Box>
      <TabActionBar addLabel="Registar Incumprimento" addColor="error" onAdd={() => setOpen(true)}
        filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen((o) => !o)} activeFilterCount={activeFilterCount} />
      <TabFilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)}
        config={filterConfig} filters={filters} onChange={setFilters}
        onChart={handleChart} onExport={handleExport} />
      <DataGrid apiRef={apiRef} rows={filteredData} columns={cols} loading={isLoading} autoHeight getRowHeight={() => 'auto'}
        disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ toolbar: DataGridToolbar }}
        sx={{ borderRadius: 2, '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 } }}
        localeText={{ ...GRID_LOCALE, ...GRID_FILTER_LOCALE, noRowsLabel: 'Sem incumprimentos registados' }} />
      <InstalacaoDataChart open={chartOpen} onClose={() => setChartOpen(false)} title="Incumprimentos"
        data={chartData}
        series={[
          { key: 'Resultado', label: 'Resultado', color: '#ef5350' },
          { key: 'Limite', label: 'Limite', color: '#42a5f5' },
        ]} />

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

// ─── TAB: Operações Diretas ──────────────────────────────────────────────────

const OperacoesTab = ({ pk, type, onSuccess }) => {
  const instType = type === 'etar' ? 'ETAR' : 'EE';

  const handleSubmit = async (data) => {
    const result = await operationService.createOperacaoDirect({ ...data, pk_instalacao: pk });
    notification.success('Operação registada com sucesso!');
    onSuccess?.();
    return result;
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <DirectTaskForm
        fixedInstType={instType}
        fixedPk={pk}
        onSubmit={handleSubmit}
        onCancel={onSuccess ?? (() => {})}
      />
    </Box>
  );
};

// ─── Dialog: Detalhe de Tarefa ────────────────────────────────────────────────

const TarefaDetailDialog = ({ tarefa, open, onClose }) => {
  if (!tarefa) return null;

  const isPendente = !tarefa.updt_time;
  const isProgramada = tarefa.tt_operacaomodo != null;
  const hasReported = tarefa.valuetext != null || tarefa.valuenumb != null || tarefa.valuememo;
  const hasValidacao = !!tarefa.control_tt_operacaocontrolo;

  const Row = ({ label, value }) => value == null || value === '' ? null : (
    <Box sx={{ display: 'flex', gap: 1, py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140, fontWeight: 500 }}>{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" />
            <Typography variant="h6" fontWeight={700} noWrap>{tarefa.tt_operacaoaccao || 'Tarefa'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={isPendente ? 'Pendente' : 'Concluída'}
              size="small"
              color={isPendente ? 'warning' : 'success'}
              variant="outlined"
            />
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2}>
          {/* Identificação */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Identificação
            </Typography>
            <Divider sx={{ my: 0.5 }} />
            <Row label="Tipo" value={isProgramada ? 'Programada' : 'Pontual'} />
            <Row label="Data agendada" value={formatDate(tarefa.data)} />
            <Row label="Operador" value={tarefa.ts_operador1} />
            {tarefa.ts_operador2 && <Row label="Operador 2" value={tarefa.ts_operador2} />}
            {tarefa.descr && <Row label="Descrição" value={tarefa.descr} />}
          </Box>

          {/* Dados reportados */}
          {hasReported && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Dados Reportados
              </Typography>
              <Divider sx={{ my: 0.5 }} />
              <Row label="Data conclusão" value={formatDate(tarefa.updt_time)} />
              {tarefa.valuetext != null && <Row label="Valor (texto)" value={tarefa.valuetext} />}
              {tarefa.valuenumb != null && <Row label="Valor (numérico)" value={String(tarefa.valuenumb)} />}
              {tarefa.valuememo && <Row label="Observações" value={tarefa.valuememo} />}
            </Box>
          )}

          {/* Anexos */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Anexos
            </Typography>
            <Divider sx={{ my: 0.5 }} />
            <AnnexesSection operacaoPk={tarefa.pk} />
          </Box>

          {/* Validação */}
          {hasValidacao && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Validação
              </Typography>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <CheckCircleIcon fontSize="small" color="success" />
                <Typography variant="body2">{tarefa.control_tt_operacaocontrolo}</Typography>
              </Box>
              {tarefa.control_memo && <Row label="Nota" value={tarefa.control_memo} />}
              {tarefa.control_client && <Row label="Validado por" value={tarefa.control_client} />}
              {tarefa.control_time && <Row label="Data validação" value={formatDate(tarefa.control_time)} />}
            </Box>
          )}

          {/* Estado pendente */}
          {isPendente && !hasReported && (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              Tarefa ainda não concluída — sem dados reportados.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} size="small">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── TAB: Histórico de Tarefas ────────────────────────────────────────────────

const HISTORICO_FILTER_DEFAULTS = { estado: '', acao: '', dateFrom: '', dateTo: '' };

const HistoricoTab = ({ pk, color, onIntervencoesOpen, onDescargasOpen }) => {
  const apiRef = useGridApiRef();
  const [filters, setFilters] = useState(HISTORICO_FILTER_DEFAULTS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  const { data: allTarefas = [], isLoading } = useQuery({
    queryKey: ['instalacao', 'historico', pk],
    queryFn: () => operationService.getOperacao({ instalacaoPk: pk }),
    enabled: !!pk,
    select: (d) => (d?.data || []).map((r, i) => ({ ...r, id: r.pk ?? i })),
    staleTime: 2 * 60 * 1000,
  });

  const uniqueOptions = (arr, key) => {
    const seen = new Set();
    return arr.map((r) => r[key]).filter(Boolean)
      .filter((v) => { if (seen.has(v)) return false; seen.add(v); return true; })
      .sort().map((v) => ({ value: v, label: v }));
  };

  const acaoOptions = useMemo(() => uniqueOptions(allTarefas, 'tt_operacaoaccao'), [allTarefas]);

  const filterConfig = useMemo(() => [
    { key: 'estado', label: 'Estado', type: 'select', md: 2,
      options: [{ value: 'concluida', label: 'Concluída' }, { value: 'pendente', label: 'Pendente' }] },
    { key: 'acao',   label: 'Ação / Tarefa', type: 'select', md: 3,
      options: acaoOptions },
    { key: 'dateFrom', label: 'De (data)', type: 'date' },
    { key: 'dateTo',   label: 'Até (data)', type: 'date' },
  ], [acaoOptions]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length, [filters],
  );

  const tarefas = useMemo(() => allTarefas.filter((r) => {
    if (filters.estado === 'concluida' && !r.updt_time) return false;
    if (filters.estado === 'pendente'  &&  r.updt_time) return false;
    if (filters.acao && r.tt_operacaoaccao !== filters.acao) return false;
    // Filtrar por data: usa updt_time para operações concluídas, data para pendentes
    const d = dateStr(r.updt_time || r.data);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo   && d > filters.dateTo)   return false;
    return true;
  }), [allTarefas, filters]);

  const getFiltered = () => {
    try { return gridFilteredSortedRowEntriesSelector(apiRef).map((e) => e.model); }
    catch { return tarefas; }
  };

  const handleExport = () => exportToExcel(getFiltered(), [
    { key: 'data',                       label: 'Data Agendada',  fn: (r) => formatDate(r.data) },
    { key: 'updt_time',                  label: 'Data Conclusão', fn: (r) => formatDate(r.updt_time) },
    { key: 'tt_operacaoaccao',           label: 'Ação / Tarefa' },
    { key: 'ts_operador1',               label: 'Operador' },
    { key: 'tt_operacaomodo',            label: 'Tipo',      fn: (r) => r.tt_operacaomodo != null ? 'Programada' : 'Pontual' },
    { key: '_estado',                    label: 'Estado',    fn: (r) => r.updt_time ? 'Concluída' : 'Pendente' },
    { key: 'control_tt_operacaocontrolo', label: 'Validação', fn: (r) => r.control_tt_operacaocontrolo ? 'Validada' : '' },
  ], `historico_${pk}`);

  const cols = [
    {
      field: 'data', headerName: 'Data Agendada', width: 130,
      valueGetter: dateValueGetter,
      renderCell: ({ row }) => (
        <Cell><Typography variant="body2">{row.data ? formatDate(row.data) : '—'}</Typography></Cell>
      ),
    },
    {
      field: 'updt_time', headerName: 'Data Conclusão', width: 130,
      valueGetter: dateValueGetter,
      renderCell: ({ row }) => (
        <Cell><Typography variant="body2">{row.updt_time ? formatDate(row.updt_time) : '—'}</Typography></Cell>
      ),
    },
    {
      field: 'tt_operacaoaccao', headerName: 'Ação / Tarefa', flex: 1, minWidth: 200,
      valueGetter: (v) => v || '',
      renderCell: ({ value }) => (
        <Cell><Typography variant="body2" noWrap>{value || '—'}</Typography></Cell>
      ),
    },
    {
      field: 'ts_operador1', headerName: 'Operador', width: 160,
      valueGetter: (v) => v || '',
      renderCell: ({ value }) => (
        <Cell><Typography variant="body2">{value || '—'}</Typography></Cell>
      ),
    },
    {
      field: 'tt_operacaomodo', headerName: 'Tipo', width: 130,
      valueGetter: (v) => v != null ? 'Programada' : 'Pontual',
      renderCell: ({ row }) => {
        const isProgramada = row.tt_operacaomodo != null;
        return (
          <Cell>
            <Chip
              icon={isProgramada ? <ScheduleIcon fontSize="small" /> : <FlashOnIcon fontSize="small" />}
              label={isProgramada ? 'Programada' : 'Pontual'}
              size="small"
              sx={isProgramada
                ? { bgcolor: alpha('#9c27b0', 0.1), color: '#9c27b0', '& .MuiChip-icon': { color: '#9c27b0' } }
                : { bgcolor: alpha('#ff9800', 0.1), color: '#ff9800', '& .MuiChip-icon': { color: '#ff9800' } }
              }
            />
          </Cell>
        );
      },
    },
    {
      field: '_estado', headerName: 'Estado', width: 120,
      valueGetter: (_, row) => row.updt_time ? 'Concluída' : 'Pendente',
      renderCell: ({ row }) => (
        <Cell>
          <Chip
            label={row.updt_time ? 'Concluída' : 'Pendente'}
            size="small"
            color={row.updt_time ? 'success' : 'warning'}
            variant="outlined"
          />
        </Cell>
      ),
    },
    {
      field: 'control_tt_operacaocontrolo', headerName: 'Validação', width: 110,
      valueGetter: (v) => v ? 'Validada' : '',
      renderCell: ({ value }) => (
        <Cell>
          {value
            ? <Chip label="Validada" size="small" color="success" variant="outlined" />
            : <Typography variant="caption" color="text.disabled">—</Typography>}
        </Cell>
      ),
    },
  ];

  return (
    <Box>
      <TabActionBar
        addLabel={null}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((o) => !o)}
        activeFilterCount={activeFilterCount}
        extra={
          <Stack direction="row" spacing={1} alignItems="center">
            {onIntervencoesOpen && (
              <Button size="small" variant="outlined" startIcon={<IntervencoesIcon />}
                onClick={onIntervencoesOpen}
                sx={{ textTransform: 'none' }}>
                Intervenção
              </Button>
            )}
            {onDescargasOpen && (
              <Button size="small" variant="outlined" color="error" startIcon={<DescargaIcon />}
                onClick={onDescargasOpen}
                sx={{ textTransform: 'none' }}>
                Descarga Interdita
              </Button>
            )}
            <Typography variant="caption" color="text.secondary">
              {tarefas.length} registo{tarefas.length !== 1 ? 's' : ''}
            </Typography>
          </Stack>
        }
      />

      <TabFilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)}
        config={filterConfig} filters={filters} onChange={setFilters}
        onExport={handleExport} />

      <DataGrid
        apiRef={apiRef}
        rows={tarefas}
        columns={cols}
        loading={isLoading}
        autoHeight
        getRowHeight={() => 'auto'}
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        onRowClick={({ row }) => setDetalhe(row)}
        slots={{ toolbar: DataGridToolbar }}
        sx={{
          borderRadius: 2,
          '& .MuiDataGrid-cell': { py: 1.5 },
          '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(color, 0.05), fontWeight: 700 },
          '& .MuiDataGrid-row': { cursor: 'pointer' },
        }}
        localeText={{ ...GRID_LOCALE, ...GRID_FILTER_LOCALE, noRowsLabel: 'Sem tarefas registadas para esta instalação.' }}
      />

      <TarefaDetailDialog
        tarefa={detalhe}
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
      />
    </Box>
  );
};

// ─── TAB: Descargas Interditas ────────────────────────────────────────────────

const DescargasInterditasTab = ({ pk, tsEntity, color, onSuccess }) => {
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: associates = [] } = useAssociates();
  const associatesMap = useMemo(() => {
    const map = {};
    for (const a of associates) {
      map[a.name] = a.pk;
      const stripped = a.name.replace(/^Município de\s+/i, '').trim();
      if (stripped !== a.name) map[stripped] = a.pk;
    }
    return map;
  }, [associates]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (memo.trim().length < 10) return;
    setIsSubmitting(true);
    try {
      const pk_entity = associatesMap[tsEntity] ?? null;
      const res = await createDescargaInterdita({ pk_instalacao: pk, pk_entity, pnmemo: memo.trim() });
      notification.success('Descarga interdita registada com sucesso!');
      setMemo('');
      onSuccess?.();
    } catch {
      notification.error('Erro ao registar descarga interdita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 2,
          borderColor: alpha(color || '#d32f2f', 0.3),
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Registe uma ocorrência de descarga interdita nesta instalação.
          Será gerado um pedido interno de acompanhamento (tipo 57).
        </Typography>

        <form onSubmit={handleSubmit}>
          {isSubmitting && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
          <TextField
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            label="Descrição da ocorrência *"
            placeholder="Descreva a ocorrência: data de deteção, origem suspeita, características do efluente e observações relevantes..."
            multiline
            rows={5}
            fullWidth
            error={memo.length > 0 && memo.length < 10}
            helperText={
              memo.length > 0 && memo.length < 10
                ? 'Mínimo 10 caracteres'
                : `${memo.length} caracteres`
            }
            disabled={isSubmitting}
            sx={{ mb: 2.5 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="error"
              disabled={isSubmitting || memo.trim().length < 10}
              startIcon={<SendIcon />}
            >
              Registar Ocorrência
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

// ─── InstalacaoPage (principal) ───────────────────────────────────────────────

const TABS_ETAR = [
  { label: 'Histórico',      icon: HistoryIcon },        // 0
  { label: 'Volumes',        icon: VolumeIcon },         // 1
  { label: 'Água',           icon: WaterIcon },          // 2
  { label: 'Energia',        icon: EnergyIcon },         // 3
  { label: 'Despesas',       icon: ExpenseIcon },        // 4
  { label: 'Incumprimentos', icon: IncumpIcon },         // 5
  { label: 'Equipamentos',   icon: EquipamentosTabIcon },// 6
  { label: 'Obras',          icon: ObrasTabIcon },       // 7
];

// EE = sem Incumprimentos
const TABS_EE = [
  { label: 'Histórico',    icon: HistoryIcon },        // 0
  { label: 'Volumes',      icon: VolumeIcon },         // 1
  { label: 'Água',         icon: WaterIcon },          // 2
  { label: 'Energia',      icon: EnergyIcon },         // 3
  { label: 'Despesas',     icon: ExpenseIcon },        // 4
  { label: 'Equipamentos', icon: EquipamentosTabIcon },// 5
  { label: 'Obras',        icon: ObrasTabIcon },       // 6
];

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
  const [intervencoesOpen, setIntervencoesOpen] = useState(false);
  const [descargasOpen, setDescargasOpen] = useState(false);
  const [equipamentosMeta, setEquipamentosMeta] = useState(null);
  const metaLoaded = useRef(false);
  const pk = selected?.pk ?? null;

  // Carrega meta de equipamentos uma única vez (lazy)
  useEffect(() => {
    if (metaLoaded.current) return;
    metaLoaded.current = true;
    getEquipamentosMeta().then(setEquipamentosMeta).catch(() => {});
  }, []);

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
            <HistoricoTab pk={pk} color={color}
              onIntervencoesOpen={() => setIntervencoesOpen(true)}
              onDescargasOpen={() => setDescargasOpen(true)}
            />
          )}
          {tab === 1 && (
            <VolumeTab pk={pk} color={color} data={volumes} isLoading={isLoadingVolumes}
              addVolume={addVolume} isAdding={isAddingVolume} />
          )}
          {tab === 2 && (
            <WaterTab pk={pk} color={color} data={waterVolumes} isLoading={isLoadingWater}
              addWaterVolume={addWaterVolume} isAdding={isAddingWater} />
          )}
          {tab === 3 && (
            <EnergyTab pk={pk} color={color} data={energy} isLoading={isLoadingEnergy}
              addEnergy={addEnergy} isAdding={isAddingEnergy} />
          )}
          {tab === 4 && (
            <ExpensesTab pk={pk} color={color} data={expenses} isLoading={isLoadingExpenses}
              addExpense={addExpense} isAdding={isAddingExpense} />
          )}
          {/* ETAR only: Incumprimentos = tab 5 */}
          {tab === 5 && type === 'etar' && (
            <IncumprimentosTab pk={pk} color={color} data={incumprimentos} isLoading={isLoadingIncump}
              addIncumprimento={addIncumprimento} isAdding={isAddingIncump} />
          )}
          {/* Equipamentos: tab 6 para ETAR, tab 5 para EE */}
          {((tab === 6 && type === 'etar') || (tab === 5 && type === 'ee')) && (
            <InstalacaoEquipamentosTab pk={pk} meta={equipamentosMeta} canEdit />
          )}
          {/* Obras: tab 7 para ETAR, tab 6 para EE */}
          {((tab === 7 && type === 'etar') || (tab === 6 && type === 'ee')) && (
            <InstalacaoObrasTab pk={pk} instalacao={selected} type={type} canEdit />
          )}
        </Box>
      )}

      {/* Modal: Intervenções */}
      <Dialog open={intervencoesOpen && !!pk} onClose={() => setIntervencoesOpen(false)}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IntervencoesIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Nova Intervenção</Typography>
            </Box>
            <IconButton size="small" onClick={() => setIntervencoesOpen(false)}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <OperacoesTab pk={pk} type={type} onSuccess={() => setIntervencoesOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal: Descargas Interditas */}
      <Dialog open={descargasOpen && !!pk} onClose={() => setDescargasOpen(false)}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescargaIcon color="error" />
              <Typography variant="h6" fontWeight={700}>Registar Descarga Interdita</Typography>
            </Box>
            <IconButton size="small" onClick={() => setDescargasOpen(false)}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <DescargasInterditasTab pk={pk} tsEntity={selected?.ts_entity} color={color}
            onSuccess={() => setDescargasOpen(false)} />
        </DialogContent>
      </Dialog>

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
