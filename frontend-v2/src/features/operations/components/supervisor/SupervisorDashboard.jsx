import React from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Stack, LinearProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Avatar, Chip, alpha, useTheme
} from '@mui/material';
import {
    Assignment, CheckCircle, Schedule, TrendingUp,
    People, CalendarMonth, Today
} from '@mui/icons-material';

const StatCard = ({ label, value, icon, color, subtitle }) => {
    const theme = useTheme();
    return (
        <Card sx={{
            background: alpha(color, 0.08),
            border: `1px solid ${alpha(color, 0.2)}`,
            borderRadius: 3, height: '100%'
        }}>
            <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ color, display: 'flex' }}>{icon}</Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h4" fontWeight={700} color={color}>
                            {value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {label}
                        </Typography>
                    </Box>
                </Stack>
                {subtitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

const DistributionBar = ({ data, title, icon, colorFn }) => {
    const theme = useTheme();
    const maxValue = Math.max(...Object.values(data), 1);

    return (
        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    {icon}
                    <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
                </Stack>
                <Stack spacing={1.5}>
                    {Object.entries(data).map(([key, value]) => (
                        <Box key={key}>
                            <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="body2">{key}</Typography>
                                <Typography variant="body2" fontWeight={600}>{value}</Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={(value / maxValue) * 100}
                                sx={{
                                    height: 6, borderRadius: 3,
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 3,
                                        bgcolor: colorFn ? colorFn(key) : theme.palette.primary.main
                                    }
                                }}
                            />
                        </Box>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
};

const SupervisorDashboard = ({ analytics, operatorStats, weekDistribution, dayDistribution, filterInfo }) => {
    const theme = useTheme();
    const { overview } = analytics;

    const weekColors = { W1: '#2196f3', W2: '#4caf50', W3: '#ff9800', W4: '#9c27b0' };

    return (
        <Stack spacing={3}>
            {/* KPI Cards */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Total de Voltas"
                        value={overview.totalOperations}
                        icon={<Assignment />}
                        color={theme.palette.primary.main}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Concluídas"
                        value={overview.completedTasks}
                        icon={<CheckCircle />}
                        color={theme.palette.success.main}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Pendentes"
                        value={overview.pendingTasks}
                        icon={<Schedule />}
                        color={theme.palette.warning.main}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Taxa de Conclusão"
                        value={`${overview.completionRate}%`}
                        icon={<TrendingUp />}
                        color={overview.completionRate >= 75 ? theme.palette.success.main : theme.palette.warning.main}
                    />
                </Grid>
            </Grid>

            {/* Progress Bar */}
            <Box>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">
                        Progresso Geral
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                        {overview.completionRate}%
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={overview.completionRate}
                    sx={{
                        height: 10, borderRadius: 5,
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 5,
                            bgcolor: theme.palette.success.main
                        }
                    }}
                />
            </Box>

            {/* Additional Stats */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Operadores Ativos"
                        value={overview.activeOperators}
                        icon={<People />}
                        color="#2196f3"
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Total Execuções"
                        value={overview.totalExecutions}
                        icon={<CheckCircle />}
                        color="#00bcd4"
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Semanas Config."
                        value={4}
                        icon={<CalendarMonth />}
                        color="#9c27b0"
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Dias Config."
                        value={7}
                        icon={<Today />}
                        color="#ff5722"
                    />
                </Grid>
            </Grid>

            {/* Distribution Charts */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <DistributionBar
                        data={weekDistribution}
                        title="Distribuição por Semana"
                        icon={<CalendarMonth color="primary" />}
                        colorFn={(key) => weekColors[key] || theme.palette.primary.main}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <DistributionBar
                        data={dayDistribution}
                        title="Distribuição por Dia"
                        icon={<Today color="primary" />}
                    />
                </Grid>
            </Grid>

            {/* Operator Workload Table */}
            {operatorStats.length > 0 && (
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Carga de Trabalho por Operador
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Operador</TableCell>
                                        <TableCell align="center">Programadas</TableCell>
                                        <TableCell align="center">Concluídas</TableCell>
                                        <TableCell align="center">Pendentes</TableCell>
                                        <TableCell align="center">Eficiência</TableCell>
                                        <TableCell sx={{ minWidth: 120 }}>Progresso</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {operatorStats.map((op) => (
                                        <TableRow key={op.pk} hover>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: alpha(theme.palette.primary.main, 0.2), color: theme.palette.primary.main }}>
                                                        {op.name?.charAt(0) || '?'}
                                                    </Avatar>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {op.name}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="center">{op.totalTasks}</TableCell>
                                            <TableCell align="center">
                                                <Chip label={op.completedTasks} size="small" color="success" variant="outlined" />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={op.pendingTasks} size="small" color={op.pendingTasks > 0 ? 'warning' : 'default'} variant="outlined" />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" fontWeight={600}
                                                    color={op.efficiency >= 75 ? 'success.main' : op.efficiency >= 50 ? 'warning.main' : 'error.main'}>
                                                    {op.efficiency}%
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={op.efficiency}
                                                    sx={{
                                                        height: 6, borderRadius: 3,
                                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                                        '& .MuiLinearProgress-bar': {
                                                            borderRadius: 3,
                                                            bgcolor: op.efficiency >= 75 ? 'success.main' : op.efficiency >= 50 ? 'warning.main' : 'error.main'
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Filter Info */}
            {filterInfo && (
                <Typography variant="caption" color="text.secondary" textAlign="center">
                    A mostrar {filterInfo.showing} de {filterInfo.totalInDatabase} tarefas programadas
                    {filterInfo.totalExecutions > 0 && ` | ${filterInfo.totalExecutions} execuções registadas`}
                </Typography>
            )}
        </Stack>
    );
};

export default SupervisorDashboard;
