import React from 'react';
import { Box, Chip } from '@mui/material';
import { Wifi, WifiOff } from '@mui/icons-material';

/**
 * Componente simples de status de conexão
 * Versão simplificada para o módulo legacy
 */
const ConnectionStatus = ({ isOnline = true }) => {
    if (isOnline) {
        return null; // Não mostra nada quando online
    }

    return (
        <Box sx={{ position: 'fixed', top: 8, right: 8, zIndex: 9999 }}>
            <Chip
                icon={<WifiOff />}
                label="Modo Offline"
                color="warning"
                size="small"
                sx={{ fontWeight: 'bold' }}
            />
        </Box>
    );
};

export default ConnectionStatus;
