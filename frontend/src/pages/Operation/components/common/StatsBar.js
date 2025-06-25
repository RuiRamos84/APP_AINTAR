// frontend/src/pages/Operation/components/common/StatsBar.js - NOVO
import React from 'react';
import { Box, Paper, Typography, Chip, Divider } from '@mui/material';
import {
    Assignment, Warning, Person, Today, Visibility
} from '@mui/icons-material';

const StatsBar = ({
    data = [],
    activeFilters = {},
    currentUserId,
    viewMode = 'cards',
    isCompact = false
}) => {
    const totalItems = data.length;
    const urgentItems = data.filter(item => item.urgency === "1").length;
    const myItems = data.filter(item => Number(item.who) === Number(currentUserId)).length;

    // Calcular items de hoje
    const todayItems = data.filter(item => {
        if (!item.ts_created) return false;
        const today = new Date();
        const itemDate = new Date(item.ts_created);
        return today.toDateString() === itemDate.toDateString();
    }).length;

    const hasActiveFilters = Object.values(activeFilters).some(Boolean);

    const stats = [
        {
            icon: <Assignment fontSize="small" />,
            label: 'Total',
            value: totalItems,
            color: 'primary'
        },
        {
            icon: <Warning fontSize="small" />,
            label: 'Urgentes',
            value: urgentItems,
            color: 'error',
            highlight: activeFilters.urgency
        },
        {
            icon: <Person fontSize="small" />,
            label: 'Meus',
            value: myItems,
            color: 'success',
            highlight: activeFilters.myTasks
        },
        {
            icon: <Today fontSize="small" />,
            label: 'Hoje',
            value: todayItems,
            color: 'info',
            highlight: activeFilters.today
        }
    ];

    if (totalItems === 0) return null;

    return (
        <Paper
            sx={{
                p: isCompact ? 1 : 1.5,
                mx: isCompact ? 1 : 2,
                mb: isCompact ? 0.5 : 1,
                borderRadius: 2,
                bgcolor: hasActiveFilters ? 'primary.50' : 'background.paper',
                transition: 'all 0.3s ease'
            }}
        >
            <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={isCompact ? 1.5 : 2}>
                    {stats.map((stat, index) => (
                        <React.Fragment key={stat.label}>
                            {index > 0 && !isCompact && (
                                <Divider
                                    orientation="vertical"
                                    flexItem
                                    sx={{ height: 24 }}
                                />
                            )}
                            <Box display="flex" alignItems="center" gap={0.5}>
                                {!isCompact && (
                                    <Box sx={{ color: `${stat.color}.main` }}>
                                        {stat.icon}
                                    </Box>
                                )}
                                {!isCompact && (
                                    <Typography variant="body2" color="text.secondary">
                                        {stat.label}:
                                    </Typography>
                                )}
                                <Chip
                                    size="small"
                                    label={isCompact ? `${stat.label}: ${stat.value}` : stat.value}
                                    color={stat.highlight ? stat.color : 'default'}
                                    variant={stat.highlight ? 'filled' : 'outlined'}
                                    sx={{
                                        minWidth: isCompact ? 'auto' : 32,
                                        height: isCompact ? 18 : 20,
                                        fontSize: isCompact ? '0.7rem' : '0.75rem'
                                    }}
                                />
                            </Box>
                        </React.Fragment>
                    ))}
                </Box>

                {/* Indicador de vista - só quando não compacto */}
                {!isCompact && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <Visibility fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                            {viewMode === 'cards' ? 'Cards' : 'Lista'}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
};

export default StatsBar;