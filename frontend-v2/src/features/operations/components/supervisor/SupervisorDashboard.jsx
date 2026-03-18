import React, { useState } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Stack, LinearProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Avatar, Chip, alpha, useTheme, InputAdornment, TextField
} from '@mui/material';
import {
    Assignment, Warning, TrendingUp,
    People, CalendarMonth, Today, CheckCircle, Search
} from '@mui/icons-material';
import SortableHeadCell from '@/shared/components/data/SortableHeadCell';
import { useSortable } from '@/shared/hooks/useSortable';

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
    const [search, setSearch] = useState('');

    const weekColors = { W1: '#2196f3', W2: '#4caf50', W3: '#ff9800', W4: '#9c27b0' };

    // Filtrar por pesquisa
    const filteredStats = search.trim()
        ? operatorStats.filter(op => (op.name || '').toLowerCase().includes(search.toLowerCase()))
        : operatorStats;

    const { sorted, sortKey, sortDir, requestSort } = useSortable(filteredStats, 'completedTasks', 'desc');

    return (
        <Stack spacing={3}>
            {/* KPI Row 1 — Estado das tarefas */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Concluídas"
                        value={overview.completedTasks}
                        icon={<CheckCircle />}
                        color={theme.palette.success.main}
                        subtitle="Tarefas com resultado registado"
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Pendentes"
                        value={overview.pendingTasks}
                        icon={<Warning />}
                        color={overview.pendingTasks > 0 ? theme.palette.warning.main : theme.palette.success.main}
                        subtitle="Tarefas por completar"
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Metas Programadas"
                        value={overview.totalOperations}
                        icon={<Assignment />}
                        color={theme.palette.primary.main}
                        subtitle="Rotinas mensais agendadas"
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Taxa de Conclusão"
                        value={`${overview.completionRate}%`}
                        icon={<TrendingUp />}
                        color={overview.completionRate >= 75 ? theme.palette.success.main : theme.palette.warning.main}
                        subtitle="Concluídas / Total de tarefas"
                    />
                </Grid>
            </Grid>

            {/* Barra de progresso */}
            <Box>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">
                        Taxa de Conclusão ({overview.completedTasks} concluídas / {overview.totalExecutions} tarefas)
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

            {/* KPI Row 2 */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Operadores Ativos"
                        value={overview.activeOperators}
                        icon={<People />}
                        color="#2196f3"
                        subtitle="Com execuções registadas"
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Operadores com Metas"
                        value={operatorStats.filter(op => op.totalTasks > 0).length}
                        icon={<Assignment />}
                        color="#9c27b0"
                        subtitle="Com tarefas de rotina atribuídas"
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Semanas com Metas"
                        value={Object.values(weekDistribution).filter(v => v > 0).length}
                        icon={<CalendarMonth />}
                        color="#00897b"
                        subtitle="Das 4 semanas mensais"
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label="Dias com Metas"
                        value={Object.values(dayDistribution).filter(v => v > 0).length}
                        icon={<Today />}
                        color="#e65100"
                        subtitle="Dos 7 dias da semana"
                    />
                </Grid>
            </Grid>

            {/* Distribution Charts */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <DistributionBar
                        data={weekDistribution}
                        title="Metas por Semana do Mês"
                        icon={<CalendarMonth color="primary" />}
                        colorFn={(key) => weekColors[key] || theme.palette.primary.main}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <DistributionBar
                        data={dayDistribution}
                        title="Metas por Dia da Semana"
                        icon={<Today color="primary" />}
                    />
                </Grid>
            </Grid>

            {/* Tabela de carga por operador */}
            {operatorStats.length > 0 && (
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                Atividade por Operador
                            </Typography>
                            <TextField
                                size="small"
                                placeholder="Pesquisar operador..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                sx={{ width: 220 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search fontSize="small" color="action" />
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Stack>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <SortableHeadCell label="Operador" field="name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                        <SortableHeadCell label="Programadas" field="scheduledTasks" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="center" />
                                        <SortableHeadCell label="Realizadas" field="completedTasks" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="center" />
                                        <SortableHeadCell label="Pendentes" field="pendingTasks" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="center" />
                                        <SortableHeadCell label="Atividade" field="efficiency" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="center" />
                                        <TableCell sx={{ minWidth: 120 }}>Progresso</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sorted.map((op) => (
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
                                            <TableCell align="center">
                                                <Typography variant="body2">{op.scheduledTasks || '—'}</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={op.completedTasks}
                                                    size="small"
                                                    color={op.completedTasks > 0 ? 'success' : 'default'}
                                                    variant="outlined"
                                                    icon={op.completedTasks > 0 ? <CheckCircle /> : undefined}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2"
                                                    color={op.pendingTasks > 0 ? 'warning.main' : 'text.secondary'}>
                                                    {op.pendingTasks > 0 ? op.pendingTasks : '—'}
                                                </Typography>
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
                                                            bgcolor: op.efficiency >= 75 ? theme.palette.success.main : op.efficiency >= 50 ? theme.palette.warning.main : theme.palette.error.main
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sorted.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                                <Typography variant="body2" color="text.secondary">Nenhum operador encontrado</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Rodapé informativo */}
            {filterInfo && (
                <Typography variant="caption" color="text.secondary" textAlign="center">
                    A mostrar {filterInfo.showing} de {filterInfo.totalInDatabase} metas programadas
                    {filterInfo.totalExecutions > 0 && ` · ${filterInfo.totalExecutions} execuções registadas no total`}
                </Typography>
            )}
        </Stack>
    );
};

export default SupervisorDashboard;
