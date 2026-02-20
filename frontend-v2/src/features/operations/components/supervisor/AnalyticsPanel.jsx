import React from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Stack, LinearProgress,
    Avatar, Divider, alpha, useTheme, Alert
} from '@mui/material';
import {
    TrendingUp, People, Assignment, CheckCircle
} from '@mui/icons-material';

const AnalyticsPanel = ({ analytics, operatorStats }) => {
    const theme = useTheme();
    const { overview } = analytics;

    return (
        <Stack spacing={3}>
            {/* Metric Cards */}
            <Grid container spacing={2}>
                {[
                    {
                        label: 'Taxa de Conclusão',
                        value: `${overview.completionRate}%`,
                        icon: <TrendingUp />,
                        color: overview.completionRate >= 75 ? theme.palette.success.main : theme.palette.warning.main,
                        description: `${overview.completedTasks} de ${overview.totalOperations} tarefas`
                    },
                    {
                        label: 'Operadores Ativos',
                        value: overview.activeOperators,
                        icon: <People />,
                        color: '#2196f3',
                        description: `${operatorStats.length} com tarefas atribuídas`
                    },
                    {
                        label: 'Total de Tarefas',
                        value: overview.totalOperations,
                        icon: <Assignment />,
                        color: '#9c27b0',
                        description: `${overview.totalExecutions} execuções registadas`
                    },
                ].map(metric => (
                    <Grid key={metric.label} size={{ xs: 12, md: 4 }}>
                        <Card sx={{
                            background: alpha(metric.color, 0.08),
                            border: `1px solid ${alpha(metric.color, 0.2)}`,
                            borderRadius: 3
                        }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Box sx={{ color: metric.color, display: 'flex' }}>{metric.icon}</Box>
                                    <Box>
                                        <Typography variant="h4" fontWeight={700} color={metric.color}>
                                            {metric.value}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={500}>{metric.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{metric.description}</Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Operator Performance Grid */}
            {operatorStats.length > 0 && (
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Performance Individual
                        </Typography>
                        <Grid container spacing={2}>
                            {operatorStats.map(op => (
                                <Grid key={op.pk} size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                                        <CardContent>
                                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                                                <Avatar sx={{
                                                    width: 36, height: 36,
                                                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                                                    color: theme.palette.primary.main,
                                                    fontSize: 14, fontWeight: 600
                                                }}>
                                                    {op.name?.charAt(0) || '?'}
                                                </Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="subtitle2" fontWeight={600} noWrap>{op.name}</Typography>
                                                    <Typography variant="h5" fontWeight={700}
                                                        color={op.efficiency >= 75 ? 'success.main' : op.efficiency >= 50 ? 'warning.main' : 'error.main'}>
                                                        {op.efficiency}%
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate" value={op.efficiency}
                                                sx={{
                                                    height: 8, borderRadius: 4, mb: 2,
                                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 4,
                                                        bgcolor: op.efficiency >= 75 ? 'success.main' : op.efficiency >= 50 ? 'warning.main' : 'error.main'
                                                    }
                                                }}
                                            />
                                            <Stack spacing={0.5}>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="caption" color="text.secondary">Total</Typography>
                                                    <Typography variant="caption" fontWeight={600}>{op.totalTasks}</Typography>
                                                </Stack>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="caption" color="success.main">Concluídas</Typography>
                                                    <Typography variant="caption" fontWeight={600} color="success.main">{op.completedTasks}</Typography>
                                                </Stack>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="caption" color="warning.main">Pendentes</Typography>
                                                    <Typography variant="caption" fontWeight={600} color="warning.main">{op.pendingTasks}</Typography>
                                                </Stack>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Executive Summary */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Resumo Executivo
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                            {overview.totalOperations > 0 ? (
                                <>
                                    O sistema conta com <strong>{overview.totalOperations}</strong> tarefas programadas,
                                    das quais <strong>{overview.completedTasks}</strong> foram concluídas
                                    ({overview.completionRate}% de taxa de conclusão).
                                    {overview.activeOperators > 0 && (
                                        <> Existem <strong>{overview.activeOperators}</strong> operadores ativos com registos de execução.</>
                                    )}
                                    {overview.pendingTasks > 0 && (
                                        <> Restam <strong>{overview.pendingTasks}</strong> tarefas pendentes.</>
                                    )}
                                </>
                            ) : (
                                'Sem dados disponíveis para os filtros selecionados.'
                            )}
                        </Typography>
                        {operatorStats.length > 0 && (
                            <Typography variant="body2" color="text.secondary">
                                O operador com melhor desempenho é <strong>{operatorStats[0]?.name}</strong> com {operatorStats[0]?.efficiency}% de eficiência.
                                {operatorStats.length > 1 && operatorStats[operatorStats.length - 1]?.efficiency < 50 && (
                                    <> O operador <strong>{operatorStats[operatorStats.length - 1]?.name}</strong> apresenta a menor eficiência ({operatorStats[operatorStats.length - 1]?.efficiency}%)
                                        e pode necessitar de acompanhamento.</>
                                )}
                            </Typography>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );
};

export default AnalyticsPanel;
