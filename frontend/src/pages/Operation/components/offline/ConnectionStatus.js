// frontend/src/pages/Operation/components/offline/ConnectionStatus.js
import React from 'react';
import { Box, Typography, Button, IconButton, Chip } from '@mui/material';
import { CloudOff, Sync, Close, CheckCircle } from '@mui/icons-material';

const ConnectionStatus = ({
    isOnline,
    pendingActions = [],
    onSync,
    onDiscard,
    isSyncing = false
}) => {
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

            {/* Acções só quando online e há pendentes */}
            {isOnline && pendingActions.length > 0 && (
                <>
                    <Button
                        size="small"
                        variant="outlined"
                        sx={{ ml: 2, color: 'inherit', borderColor: 'inherit' }}
                        onClick={onSync}
                        disabled={isSyncing}
                        startIcon={isSyncing ? <Sync className="spinning" /> : <CheckCircle />}
                    >
                        {isSyncing ? 'A sincronizar...' : 'Sincronizar'}
                    </Button>

                    <IconButton
                        size="small"
                        sx={{ color: 'inherit' }}
                        onClick={onDiscard}
                        disabled={isSyncing}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </>
            )}

            {/* Detalhe das acções pendentes */}
            {pendingActions.length > 0 && (
                <Box sx={{ ml: 2 }}>
                    {pendingActions.slice(0, 3).map((action, i) => (
                        <Chip
                            key={action.id}
                            size="small"
                            label={action.type}
                            sx={{
                                mr: 0.5,
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: 'inherit'
                            }}
                        />
                    ))}
                    {pendingActions.length > 3 && (
                        <Typography variant="caption">
                            +{pendingActions.length - 3} mais
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default ConnectionStatus;