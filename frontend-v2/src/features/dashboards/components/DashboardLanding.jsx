/**
 * DashboardLanding — Resumo operacional
 * Design nativo do frontend-v2: ChartCard, LinearProgress, MUI v7
 */
import { useMemo, useState } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, Tabs, Tab,
  LinearProgress, Skeleton, Alert, IconButton, Tooltip,
  useTheme, alpha,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useLandingData, useMunicipalities } from '../hooks/useDashboard';
import ChartCard from './charts/ChartCard';
import { formatValue } from './charts/chartUtils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('pt-PT'));

const calcTrend = (cur, prev) =>
  !prev ? null : Math.round(((cur - prev) / prev) * 100);

const sumRow = (row, exclude = []) =>
  Object.entries(row ?? {})
    .filter(([k]) => !exclude.includes(k))
    .reduce((s, [, v]) => s + (parseFloat(v) || 0), 0);

// ── TrendChip ─────────────────────────────────────────────────────────────────

const TrendChip = ({ trend, invertColors = false }) => {
  if (trend === null || trend === undefined) return null;
  const isGood = invertColors ? trend <= 0 : trend >= 0;
  const Icon = trend > 0 ? TrendingUpIcon : trend < 0 ? TrendingDownIcon : TrendingFlatIcon;
  return (
    <Chip
      size="small"
      icon={<Icon sx={{ fontSize: '12px !important' }} />}
      label={`${Math.abs(trend)}%`}
      sx={{
        height: 20, fontSize: 10, fontWeight: 700,
        bgcolor: isGood ? 'success.main' : 'error.main',
        color: '#fff',
        '& .MuiChip-icon': { color: '#fff', ml: 0.5 },
        '& .MuiChip-label': { px: 0.6 },
      }}
    />
  );
};

// ── KpiCard ───────────────────────────────────────────────────────────────────

