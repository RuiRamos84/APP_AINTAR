// components/offline/ConnectionStatus.js
import React from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { CloudOff, Sync } from '@mui/icons-material';

const ConnectionStatus = ({ isOnline, pendingActions = [], onSync, isSyncing = false }) => {
    if (isOnline && !pendingActions.length) return null;

    const status = isOnline ? 'warning' : 'error';
    const message = isOnline
        ? `${pendingActions.length} acções pendentes`
        : 'Offline';

    return (
        <Box sx={{
            position: 'sticky',
            top: 0,
            bgcolor: `${status}.main`,
            color: 'white',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            zIndex: 100
        }}>
            <CloudOff fontSize="small" />
            <Typography variant="body2">{message}</Typography>

            {isOnline && pendingActions.length > 0 && (
                <Button
                    size="small"
                    variant="outlined"
                    sx={{ ml: 2, color: 'inherit', borderColor: 'inherit' }}
                    onClick={onSync}
                    disabled={isSyncing}
                    startIcon={<Sync />}
                >
                    {isSyncing ? 'A sincronizar...' : 'Sincronizar'}
                </Button>
            )}

            {pendingActions.length > 0 && (
                <Box sx={{ ml: 2 }}>
                    {pendingActions.slice(0, 2).map((action, i) => (
                        <Chip
                            key={action.id}
                            size="small"
                            label={action.type}
                            sx={{ mr: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default ConnectionStatus;