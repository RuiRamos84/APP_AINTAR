import React, { useState } from 'react';
import {
    Box, Typography, Stack, Card, CardContent, Chip, Avatar,
    LinearProgress, AppBar, Toolbar, IconButton, Fab, Divider,
    Accordion, AccordionSummary, AccordionDetails,
    alpha, useTheme, CircularProgress, Alert
} from '@mui/material';
import {
    Dashboard, Refresh, ExpandMore, CheckCircle, Schedule,
    People, TrendingUp, Assignment
} from '@mui/icons-material';
import { useSupervisorData } from '../hooks/useSupervisorData';
import { formatDate } from '../utils/formatters';

const SupervisorMobilePage = () => {
    const theme = useTheme();
    const {
        analytics, operatorStats, recentActivity,
        isLoading, hasError, refresh
    } = useSupervisorData();

    const { overview } = analytics;

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 10 }}>
            {/* AppBar */}
            <AppBar position="sticky" elevation={1} sx={{ bgcolor: '#1565c0' }}>
                <Toolbar>
                    <Dashboard sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ flex: 1 }} fontWeight={600}>
                        Supervisão
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Chip label={`${overview.completedTasks} concl.`} size="small"
                            sx={{ color: 'white', bgcolor: alpha('#fff', 0.2) }} />
                        <Chip label={`${overview.pendingTasks} pend.`} size="small"
                            sx={{ color: 'white', bgcolor: alpha('#fff', 0.15) }} />
                    </Stack>
                </Toolbar>
                <LinearProgress
                    variant="determinate" value={overview.completionRate}
                    sx={{
                        height: 3,
                        bgcolor: alpha('#fff', 0.1),
                        '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' }
                    }}
                />
            </AppBar>

            {hasError && (
                <Alert severity="error" sx={{ m: 2 }}>Erro ao carregar dados</Alert>
            )}

            <Stack spacing={2} sx={{ p: 2 }}>
                {/* KPI Cards */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    {[
                        { label: 'Total', value: overview.totalOperations, icon: <Assignment />, color: theme.palette.primary.main },
                        { label: 'Concluídas', value: overview.completedTasks, icon: <CheckCircle />, color: theme.palette.success.main },
                        { label: 'Pendentes', value: overview.pendingTasks, icon: <Schedule />, color: theme.palette.warning.main },
                        { label: 'Taxa', value: `${overview.completionRate}%`, icon: <TrendingUp />, color: overview.completionRate >= 75 ? '#4caf50' : '#ff9800' },
                    ].map(stat => (
                        <Card key={stat.label} sx={{
                            background: alpha(stat.color, 0.08),
                            border: `1px solid ${alpha(stat.color, 0.2)}`,
                            borderRadius: 3
                        }}>
                            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                                    <Box>
                                        <Typography variant="h5" fontWeight={700} color={stat.color}>{stat.value}</Typography>
                                        <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Box>

                {/* Progress */}
                <Box>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" color="text.secondary">Progresso Geral</Typography>
                        <Typography variant="body2" fontWeight={600}>{overview.completionRate}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate" value={overview.completionRate}
                        sx={{
                            height: 8, borderRadius: 4,
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: 'success.main' }
                        }}
                    />
                </Box>

                {/* Team Section */}
                <Accordion defaultExpanded sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <People color="primary" />
                            <Typography fontWeight={600}>Equipa ({operatorStats.length})</Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <Stack spacing={1.5}>
                            {operatorStats.slice(0, 5).map(op => (
                                <Stack key={op.pk} direction="row" alignItems="center" spacing={1.5}
                                    sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                                    <Avatar sx={{
                                        width: 36, height: 36, fontSize: 13,
                                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                                        color: theme.palette.primary.main
                                    }}>
                                        {op.name?.charAt(0) || '?'}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" fontWeight={600}>{op.name}</Typography>
                                            <Chip
                                                label={`${op.efficiency}%`}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700, height: 22,
                                                    bgcolor: alpha(op.efficiency >= 75 ? '#4caf50' : op.efficiency >= 50 ? '#ff9800' : '#f44336', 0.15),
                                                    color: op.efficiency >= 75 ? '#4caf50' : op.efficiency >= 50 ? '#ff9800' : '#f44336'
                                                }}
                                            />
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate" value={op.efficiency}
                                            sx={{
                                                height: 4, borderRadius: 2, mt: 0.5,
                                                bgcolor: alpha('#4caf50', 0.1),
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 2,
                                                    bgcolor: op.efficiency >= 75 ? '#4caf50' : op.efficiency >= 50 ? '#ff9800' : '#f44336'
                                                }
                                            }}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {op.completedTasks}/{op.totalTasks} concluídas
                                        </Typography>
                                    </Box>
                                </Stack>
                            ))}
                            {operatorStats.length === 0 && (
                                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                                    Sem dados de operadores
                                </Typography>
                            )}
                        </Stack>
                    </AccordionDetails>
                </Accordion>

                {/* Recent Activity */}
                {recentActivity.length > 0 && (
                    <Accordion sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Assignment color="primary" />
                                <Typography fontWeight={600}>Atividade Recente</Typography>
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                            <Stack spacing={1}>
                                {recentActivity.slice(0, 5).map((exec, idx) => (
                                    <Box key={exec.pk || idx} sx={{
                                        p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider'
                                    }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={500} noWrap>
                                                    {exec.operador_nome || '-'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {exec.acao_nome || exec.description || '-'}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDate(exec.ts_exec || exec.data_execucao)}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        </AccordionDetails>
                    </Accordion>
                )}
            </Stack>

            {/* FAB Refresh */}
            <Fab
                color="primary" size="medium"
                onClick={refresh}
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
            >
                <Refresh />
            </Fab>
        </Box>
    );
};

export default SupervisorMobilePage;
