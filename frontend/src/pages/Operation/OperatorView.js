import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMediaQuery, useTheme } from '@mui/material';
import LoadingContainer from './components/common/LoadingContainer';
import MESSAGES from './constants/messages';

// Lazy load das views
const OperatorMobileView = lazy(() => import('./components/operator/OperatorMobileView'));
const OperatorDesktopView = lazy(() => import('./components/operator/OperatorDesktopView'));

/**
 * VISTA DE OPERADOR
 *
 * Rota: /operation
 * Mobile: Interface vertical simplificada
 * Desktop: Interface com grid de tarefas
 */
const OperatorView = () => {
    const { user } = useAuth();
    const theme = useTheme();

    // Detecção de dispositivo
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    const deviceInfo = { isMobile, isTablet, isDesktop };

    return (
        <Suspense fallback={<LoadingContainer message={MESSAGES.LOADING.OPERATIONS} fullHeight />}>
            {isMobile ? (
                <OperatorMobileView user={user} deviceInfo={deviceInfo} />
            ) : (
                <OperatorDesktopView user={user} deviceInfo={deviceInfo} />
            )}
        </Suspense>
    );
};

export default OperatorView;
