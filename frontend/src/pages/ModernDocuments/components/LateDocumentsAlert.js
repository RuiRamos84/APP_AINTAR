import React from 'react';
import { Alert, AlertTitle, Box, Chip, Typography, Grid, LinearProgress } from '@mui/material';
import {
    AccessTime as ClockIcon,
    Warning as WarningIcon,
    TrendingUp as TrendingUpIcon,
    Schedule as ScheduleIcon,
    PriorityHigh as PriorityIcon
} from '@mui/icons-material';

const LateDocumentsAlert = ({ documents, onShowDetails }) => {
    if (!documents || documents.length === 0) {
        return (
            <Alert severity="success" sx={{ mb: 3 }}>
                <AlertTitle>✅ Excelente!</AlertTitle>
                Não há documentos em atraso no momento.
            </Alert>
        );
    }

    // Calcular estatísticas avançadas
    const stats = {
        total: documents.length,
        averageDays: Math.round(documents.reduce((sum, doc) => sum + (parseInt(doc.days) || 0), 0) / documents.length),
        maxDays: Math.max(...documents.map(doc => parseInt(doc.days) || 0)),
        minDays: Math.min(...documents.map(doc => parseInt(doc.days) || 0)),
        critical: documents.filter(doc => parseInt(doc.days) > 365).length,
        urgent: documents.filter(doc => parseInt(doc.days) > 180).length,
        high: documents.filter(doc => parseInt(doc.days) > 90).length,
        medium: documents.filter(doc => parseInt(doc.days) > 60).length,
        overYear: documents.filter(doc => parseInt(doc.days) > 365).length,
    };

    const getSeverityColor = (count, total) => {
        const percentage = (count / total) * 100;
        if (percentage > 50) return 'error';
        if (percentage > 25) return 'warning';
        return 'info';
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Alert
                severity={stats.critical > 0 ? "error" : stats.urgent > 0 ? "warning" : "info"}
                sx={{ mb: 2 }}
            >
                <AlertTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        {stats.critical > 0 ? <PriorityIcon /> : <WarningIcon />}
                        <strong>Relatório de Documentos em Atraso</strong>
                    </Box>
                </AlertTitle>

                <Typography variant="body2" sx={{ mb: 2 }}>
                    Foram encontrados <strong>{stats.total}</strong> documentos com mais de 30 dias de atraso.
                </Typography>

                {/* Estatísticas principais */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="error.main" fontWeight="bold">
                                {stats.maxDays}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Máximo de dias
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main" fontWeight="bold">
                                {stats.averageDays}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Média de dias
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="info.main" fontWeight="bold">
                                {stats.minDays}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Mínimo de dias
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="secondary.main" fontWeight="bold">
                                {Math.round((stats.overYear / stats.total) * 100)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Mais de 1 ano
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                {/* Chips de severidade */}
                <Box display="flex" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
                    {stats.critical > 0 && (
                        <Chip
                            icon={<PriorityIcon />}
                            label={`${stats.critical} Críticos (>1 ano)`}
                            color="error"
                            variant="filled"
                        />
                    )}
                    {stats.urgent > 0 && (
                        <Chip
                            icon={<WarningIcon />}
                            label={`${stats.urgent} Urgentes (>6 meses)`}
                            color="error"
                            variant="outlined"
                        />
                    )}
                    {stats.high > 0 && (
                        <Chip
                            icon={<TrendingUpIcon />}
                            label={`${stats.high} Altos (>3 meses)`}
                            color="warning"
                        />
                    )}
                    {stats.medium > 0 && (
                        <Chip
                            icon={<ScheduleIcon />}
                            label={`${stats.medium} Médios (>2 meses)`}
                            color="info"
                            variant="outlined"
                        />
                    )}
                </Box>

                {/* Barra de progresso por severidade - COM ANIMAÇÃO */}
                <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                        Distribuição por Severidade
                    </Typography>
                    <Box sx={{
                        display: 'flex',
                        gap: 0.5,
                        height: 12,
                        borderRadius: 2,
                        overflow: 'hidden',
                        bgcolor: 'grey.200',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        {/* Crítico */}
                        <Box
                            sx={{
                                width: `${(stats.critical / stats.total) * 100}%`,
                                bgcolor: 'error.dark',
                                animation: stats.critical > 0 ? 'progressFillCritical 2s ease-out' : 'none',
                                '@keyframes progressFillCritical': {
                                    '0%': { width: '0%' },
                                    '100%': { width: `${(stats.critical / stats.total) * 100}%` }
                                }
                            }}
                        />
                        {/* Urgente */}
                        <Box
                            sx={{
                                width: `${((stats.urgent - stats.critical) / stats.total) * 100}%`,
                                bgcolor: 'error.main',
                                animation: stats.urgent > stats.critical ? 'progressFillUrgent 2.5s ease-out' : 'none',
                                '@keyframes progressFillUrgent': {
                                    '0%': { width: '0%' },
                                    '100%': { width: `${((stats.urgent - stats.critical) / stats.total) * 100}%` }
                                }
                            }}
                        />
                        {/* Alto */}
                        <Box
                            sx={{
                                width: `${((stats.high - stats.urgent) / stats.total) * 100}%`,
                                bgcolor: 'warning.main',
                                animation: stats.high > stats.urgent ? 'progressFillHigh 3s ease-out' : 'none',
                                '@keyframes progressFillHigh': {
                                    '0%': { width: '0%' },
                                    '100%': { width: `${((stats.high - stats.urgent) / stats.total) * 100}%` }
                                }
                            }}
                        />
                        {/* Médio */}
                        <Box
                            sx={{
                                width: `${((stats.medium - stats.high) / stats.total) * 100}%`,
                                bgcolor: 'info.main',
                                animation: stats.medium > stats.high ? 'progressFillMedium 3.5s ease-out' : 'none',
                                '@keyframes progressFillMedium': {
                                    '0%': { width: '0%' },
                                    '100%': { width: `${((stats.medium - stats.high) / stats.total) * 100}%` }
                                }
                            }}
                        />
                    </Box>
                </Box>
            </Alert>
        </Box>
    );
};

export default LateDocumentsAlert;