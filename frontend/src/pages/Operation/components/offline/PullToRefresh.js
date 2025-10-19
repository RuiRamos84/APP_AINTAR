import React from 'react';
import { Box } from '@mui/material';

/**
 * Componente wrapper simples para Pull to Refresh
 * Versão simplificada para o módulo legacy - apenas renderiza children
 */
const PullToRefresh = ({ children, onRefresh }) => {
    // Versão simplificada - apenas renderiza os children
    // Para funcionalidade completa de pull-to-refresh,
    // considere usar uma biblioteca como react-simple-pull-to-refresh

    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            {children}
        </Box>
    );
};

export default PullToRefresh;
