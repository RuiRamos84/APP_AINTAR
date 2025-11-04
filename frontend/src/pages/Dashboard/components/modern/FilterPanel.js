import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

/**
 * Painel de Filtros Avançados
 * Placeholder para futuras expansões
 */
const FilterPanel = ({ filters, onFilterChange }) => {
    return (
        <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6">Filtros Avançados</Typography>
            <Typography variant="body2" color="text.secondary">
                Em desenvolvimento...
            </Typography>
        </Paper>
    );
};

export default FilterPanel;
