// frontend/src/pages/Operation/components/filters/FilterChips.js
import React from 'react';
import { Box, Chip, Stack, Typography, Button } from '@mui/material';
import { Clear, Warning, Person, Phone, LocationOn, Schedule, Assignment } from '@mui/icons-material';
import useFiltersStore from '../../store/filtersStore';

const FilterChips = ({ users = [], compact = false }) => {
    const { filters, clearFilters, setFilter, getActiveFiltersCount } = useFiltersStore();

    const getActiveChips = () => {
        const chips = [];

        if (filters.urgency) {
            chips.push({
                key: 'urgency',
                label: 'Urgentes',
                icon: <Warning />,
                color: 'error',
                onDelete: () => setFilter('urgency', false)
            });
        }

        if (filters.createdToday) {
            chips.push({
                key: 'createdToday',
                label: 'Hoje',
                icon: <Schedule />,
                color: 'primary',
                onDelete: () => setFilter('createdToday', false)
            });
        }

        if (filters.assignedTo.length > 0) {
            const userNames = filters.assignedTo.map(id => {
                const user = users.find(u => u.pk === id);
                return user ? user.name : `User ${id}`;
            }).join(', ');

            chips.push({
                key: 'assignedTo',
                label: `Atribuído: ${userNames}`,
                icon: <Person />,
                color: 'secondary',
                onDelete: () => setFilter('assignedTo', [])
            });
        }

        if (filters.hasPhone === true) {
            chips.push({
                key: 'hasPhone',
                label: 'Com contacto',
                icon: <Phone />,
                color: 'success',
                onDelete: () => setFilter('hasPhone', null)
            });
        }

        if (filters.hasPhone === false) {
            chips.push({
                key: 'hasPhone',
                label: 'Sem contacto',
                icon: <Phone />,
                color: 'warning',
                onDelete: () => setFilter('hasPhone', null)
            });
        }

        if (filters.district) {
            chips.push({
                key: 'district',
                label: `Distrito: ${filters.district}`,
                icon: <LocationOn />,
                color: 'info',
                onDelete: () => setFilter('district', null)
            });
        }

        if (filters.municipality) {
            chips.push({
                key: 'municipality',
                label: `Concelho: ${filters.municipality}`,
                icon: <LocationOn />,
                color: 'info',
                onDelete: () => setFilter('municipality', null)
            });
        }

        if (filters.parish) {
            chips.push({
                key: 'parish',
                label: `Freguesia: ${filters.parish}`,
                icon: <LocationOn />,
                color: 'info',
                onDelete: () => setFilter('parish', null)
            });
        }

        if (filters.serviceType.length > 0) {
            chips.push({
                key: 'serviceType',
                label: `Tipos: ${filters.serviceType.join(', ')}`,
                icon: <Assignment />,
                color: 'default',
                onDelete: () => setFilter('serviceType', [])
            });
        }

        if (filters.dueThisWeek) {
            chips.push({
                key: 'dueThisWeek',
                label: 'Esta semana',
                icon: <Schedule />,
                color: 'primary',
                onDelete: () => setFilter('dueThisWeek', false)
            });
        }

        if (filters.overdue) {
            chips.push({
                key: 'overdue',
                label: 'Em atraso',
                icon: <Schedule />,
                color: 'error',
                onDelete: () => setFilter('overdue', false)
            });
        }

        if (filters.dateRange.start || filters.dateRange.end) {
            const startDate = filters.dateRange.start ?
                new Date(filters.dateRange.start).toLocaleDateString('pt-PT') : '';
            const endDate = filters.dateRange.end ?
                new Date(filters.dateRange.end).toLocaleDateString('pt-PT') : '';

            let dateLabel = 'Período: ';
            if (startDate && endDate) {
                dateLabel += `${startDate} - ${endDate}`;
            } else if (startDate) {
                dateLabel += `Desde ${startDate}`;
            } else if (endDate) {
                dateLabel += `Até ${endDate}`;
            }

            chips.push({
                key: 'dateRange',
                label: dateLabel,
                icon: <Schedule />,
                color: 'primary',
                onDelete: () => setFilter('dateRange', { start: null, end: null })
            });
        }

        return chips;
    };

    const activeChips = getActiveChips();
    const totalFilters = getActiveFiltersCount();

    if (totalFilters === 0) return null;

    return (
        <Box sx={{
            p: compact ? 1 : 1.5,
            bgcolor: 'grey.50',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200'
        }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Filtros activos ({totalFilters})
                </Typography>
                <Button
                    size="small"
                    startIcon={<Clear />}
                    onClick={clearFilters}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                >
                    Limpar todos
                </Button>
            </Box>

            <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ maxHeight: compact ? 60 : 120, overflow: 'auto' }}
            >
                {activeChips.map(chip => (
                    <Chip
                        key={chip.key}
                        icon={chip.icon}
                        label={chip.label}
                        onDelete={chip.onDelete}
                        color={chip.color}
                        size={compact ? "small" : "medium"}
                        variant="filled"
                        sx={{
                            mb: 0.5,
                            maxWidth: compact ? 150 : 200,
                            '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }
                        }}
                    />
                ))}
            </Stack>
        </Box>
    );
};

export default FilterChips;