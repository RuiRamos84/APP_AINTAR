// components/unified/AdaptiveContent.js
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, Chip, Button,
    CircularProgress, Alert, Container
} from '@mui/material';
import {
    Assignment, CheckCircle, Schedule, Person, Business
} from '@mui/icons-material';

// Mock data para demonstração
const mockTasks = [
    {
        pk: 1,
        tt_operacaoaccao: 'Inspeção de rotina',
        tb_instalacao: 'ETAR Viseu',
        tt_operacaomodo: 'Manutenção preventiva',
        ts_operador1: 'João Silva',
        completed: false,
        priority: 'normal',
        phone: '912345678'
    },
    {
        pk: 2,
        tt_operacaoaccao: 'Limpeza de filtros',
        tb_instalacao: 'EE Mangualde',
        tt_operacaomodo: 'Manutenção corretiva',
        ts_operador1: 'Maria Santos',
        completed: true,
        priority: 'high',
        phone: '913456789'
    },
    {
        pk: 3,
        tt_operacaoaccao: 'Verificação de bombas',
        tb_instalacao: 'ETAR Tondela',
        tt_operacaomodo: 'Manutenção preventiva',
        ts_operador1: 'Carlos Oliveira',
        completed: false,
        priority: 'urgent',
        phone: '914567890'
    }
];

const AdaptiveContent = ({ config, activeLayout, userRole, deviceType }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedView, setSelectedView] = useState('today');

    useEffect(() => {
        // Simular carregamento de dados
        setTimeout(() => {
            setTasks(mockTasks);
            setLoading(false);
        }, 1000);
    }, []);

    const TaskCard = ({ task, compact = false }) => {
        const getPriorityColor = (priority) => {
            switch (priority) {
                case 'urgent': return 'error';
                case 'high': return 'warning';
                default: return 'default';
            }
        };

        return (
            <Card
                sx={{
                    mb: config.contentPadding,
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 },
                    borderLeft: task.completed ? '4px solid green' : '4px solid orange'
                }}
            >
                <CardContent sx={{ p: compact ? 1.5 : 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Typography variant={compact ? "body1" : "h6"} fontWeight="bold">
                            {task.tt_operacaoaccao}
                        </Typography>
                        <Box display="flex" gap={0.5}>
                            {task.completed ? (
                                <Chip icon={<CheckCircle />} label="Concluída" color="success" size="small" />
                            ) : (
                                <Chip icon={<Schedule />} label="Pendente" color="warning" size="small" />
                            )}
                            {task.priority !== 'normal' && (
                                <Chip
                                    label={task.priority.toUpperCase()}
                                    color={getPriorityColor(task.priority)}
                                    size="small"
                                />
                            )}
                        </Box>
                    </Box>

                    <Box display="flex" flexDirection={compact ? "column" : "row"} gap={1} mb={2}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Business fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                                {task.tb_instalacao}
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Person fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                                {task.ts_operador1}
                            </Typography>
                        </Box>
                    </Box>

                    {!compact && (
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            {task.tt_operacaomodo}
                        </Typography>
                    )}

                    {!task.completed && (
                        <Box display="flex" gap={1}>
                            <Button size="small" variant="outlined">
                                Ver Detalhes
                            </Button>
                            {userRole === 'operator' && (
                                <Button size="small" variant="contained" color="success">
                                    Concluir
                                </Button>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    return (
        <Container maxWidth={config.compactMode ? false : 'lg'} sx={{ py: config.contentPadding }}>
            {/* Stats resumo */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="primary">
                            {pendingTasks.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Pendentes
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="success.main">
                            {completedTasks.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Concluídas
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="text.primary">
                            {tasks.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="info.main">
                            {Math.round((completedTasks.length / tasks.length) * 100)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Progresso
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Alert informativo */}
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                    🎯 <strong>Demonstração do Sistema Adaptativo:</strong> Esta interface ajusta-se automaticamente ao seu dispositivo e role.
                    Atualmente em modo <strong>{activeLayout}</strong> para <strong>{userRole}</strong>.
                </Typography>
            </Alert>

            {/* Lista de tarefas */}
            <Box>
                <Typography variant="h5" gutterBottom>
                    Tarefas Pendentes ({pendingTasks.length})
                </Typography>

                {pendingTasks.length > 0 ? (
                    <Grid container spacing={config.contentPadding}>
                        {pendingTasks.map((task) => (
                            <Grid size={{ xs: 12, sm: config.cardColumns === 1 ? 12 : 6, md: 12/config.cardColumns }} key={task.pk}>
                                <TaskCard task={task} compact={config.compactMode} />
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Alert severity="success">
                        Parabéns! Todas as tarefas foram concluídas.
                    </Alert>
                )}

                {completedTasks.length > 0 && (
                    <>
                        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                            Tarefas Concluídas ({completedTasks.length})
                        </Typography>
                        <Grid container spacing={config.contentPadding}>
                            {completedTasks.map((task) => (
                                <Grid size={{ xs: 12, sm: config.cardColumns === 1 ? 12 : 6, md: 12/config.cardColumns }} key={task.pk}>
                                    <TaskCard task={task} compact={config.compactMode} />
                                </Grid>
                            ))}
                        </Grid>
                    </>
                )}
            </Box>
        </Container>
    );
};

export default AdaptiveContent;