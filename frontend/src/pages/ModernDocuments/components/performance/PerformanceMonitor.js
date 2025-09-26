import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    LinearProgress,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Alert,
    IconButton,
    Collapse,
    Tooltip,
    Fade
} from '@mui/material';
import {
    Speed as SpeedIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Timeline as TimelineIcon,
    Memory as MemoryIcon,
    NetworkCheck as NetworkIcon,
    Refresh as RefreshIcon,
    ExpandMore as ExpandIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { useAdvancedDocuments } from '../../context/AdvancedDocumentsContext';

/**
 * Monitor de performance em tempo real
 * - Métricas de resposta
 * - Taxa de sucesso
 * - Uso de memória
 * - Performance de rede
 * - Recomendações automáticas
 */
const PerformanceMonitor = ({ compact = false, showRecommendations = true }) => {
    const { getPerformanceReport, metrics } = useAdvancedDocuments();
    const [expanded, setExpanded] = useState(!compact);
    const [realTimeMetrics, setRealTimeMetrics] = useState({
        memoryUsage: 0,
        networkLatency: 0,
        renderTime: 0
    });

    // Collect browser performance metrics
    const collectBrowserMetrics = useCallback(() => {
        // Memory usage
        if (performance.memory) {
            const memUsage = Math.round(
                (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
            );
            setRealTimeMetrics(prev => ({ ...prev, memoryUsage: memUsage }));
        }

        // Navigation timing
        if (performance.getEntriesByType) {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                const networkLatency = Math.round(navigation.responseEnd - navigation.requestStart);
                setRealTimeMetrics(prev => ({ ...prev, networkLatency }));
            }
        }

        // Render performance
        const renderStart = performance.now();
        requestAnimationFrame(() => {
            const renderTime = Math.round(performance.now() - renderStart);
            setRealTimeMetrics(prev => ({ ...prev, renderTime }));
        });
    }, []);

    useEffect(() => {
        collectBrowserMetrics();
        const interval = setInterval(collectBrowserMetrics, 5000);
        return () => clearInterval(interval);
    }, [collectBrowserMetrics]);

    const performanceReport = getPerformanceReport();

    const getPerformanceGrade = () => {
        const avgResponseTime = metrics.averageResponseTime;
        const successRate = metrics.successRate;

        if (avgResponseTime < 500 && successRate >= 98) return 'A';
        if (avgResponseTime < 1000 && successRate >= 95) return 'B';
        if (avgResponseTime < 2000 && successRate >= 90) return 'C';
        return 'D';
    };

    const getResponseTimeColor = () => {
        if (metrics.averageResponseTime < 500) return 'success';
        if (metrics.averageResponseTime < 1500) return 'warning';
        return 'error';
    };

    const getMemoryColor = () => {
        if (realTimeMetrics.memoryUsage < 70) return 'success';
        if (realTimeMetrics.memoryUsage < 85) return 'warning';
        return 'error';
    };

    if (compact) {
        return (
            <Card sx={{ mb: 2 }}>
                <CardContent sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <SpeedIcon color="primary" />
                            <Typography variant="body2">
                                Performance: Grade {getPerformanceGrade()}
                            </Typography>
                            <Chip
                                label={`${metrics.averageResponseTime}ms`}
                                size="small"
                                color={getResponseTimeColor()}
                            />
                            <Chip
                                label={`${metrics.successRate}%`}
                                size="small"
                                color={metrics.successRate >= 95 ? 'success' : 'warning'}
                            />
                        </Box>

                        <IconButton
                            size="small"
                            onClick={() => setExpanded(!expanded)}
                            sx={{
                                transform: expanded ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.3s'
                            }}
                        >
                            <ExpandIcon />
                        </IconButton>
                    </Box>

                    <Collapse in={expanded}>
                        <Box sx={{ mt: 2 }}>
                            <PerformanceDetails
                                performanceReport={performanceReport}
                                realTimeMetrics={realTimeMetrics}
                                getResponseTimeColor={getResponseTimeColor}
                                getMemoryColor={getMemoryColor}
                                showRecommendations={showRecommendations}
                            />
                        </Box>
                    </Collapse>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SpeedIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="h6">
                        Monitor de Performance
                    </Typography>
                    <Chip
                        label={`Grade ${getPerformanceGrade()}`}
                        color={getPerformanceGrade() === 'A' ? 'success' : getPerformanceGrade() === 'B' ? 'info' : 'warning'}
                        sx={{ ml: 'auto' }}
                    />
                </Box>

                <PerformanceDetails
                    performanceReport={performanceReport}
                    realTimeMetrics={realTimeMetrics}
                    getResponseTimeColor={getResponseTimeColor}
                    getMemoryColor={getMemoryColor}
                    showRecommendations={showRecommendations}
                />
            </CardContent>
        </Card>
    );
};

// Component for detailed metrics
const PerformanceDetails = ({
    performanceReport,
    realTimeMetrics,
    getResponseTimeColor,
    getMemoryColor,
    showRecommendations
}) => {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <>
            <Grid container spacing={3}>
                {/* Response Time */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <TimelineIcon color={getResponseTimeColor()} sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="h4" color={`${getResponseTimeColor()}.main`}>
                            {performanceReport.averageResponseTime}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            ms médio
                        </Typography>
                    </Box>
                </Grid>

                {/* Success Rate */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <SuccessIcon
                            color={performanceReport.successRate >= 95 ? 'success' : 'warning'}
                            sx={{ fontSize: 32, mb: 1 }}
                        />
                        <Typography
                            variant="h4"
                            color={performanceReport.successRate >= 95 ? 'success.main' : 'warning.main'}
                        >
                            {performanceReport.successRate}%
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            taxa sucesso
                        </Typography>
                    </Box>
                </Grid>

                {/* Memory Usage */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <MemoryIcon color={getMemoryColor()} sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="h4" color={`${getMemoryColor()}.main`}>
                            {realTimeMetrics.memoryUsage}%
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            memória
                        </Typography>
                    </Box>
                </Grid>

                {/* Operations */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <NetworkIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="h4" color="primary.main">
                            {performanceReport.totalOperations}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            operações
                        </Typography>
                    </Box>
                </Grid>
            </Grid>

            {/* Progress Bars */}
            <Box sx={{ mt: 3 }}>
                <Typography variant="body2" gutterBottom>
                    Tempo de Resposta
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={Math.min((performanceReport.averageResponseTime / 3000) * 100, 100)}
                    color={getResponseTimeColor()}
                    sx={{ mb: 2, height: 6 }}
                />

                <Typography variant="body2" gutterBottom>
                    Uso de Memória
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={realTimeMetrics.memoryUsage}
                    color={getMemoryColor()}
                    sx={{ mb: 2, height: 6 }}
                />
            </Box>

            {/* Recent Operations */}
            <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Operações Recentes
                </Typography>
                <List dense>
                    {performanceReport.recentOperations.slice(0, 3).map((op, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemIcon>
                                {op.success ? (
                                    <SuccessIcon color="success" fontSize="small" />
                                ) : (
                                    <ErrorIcon color="error" fontSize="small" />
                                )}
                            </ListItemIcon>
                            <ListItemText
                                primary={op.type.replace('_', ' ').toUpperCase()}
                                secondary={`${op.duration}ms - ${new Date(op.timestamp).toLocaleTimeString()}`}
                            />
                            {op.duration < 500 ? (
                                <TrendingUpIcon color="success" fontSize="small" />
                            ) : (
                                <TrendingDownIcon color="warning" fontSize="small" />
                            )}
                        </ListItem>
                    ))}
                </List>
            </Box>

            {/* Recommendations */}
            {showRecommendations && performanceReport.recommendations.length > 0 && (
                <Fade in={true}>
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Recomendações
                        </Typography>
                        {performanceReport.recommendations.map((rec, index) => (
                            <Alert
                                key={index}
                                severity={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                                sx={{ mb: 1 }}
                            >
                                <Typography variant="body2">
                                    {rec.message}
                                </Typography>
                            </Alert>
                        ))}
                    </Box>
                </Fade>
            )}
        </>
    );
};

export default PerformanceMonitor;