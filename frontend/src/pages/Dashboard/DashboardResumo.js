import { useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    Divider,
    useTheme,
    alpha
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
    CheckCircle as CheckCircleIcon,
    LinearScale as LinearScaleIcon,
    Layers as LayersIcon,
    AssignmentTurnedIn as AssignmentTurnedInIcon,
    BarChart as BarChartIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
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

const StatCard = ({ label, value, unit, color, icon: Icon, index = 0 }) => {
    const theme = useTheme();
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            style={{ height: '100%' }}
        >
            <Paper
                sx={{
                    p: 2,
                    borderRadius: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    background: `linear-gradient(135deg, ${alpha(color, 0.07)} 0%, ${theme.palette.background.paper} 60%)`,
                    border: `1px solid ${alpha(color, 0.18)}`,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        boxShadow: `0 8px 28px ${alpha(color, 0.22)}`,
                        transform: 'translateY(-3px)',
                    }
                }}
            >
                {/* Círculo decorativo de fundo */}
                <Box sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 75,
                    height: 75,
                    borderRadius: '50%',
                    background: alpha(color, 0.08),
                    pointerEvents: 'none'
                }} />

                {/* Linha superior: label + ícone */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ lineHeight: 1.4, flex: 1, pr: 1 }}>
                        {label}
                    </Typography>
                    <Box sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        backgroundColor: alpha(color, 0.14),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Icon sx={{ color, fontSize: 20 }} />
                    </Box>
                </Box>

                {/* Valor + unidade */}
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="h4" fontWeight="bold" sx={{ color, lineHeight: 1, letterSpacing: '-0.5px' }}>
                        {value}
                    </Typography>
                    {unit && (
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                            {unit}
                        </Typography>
                    )}
                </Box>

                {/* Barra colorida no fundo */}
                <Box sx={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.3)})`,
                    borderRadius: '0 0 12px 12px'
                }} />
            </Paper>
        </motion.div>
    );
};

// ── SectionHeader ─────────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, color, delay = 0 }) => {
    const theme = useTheme();
    return (
        <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    background: alpha(color, 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Icon sx={{ color, fontSize: 20 }} />
                </Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">
                    {title}
                </Typography>
                <Box sx={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${alpha(color, 0.3)}, transparent)`, ml: 1 }} />
            </Box>
        </motion.div>
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

        // KPI 3 — área de repavimentações (betuminoso + granito + pave)
        let repavArea = null;
        const rpv = d?.repavimentacoes?.views?.['vds_repav_01$002'];
        if (rpv?.data?.length) {
            const labelCol = findLabelCol(rpv.columns, rpv.data);
            const valCols = findValueCols(rpv.columns, rpv.data, labelCol);
            const areaCols = valCols.filter(c => {
                const cl = c.toLowerCase();
                return cl.includes('betuminoso') || cl.includes('granito') || cl.includes('pave');
            });
            const colsToSum = areaCols.length > 0 ? areaCols : valCols;
            repavArea = rpv.data.reduce(
                (s, r) => s + colsToSum.reduce((cs, col) => cs + (parseFloat(r[col]) || 0), 0),
                0
            );
        }

        // KPI 4 — total de pedidos concluídos com sucesso (até 2025)
        let pedidosConcluidos = null;
        const pv = d?.pedidos?.views?.['vds_pedido_01$005'];
        if (pv?.data?.length) {
            const labelCol = findLabelCol(pv.columns, pv.data);
            const valCols = findValueCols(pv.columns, pv.data, labelCol);
            const terminadoCol = valCols.find(c => c.toLowerCase().includes('terminado')) ?? null;
            if (terminadoCol) {
                pedidosConcluidos = pv.data
                    .filter(r => {
                        const ano = parseInt(r[labelCol]);
                        return !isNaN(ano) && ano <= 2025;
                    })
                    .reduce((s, r) => s + (parseFloat(r[terminadoCol]) || 0), 0);
            }
        }

        return { fossaPct, ramalMetros, repavArea, pedidosConcluidos };
    }, [dashboardData]);

    // Dados para ChartContainer — vds_ramal_01$002 (até 2025) + vds_pedido_01$008
    const resumoChartData = useMemo(() => {
        if (!dashboardData?.data) return null;
        const d = dashboardData.data;

        const rv = d?.ramais?.views?.['vds_ramal_01$002'];
        const pv = d?.pedidos?.views?.['vds_pedido_01$008'];

        if (!rv && !pv) return null;

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

        if (pv) {
            result.pedidos = {
                views: {
                    'vds_pedido_01$008': { ...pv, name: 'Por concelho e tipo de pedido' }
                }
            };
        }

        return result;
    }, [dashboardData]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 2 }}>
                <CircularProgress size={56} thickness={3} />
                <Typography variant="body2" color="text.secondary">A carregar dados...</Typography>
            </Box>
        );
    }

    const kpiCards = [
        {
            label: 'Fossas concluídas com sucesso',
            value: kpis?.fossaPct != null ? fmt(kpis.fossaPct) : '—',
            unit: '',
            color: theme.palette.success.main,
            icon: CheckCircleIcon,
        },
        {
            label: 'Metros de ramal construídos',
            value: kpis?.ramalMetros != null ? fmt(kpis.ramalMetros) : '—',
            unit: 'm',
            color: theme.palette.primary.main,
            icon: LinearScaleIcon,
        },
        {
            label: 'Área de repavimentações solicitada',
            value: kpis?.repavArea != null ? fmt(kpis.repavArea, 1) : '—',
            unit: 'm²',
            color: theme.palette.warning.main,
            icon: LayersIcon,
        },
        {
            label: 'Total de pedidos concluídos',
            value: kpis?.pedidosConcluidos != null ? fmt(kpis.pedidosConcluidos) : '—',
            unit: '',
            color: theme.palette.info.main,
            icon: AssignmentTurnedInIcon,
        },
    ];

    return (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

                <Grid container spacing={2} sx={{ mb: 1.5 }}>
                    {kpiCards.map((card, i) => (
                        <Grid key={card.label} size={{ xs: 12, sm: 6, lg: 3 }}>
                            <StatCard {...card} index={i} />
                        </Grid>
                    ))}
                </Grid>

                <Divider sx={{ mb: 1.5, borderColor: alpha(theme.palette.divider, 0.5) }} />

                {/* Charts section */}
                {resumoChartData && (
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.35 }}
                        >
                            <ChartContainer
                                data={resumoChartData}
                                viewMode="overview"
                                compact
                            />
                        </motion.div>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default DashboardResumo;
