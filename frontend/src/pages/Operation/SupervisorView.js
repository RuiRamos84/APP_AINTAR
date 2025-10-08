import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMediaQuery, useTheme } from '@mui/material';
import LoadingContainer from './components/common/LoadingContainer';

// Lazy load das views
const SupervisorMobileView = lazy(() => import('./components/supervisor/SupervisorMobileView'));
const SupervisorDesktopView = lazy(() => import('./components/supervisor/SupervisorDesktopView'));

/**
 * VISTA DE SUPERVISOR
 *
 * Rota: /operation/control
 * Mobile: Interface simplificada para supervisão
 * Desktop: Dashboard completo com analytics
 */
const SupervisorView = () => {
    const { user } = useAuth();
    const theme = useTheme();

    // Detecção de dispositivo
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    const deviceInfo = { isMobile, isTablet, isDesktop };

    return (
        <Suspense fallback={<LoadingContainer message="A carregar supervisão..." fullHeight />}>
            {isMobile ? (
                <SupervisorMobileView user={user} deviceInfo={deviceInfo} />
            ) : (
                <SupervisorDesktopView user={user} deviceInfo={deviceInfo} />
            )}
        </Suspense>
    );
};

export default SupervisorView;
