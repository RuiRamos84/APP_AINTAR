// frontend/src/pages/Operation/components/filters/AdvancedFilterPanel.js
import React, { useState } from 'react';
import {
    Drawer, Box, Typography, Divider, Button, Chip, Stack,
    FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
    TextField, Autocomplete, Grid, IconButton, Collapse
} from '@mui/material';
import {
    Close, Clear, FilterList, ExpandMore, ExpandLess,
    Today, Schedule, Warning, Person, Phone, LocationOn
} from '@mui/icons-material';
import useFiltersStore from '../../store/filtersStore';

const AdvancedFilterPanel = ({
    open,
    onClose,
    associates = [],
    users = [],
    serviceTypes = [],
    locations = { districts: [], municipalities: [], parishes: [] }
}) => {
    const {
        filters,
        activePreset,
        setFilter,
        clearFilters,
        applyPreset,
        getActiveFiltersCount
    } = useFiltersStore();

    const [sections, setSections] = useState({
        basic: true,
        temporal: false,
        geographic: false,
        operational: false
    });

    const toggleSection = (section) => {
        setSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const presets = [
        { id: 'urgent_today', label: 'Urgentes Hoje', icon: <Warning />, color: 'error' },
        { id: 'my_tasks', label: 'Meus Pedidos', icon: <Person />, color: 'primary' },
        { id: 'overdue', label: 'Em Atraso', icon: <Schedule />, color: 'warning' },
        { id: 'no_phone', label: 'Sem Contacto', icon: <Phone />, color: 'secondary' },
        { id: 'this_week', label: 'Esta Semana', icon: <Today />, color: 'info' }
    ];

    const getPresetColor = (presetId) => {
        return activePreset === presetId ? 'primary' : 'default';
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { width: { xs: '100%', sm: 400, md: 450 }, p: 0 }
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <Box sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <FilterList color="primary" />
                        <Typography variant="h6">Filtros Avançados</Typography>
                        {getActiveFiltersCount() > 0 && (
                            <Chip
                                size="small"
                                label={getActiveFiltersCount()}
                                color="primary"
                            />
                        )}
                    </Box>
                    <IconButton onClick={onClose}>
                        <Close />
                    </IconButton>
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {/* Presets */}
                    <Box mb={3}>
                        <Typography variant="subtitle2" gutterBottom>
                            Filtros Rápidos
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {presets.map(preset => (
                                <Chip
                                    key={preset.id}
                                    icon={preset.icon}
                                    label={preset.label}
                                    onClick={() => applyPreset(preset.id)}
                                    color={getPresetColor(preset.id)}
                                    variant={activePreset === preset.id ? 'filled' : 'outlined'}
                                    sx={{ mb: 1 }}
                                />
                            ))}
                        </Stack>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* Filtros Básicos */}
                    <Box mb={2}>
                        <Box
                            display="flex"
                            alignItems="center"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => toggleSection('basic')}
                        >
                            <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                Filtros Básicos
                            </Typography>
                            {sections.basic ? <ExpandLess /> : <ExpandMore />}
                        </Box>

                        <Collapse in={sections.basic}>
                            <Box sx={{ mt: 2, space: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={filters.urgency}
                                            onChange={(e) => setFilter('urgency', e.target.checked)}
                                        />
                                    }
                                    label="Apenas urgentes"
                                />

                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Estado</InputLabel>
                                    <Select
                                        multiple
                                        value={filters.status}
                                        onChange={(e) => setFilter('status', e.target.value)}
                                        renderValue={(selected) => (
                                            <Stack direction="row" spacing={0.5}>
                                                {selected.map(value => (
                                                    <Chip key={value} size="small" label={value} />
                                                ))}
                                            </Stack>
                                        )}
                                    >
                                        <MenuItem value="pending">Pendente</MenuItem>
                                        <MenuItem value="in_progress">Em Progresso</MenuItem>
                                        <MenuItem value="completed">Concluído</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Tem Contacto</InputLabel>
                                    <Select
                                        value={filters.hasPhone ?? ''}
                                        onChange={(e) => setFilter('hasPhone', e.target.value === '' ? null : e.target.value)}
                                    >
                                        <MenuItem value="">Todos</MenuItem>
                                        <MenuItem value={true}>Apenas com contacto</MenuItem>
                                        <MenuItem value={false}>Apenas sem contacto</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </Collapse>
                    </Box>

                    {/* Filtros Temporais */}
                    <Box mb={2}>
                        <Box
                            display="flex"
                            alignItems="center"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => toggleSection('temporal')}
                        >
                            <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                Filtros Temporais
                            </Typography>
                            {sections.temporal ? <ExpandLess /> : <ExpandMore />}
                        </Box>

                        <Collapse in={sections.temporal}>
                            <Box sx={{ mt: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={filters.createdToday}
                                            onChange={(e) => setFilter('createdToday', e.target.checked)}
                                        />
                                    }
                                    label="Criados hoje"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={filters.dueThisWeek}
                                            onChange={(e) => setFilter('dueThisWeek', e.target.checked)}
                                        />
                                    }
                                    label="Vencimento esta semana"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={filters.overdue}
                                            onChange={(e) => setFilter('overdue', e.target.checked)}
                                        />
                                    }
                                    label="Em atraso"
                                />

                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                    <Grid item xs={6}>
                                        <TextField
                                            type="date"
                                            label="Data início"
                                            value={filters.dateRange.start?.toISOString()?.split('T')[0] || ''}
                                            onChange={(e) => setFilter('dateRange', {
                                                ...filters.dateRange,
                                                start: e.target.value ? new Date(e.target.value) : null
                                            })}
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            type="date"
                                            label="Data fim"
                                            value={filters.dateRange.end?.toISOString()?.split('T')[0] || ''}
                                            onChange={(e) => setFilter('dateRange', {
                                                ...filters.dateRange,
                                                end: e.target.value ? new Date(e.target.value) : null
                                            })}
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        </Collapse>
                    </Box>

                    {/* Filtros Geográficos */}
                    <Box mb={2}>
                        <Box
                            display="flex"
                            alignItems="center"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => toggleSection('geographic')}
                        >
                            <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                Filtros Geográficos
                            </Typography>
                            {sections.geographic ? <ExpandLess /> : <ExpandMore />}
                        </Box>

                        <Collapse in={sections.geographic}>
                            <Box sx={{ mt: 2 }}>
                                <Autocomplete
                                    options={locations.districts}
                                    value={filters.district}
                                    onChange={(e, value) => setFilter('district', value)}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Distrito" margin="normal" fullWidth />
                                    )}
                                />

                                <Autocomplete
                                    options={locations.municipalities}
                                    value={filters.municipality}
                                    onChange={(e, value) => setFilter('municipality', value)}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Concelho" margin="normal" fullWidth />
                                    )}
                                />

                                <Autocomplete
                                    options={locations.parishes}
                                    value={filters.parish}
                                    onChange={(e, value) => setFilter('parish', value)}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Freguesia" margin="normal" fullWidth />
                                    )}
                                />
                            </Box>
                        </Collapse>
                    </Box>

                    {/* Filtros Operacionais */}
                    <Box mb={2}>
                        <Box
                            display="flex"
                            alignItems="center"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => toggleSection('operational')}
                        >
                            <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                Filtros Operacionais
                            </Typography>
                            {sections.operational ? <ExpandLess /> : <ExpandMore />}
                        </Box>

                        <Collapse in={sections.operational}>
                            <Box sx={{ mt: 2 }}>
                                <Autocomplete
                                    multiple
                                    options={users}
                                    getOptionLabel={(option) => option.name}
                                    value={users.filter(u => filters.assignedTo.includes(u.pk))}
                                    onChange={(e, values) => setFilter('assignedTo', values.map(v => v.pk))}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Atribuído a" margin="normal" fullWidth />
                                    )}
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip
                                                variant="outlined"
                                                label={option.name}
                                                size="small"
                                                {...getTagProps({ index })}
                                            />
                                        ))
                                    }
                                />

                                <Autocomplete
                                    multiple
                                    options={serviceTypes}
                                    value={filters.serviceType}
                                    onChange={(e, values) => setFilter('serviceType', values)}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Tipo de Serviço" margin="normal" fullWidth />
                                    )}
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip
                                                variant="outlined"
                                                label={option}
                                                size="small"
                                                {...getTagProps({ index })}
                                            />
                                        ))
                                    }
                                />
                            </Box>
                        </Collapse>
                    </Box>
                </Box>

                {/* Footer */}
                <Box sx={{
                    p: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    gap: 2
                }}>
                    <Button
                        variant="outlined"
                        startIcon={<Clear />}
                        onClick={clearFilters}
                        disabled={getActiveFiltersCount() === 0}
                        fullWidth
                    >
                        Limpar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={onClose}
                        fullWidth
                    >
                        Aplicar ({getActiveFiltersCount()})
                    </Button>
                </Box>
            </Box>
        </Drawer>
    );
};

export default AdvancedFilterPanel;