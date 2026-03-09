import React, { lazy, Suspense } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMediaQuery, useTheme, Box, CircularProgress, Typography } from '@mui/material';
import { useUserRole } from '../hooks/useUserRole';
import OperationErrorBoundary from '../components/OperationErrorBoundary';
import ConnectionStatus from '../components/ConnectionStatus';

const OperatorMobilePage = lazy(() => import('./OperatorMobilePage'));
const OperatorTabletPage = lazy(() => import('./OperatorTabletPage'));
const SupervisorPage = lazy(() => import('./SupervisorPage'));
const SupervisorMobilePage = lazy(() => import('./SupervisorMobilePage'));

/**
 * Ponto de entrada adaptativo do módulo de operações.
 *
 * Seleciona a vista com base no dispositivo e permissões:
 * - Supervisor + Mobile     → SupervisorMobilePage
 * - Supervisor + Tablet/Desktop → SupervisorPage
 * - Operador + Phone (<sm)  → OperatorMobilePage
 * - Operador + Tablet/Desktop → OperatorTabletPage (touch-optimized 11")
 */
const OperationPage = () => {
    const { user } = useAuth();
    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

    const { canSupervise } = useUserRole(user);

    const renderView = () => {
        if (canSupervise()) {
            return isPhone ? <SupervisorMobilePage /> : <SupervisorPage />;
        }
        return isPhone ? <OperatorMobilePage /> : <OperatorTabletPage />;
    };

    return (
        <OperationErrorBoundary>
            <ConnectionStatus />
            <Suspense
                fallback={
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh">
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography color="text.secondary">A carregar operações...</Typography>
                    </Box>
                }
            >
                {renderView()}
            </Suspense>
        </OperationErrorBoundary>
    );
};

export default OperationPage;
