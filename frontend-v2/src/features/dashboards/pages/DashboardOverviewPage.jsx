/**
 * DashboardOverviewPage — landing dashboard
 * Grelha unificada: KPI + navegação por categoria + spotlights históricos
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Divider,
  Skeleton, Stack, Chip, Select, MenuItem, FormControl,
  useTheme, alpha,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import ConstructionIcon from '@mui/icons-material/Construction';
import ScienceIcon from '@mui/icons-material/Science';
import WarningIcon from '@mui/icons-material/Warning';
import RoadIcon from '@mui/icons-material/Traffic';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import TimelineIcon from '@mui/icons-material/Timeline';
import HeartbeatIcon from '@mui/icons-material/MonitorHeart';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useDashboardView } from '../hooks/useDashboard';
import ChartCard from '../components/charts/ChartCard';
import { formatValue } from '../components/charts/chartUtils';
import DashboardLanding from '../components/DashboardLanding';

// ─── Category definitions ────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'pedidos', label: 'Pedidos', route: '/dashboards/requests',
    icon: AssignmentIcon, color: '#2196F3',
    desc: 'Tramitações, estados e desempenho',
    kpiView: 'vds_pedido_01$005', kpiSumKey: 'Total', kpiYearKey: 'Ano',
    spotlightView: 'vds_pedido_01$005',
    spotlightType: 'line', spotlightLabel: 'Pedidos por Ano (Total / Terminados / Abertos)',
  },
  {
    id: 'ramais', label: 'Ramais', route: '/dashboards/branches',
    icon: AccountTreeIcon, color: '#4CAF50',
    desc: 'Construção e extensão de rede',
    kpiView: 'vds_ramal_01$002', kpiSumKey: 'Número', kpiYearKey: 'Ano',
  },
  {
    id: 'fossas', label: 'Fossas', route: '/dashboards/septic-tanks',
    icon: CleaningServicesIcon, color: '#FF9800',
    desc: 'Somatório de fossas por município e ano',
    kpiView: 'vds_fossa_01$002', kpiPivot: true,
    spotlightView: 'vds_fossa_01$001',
    spotlightType: 'pie', spotlightLabel: 'Fossas por Estado (atual)',
  },
  {
    id: 'instalacoes', label: 'Instalações', route: '/dashboards/installations',
    icon: ConstructionIcon, color: '#9C27B0',
    desc: 'Instalações, operadores e durações',
    kpiView: null,
  },
  {
    id: 'analises', label: 'Análises', route: '/dashboards/analyses',
    icon: ScienceIcon, color: '#00BCD4',
    desc: 'Análises laboratoriais e parâmetros',
    kpiView: null,
  },
  {
    id: 'incumprimentos', label: 'Incumprimentos', route: '/dashboards/violations',
    icon: WarningIcon, color: '#F44336',
    desc: 'Não conformidades e severidade',
    kpiView: 'vds_incumprimento_01$001', kpiSumKey: 'Contagem', kpiYearKey: 'Ano',
    spotlightView: 'vds_incumprimento_01$001',
    spotlightType: 'bar', spotlightLabel: 'Incumprimentos por Ano',
  },
  {
    id: 'repavimentacoes', label: 'Repavimentações', route: '/dashboards/repav',
    icon: RoadIcon, color: '#795548',
    desc: 'Pedidos e áreas de repavimentação',
    kpiView: 'vds_repav_01$002', kpiSumKey: 'Número', kpiYearKey: 'Ano',
    spotlightView: 'vds_repav_01$001',
    spotlightType: 'pie', spotlightLabel: 'Repavimentações por Estado',
  },
  {
    id: 'tramitacoes', label: 'Tramitações', route: '/dashboards/tramitacoes',
    icon: SwapHorizIcon, color: '#607D8B',
    desc: 'Procedimentos por utilizador',
    kpiView: 'vds_tramitacao_01$003', kpiSumKey: 'Movimentos', kpiYearKey: 'Ano',
    spotlightView: 'vds_tramitacao_01$001',
    spotlightType: 'bar-h', spotlightLabel: 'Movimentos por Utilizador',
  },
];

const SPOTLIGHTS = CATEGORIES.filter((c) => c.spotlightView).slice(0, 3);

// ─── Year column detection ───────────────────────────────────────────────────
const currentYear = new Date().getFullYear();

const detectYearColumn = (row) => {
  if (!row) return null;
  const keys = Object.keys(row);
  const byName = keys.find((k) =>
    /^(ano|year|exercicio|periodo)$/i.test(k) ||
    /^(ano_|year_)/i.test(k) ||
    /_(ano|year)$/i.test(k),
  );
  if (byName) return byName;
  const maxYear = currentYear + 2;
  return keys.find((k) => {
    const v = Number(row[k]);
    return Number.isInteger(v) && v >= 2000 && v <= maxYear;
  }) ?? null;
};

// ─── Unified Category Card (KPI + navigation) ────────────────────────────────
const CategoryCard = ({ cat, year }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const Icon = cat.icon;

  const { data = [], isLoading } = useDashboardView(cat.kpiView);

  const { value: total, yearFiltered } = useMemo(() => {
    if (!data.length || !cat.kpiView) return { value: 0, yearFiltered: false };

    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    const yearNum = Number(year);

    if (cat.kpiPivot) {
      const yearColName = String(yearNum);
      const yearCols = keys
        .filter((k) => /^\d{4}$/.test(k))
        .sort((a, b) => Number(b) - Number(a));
      const effectiveCol = yearColName in firstRow ? yearColName : (yearCols[0] ?? null);
      const value = effectiveCol
        ? data.reduce((s, r) => s + (Number(r[effectiveCol]) || 0), 0)
        : 0;
      return { value, yearFiltered: !!effectiveCol };
    }

    let yearKey;
    if (!('kpiYearKey' in cat)) {
      yearKey = detectYearColumn(firstRow);
    } else if (cat.kpiYearKey === null) {
      yearKey = null;
    } else if (firstRow[cat.kpiYearKey] !== undefined) {
      yearKey = cat.kpiYearKey;
    } else {
      yearKey = detectYearColumn(firstRow);
    }

    const filtered = yearKey
      ? data.filter((r) => Number(r[yearKey]) === Number(year))
      : data;

    if (!filtered.length) return { value: 0, yearFiltered: !!yearKey };

    const sumKey = (cat.kpiSumKey && filtered[0]?.[cat.kpiSumKey] !== undefined)
      ? cat.kpiSumKey
      : keys.find(
          (k) => typeof firstRow[k] === 'number' &&
            !/^(ano|year|mes|month|exercicio|periodo)/i.test(k),
        );

    if (!sumKey) return { value: 0, yearFiltered: !!yearKey };
    const value = filtered.reduce((s, r) => s + (Number(r[sumKey]) || 0), 0);
    return { value, yearFiltered: !!yearKey };
  }, [data, year, cat]);

  const hasKpi = !!cat.kpiView;

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 3,
        cursor: 'pointer',
        background: `linear-gradient(135deg, ${alpha(cat.color, 0.11)} 0%, ${alpha(cat.color, 0.03)} 100%)`,
        border: `1px solid ${alpha(cat.color, 0.18)}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 6px 20px ${alpha(cat.color, 0.22)}`,
        },
      }}
      onClick={() => navigate(cat.route)}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

          {/* Left: label, value, desc */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
              >
                {cat.label}
              </Typography>
              {!isLoading && hasKpi && !yearFiltered && (
                <Chip
                  label="Total"
                  size="small"
                  sx={{
                    height: 14, fontSize: 9, fontWeight: 700,
                    bgcolor: alpha(cat.color, 0.12), color: cat.color,
                    '& .MuiChip-label': { px: 0.6 },
                  }}
                />
              )}
            </Box>

            {isLoading && hasKpi ? (
              <Skeleton width={64} height={38} sx={{ my: 0.25 }} />
            ) : (
              <Typography
                variant="h4"
                fontWeight={800}
                sx={{
                  lineHeight: 1.1,
                  mt: 0.25, mb: 0.5,
                  color: hasKpi ? cat.color : alpha(theme.palette.text.primary, 0.25),
                }}
              >
                {hasKpi ? formatValue(total) : '—'}
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {cat.desc}
            </Typography>
          </Box>

          {/* Right: icon + arrow */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, ml: 1.5, flexShrink: 0 }}>
            <Box sx={{ p: 1.2, borderRadius: 2.5, bgcolor: alpha(cat.color, 0.13) }}>
              <Icon sx={{ fontSize: 24, color: cat.color }} />
            </Box>
            <ArrowForwardIosIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── Spotlight chart card ────────────────────────────────────────────────────
const SpotlightCard = ({ cat }) => {
  const { data = [], isLoading, isError } = useDashboardView(cat.spotlightView);
  return (
    <ChartCard
      title={cat.spotlightLabel}
      data={data}
      chartType={cat.spotlightType}
      color={cat.color}
      height={300}
      isLoading={isLoading}
      isError={isError}
      showExport={false}
      elevation={2}
    />
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const FALLBACK_YEARS = Array.from({ length: 8 }, (_, i) => currentYear - i);

export const DashboardOverviewPage = () => {
  const [year, setYear] = useState(currentYear);

  const { data: pedidosData = [] } = useDashboardView('vds_pedido_01$005');

  const availableYears = useMemo(() => {
    if (!pedidosData.length) return FALLBACK_YEARS;
    const yearKey = detectYearColumn(pedidosData[0]);
    if (!yearKey) return FALLBACK_YEARS;
    const unique = [...new Set(pedidosData.map((r) => Number(r[yearKey])))]
      .filter((y) => y > 2000 && y <= currentYear + 1)
      .sort((a, b) => b - a);
    return unique.length >= 2 ? unique : FALLBACK_YEARS;
  }, [pedidosData]);

  return (
    <ModulePage
      title="Visão Geral"
      subtitle="Indicadores e análise de dados AINTAR"
      icon={DashboardIcon}
      color="#9c27b0"
      breadcrumbs={[{ label: 'Visão Geral', path: '/dashboards/overview' }]}
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ fontSize: 13 }}>
              {availableYears.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      }
    >

      {/* ── Resumo operacional (landing views) ───────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <HeartbeatIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary', fontSize: 11 }}>
          Resumo operacional
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
          — Corrente vs Anterior, por município e por tipo
        </Typography>
      </Box>
      <DashboardLanding />

      <Divider sx={{ my: 3 }} />

      {/* ── Spotlights históricos ────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <TimelineIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary', fontSize: 11 }}>
          Tendências históricas
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
          — dados acumulados, independentes do ano selecionado
        </Typography>
      </Box>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {SPOTLIGHTS.map((cat) => (
          <Grid key={cat.id} size={{ xs: 12, md: 4 }}>
            <SpotlightCard cat={cat} />
          </Grid>
        ))}
      </Grid>

      {/* ── Categorias (KPI + navegação) ─────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <FilterAltIcon sx={{ fontSize: 16, color: '#9c27b0' }} />
        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, color: '#9c27b0', fontSize: 11 }}>
          Indicadores de {year}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
          — clique numa categoria para explorar os dados
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {CATEGORIES.map((cat) => (
          <Grid key={cat.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <CategoryCard cat={cat} year={year} />
          </Grid>
        ))}
      </Grid>

    </ModulePage>
  );
};

export default DashboardOverviewPage;
