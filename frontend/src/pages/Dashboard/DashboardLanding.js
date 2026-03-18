import { useMemo, useState, useEffect } from 'react';
import {
    Box, Typography, Paper, CircularProgress, Alert,
    Grid, Tabs, Tab, List, ListItem, ListItemText,
    Divider, useTheme, alpha, IconButton, Tooltip
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    TrendingFlat as TrendingFlatIcon,
    Refresh as RefreshIcon,
    EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import { useQueryClient } from '@tanstack/react-query';
import { useLandingData } from '../../hooks/useLandingData';
import { getAllDashboardData } from '../../services/dashboardService';
import KPICard from './components/modern/KPICard';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('pt-PT');
};

const calcTrend = (current, previous) => {
    if (!previous || previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
};

const sumRow = (row, excludeKeys = []) => {
    if (!row) return 0;
    return Object.entries(row)
        .filter(([k]) => !excludeKeys.includes(k))
        .reduce((s, [, v]) => s + (parseFloat(v) || 0), 0);
};

// ── PipelinePedidos ────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
    { key: 'Entrada', label: 'Entrada', color: 'info' },
    { key: 'Em tratamento', label: 'Em Tratamento', color: 'warning' },
    { key: 'Em tratamento externo', label: 'Externo', color: 'secondary' },
    { key: 'Concluido', label: 'Concluído', color: 'success' },
];

