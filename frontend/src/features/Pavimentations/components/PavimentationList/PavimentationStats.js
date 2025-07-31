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
 * @param {Object} props - Propriedades do componente
 * @returns {JSX.Element} Componente de estatísticas
 */
const PavimentationStats = ({
    statistics,
    status,
    compact = false,
    showTrends = false,
    previousStats = null,
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

    const stats = [
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

    // Adicionar médias se não for modo compacto
    if (!compact) {
        stats.push(
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
        );
    }

    return (
        <Box sx={{ py: compact ? 1 : 2, ...sx }}>
            <Grid container spacing={compact ? 1 : 2}>
                {stats.map((stat, index) => (
                    <Grid
                        item
                        xs={compact ? 4 : 6}
                        md={compact ? 3 : 4}
                        lg={compact ? 2.4 : 2.4}
                        key={index}
                    >
                        <StatCard {...stat} />
                    </Grid>
                ))}
            </Grid>

            {/* Informação adicional no modo não compacto */}
            {!compact && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        Estatísticas calculadas com base nos dados filtrados
                        {previousStats && showTrends && ' • Comparação com período anterior'}
                    </Typography>
                </Box>
            )}
        </Box>
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
    compact = false
}) => {
    if (!currentStats || !previousStats) {
        return <PavimentationStats statistics={currentStats} compact={compact} />;
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
            />
        </Box>
    );
};

export default PavimentationStats;