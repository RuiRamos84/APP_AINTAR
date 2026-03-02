import React, { useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useDashboardData } from '../../hooks/useDashboardData';
import ChartContainer from './components/modern/ChartContainer';

// ── helpers ──────────────────────────────────────────────────────────────────

const findLabelCol = (columns, data) => {
    if (!columns || !data || data.length === 0) return columns?.[0] ?? null;
    return (
        columns.find(col =>
            data.some(row => {
                const val = row[col];
                return typeof val === 'string' && isNaN(parseFloat(val));
            })
        ) ?? columns[0]
    );
};

const findValueCols = (columns, data, labelCol) => {
    if (!columns || !data || data.length === 0) return [];
    return columns.filter(col => {
        if (col === labelCol) return false;
        return data.some(row => {
            const val = row[col];
            return (
                typeof val === 'number' ||
                (val !== null && val !== undefined && !isNaN(parseFloat(val)))
            );
        });
    });
};

const fmt = (n, decimals = 0) => {
    if (n === null || n === undefined) return '—';
    return Number(n).toLocaleString('pt-PT', { maximumFractionDigits: decimals });
};

// ── StatCard ──────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, unit, color }) => {
    return (
        <Paper
            sx={{
                p: 3,
                borderRadius: 2,
                borderTop: `4px solid ${color}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 1
            }}
        >
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color }}>
                    {value}
                </Typography>
                {unit && (
                    <Typography variant="body1" color="text.secondary">
                        {unit}
                    </Typography>
                )}
            </Box>
        </Paper>
    );
};

// ── DashboardResumo ───────────────────────────────────────────────────────────

const DashboardResumo = () => {
    const theme = useTheme();
    const { dashboardData, isLoading } = useDashboardData({});

    // KPI calculations
    const kpis = useMemo(() => {
        if (!dashboardData?.data) return null;
        const d = dashboardData.data;

        // KPI 1 — nº fossas concluídas com sucesso
        let fossaPct = null;
        const fv = d?.fossas?.views?.['vds_fossa_01$001'];
        if (fv?.data?.length) {
            const labelCol = findLabelCol(fv.columns, fv.data);
            const valCols = findValueCols(fv.columns, fv.data, labelCol);
            if (valCols.length) {
                const vc = valCols[0];
                fossaPct = fv.data
                    .filter(r => String(r[labelCol] ?? '').toLowerCase().includes('sucesso'))
                    .reduce((s, r) => s + (parseFloat(r[vc]) || 0), 0);
            }
        }

        // KPI 2 — metros de ramal construídos (coluna "comprimento")
        let ramalMetros = null;
        const rv = d?.ramais?.views?.['vds_ramal_01$002'];
        if (rv?.data?.length) {
            const labelCol = findLabelCol(rv.columns, rv.data);
            const valCols = findValueCols(rv.columns, rv.data, labelCol);
            const comprimentoCol =
                valCols.find(c => c.toLowerCase().includes('comprimento')) ?? valCols[0];
            if (comprimentoCol) {
                ramalMetros = rv.data.reduce(
                    (s, r) => s + (parseFloat(r[comprimentoCol]) || 0),
                    0
                );
            }
        }

        // KPI 3 — área de repavimentações solicitada
        let repavArea = null;
        const rpv = d?.repavimentacoes?.views?.['vds_repav_01$002'];
        if (rpv?.data?.length) {
            const labelCol = findLabelCol(rpv.columns, rpv.data);
            const valCols = findValueCols(rpv.columns, rpv.data, labelCol);
            const totalCol =
                valCols.find(c => c.toLowerCase().includes('total')) ?? valCols[0];
            if (totalCol) {
                repavArea = rpv.data.reduce(
                    (s, r) => s + (parseFloat(r[totalCol]) || 0),
                    0
                );
            }
        }

        // KPI 4 — total de pedidos concluídos com sucesso (até 2025)
        let pedidosConcluidos = null;
        const pv = d?.pedidos?.views?.['vds_pedido_01$005'];
        if (pv?.data?.length) {
            const labelCol = findLabelCol(pv.columns, pv.data);
            const valCols = findValueCols(pv.columns, pv.data, labelCol);
            const concluCol = valCols.find(c => c.toLowerCase().includes('conclu')) ?? null;
            if (concluCol) {
                pedidosConcluidos = pv.data
                    .filter(r => {
                        const ano = parseInt(r[labelCol]);
                        return !isNaN(ano) && ano <= 2025;
                    })
                    .reduce((s, r) => s + (parseFloat(r[concluCol]) || 0), 0);
            }
        }

        return { fossaPct, ramalMetros, repavArea, pedidosConcluidos };
    }, [dashboardData]);

    // Dados para ChartContainer — vds_ramal_01$002 (até 2025) + vds_fossa_01$001
    const resumoChartData = useMemo(() => {
        if (!dashboardData?.data) return null;
        const d = dashboardData.data;

        const rv = d?.ramais?.views?.['vds_ramal_01$002'];
        const fv = d?.fossas?.views?.['vds_fossa_01$001'];

        if (!rv && !fv) return null;

        const result = {};

        if (rv) {
            const labelCol = findLabelCol(rv.columns, rv.data);
            const filteredData = rv.data.filter(r => {
                const ano = parseInt(r[labelCol]);
                return !isNaN(ano) && ano <= 2025;
            });
            result.ramais = {
                views: {
                    'vds_ramal_01$002': { ...rv, data: filteredData, name: 'Metros de ramal construídos por ano (até 2025)' }
                }
            };
        }

        if (fv) {
            result.fossas = {
                views: {
                    'vds_fossa_01$001': { ...fv }
                }
            };
        }

        return result;
    }, [dashboardData]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, backgroundColor: theme.palette.background.default, minHeight: '100vh' }}>
            {/* KPI Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard
                        label="Fossas concluídas com sucesso"
                        value={kpis?.fossaPct != null ? fmt(kpis.fossaPct) : '—'}
                        unit=""
                        color={theme.palette.success.main}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard
                        label="Metros de ramal construídos"
                        value={kpis?.ramalMetros != null ? fmt(kpis.ramalMetros) : '—'}
                        unit="m"
                        color={theme.palette.primary.main}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard
                        label="Área de repavimentações solicitada"
                        value={kpis?.repavArea != null ? fmt(kpis.repavArea, 1) : '—'}
                        unit="m²"
                        color={theme.palette.warning.main}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard
                        label="Total de pedidos concluídos"
                        value={kpis?.pedidosConcluidos != null ? fmt(kpis.pedidosConcluidos) : '—'}
                        unit=""
                        color={theme.palette.info.main}
                    />
                </Grid>
            </Grid>

            {/* Gráfico — igual ao Geral */}
            {resumoChartData && (
                <ChartContainer
                    data={resumoChartData}
                    viewMode="overview"
                />
            )}
        </Box>
    );
};

export default DashboardResumo;
