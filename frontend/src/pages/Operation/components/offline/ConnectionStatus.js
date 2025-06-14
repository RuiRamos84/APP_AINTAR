import React from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { CloudOff, Close } from '@mui/icons-material';

const ConnectionStatus = ({ isOnline, pendingActions = [], onSync, onDiscard }) => {
    if (isOnline && !pendingActions.length) return null;

    return (
        <Box
            sx={{
                position: 'sticky',
                top: 0,
                bgcolor: isOnline ? 'warning.main' : 'error.main',
                color: 'white',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                zIndex: 100
            }}
        >
            <CloudOff fontSize="small" />
            <Typography variant="body2">
                {isOnline ? `${pendingActions.length} pendentes` : "Offline"}
            </Typography>

            {isOnline && pendingActions.length > 0 && (
                <>
                    <Button
                        size="small"
                        variant="outlined"
                        sx={{ ml: 2, color: 'inherit', borderColor: 'inherit' }}
                        onClick={onSync}
                    >
                        Sincronizar
                    </Button>
                    <IconButton size="small" sx={{ color: 'inherit' }} onClick={onDiscard}>
                        <Close fontSize="small" />
                    </IconButton>
                </>
            )}
        </Box>
    );
};

export default ConnectionStatus;