const KpiCard = ({ title, value, sub, trend, color, icon: Icon }) => {
  return (
    <Paper elevation={0} sx={{
      p: 2.5, borderRadius: 3, height: '100%', position: 'relative', overflow: 'hidden',
      background: `linear-gradient(135deg, ${alpha(color, 0.12)} 0%, ${alpha(color, 0.03)} 100%)`,
      border: `1px solid ${alpha(color, 0.2)}`,
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: `0 4px 20px ${alpha(color, 0.18)}` },
    }}>
      {/* Círculo decorativo */}
      <Box sx={{
        position: 'absolute', top: -24, right: -24,
        width: 96, height: 96, borderRadius: '50%',
        background: alpha(color, 0.07), pointerEvents: 'none',
      }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.9 }}>
          {title}
        </Typography>
        <Box sx={{ p: 0.9, borderRadius: 2, bgcolor: alpha(color, 0.13), flexShrink: 0 }}>
          <Icon sx={{ fontSize: 18, color }} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.75 }}>
        <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1 }}>
          {fmt(value)}
        </Typography>
        <TrendChip trend={trend} />
      </Box>

      {sub && (
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', lineHeight: 1.6 }}>
          {sub}
        </Typography>
      )}

      {/* Barra de cor no rodapé */}
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.1)})`,
      }} />
    </Paper>
  );
};

// ── Pipeline ──────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'Entrada',               label: 'Entrada',       color: '#29b6f6' },
  { key: 'Em tratamento',         label: 'Em Tratamento', color: '#ffa726' },
  { key: 'Em tratamento externo', label: 'Externo',       color: '#ab47bc' },
  { key: 'Concluido',             label: 'Concluído',     color: '#66bb6a' },
];

const Pipeline = ({ data }) => {
  const theme = useTheme();
  const row = data?.[0];
  if (!row) return null;

  const values = STAGES.map((s) => ({ ...s, val: parseInt(row[s.key]) || 0 }));
  const total  = values.reduce((s, v) => s + v.val, 0);

  return (
    <Paper elevation={1} sx={{
      p: 2.5, mb: 2.5, borderRadius: 3,
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: 4 },
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Pipeline de pedidos
        </Typography>
        <Chip label={`Total: ${fmt(total)}`} size="small" variant="outlined"
          sx={{ fontWeight: 700, fontSize: 11 }} />
      </Box>

      <Grid container alignItems="stretch" spacing={0}>
        {values.map((stage, idx) => {
          const pct = total > 0 ? (stage.val / total) * 100 : 0;
          return (
            <Grid key={stage.key} size={{ xs: 6, sm: 3 }} sx={{ display: 'flex', alignItems: 'stretch' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>

                {idx > 0 && (
                  <Box sx={{
                    width: 20, flexShrink: 0, textAlign: 'center',
                    fontSize: 20, color: alpha(theme.palette.text.disabled, 0.5),
                    userSelect: 'none', lineHeight: 1,
                  }}>›</Box>
                )}

                <Box sx={{
                  flex: 1, p: 1.5, borderRadius: 2.5, minWidth: 0,
                  background: alpha(stage.color, 0.07),
                  border: `1px solid ${alpha(stage.color, 0.18)}`,
                }}>
                  <Typography variant="h4" fontWeight={800}
                    sx={{ color: stage.color, lineHeight: 1, mb: 0.5 }}>
                    {formatValue(stage.val)}
                  </Typography>
                  <Typography variant="caption" fontWeight={600} color="text.secondary"
                    sx={{ display: 'block', mb: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stage.label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{
                        flex: 1, height: 5, borderRadius: 3,
                        bgcolor: alpha(stage.color, 0.12),
                        '& .MuiLinearProgress-bar': { bgcolor: stage.color, borderRadius: 3 },
                      }}
                    />
                    <Typography variant="caption" fontWeight={700}
                      sx={{ color: stage.color, flexShrink: 0, fontSize: 10 }}>
                      {Math.round(pct)}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

// ── Fossas Comparação ─────────────────────────────────────────────────────────

const FOSSA_METRICS = [
  { key: 'Em execução', colorKey: 'warning' },
  { key: 'Concluido',   colorKey: 'success' },
];

const FossasComparacao = ({ data }) => {
  const theme = useTheme();
  if (!data?.length) return null;

  const cor = data.find((r) => r['Ano'] === 'Corrente') || {};
  const ant = data.find((r) => r['Ano'] === 'Anterior') || {};

  return (
    <Paper elevation={1} sx={{
      p: 2.5, height: '100%', borderRadius: 3,
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: 4 },
    }}>
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
        sx={{ mb: 2.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Fossas — Corrente vs Anterior
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {FOSSA_METRICS.map((m) => {
          const vCor  = parseInt(cor[m.key]) || 0;
          const vAnt  = parseInt(ant[m.key]) || 0;
          const trend = calcTrend(vCor, vAnt);
          const color = theme.palette[m.colorKey]?.main;
          const maxVal = Math.max(vCor, vAnt, 1);

          return (
            <Box key={m.key}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={600} color="text.primary">{m.key}</Typography>
                <TrendChip trend={trend} />
              </Box>

              {[
                { label: 'Corrente', val: vCor, solid: true },
                { label: 'Anterior', val: vAnt, solid: false },
              ].map((row) => (
                <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 60, flexShrink: 0 }}>
                    {row.label}
                  </Typography>
                  <LinearProgress variant="determinate" value={(row.val / maxVal) * 100}
                    sx={{
                      flex: 1, height: 8, borderRadius: 4,
                      // Track invisível quando valor é zero — evita barra cinza confusa
                      bgcolor: row.val === 0 ? 'transparent' : alpha(color, 0.1),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: row.solid ? color : alpha(color, 0.35),
                        borderRadius: 4,
                      },
                    }}
                  />
                  <Typography variant="caption" fontWeight={row.solid ? 700 : 400}
                    sx={{ color: row.solid ? color : 'text.secondary', width: 36, textAlign: 'right', flexShrink: 0 }}>
                    {fmt(row.val)}
                  </Typography>
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

// ── Ranking de Duração ────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'];

const DuracaoRanking = ({ data }) => {
  const theme = useTheme();
  if (!data?.length) return null;

  const items   = data.filter((r) => r['Corrente'] >= 0).slice(0, 8);
  const maxDays = Math.max(...items.map((r) => parseFloat(r['Corrente']) || 0), 1);

  return (
    <Paper elevation={1} sx={{
      p: 2.5, height: '100%', borderRadius: 3,
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: 4 },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <EmojiEventsIcon sx={{ fontSize: 16, color: 'warning.main' }} />
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Duração média (dias)
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {items.map((r, i) => {
          const days  = parseFloat(r['Corrente']) || 0;
          const prev  = parseFloat(r['Anterior']);
          const trend = prev >= 0 ? calcTrend(days, prev) : null;
          const pct   = (days / maxDays) * 100;
          const barColor = pct > 70
            ? theme.palette.error.main
            : pct > 40
              ? theme.palette.warning.main
              : theme.palette.success.main;

          return (
            <Box key={i}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                <Typography sx={{ fontSize: 13, lineHeight: 1, width: 20, flexShrink: 0 }}>
                  {MEDALS[i] ?? `${i + 1}.`}
                </Typography>
                <Typography variant="caption" fontWeight={500} color="text.primary"
                  noWrap sx={{ flex: 1 }} title={r['Tipo de pedido']}>
                  {r['Tipo de pedido']}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  <Typography variant="caption" fontWeight={700} color="text.primary">
                    {fmt(days)}d
                  </Typography>
                  <TrendChip trend={trend} invertColors />
                </Box>
              </Box>
              <LinearProgress variant="determinate" value={pct}
                sx={{
                  ml: '28px', height: 4, borderRadius: 2,
                  bgcolor: alpha(barColor, 0.1),
                  '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 2 },
                }}
              />
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

// ── Transformadores de dados para ChartCard ───────────────────────────────────

const pivotEstado = (data, statusKeys) => {
  if (!data?.length) return [];
  const cor = data.find((r) => r['Ano'] === 'Corrente') || {};
  const ant = data.find((r) => r['Ano'] === 'Anterior') || {};
  return statusKeys.map((k) => ({
    Estado:   k.length > 22 ? `${k.slice(0, 22)}…` : k,
    Corrente: parseInt(cor[k]) || 0,
    Anterior: parseInt(ant[k]) || 0,
  }));
};

const RAMAL_STATUS_KEYS = [
  'Em avaliação', 'Para aceitação de orçamento',
  'Para execução', 'Concluido com sucesso', 'Concluido sem sucesso',
];

// statusKeys define EXACTAMENTE quais colunas mostrar — evita ambiguidade no detectKeys
const MUN_TABS = [
  { label: 'Pedidos', dataKey: 'pedidos', muniKey: 'Município', filterYear: true,
    statusKeys: ['Terminados', 'Abertos'] },
  { label: 'Ramais',  dataKey: 'ramais',  muniKey: 'Municipio', filterYear: false,
    statusKeys: ['Concluido com sucesso', 'Para execução', 'Em avaliação'] },
  { label: 'Fossas',  dataKey: 'fossas',  muniKey: 'Municipio', filterYear: false,
    statusKeys: ['Concluido', 'Em execução'] },
];

const MUN_COLORS = { pedidos: '#2196F3', ramais: '#4CAF50', fossas: '#FF9800' };

// ── MunicipioSection ──────────────────────────────────────────────────────────

const MunicipioSection = ({ pedidosData, ramaisData, fossasData }) => {
  const [tab, setTab] = useState(0);
  const { data: munMap = {} } = useMunicipalities();
  const allData = { pedidos: pedidosData, ramais: ramaisData, fossas: fossasData };
  const active  = MUN_TABS[tab];

  const chartData = useMemo(() => {
    const rows     = allData[active.dataKey] || [];
    const filtered = active.filterYear ? rows.filter((r) => r['Ano'] === 'Corrente') : rows;
    return filtered.map((r) => {
      // 'Município' é SEMPRE string e SEMPRE primeiro — detectKeys escolhe-o como xKey
      const rawMun = r[active.muniKey];
      const nome   = munMap[String(rawMun)] ?? String(rawMun ?? '—');
      const entry  = { Município: nome };
      // Só as colunas definidas em statusKeys como valores numéricos
      active.statusKeys.forEach((k) => { entry[k] = parseInt(r[k]) || 0; });
      return entry;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pedidosData, ramaisData, fossasData, munMap]);

  return (
    <Box>
      {/* Header: título à esquerda, tabs de dataset à direita — sem overlap com ChartCard */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 0.5 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Por Município
        </Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ minHeight: 26, '& .MuiTab-root': { minHeight: 26, py: 0.25, px: 1.25, fontSize: 11 } }}>
          {MUN_TABS.map((t, i) => <Tab key={i} label={t.label} />)}
        </Tabs>
      </Box>
      {/* ChartCard sem título — já mostrado acima; toggle + export ficam no canto direito do card */}
      <ChartCard
        title=""
        data={chartData}
        chartType="bar"
        color={MUN_COLORS[active.dataKey]}
        height={260}
        showExport={false}
      />
    </Box>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const LandingSkeleton = () => (
  <Box>
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      {[0, 1, 2].map((i) => (
        <Grid key={i} size={{ xs: 12, sm: 4 }}>
          <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3 }} />
        </Grid>
      ))}
    </Grid>
    <Skeleton variant="rounded" height={138} sx={{ borderRadius: 3, mb: 2.5 }} />
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      <Grid size={{ xs: 12, md: 7 }}><Skeleton variant="rounded" height={260} sx={{ borderRadius: 3 }} /></Grid>
      <Grid size={{ xs: 12, md: 5 }}><Skeleton variant="rounded" height={260} sx={{ borderRadius: 3 }} /></Grid>
    </Grid>
    <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3, mb: 2.5 }} />
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}><Skeleton variant="rounded" height={360} sx={{ borderRadius: 3 }} /></Grid>
      <Grid size={{ xs: 12, md: 5 }}><Skeleton variant="rounded" height={360} sx={{ borderRadius: 3 }} /></Grid>
    </Grid>
  </Box>
);

// ── DashboardLanding ──────────────────────────────────────────────────────────

const DashboardLanding = () => {
  const theme = useTheme();
  const { data: landing, isLoading, isError, refetch } = useLandingData();

  const kpis = useMemo(() => {
    if (!landing) return null;

    const pedidosEstado = landing['vds_landing_01$003']?.data?.[0] || {};
    const entrada = parseInt(pedidosEstado['Entrada'])               || 0;
    const trat    = parseInt(pedidosEstado['Em tratamento'])         || 0;
    const tratExt = parseInt(pedidosEstado['Em tratamento externo']) || 0;
    const conc    = parseInt(pedidosEstado['Concluido'])             || 0;
    const pedTotal   = entrada + trat + tratExt + conc;
    const pedAbertos = entrada + trat + tratExt;

    const muniRows = landing['vds_landing_01$002']?.data || [];
    const muniCor  = muniRows.filter((r) => r['Ano'] === 'Corrente').reduce((s, r) => s + (parseInt(r['Total']) || 0), 0);
    const muniAnt  = muniRows.filter((r) => r['Ano'] === 'Anterior').reduce((s, r) => s + (parseInt(r['Total']) || 0), 0);

    const ramaisRows = landing['vds_landing_02$001']?.data || [];
    const ramCor  = ramaisRows.find((r) => r['Ano'] === 'Corrente') || {};
    const ramAnt  = ramaisRows.find((r) => r['Ano'] === 'Anterior') || {};
    const ramTotal = sumRow(ramCor, ['Ano']);
    const ramConc  = parseInt(ramCor['Concluido com sucesso']) || 0;

    const fossasRows = landing['vds_landing_03$001']?.data || [];
    const fosCor  = fossasRows.find((r) => r['Ano'] === 'Corrente') || {};
    const fosAnt  = fossasRows.find((r) => r['Ano'] === 'Anterior') || {};
    const fosTotal = sumRow(fosCor, ['Ano']);
    const fosConc  = parseInt(fosCor['Concluido'])   || 0;
    const fosExec  = parseInt(fosCor['Em execução']) || 0;

    return {
      pedidos: { total: pedTotal,  abertos: pedAbertos,          concluidos: conc,    trend: calcTrend(muniCor,  muniAnt) },
      ramais:  { total: ramTotal,  concluidos: ramConc,           abertos: ramTotal - ramConc, trend: calcTrend(ramTotal, sumRow(ramAnt, ['Ano'])) },
      fossas:  { total: fosTotal,  concluidos: fosConc,           execucao: fosExec,   trend: calcTrend(fosTotal, sumRow(fosAnt, ['Ano'])) },
    };
  }, [landing]);

  const ramaisChartData = useMemo(
    () => pivotEstado(landing?.['vds_landing_02$001']?.data, RAMAL_STATUS_KEYS),
    [landing],
  );

  const topTiposData = useMemo(
    () => (landing?.['vds_landing_01$001']?.data || []).map((r) => ({
      Tipo:     r['Tipo de pedido']?.length > 28 ? `${r['Tipo de pedido'].slice(0, 28)}…` : r['Tipo de pedido'],
      Corrente: parseInt(r['Corrente']) || 0,
      Anterior: parseInt(r['Anterior']) || 0,
    })),
    [landing],
  );

  if (isLoading) return <LandingSkeleton />;

  if (isError) {
    return (
      <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 3 }}
        action={
          <Tooltip title="Tentar novamente">
            <IconButton size="small" color="inherit" onClick={() => refetch()}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        }>
        Resumo operacional indisponível. As views de landing podem não estar configuradas na base de dados.
      </Alert>
    );
  }

  if (!landing) return null;

  return (
    <Box>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            title="Pedidos" value={kpis?.pedidos.total}
            sub={`Abertos: ${fmt(kpis?.pedidos.abertos)} · Concluídos: ${fmt(kpis?.pedidos.concluidos)}`}
            trend={kpis?.pedidos.trend}
            color={theme.palette.primary.main} icon={AssignmentIcon}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            title="Ramais" value={kpis?.ramais.total}
            sub={`Concluídos: ${fmt(kpis?.ramais.concluidos)} · Abertos: ${fmt(kpis?.ramais.abertos)}`}
            trend={kpis?.ramais.trend}
            color={theme.palette.success.main} icon={AccountTreeIcon}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            title="Fossas" value={kpis?.fossas.total}
            sub={`Em execução: ${fmt(kpis?.fossas.execucao)} · Concluídas: ${fmt(kpis?.fossas.concluidos)}`}
            trend={kpis?.fossas.trend}
            color={theme.palette.warning.main} icon={CleaningServicesIcon}
          />
        </Grid>
      </Grid>

      {/* ── Pipeline ──────────────────────────────────────────────────────── */}
      <Pipeline data={landing['vds_landing_01$003']?.data} />

      {/* ── Ramais ChartCard + Fossas LinearProgress ───────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ChartCard
            title="Ramais — Corrente vs Anterior"
            data={ramaisChartData}
            chartType="bar-h"
            color={theme.palette.success.main}
            height={240}
            showExport={false}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <FossasComparacao data={landing['vds_landing_03$001']?.data} />
        </Grid>
      </Grid>

      {/* ── Por Município ─────────────────────────────────────────────── */}
      <Box sx={{ mb: 2.5 }}>
        <MunicipioSection
          pedidosData={landing['vds_landing_01$002']?.data}
          ramaisData={landing['vds_landing_02$002']?.data}
          fossasData={landing['vds_landing_03$002']?.data}
        />
      </Box>

      {/* ── Top tipos ChartCard + Duração Ranking ─────────────────────── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ChartCard
            title="Top 10 tipos de pedido — Corrente vs Anterior"
            data={topTiposData}
            chartType="bar-h"
            color={theme.palette.primary.main}
            height={340}
            showExport={false}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <DuracaoRanking data={landing['vds_landing_01$004']?.data} />
        </Grid>
      </Grid>

    </Box>
  );
};

export default DashboardLanding;
