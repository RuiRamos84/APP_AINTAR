import React from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Stack, LinearProgress,
    Avatar, Chip, Divider, alpha, useTheme, Tooltip
} from '@mui/material';
import {
    TrendingUp, People, Assignment, Schedule, FlashOn
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
                        description: `${overview.completedTasks} concluídas · ${overview.pendingTasks} pendentes`
                    },
                    {
                        label: 'Operadores Ativos',
                        value: overview.activeOperators,
                        icon: <People />,
                        color: '#2196f3',
                        description: `${operatorStats.filter(o => o.completedTasks > 0).length} com tarefas concluídas`
                    },
                    {
                        label: 'Metas Programadas',
                        value: overview.totalOperations,
                        icon: <Assignment />,
                        color: '#9c27b0',
                        description: `${overview.scheduledExecutions ?? 0} exec. programadas · ${overview.punctualExecutions ?? 0} pontuais`
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

            {/* Distribuição Programadas vs Pontuais */}
            {overview.totalExecutions > 0 && (
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Tipo de Tarefas
                        </Typography>
                        <Grid container spacing={3} alignItems="center">
                            {/* Barra de distribuição */}
                            <Grid size={12}>
                                <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <Schedule fontSize="small" sx={{ color: '#9c27b0' }} />
                                            <Typography variant="body2">Programadas</Typography>
                                        </Stack>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <Typography variant="body2">Pontuais</Typography>
                                            <FlashOn fontSize="small" sx={{ color: '#ff9800' }} />
                                        </Stack>
                                    </Stack>
                                    <Tooltip
                                        title={`${overview.scheduledExecutions} programadas · ${overview.punctualExecutions} pontuais`}
                                        placement="top"
                                    >
                                        <Box sx={{ position: 'relative', height: 24, borderRadius: 2, overflow: 'hidden', bgcolor: alpha('#ff9800', 0.2), cursor: 'default' }}>
                                            <Box sx={{
                                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                                width: `${Math.round((overview.scheduledExecutions / overview.totalExecutions) * 100)}%`,
                                                bgcolor: alpha('#9c27b0', 0.7),
                                                borderRadius: '8px 0 0 8px',
                                                transition: 'width 0.4s ease',
                                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1
                                            }}>
                                                {overview.scheduledExecutions > 0 && (
                                                    <Typography variant="caption" fontWeight={700} sx={{ color: '#fff', fontSize: 11 }}>
                                                        {Math.round((overview.scheduledExecutions / overview.totalExecutions) * 100)}%
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Tooltip>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Chip
                                            icon={<Schedule fontSize="small" />}
                                            label={`${overview.scheduledExecutions} programada${overview.scheduledExecutions !== 1 ? 's' : ''}`}
                                            size="small"
                                            sx={{ bgcolor: alpha('#9c27b0', 0.1), color: '#9c27b0', fontWeight: 600 }}
                                        />
                                        <Chip
                                            icon={<FlashOn fontSize="small" />}
                                            label={`${overview.punctualExecutions} pontual${overview.punctualExecutions !== 1 ? 'is' : ''}`}
                                            size="small"
                                            sx={{ bgcolor: alpha('#ff9800', 0.1), color: '#ff9800', fontWeight: 600 }}
                                        />
                                    </Stack>
                                </Stack>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Operator Performance Grid */}
            {operatorStats.length > 0 && (
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Performance Individual
                        </Typography>
                        <Grid container spacing={2}>
                            {operatorStats.map(op => {
                                const effColor = op.efficiency >= 75 ? 'success.main' : op.efficiency >= 50 ? 'warning.main' : 'error.main';
                                const hasScheduled = op.scheduledCompleted > 0 || op.scheduledPending > 0 || op.scheduledTasks > 0;
                                const hasPunctual = op.punctualCompleted > 0 || op.punctualPending > 0;
                                return (
                                    <Grid key={op.pk} size={{ xs: 12, sm: 6, md: 4 }}>
                                        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                                            <CardContent>
                                                {/* Header: avatar + nome + % eficiência */}
                                                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
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
                                                        <Typography variant="h5" fontWeight={700} color={effColor}>
                                                            {op.efficiency}%
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                                <LinearProgress
                                                    variant="determinate" value={op.efficiency}
                                                    sx={{
                                                        height: 6, borderRadius: 3, mb: 2,
                                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                                        '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: effColor }
                                                    }}
                                                />

                                                {/* Bloco Programadas */}
                                                {hasScheduled && (
                                                    <Box sx={{ mb: 1, p: 1, borderRadius: 1.5, bgcolor: alpha('#9c27b0', 0.05), border: `1px solid ${alpha('#9c27b0', 0.15)}` }}>
                                                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                                                            <Schedule sx={{ fontSize: 13, color: '#9c27b0' }} />
                                                            <Typography variant="caption" fontWeight={700} sx={{ color: '#9c27b0' }}>Programadas</Typography>
                                                        </Stack>
                                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                                            <Typography variant="caption" color="text.secondary">
                                                                Plano: <strong>{op.scheduledTasks}</strong>
                                                            </Typography>
                                                            <Typography variant="caption" color="success.main">
                                                                ✓ <strong>{op.scheduledCompleted}</strong>
                                                            </Typography>
                                                            {op.scheduledPending > 0 && (
                                                                <Typography variant="caption" color="warning.main">
                                                                    ⏳ <strong>{op.scheduledPending}</strong>
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    </Box>
                                                )}

                                                {/* Bloco Pontuais */}
                                                {hasPunctual && (
                                                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha('#ff9800', 0.05), border: `1px solid ${alpha('#ff9800', 0.15)}` }}>
                                                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                                                            <FlashOn sx={{ fontSize: 13, color: '#ff9800' }} />
                                                            <Typography variant="caption" fontWeight={700} sx={{ color: '#ff9800' }}>Pontuais</Typography>
                                                        </Stack>
                                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                                            <Typography variant="caption" color="success.main">
                                                                ✓ <strong>{op.punctualCompleted}</strong>
                                                            </Typography>
                                                            {op.punctualPending > 0 && (
                                                                <Typography variant="caption" color="warning.main">
                                                                    ⏳ <strong>{op.punctualPending}</strong>
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
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
                            {overview.totalExecutions > 0 ? (
                                <>
                                    Existem <strong>{overview.totalExecutions}</strong> tarefas registadas:
                                    {' '}<strong>{overview.completedTasks}</strong> concluídas
                                    e <strong>{overview.pendingTasks}</strong> pendentes
                                    ({overview.completionRate}% de conclusão).
                                    {(overview.scheduledExecutions > 0 || overview.punctualExecutions > 0) && (
                                        <> Destas, <strong>{overview.scheduledExecutions}</strong> são programadas (de rotina)
                                        {' '}e <strong>{overview.punctualExecutions}</strong> são pontuais (ad-hoc).</>
                                    )}
                                    {overview.totalOperations > 0 && (
                                        <> O plano mensal contempla <strong>{overview.totalOperations}</strong> metas de rotina.</>
                                    )}
                                    {overview.activeOperators > 0 && (
                                        <> Existem <strong>{overview.activeOperators}</strong> operadores ativos.</>
                                    )}
                                    {overview.unvalidatedCount > 0 && (
                                        <> <strong>{overview.unvalidatedCount}</strong> execuções aguardam validação de qualidade.</>
                                    )}
                                </>
                            ) : (
                                'Sem dados disponíveis para os filtros selecionados.'
                            )}
                        </Typography>
                        {operatorStats.length > 0 && (() => {
                            const topByExec = [...operatorStats].sort((a, b) => b.completedTasks - a.completedTasks)[0];
                            return (
                                <Typography variant="body2" color="text.secondary">
                                    O operador com mais execuções é <strong>{topByExec?.name}</strong> com <strong>{topByExec?.completedTasks}</strong> execuções registadas.
                                </Typography>
                            );
                        })()}
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );
};

export default AnalyticsPanel;
