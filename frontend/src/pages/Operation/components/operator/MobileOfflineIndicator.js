// components/operator/MobileOfflineIndicator.js
import React, { useState, useEffect } from 'react';
import { Box, Chip, Collapse, Alert, Button } from '@mui/material';
import { CloudOff, Cloud, Sync, WifiOff } from '@mui/icons-material';

const MobileOfflineIndicator = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showOfflineAlert, setShowOfflineAlert] = useState(false);
    const [pendingActions, setPendingActions] = useState(0);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowOfflineAlert(false);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowOfflineAlert(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Verificar ações pendentes no localStorage
        const checkPendingActions = () => {
            try {
                const pending = localStorage.getItem('pending_operations');
                if (pending) {
                    const actions = JSON.parse(pending);
                    setPendingActions(actions.length || 0);
                }
            } catch {
                setPendingActions(0);
            }
        };

        checkPendingActions();
        const interval = setInterval(checkPendingActions, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const handleSync = () => {
        // Aqui implementarias a lógica de sincronização
        console.log('Sincronizando ações pendentes...');
        setPendingActions(0);
        localStorage.removeItem('pending_operations');
    };

    if (isOnline && pendingActions === 0) {
        return null; // Não mostrar nada quando está online e sem pendências
    }

    return (
        <Box>
            {/* Indicador de estado */}
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 1, bgcolor: 'background.paper' }}>
                {!isOnline ? (
                    <Chip
                        icon={<WifiOff />}
                        label="Modo Offline"
                        color="warning"
                        variant="filled"
                        size="small"
                    />
                ) : pendingActions > 0 ? (
                    <Chip
                        icon={<Sync />}
                        label={`${pendingActions} ações para sincronizar`}
                        color="info"
                        variant="filled"
                        size="small"
                        onClick={handleSync}
                        clickable
                    />
                ) : (
                    <Chip
                        icon={<Cloud />}
                        label="Online"
                        color="success"
                        variant="outlined"
                        size="small"
                    />
                )}
            </Box>

            {/* Alert de modo offline */}
            <Collapse in={showOfflineAlert}>
                <Alert
                    severity="warning"
                    sx={{ mx: 2, mb: 1 }}
                    action={
                        pendingActions > 0 && isOnline ? (
                            <Button color="inherit" size="small" onClick={handleSync}>
                                Sincronizar
                            </Button>
                        ) : null
                    }
                >
                    {!isOnline
                        ? 'Você está offline. As ações serão sincronizadas quando a conexão for restabelecida.'
                        : `Você tem ${pendingActions} ações pendentes para sincronização.`
                    }
                </Alert>
            </Collapse>
        </Box>
    );
};

export default MobileOfflineIndicator;