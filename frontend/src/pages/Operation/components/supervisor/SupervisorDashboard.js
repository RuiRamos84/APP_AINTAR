import React from 'react';
import {
    Grid as Grid, Card, CardContent, Typography, Box, LinearProgress,
    List, ListItem, ListItemText, Chip, Button, Stack, Avatar, Divider,
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
    TrendingUp, People, Assignment, CalendarMonth,
    Person, AccessTime, Route, CheckCircle, HourglassEmpty
} from '@mui/icons-material';

/**
 * DASHBOARD DE SUPERVISOR - COM DADOS REAIS DE EXECUÇÃO
 *
 * Exibe:
 * - KPIs de voltas programadas vs executadas
 * - Taxa de conclusão em tempo real
 * - Distribuição de voltas por operador
 * - Atividades recentes (execuções reais)
 */
const SupervisorDashboard = ({
    operationsData,
    analytics,
    recentActivity,
    operatorStats,
    onCreateTask
}) => {
    // Dados com fallbacks seguros - ANTES de qualquer early return
    const overview = analytics?.overview || {
        totalOperations: 0,
        completedTasks: 0,
        pendingTasks: 0,
        completionRate: 0
    };

    const operators = operatorStats || [];
    const metas = operationsData?.metas || [];

    // Calcular distribuição por semana - HOOKS SEMPRE NO TOPO
    const weekDistribution = React.useMemo(() => {
        const distribution = {};
        metas.forEach(meta => {
            const weekMatch = (meta.tt_operacaodia_nome || '').match(/^(W\d+)/i);
            if (weekMatch) {
                const week = weekMatch[1].toUpperCase();
                distribution[week] = (distribution[week] || 0) + 1;
            }
        });
        return distribution;
    }, [metas]);

    // Calcular distribuição por dia
    const dayDistribution = React.useMemo(() => {
        const distribution = {};
        metas.forEach(meta => {
            const dayMatch = (meta.tt_operacaodia_nome || '').match(/W\d+\s+(.+)/i);
            if (dayMatch) {
                const day = dayMatch[1];
                distribution[day] = (distribution[day] || 0) + 1;
            }
        });
        return distribution;
    }, [metas]);

    // Loading state - DEPOIS dos hooks
    if (operationsData?.isLoading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>A carregar dashboard...</Typography>
                <LinearProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    📊 Dashboard de Supervisão - Voltas Programadas
                </Typography>
                <Button variant="contained" size="large" onClick={onCreateTask}>
                    + Nova Volta
                </Button>
            </Box>

            {/* KPIs Principais - COM DADOS DE EXECUÇÃO */}
            <Grid container spacing={3} mb={3}>
                {/* Total de Voltas Programadas */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        height: '100%'
                    }}>
                        <CardContent>
                            <Stack spacing={1}>
                                <Route sx={{ fontSize: 40 }} />
                                <Typography variant="h3" fontWeight="bold">
                                    {overview.totalOperations}
                                </Typography>
                                <Typography variant="body2">
                                    Voltas Programadas
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Voltas Concluídas */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{
                        bgcolor: 'success.main',
                        color: 'white',
                        height: '100%'
                    }}>
                        <CardContent>
                            <Stack spacing={1}>
                                <CheckCircle sx={{ fontSize: 40 }} />
                                <Typography variant="h3" fontWeight="bold">
                                    {overview.completedTasks}
                                </Typography>
                                <Typography variant="body2">
                                    Voltas Concluídas
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Voltas Pendentes */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{
                        bgcolor: 'warning.main',
                        color: 'white',
                        height: '100%'
                    }}>
                        <CardContent>
                            <Stack spacing={1}>
                                <HourglassEmpty sx={{ fontSize: 40 }} />
                                <Typography variant="h3" fontWeight="bold">
                                    {overview.pendingTasks}
                                </Typography>
                                <Typography variant="body2">
                                    Voltas Pendentes
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Taxa de Conclusão */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{
                        bgcolor: 'info.main',
                        color: 'white',
                        height: '100%'
                    }}>
                        <CardContent>
                            <Stack spacing={1}>
                                <TrendingUp sx={{ fontSize: 40 }} />
                                <Typography variant="h3" fontWeight="bold">
                                    {overview.completionRate}%
                                </Typography>
                                <Typography variant="body2">
                                    Taxa de Conclusão
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Barra de Progresso Geral */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Progresso Geral</Typography>
                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                            {overview.completedTasks} / {overview.totalOperations}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={overview.completionRate}
                        sx={{
                            height: 12,
                            borderRadius: 2,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: 'success.main',
                                borderRadius: 2
                            }
                        }}
                    />
                    <Box display="flex" justifyContent="space-between" mt={1}>
                        <Typography variant="caption" color="text.secondary">
                            {overview.pendingTasks} voltas pendentes
                        </Typography>
                        <Typography variant="caption" color="success.main" fontWeight="bold">
                            {overview.completionRate}% concluído
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            {/* Estatísticas Adicionais */}
            <Grid container spacing={3} mb={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{
                        bgcolor: 'secondary.main',
                        color: 'white',
                        height: '100%'
                    }}>
                        <CardContent>
                            <Stack spacing={1}>
                                <People sx={{ fontSize: 40 }} />
                                <Typography variant="h3" fontWeight="bold">
                                    {overview.activeOperators || operators.length}
                                </Typography>
                                <Typography variant="body2">
                                    Operadores Ativos
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack spacing={1}>
                                <CalendarMonth sx={{ fontSize: 40, color: 'primary.main' }} />
                                <Typography variant="h3" fontWeight="bold">
                                    {Object.keys(weekDistribution).length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Semanas Configuradas
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack spacing={1}>
                                <Assignment sx={{ fontSize: 40 }} />
                                <Typography variant="h3" fontWeight="bold">
                                    {Object.keys(dayDistribution).length}
                                </Typography>
                                <Typography variant="body2">
                                    Dias da Semana
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Distribuição por Semana */}
            <Grid container spacing={3} mb={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                📅 Distribuição por Semana
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Stack spacing={2}>
                                {Object.entries(weekDistribution)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([week, count]) => (
                                    <Box key={week}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="subtitle1" fontWeight="600">
                                                {week}
                                            </Typography>
                                            <Chip
                                                label={`${count} voltas`}
                                                color="primary"
                                                size="small"
                                            />
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={(count / overview.totalOperations) * 100}
                                            sx={{ height: 8, borderRadius: 4 }}
                                        />
                                    </Box>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                📆 Distribuição por Dia da Semana
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Stack spacing={2}>
                                {Object.entries(dayDistribution)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 7)
                                    .map(([day, count]) => (
                                    <Box key={day}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="subtitle1" fontWeight="600">
                                                {day}
                                            </Typography>
                                            <Chip
                                                label={`${count} voltas`}
                                                color="secondary"
                                                size="small"
                                            />
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={(count / overview.totalOperations) * 100}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: 'grey.200',
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: 'secondary.main'
                                                }
                                            }}
                                        />
                                    </Box>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Carga de Trabalho por Operador */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <People /> Carga de Trabalho por Operador
                    </Typography>
                    <Divider sx={{ my: 2 }} />

                    {operators.length === 0 ? (
                        <Box textAlign="center" py={4}>
                            <People sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="body1" color="text.secondary">
                                Nenhum operador com voltas atribuídas
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Operador</strong></TableCell>
                                        <TableCell align="center"><strong>Programadas</strong></TableCell>
                                        <TableCell align="center"><strong>Concluídas</strong></TableCell>
                                        <TableCell align="center"><strong>Pendentes</strong></TableCell>
                                        <TableCell align="center"><strong>Eficiência</strong></TableCell>
                                        <TableCell align="right"><strong>Progresso</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {operators.map((operator, index) => {
                                        return (
                                            <TableRow key={operator.name || `operator-${index}`} hover>
                                                <TableCell>
                                                    <Stack direction="row" alignItems="center" spacing={2}>
                                                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                                            <Person sx={{ fontSize: 18 }} />
                                                        </Avatar>
                                                        <Typography variant="body2" fontWeight="500">
                                                            {operator.name}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={operator.totalTasks}
                                                        color="primary"
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={operator.completedTasks}
                                                        color="success"
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={operator.pendingTasks}
                                                        color="warning"
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={`${operator.efficiency}%`}
                                                        color={
                                                            operator.efficiency >= 80 ? 'success' :
                                                            operator.efficiency >= 50 ? 'warning' : 'error'
                                                        }
                                                        size="small"
                                                        sx={{ fontWeight: 'bold', minWidth: 60 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Box sx={{ width: 150, ml: 'auto' }}>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={operator.efficiency}
                                                            sx={{
                                                                height: 8,
                                                                borderRadius: 4,
                                                                bgcolor: 'grey.200',
                                                                '& .MuiLinearProgress-bar': {
                                                                    bgcolor: operator.efficiency >= 80 ? 'success.main' :
                                                                             operator.efficiency >= 50 ? 'warning.main' : 'error.main'
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default SupervisorDashboard;
