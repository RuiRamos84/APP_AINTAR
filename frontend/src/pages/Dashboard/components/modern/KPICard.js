import React from 'react';
import { Card, CardContent, Typography, Box, useTheme, alpha } from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Assignment as AssignmentIcon,
    AccountTree as AccountTreeIcon,
    CleaningServices as CleaningServicesIcon,
    Construction as ConstructionIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

/**
 * Componente KPI Card - Cartão de indicador-chave de desempenho
 * Design moderno com animações e gradientes
 */
const KPICard = ({
    title,
    value,
    subtitle,
    trend,
    icon,
    color,
    onClick
}) => {
    const theme = useTheme();

    // Mapear ícones
    const iconMap = {
        assignment: <AssignmentIcon sx={{ fontSize: 40 }} />,
        account_tree: <AccountTreeIcon sx={{ fontSize: 40 }} />,
        cleaning_services: <CleaningServicesIcon sx={{ fontSize: 40 }} />,
        construction: <ConstructionIcon sx={{ fontSize: 40 }} />
    };

    const IconComponent = iconMap[icon] || iconMap.assignment;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -5 }}
        >
            <Card
                sx={{
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: onClick ? 'pointer' : 'default',
                    background: `linear-gradient(135deg, ${alpha(color || theme.palette.primary.main, 0.1)} 0%, ${alpha(color || theme.palette.primary.main, 0.05)} 100%)`,
                    border: `1px solid ${alpha(color || theme.palette.primary.main, 0.2)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        boxShadow: `0 8px 24px ${alpha(color || theme.palette.primary.main, 0.25)}`,
                        borderColor: alpha(color || theme.palette.primary.main, 0.5)
                    }
                }}
                onClick={onClick}
            >
                {/* Ícone de fundo decorativo */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        opacity: 0.1,
                        transform: 'rotate(-15deg)',
                        color: color || theme.palette.primary.main
                    }}
                >
                    {React.cloneElement(IconComponent, { sx: { fontSize: 120 } })}
                </Box>

                <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                    {/* Ícone e título */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 2,
                                backgroundColor: alpha(color || theme.palette.primary.main, 0.15),
                                color: color || theme.palette.primary.main,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 2
                            }}
                        >
                            {IconComponent}
                        </Box>
                        <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                            {title}
                        </Typography>
                    </Box>

                    {/* Valor principal */}
                    <Box sx={{ mb: 1 }}>
                        <Typography
                            variant="h3"
                            fontWeight="bold"
                            sx={{
                                color: color || theme.palette.primary.main,
                                fontFamily: 'monospace'
                            }}
                        >
                            {typeof value === 'number' ? value.toLocaleString('pt-PT') : value}
                        </Typography>
                    </Box>

                    {/* Subtítulo */}
                    {subtitle && (
                        <Typography variant="body2" color="text.secondary">
                            {subtitle}
                        </Typography>
                    )}

                    {/* Trend (se disponível) */}
                    {trend !== null && trend !== undefined && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mt: 2,
                                color: trend >= 0 ? theme.palette.success.main : theme.palette.error.main
                            }}
                        >
                            {trend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            <Typography variant="body2" fontWeight="bold" sx={{ ml: 0.5 }}>
                                {Math.abs(trend)}%
                            </Typography>
                            <Typography variant="caption" sx={{ ml: 1 }} color="text.secondary">
                                vs. período anterior
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default KPICard;
