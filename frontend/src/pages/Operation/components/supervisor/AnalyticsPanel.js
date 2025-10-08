// components/supervisor/AnalyticsPanel.js
import React from 'react';
import {
    Box, Grid, Card, CardContent, Typography, LinearProgress
} from '@mui/material';
import {
    TrendingUp, Assessment, Timeline
} from '@mui/icons-material';

const AnalyticsPanel = ({ operationsData }) => {
    // Usar dados do hook unificado com fallbacks seguros
    const loading = operationsData?.isLoading || false;
    const analytics = operationsData?.analytics || {};

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6">Carregando analytics...</Typography>
                <LinearProgress />
            </Box>
        );
    }

    const stats = {
        totalTasks: analytics?.overview?.totalOperations || 0,
        completedTasks: analytics?.overview?.completedTasks || 0,
        pendingTasks: analytics?.overview?.pendingTasks || 0,
        completionRate: analytics?.overview?.completionRate || 0,
        operatorStats: operationsData?.operatorStats || []
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Analytics e Relatórios
            </Typography>

            <Grid container spacing={3}>
                {/* Card de métricas principais */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <TrendingUp sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h4" color="primary" gutterBottom>
                                {Math.round(stats.completionRate)}%
                            </Typography>
                            <Typography variant="h6" gutterBottom>
                                Taxa de Conclusão
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {stats.completedTasks} de {stats.totalTasks} tarefas concluídas
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Assessment sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                            <Typography variant="h4" color="success.main" gutterBottom>
                                {stats.operatorStats.length}
                            </Typography>
                            <Typography variant="h6" gutterBottom>
                                Operadores Ativos
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Operadores com tarefas atribuídas
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Timeline sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                            <Typography variant="h4" color="info.main" gutterBottom>
                                {stats.totalTasks}
                            </Typography>
                            <Typography variant="h6" gutterBottom>
                                Tarefas Definidas
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Tarefas de operação configuradas
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Performance por operador */}
                <Grid size={{ xs: 12 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Performance Detalhada por Operador
                            </Typography>

                            {stats.operatorStats.length > 0 ? (
                                <Grid container spacing={2}>
                                    {stats.operatorStats.map((operator, index) => {
                                        const completionRate = operator.totalTasks > 0
                                            ? (operator.completedTasks / operator.totalTasks) * 100
                                            : 0;

                                        return (
                                            <Grid size={{ xs: 12, md: 6 }} key={operator.id || index}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                                            <Typography variant="h6">
                                                                {operator.name}
                                                            </Typography>
                                                            <Typography variant="h6" color="primary">
                                                                {Math.round(completionRate)}%
                                                            </Typography>
                                                        </Box>

                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={completionRate}
                                                            sx={{ height: 8, borderRadius: 4, mb: 2 }}
                                                        />

                                                        <Grid container spacing={2}>
                                                            <Grid size={{ xs: 4 }}>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Total
                                                                </Typography>
                                                                <Typography variant="h6">
                                                                    {operator.totalTasks}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid size={{ xs: 4 }}>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Concluídas
                                                                </Typography>
                                                                <Typography variant="h6" color="success.main">
                                                                    {operator.completedTasks}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid size={{ xs: 4 }}>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Pendentes
                                                                </Typography>
                                                                <Typography variant="h6" color="warning.main">
                                                                    {operator.pendingTasks}
                                                                </Typography>
                                                            </Grid>
                                                        </Grid>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            ) : (
                                <Box textAlign="center" py={4}>
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        Nenhum dado disponível
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Defina tarefas e atribua operações para ver analytics
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
                                Resumo Executivo
                            </Typography>
                            <Typography variant="body1" paragraph>
                                <strong>Estado Atual:</strong> O sistema tem {stats.totalTasks} tarefas definidas
                                e {stats.totalTasks} tarefas atribuídas aos operadores.
                            </Typography>
                            <Typography variant="body1" paragraph>
                                <strong>Performance:</strong> {stats.completedTasks} tarefas foram concluídas
                                ({Math.round(stats.completionRate)}% de taxa de conclusão) e {stats.pendingTasks}
                                ainda estão pendentes.
                            </Typography>
                            <Typography variant="body1">
                                <strong>Equipa:</strong> {stats.operatorStats.length} operadores estão ativos
                                e a trabalhar nas tarefas atribuídas.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsPanel;