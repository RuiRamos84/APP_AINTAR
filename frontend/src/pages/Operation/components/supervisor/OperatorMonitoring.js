// components/supervisor/OperatorMonitoring.js
import React, { useState } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, List, ListItem,
    ListItemText, ListItemAvatar, Avatar, Chip, LinearProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
    Person, CheckCircle, Schedule, TrendingUp, FactCheck, Close
} from '@mui/icons-material';
import operationsApi from '../../services/operationsApi';
import { useMetaData } from '../../../../contexts/MetaDataContext';

const OperatorMonitoring = ({ operationsData }) => {
    // Usar dados do hook unificado com fallbacks seguros
    const loading = operationsData?.isLoading || false;
    const analytics = operationsData?.analytics || {};
    const operatorStats = operationsData?.operatorStats || [];
    const recentActivity = operationsData?.recentActivity || [];

    // Buscar metadados para opções de classificação de controlo
    const { metaData } = useMetaData();
    const opcontroloOptions = metaData?.opcontrolo || [];

    // Estados para modal de validação
    const [validationDialogOpen, setValidationDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [validationData, setValidationData] = useState({
        control_tt_operacaocontrolo: 1,
        control_memo: ''
    });
    const [validating, setValidating] = useState(false);

    const handleValidateClick = (task) => {
        setSelectedTask(task);
        setValidationData({ control_tt_operacaocontrolo: 1, control_memo: '' });
        setValidationDialogOpen(true);
    };

    const handleValidationSubmit = async () => {
        if (!selectedTask) return;

        setValidating(true);
        try {
            await operationsApi.updateOperationControl({
                pk: selectedTask.id,
                control_tt_operacaocontrolo: validationData.control_tt_operacaocontrolo,
                control_memo: validationData.control_memo
            });

            setValidationDialogOpen(false);
            // Refresh data
            if (operationsData.refreshExecutions) {
                operationsData.refreshExecutions();
            }
        } catch (error) {
            console.error('Erro ao validar tarefa:', error);
            alert('Erro ao validar tarefa');
        } finally {
            setValidating(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6">Carregando monitorização...</Typography>
                <LinearProgress />
            </Box>
        );
    }

    const recentTasks = recentActivity?.slice(0, 10) || [];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Monitorização de Operadores
            </Typography>

            <Grid container spacing={3}>
                {/* Estatísticas por operador */}
                <Grid size={{ xs: 12, lg: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Performance dos Operadores
                            </Typography>

                            {operatorStats.length > 0 ? (
                                <List>
                                    {operatorStats.map((operator, index) => {
                                        const completionRate = operator.totalTasks > 0
                                            ? (operator.completedTasks / operator.totalTasks) * 100
                                            : 0;

                                        return (
                                            <ListItem key={operator.id || index} sx={{ mb: 2 }}>
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                        <Person />
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={operator.name}
                                                    secondary={`${operator.completedTasks}/${operator.totalTasks} tarefas concluídas`}
                                                />
                                                <Box sx={{ ml: 2, minWidth: 120 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={completionRate}
                                                        sx={{ height: 6, borderRadius: 3, mb: 1 }}
                                                    />
                                                    <Box display="flex" gap={1}>
                                                        <Chip
                                                            icon={<CheckCircle />}
                                                            label={`${operator.completedTasks} ✓`}
                                                            color="success"
                                                            size="small"
                                                        />
                                                        <Chip
                                                            icon={<Schedule />}
                                                            label={`${operator.pendingTasks} ⏳`}
                                                            color="warning"
                                                            size="small"
                                                        />
                                                    </Box>
                                                </Box>
                                                <Box sx={{ textAlign: 'right', ml: 2 }}>
                                                    <Typography variant="h6" color="primary">
                                                        {Math.round(completionRate)}%
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        conclusão
                                                    </Typography>
                                                </Box>
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            ) : (
                                <Box textAlign="center" py={4}>
                                    <Typography variant="body1" color="text.secondary">
                                        Nenhum operador com tarefas atribuídas
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Atividade recente */}
                <Grid size={{ xs: 12, lg: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Atividade Recente
                            </Typography>

                            {recentTasks.length > 0 ? (
                                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Operador</TableCell>
                                                <TableCell>Tarefa</TableCell>
                                                <TableCell>Estado</TableCell>
                                                <TableCell>Data</TableCell>
                                                <TableCell align="center">Ações</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {recentTasks.map((task, index) => (
                                                <TableRow key={task.id || index}>
                                                    <TableCell>{task.operator || '-'}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2">
                                                            {task.description || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={task.status === 'completed' ? 'Concluída' : 'Pendente'}
                                                            color={task.status === 'completed' ? 'success' : 'warning'}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption">
                                                            {task.timestamp ? new Date(task.timestamp).toLocaleDateString('pt-PT') : 'Hoje'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => handleValidateClick(task)}
                                                            title="Validar Tarefa"
                                                        >
                                                            <FactCheck fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box textAlign="center" py={4}>
                                    <Typography variant="body1" color="text.secondary">
                                        Nenhuma atividade recente
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Resumo geral */}
                <Grid size={{ xs: 12 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Resumo do Dia
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 3 }}>
                                    <Box textAlign="center">
                                        <Typography variant="h4" color="primary">
                                            {operatorStats.length}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Operadores Ativos
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 3 }}>
                                    <Box textAlign="center">
                                        <Typography variant="h4" color="info.main">
                                            {analytics?.overview?.totalOperations || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Tarefas Atribuídas
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 3 }}>
                                    <Box textAlign="center">
                                        <Typography variant="h4" color="success.main">
                                            {analytics?.overview?.completedTasks || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Tarefas Concluídas
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 3 }}>
                                    <Box textAlign="center">
                                        <Typography variant="h4" color="warning.main">
                                            {analytics?.overview?.pendingTasks || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Tarefas Pendentes
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Dialog de Validação */}
            <Dialog open={validationDialogOpen} onClose={() => setValidationDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">Validar Tarefa</Typography>
                        <IconButton onClick={() => setValidationDialogOpen(false)} size="small">
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedTask && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>Tarefa:</strong> {selectedTask.description}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>Operador:</strong> {selectedTask.operator}
                            </Typography>

                            <FormControl fullWidth sx={{ mt: 3 }}>
                                <InputLabel>Classificação da Validação</InputLabel>
                                <Select
                                    value={validationData.control_tt_operacaocontrolo}
                                    onChange={(e) => setValidationData({ ...validationData, control_tt_operacaocontrolo: e.target.value })}
                                    label="Classificação da Validação"
                                >
                                    {opcontroloOptions.length > 0 ? (
                                        opcontroloOptions.map((option) => (
                                            <MenuItem key={option.pk} value={option.pk}>
                                                {option.value}
                                            </MenuItem>
                                        ))
                                    ) : (
                                        // Fallback caso metadados não estejam carregados
                                        <>
                                            <MenuItem value={1}>✅ Conforme</MenuItem>
                                            <MenuItem value={2}>⚠️ Com Observações</MenuItem>
                                            <MenuItem value={3}>❌ Não Conforme</MenuItem>
                                        </>
                                    )}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Observações"
                                value={validationData.control_memo}
                                onChange={(e) => setValidationData({ ...validationData, control_memo: e.target.value })}
                                sx={{ mt: 2 }}
                                placeholder="Adicione observações sobre a validação..."
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setValidationDialogOpen(false)} disabled={validating}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleValidationSubmit}
                        variant="contained"
                        disabled={validating}
                        startIcon={<FactCheck />}
                    >
                        {validating ? 'Guardando...' : 'Guardar Validação'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OperatorMonitoring;