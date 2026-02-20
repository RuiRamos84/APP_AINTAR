import React, { lazy, Suspense } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMediaQuery, useTheme, Box, CircularProgress, Typography } from '@mui/material';
import { useUserRole } from '../hooks/useUserRole';

const TasksPage = lazy(() => import('./TasksPage'));
const OperatorMobilePage = lazy(() => import('./OperatorMobilePage'));
const SupervisorPage = lazy(() => import('./SupervisorPage'));
const SupervisorMobilePage = lazy(() => import('./SupervisorMobilePage'));

/**
 * Ponto de entrada adaptativo do módulo de operações.
 *
 * Seleciona a vista com base no dispositivo e permissões:
 * - Mobile → OperatorMobilePage (touch-optimized, tarefas do dia)
 * - Desktop + Supervisor/Manager → SupervisorPage (Fase 2)
 * - Desktop + Operator → TasksPage (desktop com accordion por instalação)
 */
const OperationPage = () => {
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const {
        canSupervise,
        canExecute,
    } = useUserRole(user);

    const renderView = () => {
        // Supervisor/Manager
        if (canSupervise()) {
            return isMobile ? <SupervisorMobilePage /> : <SupervisorPage />;
        }

        // Operador
        return isMobile ? <OperatorMobilePage /> : <TasksPage />;
    };

    return (
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
    );
};

export default OperationPage;
