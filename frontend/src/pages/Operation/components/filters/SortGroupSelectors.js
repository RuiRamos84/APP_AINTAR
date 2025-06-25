// frontend/src/pages/Operation/components/filters/SortGroupSelectors.js
import React from 'react';
import {
    Box, FormControl, InputLabel, Select, MenuItem, 
    ToggleButtonGroup, ToggleButton, Typography, Divider
} from '@mui/material';
import {
    Sort, Group, Schedule, LocationOn, Person, Assignment,
    TrendingUp, TrendingDown
} from '@mui/icons-material';
import useFiltersStore from '../../store/filtersStore';

const SortGroupSelectors = ({ compact = false }) => {
    const { sortBy, sortOrder, groupBy, setSortBy, setGroupBy } = useFiltersStore();

    const sortOptions = [
        { value: 'urgency_date', label: 'Urgência + Data', icon: <Schedule /> },
        // { value: 'date_newest', label: 'Mais Recentes', icon: <TrendingDown /> },
        // { value: 'date_oldest', label: 'Mais Antigos', icon: <TrendingUp /> },
        { value: 'location', label: 'Localização', icon: <LocationOn /> },
        { value: 'assignee', label: 'Responsável', icon: <Person /> },
        { value: 'type', label: 'Tipo', icon: <Assignment /> }
    ];

    const groupOptions = [
        { value: 'none', label: 'Sem Agrupamento' },
        { value: 'urgency', label: 'Por Urgência' },
        { value: 'assignee', label: 'Por Responsável' },
        { value: 'location', label: 'Por Localização' },
        { value: 'type', label: 'Por Tipo' },
        { value: 'date', label: 'Por Data' }
    ];

    if (compact) {
        return (
            <Box display="flex" gap={1} alignItems="center">
                <ToggleButtonGroup
                    value={sortOrder}
                    exclusive
                    onChange={(e, value) => value && setSortBy(sortBy, value)}
                    size="small"
                >
                    <ToggleButton value="desc" title="Descendente">
                        <TrendingDown fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="asc" title="Ascendente">
                        <TrendingUp fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value, sortOrder)}
                        displayEmpty
                    >
                        {sortOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    {option.icon}
                                    {option.label}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        displayEmpty
                    >
                        {groupOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Sort color="primary" />
                <Typography variant="subtitle2">Ordenação e Agrupamento</Typography>
            </Box>

            <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                {/* Ordenação */}
                <Box flex={1}>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Ordenar por</InputLabel>
                        <Select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value, sortOrder)}
                            label="Ordenar por"
                        >
                            {sortOptions.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        {option.icon}
                                        {option.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <ToggleButtonGroup
                        value={sortOrder}
                        exclusive
                        onChange={(e, value) => value && setSortBy(sortBy, value)}
                        size="small"
                        sx={{ mt: 1 }}
                    >
                        <ToggleButton value="desc">
                            <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />
                            Descendente
                        </ToggleButton>
                        <ToggleButton value="asc">
                            <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />
                            Ascendente
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

                {/* Agrupamento */}
                <Box flex={1}>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Agrupar por</InputLabel>
                        <Select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            label="Agrupar por"
                        >
                            {groupOptions.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        {option.icon && <option.icon fontSize="small" />}
                                        {option.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>
        </Box>
    );
};

export default SortGroupSelectors;