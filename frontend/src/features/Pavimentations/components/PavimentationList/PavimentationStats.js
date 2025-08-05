// frontend/src/features/Pavimentations/components/PavimentationList/PavimentationStats.js

import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Chip,
    Tooltip,
    useTheme,
    alpha
} from '@mui/material';
import {
    Straighten as ComprimentoIcon,
    CropSquare as AreaIcon,
    Assignment as ItemsIcon,
    TrendingUp as TrendIcon
} from '@mui/icons-material';
import { DataHelpers } from '../../constants/pavimentationTypes';

/**
 * Componente para exibir estatísticas das pavimentações
 */
const PavimentationStats = ({
    statistics,
    status,
    compact = false,
    showTrends = false,
    showAverages = false, // Nova prop para controlar médias
    previousStats = null,
    isFiltered = false, // Nova prop para contexto
    sx = {}
}) => {
    const theme = useTheme();

    if (!statistics || statistics.totalItems === 0) {
        return null;
    }

    /**
     * Calcular tendência em relação aos dados anteriores
     */
    const calculateTrend = (current, previous, field) => {
        if (!previousStats || !previous[field] || previous[field] === 0) return null;

        const currentValue = parseFloat(current[field]) || 0;
        const previousValue = parseFloat(previous[field]) || 0;
        const change = ((currentValue - previousValue) / previousValue * 100);

        return {
            percentage: Math.abs(change).toFixed(1),
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
            value: change
        };
    };

    /**
     * Renderizar card de estatística
     */
    const StatCard = ({
        icon: Icon,
        label,
        value,
        unit = '',
        color = 'primary',
        trend = null,
        tooltip = null
    }) => {
        const cardContent = (
            <Paper
                elevation={0}
                sx={{
                    p: compact ? 1.5 : 2,
                    textAlign: 'center',
                    backgroundColor: alpha(theme.palette[color].main, 0.08),
                    border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        backgroundColor: alpha(theme.palette[color].main, 0.12),
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[4]
                    }
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                    <Icon
                        sx={{
                            fontSize: compact ? 20 : 24,
                            color: `${color}.main`,
                            mr: 1
                        }}
                    />
                    <Typography
                        variant={compact ? 'caption' : 'body2'}
                        color="text.secondary"
                        sx={{ fontWeight: 500 }}
                    >
                        {label}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
                    <Typography
                        variant={compact ? 'h6' : 'h5'}
                        color={`${color}.main`}
                        sx={{ fontWeight: 600 }}
                    >
                        {value}
                    </Typography>
                    {unit && (
                        <Typography variant="caption" color="text.secondary">
                            {unit}
                        </Typography>
                    )}
                </Box>

                {trend && showTrends && (
                    <Box sx={{ mt: 1 }}>
                        <Chip
                            size="small"
                            icon={
                                trend.direction === 'up' ? (
                                    <TrendIcon sx={{ transform: 'rotate(0deg)' }} />
                                ) : trend.direction === 'down' ? (
                                    <TrendIcon sx={{ transform: 'rotate(180deg)' }} />
                                ) : null
                            }
                            label={`${trend.percentage}%`}
                            color={
                                trend.direction === 'up' ? 'success' :
                                    trend.direction === 'down' ? 'error' : 'default'
                            }
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                    </Box>
                )}
            </Paper>
        );

        return tooltip ? (
            <Tooltip title={tooltip} arrow>
                {cardContent}
            </Tooltip>
        ) : cardContent;
    };

    // Estatísticas principais (sempre mostradas)
    const mainStats = [
        {
            icon: ItemsIcon,
            label: 'Total de Itens',
            value: statistics.totalItems.toLocaleString('pt-PT'),
            color: 'primary',
            trend: showTrends ? calculateTrend(statistics, previousStats, 'totalItems') : null,
            tooltip: 'Número total de pavimentações'
        },
        {
            icon: ComprimentoIcon,
            label: 'Comprimento Total',
            value: parseFloat(statistics.totalComprimento).toLocaleString('pt-PT', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }),
            unit: 'm',
            color: 'info',
            trend: showTrends ? calculateTrend(statistics, previousStats, 'totalComprimento') : null,
            tooltip: `Comprimento total: ${DataHelpers.formatMeasurement(statistics.totalComprimento, 'm')}`
        },
        {
            icon: AreaIcon,
            label: 'Área Total',
            value: parseFloat(statistics.totalArea).toLocaleString('pt-PT', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }),
            unit: 'm²',
            color: 'success',
            trend: showTrends ? calculateTrend(statistics, previousStats, 'totalArea') : null,
            tooltip: `Área total: ${DataHelpers.formatMeasurement(statistics.totalArea, 'm²')}`
        }
    ];

    // Estatísticas de médias (opcionais)
    const averageStats = showAverages ? [
        {
            icon: ComprimentoIcon,
            label: 'Média Comprimento',
            value: parseFloat(statistics.averageComprimento).toLocaleString('pt-PT', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }),
            unit: 'm',
            color: 'warning',
            tooltip: `Comprimento médio por pavimentação: ${DataHelpers.formatMeasurement(statistics.averageComprimento, 'm')}`
        },
        {
            icon: AreaIcon,
            label: 'Média Área',
            value: parseFloat(statistics.averageArea).toLocaleString('pt-PT', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }),
            unit: 'm²',
            color: 'secondary',
            tooltip: `Área média por pavimentação: ${DataHelpers.formatMeasurement(statistics.averageArea, 'm²')}`
        }
    ] : [];

    const allStats = [...mainStats, ...averageStats];

    return (
        <Paper
            elevation={0}
            sx={{
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                borderRadius: 2,
                p: 3,
                ...sx
            }}
        >
            {/* Cabeçalho das estatísticas */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 600,
                        color: 'primary.main',
                        mb: 0.5
                    }}
                >
                    Resumo das Pavimentações
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Dados consolidados {isFiltered ? 'dos resultados filtrados' : 'de todos os registos'}
                </Typography>
            </Box>

            {/* Estatísticas principais - Layout horizontal */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {mainStats.map((stat, index) => (
                    <Grid size={{ xs: 12, sm: 4 }} key={index}>
                        <Box
                            sx={{
                                textAlign: 'center',
                                p: 2,
                                borderRadius: 2,
                                backgroundColor: alpha(theme.palette[stat.color].main, 0.08),
                                border: `2px solid ${alpha(theme.palette[stat.color].main, 0.2)}`,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: `0 8px 25px ${alpha(theme.palette[stat.color].main, 0.2)}`,
                                    borderColor: `${stat.color}.main`
                                }
                            }}
                        >
                            <stat.icon
                                sx={{
                                    fontSize: 40,
                                    color: `${stat.color}.main`,
                                    mb: 1,
                                    display: 'block',
                                    mx: 'auto'
                                }}
                            />
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 700,
                                    color: `${stat.color}.main`,
                                    mb: 0.5,
                                    lineHeight: 1
                                }}
                            >
                                {stat.value}
                                {stat.unit && (
                                    <Typography
                                        component="span"
                                        variant="h6"
                                        sx={{ ml: 0.5, fontWeight: 400, opacity: 0.8 }}
                                    >
                                        {stat.unit}
                                    </Typography>
                                )}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontWeight: 500 }}
                            >
                                {stat.label}
                            </Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {/* Informação contextual */}
            <Box
                sx={{
                    textAlign: 'center',
                    p: 2,
                    backgroundColor: alpha(theme.palette.info.main, 0.05),
                    borderRadius: 1,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`
                }}
            >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    📊 Estatísticas calculadas em tempo real
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {previousStats && showTrends && '📈 Comparação com período anterior disponível • '}
                    🔄 Dados actualizados automaticamente
                </Typography>
            </Box>
        </Paper>
    );
};

/**
 * Componente simplificado para estatísticas inline
 */
export const PavimentationStatsInline = ({ statistics, separator = ' • ' }) => {
    if (!statistics || statistics.totalItems === 0) {
        return null;
    }

    const items = [
        `${statistics.totalItems} ${statistics.totalItems === 1 ? 'item' : 'itens'}`,
        `${DataHelpers.formatMeasurement(statistics.totalComprimento, 'm')} total`,
        `${DataHelpers.formatMeasurement(statistics.totalArea, 'm²')} total`
    ];

    return (
        <Typography variant="caption" color="text.secondary">
            {items.join(separator)}
        </Typography>
    );
};

/**
 * Componente para comparação de estatísticas
 */
export const PavimentationStatsComparison = ({
    currentStats,
    previousStats,
    period = 'anterior',
    compact = false,
    showAverages = false
}) => {
    if (!currentStats || !previousStats) {
        return <PavimentationStats statistics={currentStats} compact={compact} showAverages={showAverages} />;
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Comparação com período {period}
            </Typography>
            <PavimentationStats
                statistics={currentStats}
                previousStats={previousStats}
                showTrends={true}
                compact={compact}
                showAverages={showAverages}
            />
        </Box>
    );
};

export default PavimentationStats;