const PipelinePedidos = ({ data }) => {
    const theme = useTheme();
    const row = data?.data?.[0];
    if (!row) return null;

    const total = PIPELINE_STAGES.reduce((s, st) => s + (parseInt(row[st.key]) || 0), 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
        >
            <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Estado actual dos pedidos
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {PIPELINE_STAGES.map((stage, idx) => {
                        const val = parseInt(row[stage.key]) || 0;
                        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                        const color = theme.palette[stage.color]?.main || theme.palette.primary.main;

                        return (
                            <Box key={stage.key} sx={{ flex: '1 1 120px', minWidth: 100 }}>
                                <Box sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    background: alpha(color, 0.08),
                                    border: `1px solid ${alpha(color, 0.2)}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}>
                                    {/* Barra de progresso interna */}
                                    <Box sx={{
                                        position: 'absolute',
                                        bottom: 0, left: 0,
                                        width: `${pct}%`,
                                        height: 3,
                                        background: color,
                                        borderRadius: '0 2px 2px 0',
                                    }} />
                                    <Typography variant="h5" fontWeight={700} sx={{ color, lineHeight: 1 }}>
                                        {fmt(val)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        {stage.label}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block', color: alpha(color, 0.8), mt: 0.5 }}>
                                        {pct}%
                                    </Typography>
                                </Box>
                                {idx < PIPELINE_STAGES.length - 1 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
                                        <Typography sx={{ color: 'text.disabled', fontSize: 18 }}>›</Typography>
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            </Paper>
        </motion.div>
    );
};

// ── RamaisEstado ──────────────────────────────────────────────────────────────

const RamaisEstado = ({ data }) => {
    const theme = useTheme();
    if (!data?.data?.length) return null;

    const STATUS_KEYS = ['Em avaliação', 'Para aceitação de orçamento', 'Para execução', 'Concluido com sucesso', 'Concluido sem sucesso'];
    const STATUS_LABELS = {
        'Em avaliação': 'Em avaliação',
        'Para aceitação de orçamento': 'Para orçamento',
        'Para execução': 'Para execução',
        'Concluido com sucesso': 'Concluído ✓',
        'Concluido sem sucesso': 'Concluído ✗',
    };

    const corrente = data.data.find(r => r['Ano'] === 'Corrente') || {};
    const anterior = data.data.find(r => r['Ano'] === 'Anterior') || {};

    const chartData = STATUS_KEYS.map(k => ({
        name: STATUS_LABELS[k],
        Corrente: parseInt(corrente[k]) || 0,
        Anterior: parseInt(anterior[k]) || 0,
    }));

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} style={{ height: '100%' }}>
            <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Ramais — Corrente vs Anterior
                </Typography>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip
                            contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Corrente" fill={theme.palette.primary.main} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="Anterior" fill={alpha(theme.palette.primary.main, 0.35)} radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Paper>
        </motion.div>
    );
};

// ── FossasEstado ──────────────────────────────────────────────────────────────

const FossasEstado = ({ data }) => {
    const theme = useTheme();
    if (!data?.data?.length) return null;

    const corrente = data.data.find(r => r['Ano'] === 'Corrente') || {};
    const anterior = data.data.find(r => r['Ano'] === 'Anterior') || {};

    const metrics = [
        { key: 'Em execução', color: theme.palette.warning.main },
        { key: 'Concluido', color: theme.palette.success.main },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }} style={{ height: '100%' }}>
            <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Fossas — Corrente vs Anterior
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {metrics.map(m => {
                        const vCor = parseInt(corrente[m.key]) || 0;
                        const vAnt = parseInt(anterior[m.key]) || 0;
                        const trend = calcTrend(vCor, vAnt);
                        return (
                            <Box key={m.key} sx={{
                                p: 2, borderRadius: 2,
                                background: alpha(m.color, 0.07),
                                border: `1px solid ${alpha(m.color, 0.18)}`,
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Typography variant="body2" fontWeight={600} color="text.secondary">
                                        {m.key}
                                    </Typography>
                                    {trend !== null && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: trend >= 0 ? 'success.main' : 'error.main' }}>
                                            {trend > 0 ? <TrendingUpIcon fontSize="small" /> : trend < 0 ? <TrendingDownIcon fontSize="small" /> : <TrendingFlatIcon fontSize="small" />}
                                            <Typography variant="caption" fontWeight={700}>{Math.abs(trend)}%</Typography>
                                        </Box>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 0.5 }}>
                                    <Typography variant="h4" fontWeight={700} sx={{ color: m.color }}>
                                        {fmt(vCor)}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                        ant: {fmt(vAnt)}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Paper>
        </motion.div>
    );
};

// ── MunicipioChart ─────────────────────────────────────────────────────────────

const MunicipioChart = ({ pedidosData, ramaisData, fossasData }) => {
    const theme = useTheme();
    const [tab, setTab] = useState(0);

    const tabsConfig = [
        {
            label: 'Pedidos',
            data: pedidosData,
            muniKey: 'Município',
            statusKeys: ['Terminados', 'Abertos'],
            colors: [theme.palette.success.main, theme.palette.error.main],
            filterCurrentYear: true,
        },
        {
            label: 'Ramais',
            data: ramaisData,
            muniKey: 'Municipio',
            statusKeys: ['Em avaliação', 'Para aceitação de orçamento', 'Para execução', 'Concluido com sucesso', 'Concluido sem sucesso'],
            colors: [
                '#7C4DFF',  // violeta — Em avaliação
                '#FF9800',  // laranja — Para aceitação de orçamento
                '#26C6DA',  // ciano   — Para execução
                '#4CAF50',  // verde   — Concluido com sucesso
                '#EF5350',  // vermelho — Concluido sem sucesso
            ],
            filterCurrentYear: false,
        },
        {
            label: 'Fossas',
            data: fossasData,
            muniKey: 'Municipio',
            statusKeys: ['Em execução', 'Concluido'],
            colors: [theme.palette.warning.main, theme.palette.success.main],
            filterCurrentYear: false,
        },
    ];

    const active = tabsConfig[tab];

    const chartData = useMemo(() => {
        if (!active.data?.data?.length) return [];
        let rows = active.data.data;
        if (active.filterCurrentYear) {
            rows = rows.filter(r => r['Ano'] === 'Corrente');
        }
        return rows.map(r => {
            const entry = { name: r[active.muniKey] || '—' };
            active.statusKeys.forEach(k => { entry[k] = parseInt(r[k]) || 0; });
            return entry;
        });
    }, [active]);

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
            <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Por Município
                    </Typography>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, px: 2, fontSize: 12 } }}
                    >
                        {tabsConfig.map((t, i) => (
                            <Tab key={i} label={t.label} />
                        ))}
                    </Tabs>
                </Box>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {active.statusKeys.map((k, i) => (
                                <Bar key={k} dataKey={k} stackId="a" fill={active.colors[i] || theme.palette.primary.main} radius={i === active.statusKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.disabled">Sem dados para visualizar</Typography>
                    </Box>
                )}
            </Paper>
        </motion.div>
    );
};

// ── TopTiposChart ─────────────────────────────────────────────────────────────

const TopTiposChart = ({ data }) => {
    const theme = useTheme();
    if (!data?.data?.length) return null;

    const chartData = data.data.map(r => ({
        name: r['Tipo de pedido'] || '—',
        Corrente: parseInt(r['Corrente']) || 0,
        Anterior: parseInt(r['Anterior']) || 0,
    }));

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45 }} style={{ height: '100%' }}>
            <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Top 10 tipos de pedido
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={170}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => v.length > 22 ? `${v.slice(0, 22)}…` : v}
                        />
                        <RechartsTooltip
                            contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Corrente" fill={theme.palette.primary.main} radius={[0, 3, 3, 0]} barSize={10} />
                        <Bar dataKey="Anterior" fill={alpha(theme.palette.primary.main, 0.35)} radius={[0, 3, 3, 0]} barSize={10} />
                    </BarChart>
                </ResponsiveContainer>
            </Paper>
        </motion.div>
    );
};

// ── DuracaoList ────────────────────────────────────────────────────────────────

const DuracaoList = ({ data }) => {
    const theme = useTheme();
    if (!data?.data?.length) return null;

    const items = data.data
        .filter(r => r['Corrente'] >= 0)
        .slice(0, 10);

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} style={{ height: '100%' }}>
            <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <TrophyIcon sx={{ color: theme.palette.warning.main, fontSize: 18 }} />
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Duração média (dias)
                    </Typography>
                </Box>
                <List dense disablePadding>
                    {items.map((r, i) => {
                        const cor = parseFloat(r['Corrente']) || 0;
                        const ant = parseFloat(r['Anterior']);
                        const trend = ant >= 0 ? calcTrend(cor, ant) : null;
                        // Menor duração = melhor = verde
                        const trendColor = trend === null ? 'text.secondary'
                            : trend <= 0 ? 'success.main' : 'error.main';
                        const TrendIcon = trend === null ? TrendingFlatIcon
                            : trend <= 0 ? TrendingDownIcon : TrendingUpIcon;

                        return (
                            <Box key={i}>
                                <ListItem disablePadding sx={{ py: 0.75 }}>
                                    <ListItemText
                                        primary={
                                            <Typography variant="body2" noWrap fontWeight={500} title={r['Tipo de pedido']}>
                                                {r['Tipo de pedido']}
                                            </Typography>
                                        }
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                        <Typography variant="body2" fontWeight={700} color="text.primary">
                                            {fmt(cor)}d
                                        </Typography>
                                        {trend !== null && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', color: trendColor }}>
                                                <TrendIcon sx={{ fontSize: 16 }} />
                                                <Typography variant="caption" fontWeight={600}>
                                                    {Math.abs(trend)}%
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </ListItem>
                                {i < items.length - 1 && <Divider sx={{ opacity: 0.4 }} />}
                            </Box>
                        );
                    })}
                </List>
            </Paper>
        </motion.div>
    );
};

// ── DashboardLanding ──────────────────────────────────────────────────────────

const DashboardLanding = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const { landingData, isLoading, isError, refetch, forceRefetch } = useLandingData();

    // Prefetch dos dados do Dashboard Geral em background
    // assim que a landing page termina de carregar
    useEffect(() => {
        if (!landingData) return;
        queryClient.prefetchQuery({
            queryKey: ['dashboardData', {}],
            queryFn: () => getAllDashboardData({}),
            staleTime: Infinity,
        });
    }, [landingData, queryClient]);

    const kpis = useMemo(() => {
        if (!landingData) return null;

        // Pedidos (vds_landing_01$003 — 1 linha + vds_landing_01$002 para trend)
        const pedidosEstado = landingData['vds_landing_01$003']?.data?.[0] || {};
        const pedidosEntrada = parseInt(pedidosEstado['Entrada']) || 0;
        const pedidosTrat = parseInt(pedidosEstado['Em tratamento']) || 0;
        const pedidosTratExt = parseInt(pedidosEstado['Em tratamento externo']) || 0;
        const pedidosConc = parseInt(pedidosEstado['Concluido']) || 0;
        const pedidosTotal = pedidosEntrada + pedidosTrat + pedidosTratExt + pedidosConc;
        const pedidosAbertos = pedidosEntrada + pedidosTrat + pedidosTratExt;

        // Trend pedidos via vds_landing_01$002
        const muniRows = landingData['vds_landing_01$002']?.data || [];
        const totalCorPed = muniRows.filter(r => r['Ano'] === 'Corrente').reduce((s, r) => s + (parseInt(r['Total']) || 0), 0);
        const totalAntPed = muniRows.filter(r => r['Ano'] === 'Anterior').reduce((s, r) => s + (parseInt(r['Total']) || 0), 0);
        const pedidosTrend = calcTrend(totalCorPed, totalAntPed);

        // Ramais (vds_landing_02$001 — 2 linhas)
        const ramaisRows = landingData['vds_landing_02$001']?.data || [];
        const ramaisCor = ramaisRows.find(r => r['Ano'] === 'Corrente') || {};
        const ramaisAnt = ramaisRows.find(r => r['Ano'] === 'Anterior') || {};
        const RAMAI_EXCL = ['Ano'];
        const ramaisTotal = sumRow(ramaisCor, RAMAI_EXCL);
        const ramaisTotalAnt = sumRow(ramaisAnt, RAMAI_EXCL);
        const ramaisConc = (parseInt(ramaisCor['Concluido com sucesso']) || 0);
        const ramaisTrend = calcTrend(ramaisTotal, ramaisTotalAnt);

        // Fossas (vds_landing_03$001 — 2 linhas)
        const fossasRows = landingData['vds_landing_03$001']?.data || [];
        const fossasCor = fossasRows.find(r => r['Ano'] === 'Corrente') || {};
        const fossasAnt = fossasRows.find(r => r['Ano'] === 'Anterior') || {};
        const FOSSA_EXCL = ['Ano'];
        const fossasTotal = sumRow(fossasCor, FOSSA_EXCL);
        const fossasTotalAnt = sumRow(fossasAnt, FOSSA_EXCL);
        const fossasConc = parseInt(fossasCor['Concluido']) || 0;
        const fossasExec = parseInt(fossasCor['Em execução']) || 0;
        const fossasTrend = calcTrend(fossasTotal, fossasTotalAnt);

        return {
            pedidos: { total: pedidosTotal, abertos: pedidosAbertos, concluidos: pedidosConc, trend: pedidosTrend },
            ramais: { total: ramaisTotal, concluidos: ramaisConc, abertos: ramaisTotal - ramaisConc, trend: ramaisTrend },
            fossas: { total: fossasTotal, concluidos: fossasConc, execucao: fossasExec, trend: fossasTrend },
        };
    }, [landingData]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 2 }}>
                <CircularProgress size={48} thickness={3} />
                <Typography variant="body1" color="text.secondary" fontWeight={500}>A obter os dados mais recentes...</Typography>
                <Typography variant="body2" color="text.disabled">Estamos a preparar tudo para lhe proporcionar a melhor experiência.</Typography>
            </Box>
        );
    }

    if (isError) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" action={
                    <Tooltip title="Tentar novamente">
                        <IconButton size="small" color="inherit" onClick={() => refetch()}>
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                }>
                    Erro ao carregar dados da landing page. Verifique se as views estão criadas na base de dados.
                </Alert>
            </Box>
        );
    }

    return (
        <Box>

            {/* KPIs */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <KPICard
                        title="Pedidos"
                        value={kpis?.pedidos.total ?? 0}
                        subtitle={`Ab: ${fmt(kpis?.pedidos.abertos)} | Co: ${fmt(kpis?.pedidos.concluidos)}`}
                        trend={kpis?.pedidos.trend}
                        icon="assignment"
                        color={theme.palette.primary.main}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <KPICard
                        title="Ramais"
                        value={kpis?.ramais.total ?? 0}
                        subtitle={`Conc: ${fmt(kpis?.ramais.concluidos)} | Ab: ${fmt(kpis?.ramais.abertos)}`}
                        trend={kpis?.ramais.trend}
                        icon="account_tree"
                        color={theme.palette.success.main}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <KPICard
                        title="Fossas"
                        value={kpis?.fossas.total ?? 0}
                        subtitle={`Exec: ${fmt(kpis?.fossas.execucao)} | Conc: ${fmt(kpis?.fossas.concluidos)}`}
                        trend={kpis?.fossas.trend}
                        icon="cleaning_services"
                        color={theme.palette.warning.main}
                    />
                </Grid>
            </Grid>

            {/* Pipeline de pedidos */}
            <PipelinePedidos data={landingData?.['vds_landing_01$003']} />

            {/* Ramais + Fossas estado */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <RamaisEstado data={landingData?.['vds_landing_02$001']} />
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                    <FossasEstado data={landingData?.['vds_landing_03$001']} />
                </Grid>
            </Grid>

            {/* Por município */}
            <MunicipioChart
                pedidosData={landingData?.['vds_landing_01$002']}
                ramaisData={landingData?.['vds_landing_02$002']}
                fossasData={landingData?.['vds_landing_03$002']}
            />

            {/* Top tipos + Duração */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <TopTiposChart data={landingData?.['vds_landing_01$001']} />
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                    <DuracaoList data={landingData?.['vds_landing_01$004']} />
                </Grid>
            </Grid>

        </Box>
    );
};

export default DashboardLanding;
