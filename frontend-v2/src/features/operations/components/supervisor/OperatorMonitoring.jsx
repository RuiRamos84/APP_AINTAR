import React, { useMemo } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Stack, LinearProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Avatar, Chip, Tooltip, IconButton, alpha, useTheme, Alert
} from '@mui/material';
import {
    People, CheckCircle, Schedule, Assignment, OpenInNew
} from '@mui/icons-material';
import { SortableHeadCell, SearchBar } from '@/shared/components/data';
import { useSortable } from '@/shared/hooks/useSortable';
import { useState } from 'react';
import { formatDate } from '../../utils/formatters';

/**
 * OperatorMonitoring — Painel de equipa (read-only).
 * Validação de execuções centralizada no tab "Controlo de Tarefas".
 */
const OperatorMonitoring = ({ operatorStats, recentActivity, onNavigateToControl }) => {
    const theme = useTheme();
    const [searchOp, setSearchOp] = useState('');

    const filteredOps = useMemo(() => {
        if (!searchOp.trim()) return operatorStats;
        return operatorStats.filter(op => (op.name || '').toLowerCase().includes(searchOp.toLowerCase()));
    }, [operatorStats, searchOp]);

    const { sorted: sortedActivity, sortKey, sortDir, requestSort } = useSortable(recentActivity, 'updt_time', 'desc');

    const totalOperators = operatorStats.length;
    const totalAssigned = operatorStats.reduce((sum, op) => sum + op.totalTasks, 0);
    const totalCompleted = operatorStats.reduce((sum, op) => sum + op.completedTasks, 0);
    const totalPending = operatorStats.reduce((sum, op) => sum + op.pendingTasks, 0);

    return (
        <Stack spacing={3}>
            {/* Summary Cards */}
            <Grid container spacing={2}>
                {[
                    { label: 'Operadores', value: totalOperators, icon: <People />, color: '#2196f3' },
                    { label: 'Tarefas Atribuídas', value: totalAssigned, icon: <Assignment />, color: '#9c27b0' },
                    { label: 'Concluídas', value: totalCompleted, icon: <CheckCircle />, color: '#4caf50' },
                    { label: 'Pendentes', value: totalPending, icon: <Schedule />, color: '#ff9800' },
                ].map(stat => (
                    <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
                        <Card sx={{
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
                    </Grid>
                ))}
            </Grid>

            {/* Operator Performance */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            Desempenho por Operador
                        </Typography>
                        <SearchBar searchTerm={searchOp} onSearch={setSearchOp} />
                    </Stack>
                    <Stack spacing={2}>
                        {filteredOps.map(op => (
                            <Box key={op.pk} sx={{
                                p: 2, borderRadius: 2,
                                border: 1, borderColor: 'divider',
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                            }}>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Avatar sx={{
                                        width: 40, height: 40,
                                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                                        color: theme.palette.primary.main,
                                        fontWeight: 600
                                    }}>
                                        {op.name?.charAt(0) || '?'}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle2" fontWeight={600}>{op.name}</Typography>
                                            <Typography variant="body2" fontWeight={700}
                                                color={op.efficiency >= 75 ? 'success.main' : op.efficiency >= 50 ? 'warning.main' : 'error.main'}>
                                                {op.efficiency}%
                                            </Typography>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate" value={op.efficiency}
                                            sx={{
                                                height: 6, borderRadius: 3, mt: 1,
                                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 3,
                                                    bgcolor: op.efficiency >= 75 ? 'success.main' : op.efficiency >= 50 ? 'warning.main' : 'error.main'
                                                }
                                            }}
                                        />
                                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {op.completedTasks}/{op.totalTasks} concluídas
                                            </Typography>
                                            {op.pendingTasks > 0 && (
                                                <Typography variant="caption" color="warning.main">
                                                    {op.pendingTasks} pendente{op.pendingTasks > 1 ? 's' : ''}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Box>
                        ))}
                        {filteredOps.length === 0 && (
                            <Alert severity="info">
                                {searchOp ? 'Nenhum operador encontrado.' : 'Sem dados de operadores para os filtros selecionados.'}
                            </Alert>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                Atividade Recente
                            </Typography>
                            {onNavigateToControl && (
                                <Tooltip title="Validar execuções no separador Controlo">
                                    <Chip
                                        icon={<OpenInNew fontSize="small" />}
                                        label="Ir para Controlo"
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        onClick={onNavigateToControl}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                </Tooltip>
                            )}
                        </Stack>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <SortableHeadCell label="Operador" field="operador_nome" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                        <SortableHeadCell label="Tarefa" field="acao_nome" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                        <TableCell>Validação</TableCell>
                                        <SortableHeadCell label="Data" field="updt_time" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sortedActivity.slice(0, 20).map((exec, idx) => {
                                        const isValidated = exec.control_tt_operacaocontrolo || exec.validated;
                                        return (
                                            <TableRow key={exec.pk || idx} hover>
                                                <TableCell>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Avatar sx={{ width: 24, height: 24, fontSize: 10 }}>
                                                            {exec.operador_nome?.charAt(0) || '?'}
                                                        </Avatar>
                                                        <Typography variant="body2">{exec.operador_nome || '-'}</Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                                        {exec.acao_nome || exec.description || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={isValidated ? 'Validada' : 'Aguarda validação'}
                                                        size="small"
                                                        color={isValidated ? 'success' : 'warning'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption">
                                                        {formatDate(exec.updt_time)}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}
        </Stack>
    );
};

export default OperatorMonitoring;
