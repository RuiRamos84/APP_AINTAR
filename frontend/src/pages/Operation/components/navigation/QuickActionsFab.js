// frontend/src/pages/Operation/components/navigation/QuickActionsFab.js
import React, { useState } from 'react';
import {
    Box, Fab, Menu, MenuItem, ListItemIcon, ListItemText,
    Divider, Badge, Chip, Slider, Typography
} from '@mui/material';
import {
    FilterList, MyLocation, Phone, CheckCircle,
    Schedule, Warning, Person, Today, Sort
} from '@mui/icons-material';

const QuickActionsFab = ({
    selectedItem,
    onNavigate,
    onCall,
    onComplete,
    onFilter,
    currentUserPk,
    // Novos props para filtros
    filters = {},
    onFilterChange = () => { },
    // Novo: raio personalizado
    radiusKm = 10,
    onRadiusChange = () => { }
}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const canComplete = selectedItem && Number(selectedItem.who) === currentUserPk;

    const handleFilterClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleFilterClose = () => {
        setAnchorEl(null);
    };

    const applyFilter = (filterType, value) => {
        onFilterChange(filterType, value);
        handleFilterClose();
    };

    const activeFiltersCount = Object.entries(filters).filter(([key, value]) =>
        key !== 'sortBy' && Boolean(value)
    ).length;

    return (
        <>
            <Box sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
            }}>
                {/* Filtros - sempre visível */}
                <Badge badgeContent={activeFiltersCount} color="primary">
                    <Fab
                        color="default"
                        size="medium"
                        onClick={handleFilterClick}
                        sx={{ boxShadow: 4 }}
                    >
                        <FilterList />
                    </Fab>
                </Badge>

                {selectedItem && (
                    <>
                        {/* Navegar */}
                        <Fab
                            color="secondary"
                            size="medium"
                            onClick={() => onNavigate(selectedItem)}
                            sx={{ boxShadow: 4 }}
                        >
                            <MyLocation />
                        </Fab>

                        {/* Ligar (se tem telefone) */}
                        {selectedItem.phone && (
                            <Fab
                                color="info"
                                size="medium"
                                onClick={() => onCall(selectedItem)}
                                sx={{ boxShadow: 4 }}
                            >
                                <Phone />
                            </Fab>
                        )}

                        {/* Concluir (se pode) */}
                        {canComplete && (
                            <Fab
                                color="success"
                                size="medium"
                                onClick={() => onComplete(selectedItem)}
                                sx={{ boxShadow: 4 }}
                            >
                                <CheckCircle />
                            </Fab>
                        )}
                    </>
                )}
            </Box>

            {/* Menu de Filtros */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleFilterClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                {/* Urgência */}
                <MenuItem onClick={() => applyFilter('urgency', !filters.urgency)}>
                    <ListItemIcon>
                        <Warning color={filters.urgency ? 'error' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText>
                        Só urgentes
                        {filters.urgency && <Chip size="small" label="ON" color="error" sx={{ ml: 1 }} />}
                    </ListItemText>
                </MenuItem>

                {/* Hoje */}
                <MenuItem onClick={() => applyFilter('today', !filters.today)}>
                    <ListItemIcon>
                        <Today color={filters.today ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText>
                        Só hoje
                        {filters.today && <Chip size="small" label="ON" color="primary" sx={{ ml: 1 }} />}
                    </ListItemText>
                </MenuItem>

                {/* Próximos de mim com raio ajustável */}
                <MenuItem onClick={() => applyFilter('nearby', !filters.nearby)}>
                    <ListItemIcon>
                        <MyLocation color={filters.nearby ? 'secondary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText>
                        Próximos de mim
                        {filters.nearby && <Chip size="small" label={`${radiusKm}km`} color="secondary" sx={{ ml: 1 }} />}
                    </ListItemText>
                </MenuItem>

                {/* Controlo do raio (só visível se filtro activo) */}
                {filters.nearby && (
                    <Box sx={{ px: 2, py: 1 }}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                            Raio: {radiusKm} km
                        </Typography>
                        <Slider
                            value={radiusKm}
                            onChange={(e, value) => onRadiusChange(value)}
                            min={5}
                            max={50}
                            step={5}
                            marks={[
                                { value: 5, label: '5km' },
                                { value: 25, label: '25km' },
                                { value: 50, label: '50km' }
                            ]}
                            size="small"
                        />
                    </Box>
                )}

                <Divider />

                {/* Ordenação */}
                <MenuItem onClick={() => applyFilter('sortBy', filters.sortBy === 'date' ? 'urgency' : 'date')}>
                    <ListItemIcon>
                        <Sort />
                    </ListItemIcon>
                    <ListItemText>
                        Ordenar por {filters.sortBy === 'date' ? 'urgência' : 'data'}
                    </ListItemText>
                </MenuItem>

                <Divider />

                {/* Limpar filtros */}
                {activeFiltersCount > 0 && (
                    <MenuItem onClick={() => onFilterChange('clear')}>
                        <ListItemText sx={{ color: 'error.main' }}>
                            Limpar filtros ({activeFiltersCount})
                        </ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
};

export default QuickActionsFab;