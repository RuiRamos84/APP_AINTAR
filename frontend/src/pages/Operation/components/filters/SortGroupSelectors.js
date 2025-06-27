// frontend/src/pages/Operation/components/filters/SortGroupSelectors.js - CORRIGIDO
import React from 'react';
import {
    Box, FormControl, InputLabel, Select, MenuItem,
    ToggleButtonGroup, ToggleButton, Typography, Divider
} from '@mui/material';
import {
    Sort, Group, Schedule, LocationOn, Person, Assignment,
    TrendingUp, TrendingDown, Phone, Business
} from '@mui/icons-material';
import useFiltersStore from '../../store/filtersStore';

const SortGroupSelectors = ({ compact = false }) => {
    const {
        sortBy,
        sortOrder,
        groupBy,
        setSortBy,
        setSortOrder,
        setGroupBy
    } = useFiltersStore();

    // OPÇÕES DE ORDENAÇÃO
    const sortOptions = [
        { value: 'urgency_date', label: 'Urgência + Data', icon: <Schedule /> },
        { value: 'date', label: 'Data Submissão', icon: <Schedule /> },
        { value: 'location', label: 'Localização', icon: <LocationOn /> },
        { value: 'assignee', label: 'Responsável', icon: <Person /> },
        { value: 'type', label: 'Tipo Serviço', icon: <Assignment /> },
        { value: 'entity', label: 'Requerente', icon: <Business /> },
        { value: 'phone', label: 'Contacto', icon: <Phone /> },
        { value: 'restdays', label: 'Dias Restantes', icon: <Schedule /> }
    ];

    // OPÇÕES DE AGRUPAMENTO
    const groupOptions = [
        { value: 'none', label: 'Sem Agrupamento' },
        { value: 'urgency', label: 'Por Urgência' },
        { value: 'assignee', label: 'Por Responsável' },
        { value: 'location', label: 'Por Localização' },
        { value: 'type', label: 'Por Tipo' },
        { value: 'date', label: 'Por Data' }
    ];

    const handleSortChange = (newSortBy) => {
        setSortBy(newSortBy);
    };

    const handleOrderChange = (event, newOrder) => {
        if (newOrder !== null) {
            setSortOrder(newOrder);
        }
    };

    // VERSÃO COMPACTA (para tablet/mobile)
    if (compact) {
        return (
            <Box display="flex" gap={1} alignItems="center">
                {/* Direcção */}
                <ToggleButtonGroup
                    value={sortOrder}
                    exclusive
                    onChange={handleOrderChange}
                    size="small"
                >
                    <ToggleButton value="asc" title="Ascendente">
                        <TrendingUp fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="desc" title="Descendente">
                        <TrendingDown fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                {/* Ordenar Por */}
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value)}
                        displayEmpty
                    >
                        {sortOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    {option.icon}
                                    <Typography variant="body2">
                                        {option.label}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Agrupar */}
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        displayEmpty
                    >
                        {groupOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                <Typography variant="body2">
                                    {option.label}
                                </Typography>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        );
    }

    // VERSÃO COMPLETA (para desktop)
    return (
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Sort color="primary" />
                <Typography variant="subtitle2">
                    Ordenação e Agrupamento
                </Typography>
            </Box>

            <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                {/* SECÇÃO ORDENAÇÃO */}
                <Box flex={1}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Ordenar por
                    </Typography>

                    <FormControl fullWidth margin="dense">
                        <InputLabel>Campo</InputLabel>
                        <Select
                            value={sortBy}
                            onChange={(e) => handleSortChange(e.target.value)}
                            label="Campo"
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
                        onChange={handleOrderChange}
                        size="small"
                        sx={{ mt: 1 }}
                        fullWidth
                    >
                        <ToggleButton value="asc">
                            <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />
                            Ascendente
                        </ToggleButton>
                        <ToggleButton value="desc">
                            <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />
                            Descendente
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ display: { xs: 'none', sm: 'block' } }}
                />

                {/* SECÇÃO AGRUPAMENTO */}
                <Box flex={1}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Agrupar dados
                    </Typography>

                    <FormControl fullWidth margin="dense">
                        <InputLabel>Agrupamento</InputLabel>
                        <Select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            label="Agrupamento"
                        >
                            {groupOptions.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Group fontSize="small" />
                                        {option.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            {/* INFO ACTUAL */}
            <Box sx={{ mt: 2, p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="caption" color="primary.main">
                    <strong>Activo:</strong> {' '}
                    {sortOptions.find(opt => opt.value === sortBy)?.label} ({sortOrder === 'asc' ? 'Ascendente' : 'Descendente'})
                    {groupBy !== 'none' && ` • ${groupOptions.find(opt => opt.value === groupBy)?.label}`}
                </Typography>
            </Box>
        </Box>
    );
};

export default SortGroupSelectors;