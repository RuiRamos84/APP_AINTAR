/**
 * DashboardCategoryPage — redesigned with Recharts, tabs, year/month filters, export
 */
import { useState, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, Skeleton,
  Tabs, Tab, Chip, Stack, Select, MenuItem, FormControl,
  InputLabel, IconButton, Tooltip, Divider, useTheme, alpha,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useDashboardView } from '../hooks/useDashboard';
import ChartCard from './charts/ChartCard';

// ─── KPI Card ───────────────────────────────────────────────────────────────
const KPICard = ({ title, value, subtitle, color, icon: Icon, isLoading }) => {
  const theme = useTheme();
  if (isLoading) return <Skeleton variant="rounded" height={100} />;
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(color ?? theme.palette.primary.main, 0.12)} 0%, ${alpha(color ?? theme.palette.primary.main, 0.04)} 100%)`,
        border: `1px solid ${alpha(color ?? theme.palette.primary.main, 0.18)}`,
        transition: 'transform 0.18s, box-shadow 0.18s',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: theme.shadows[6] },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: color ?? 'primary.main', lineHeight: 1.1, mt: 0.5 }}>
              {value ?? '—'}
            </Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          {Icon && (
            <Box sx={{ p: 1.2, borderRadius: 2.5, bgcolor: alpha(color ?? theme.palette.primary.main, 0.15) }}>
              <Icon sx={{ fontSize: 26, color: color ?? 'primary.main' }} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── Single view chart with data fetching ───────────────────────────────────
const ViewChart = ({ viewName, chartType, color, filters, height = 360 }) => {
  const { data = [], isLoading, isError } = useDashboardView(viewName, filters);
  return (
    <ChartCard
      title=""
      data={data}
      chartType={chartType}
      color={color}
      height={height}
      isLoading={isLoading}
      isError={isError}
      elevation={0}
    />
  );
};

// ─── Year range for filter ───────────────────────────────────────────────────
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => currentYear - i);
const MONTHS = [
  { value: '', label: 'Todos os meses' },
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
];

// ─── Main Component ──────────────────────────────────────────────────────────
const DashboardCategoryPage = ({
  title,
  subtitle,
  icon,
  color = '#2196f3',
  breadcrumbs,
  kpiConfig = [],
  views = [],
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState('');

  const filters = useMemo(() => {
    const f = { year };
    if (month) f.month = month;
    return f;
  }, [year, month]);

  const activeView = views[activeTab];

  // KPI data: use first view in list to compute totals
  const { data: kpiData = [], isLoading: kpiLoading, refetch } = useDashboardView(
    views[0]?.name,
    filters,
  );

  const kpiValues = useMemo(() => {
    if (!kpiConfig.length || !kpiData.length) return {};
    const out = {};
    kpiConfig.forEach((k) => {
      if (k.getValue) out[k.key] = k.getValue(kpiData);
    });
    return out;
  }, [kpiConfig, kpiData]);

  return (
    <ModulePage
      title={title}
      subtitle={subtitle}
      icon={icon}
      color={color}
      breadcrumbs={breadcrumbs}
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Year filter */}
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <Select value={year} onChange={(e) => setYear(e.target.value)} sx={{ fontSize: 13 }}>
              {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          {/* Month filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={month} onChange={(e) => setMonth(e.target.value)} displayEmpty sx={{ fontSize: 13 }}>
              {MONTHS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Tooltip title="Atualizar">
            <IconButton size="small" onClick={() => refetch()}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      {/* KPI Row */}
      {kpiConfig.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpiConfig.map((kpi, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <KPICard
                title={kpi.title}
                value={kpiValues[kpi.key]}
                subtitle={kpi.subtitle}
                color={kpi.color ?? color}
                icon={kpi.icon}
                isLoading={kpiLoading}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Chart area with tab nav */}
      {views.length > 0 && (
        <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {/* Tab header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              pt: 1,
              bgcolor: alpha(color, 0.04),
              borderBottom: `1px solid ${theme.palette.divider}`,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 44,
                '& .MuiTab-root': { minHeight: 44, fontSize: 12, fontWeight: 600, px: 2 },
                '& .MuiTabs-indicator': { bgcolor: color, height: 3, borderRadius: '3px 3px 0 0' },
                '& .Mui-selected': { color: `${color} !important` },
              }}
            >
              {views.map((v, i) => (
                <Tab key={v.name} label={v.label} value={i} />
              ))}
            </Tabs>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pr: 1 }}>
              <FilterAltIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Chip label={year} size="small" sx={{ bgcolor: alpha(color, 0.1), color: color, fontWeight: 700 }} />
              {month && <Chip label={MONTHS.find((m) => m.value === month)?.label} size="small" variant="outlined" />}
            </Stack>
          </Box>

          {/* Active chart */}
          <Box sx={{ p: { xs: 1.5, md: 3 } }}>
            {activeView && (
              <ViewChart
                key={`${activeView.name}-${year}-${month}`}
                viewName={activeView.name}
                chartType={activeView.chartType ?? 'auto'}
                color={color}
                filters={filters}
                height={400}
              />
            )}
          </Box>

          {/* Footer info */}
          <Divider />
          <Box sx={{ px: 3, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.disabled">
              Vista: <strong>{activeView?.name}</strong>
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Dados de {year}{month ? ` · ${MONTHS.find((m) => m.value === month)?.label}` : ''}
            </Typography>
          </Box>
        </Paper>
      )}
    </ModulePage>
  );
};

export default DashboardCategoryPage;
