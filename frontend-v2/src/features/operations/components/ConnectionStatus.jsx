import React, { useEffect, useRef, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { WifiOff, Wifi } from '@mui/icons-material';
import { useOffline } from '../hooks/useOffline';

/**
 * ConnectionStatus
 *
 * Exibe um Snackbar automático quando o utilizador fica offline ou volta online.
 * - Offline → persiste até voltar online
 * - Online  → auto-fecha em 3s (só se houve uma transição offline anterior)
 */
const ConnectionStatus = () => {
    const { isOnline } = useOffline();
    const isOffline = !isOnline;
    const wasOfflineRef = useRef(false);
    const [showOnline, setShowOnline] = useState(false);

    useEffect(() => {
        if (isOffline) {
            wasOfflineRef.current = true;
            setShowOnline(false);
        } else if (wasOfflineRef.current) {
            // voltou online depois de ter estado offline
            setShowOnline(true);
            const timer = setTimeout(() => setShowOnline(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOffline]);

    return (
        <>
            {/* Aviso persistente enquanto offline */}
            <Snackbar
                open={isOffline}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity="error"
                    icon={<WifiOff fontSize="inherit" />}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    Sem ligação à internet — a trabalhar em modo offline
                </Alert>
            </Snackbar>

            {/* Confirmação ao voltar online */}
            <Snackbar
                open={showOnline}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                onClose={() => setShowOnline(false)}
                autoHideDuration={3000}
            >
                <Alert
                    severity="success"
                    icon={<Wifi fontSize="inherit" />}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    Ligação restabelecida
                </Alert>
            </Snackbar>
        </>
    );
};

export default ConnectionStatus;
