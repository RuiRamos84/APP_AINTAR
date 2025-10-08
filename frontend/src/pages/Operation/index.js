/**
 * MÓDULO DE OPERAÇÕES - PONTO DE ENTRADA ÚNICO
 *
 * Este componente é o ponto de entrada unificado para o módulo de operações.
 * Renderiza a vista apropriada baseado em:
 * - Dispositivo (mobile/tablet/desktop)
 * - Permissões do utilizador (311, 312, 313)
 * - Role (operator/supervisor/manager)
 *
 * Arquitectura Mobile-First:
 * - MOBILE → OperatorMobileView (fullscreen, touch-optimized)
 * - TABLET/DESKTOP + Supervisor → SupervisorDesktopView
 * - TABLET/DESKTOP + Operator → UnifiedResponsiveView
 */

import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMediaQuery, useTheme, Box } from '@mui/material';
import { useUserRole } from './hooks/useUserRole';
import { useOperationsUnifiedV2 } from './hooks/useOperationsUnifiedV2';
import LoadingContainer from './components/common/LoadingContainer';
import ErrorContainer from './components/common/ErrorContainer';
import MESSAGES from './constants/messages';

// Lazy load das views para otimizar performance
const OperatorMobileView = lazy(() => import('./components/operator/OperatorMobileView'));
const OperatorDesktopView = lazy(() => import('./components/operator/OperatorDesktopView'));
const SupervisorDesktopView = lazy(() => import('./components/supervisor/SupervisorDesktopView'));
const UnifiedResponsiveView = lazy(() => import('./components/unified/UnifiedResponsiveView'));

/**
 * Error Boundary para capturar erros no módulo
 */
class OperationErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('❌ Erro no módulo de operações:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <ErrorContainer
                    error={this.state.error}
                    message={MESSAGES.ERROR.GENERIC}
                    onRetry={() => window.location.reload()}
                    variant="card"
                    fullHeight
                />
            );
        }

        return this.props.children;
    }
}

/**
 * Componente principal de operações
 */
const AdaptiveOperation = () => {
    const { user } = useAuth();
    const theme = useTheme();

    // Detecção de dispositivo
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    // Detecção de role e permissões
    const {
        userRole,
        isSupervisor,
        isOperator,
        isManager,
        canSupervise,
        canExecute,
        hasPermission
    } = useUserRole(user);

    // Fetch de dados de operações (apenas para views que precisam - Supervisor e Unified)
    // OperatorMobileView busca seus próprios dados internamente
    const operationsData = useOperationsUnifiedV2({
        autoLoad: !isMobile, // Mobile não precisa carregar aqui
        includeMetas: true,
        includeUserTasks: !isMobile, // Mobile carrega internamente
        includeAnalytics: canSupervise() || isManager
    });

    /**
     * Lógica de decisão de view
     * Prioridade:
     * 1. Mobile → Sempre OperatorMobileView (busca dados internamente)
     * 2. Desktop/Tablet + Supervisor → SupervisorDesktopView (usa operationsData)
     * 3. Desktop/Tablet + Operator → UnifiedResponsiveView (usa operationsData)
     */
    const renderView = () => {
        // Device info comum
        const deviceInfo = {
            isMobile,
            isTablet,
            isDesktop
        };

        // MOBILE: Vista de operador mobile (busca seus próprios dados)
        if (isMobile) {
            return (
                <OperatorMobileView
                    user={user}
                    deviceInfo={deviceInfo}
                />
            );
        }

        // DESKTOP/TABLET: Vista baseada em permissões
        if (isDesktop || isTablet) {
            // Supervisor ou Manager → Vista de supervisão
            if (canSupervise()) {
                return (
                    <SupervisorDesktopView
                        operationsData={operationsData}
                        user={user}
                        deviceInfo={deviceInfo}
                    />
                );
            }

            // Operator → Vista simplificada de operador desktop
            if (canExecute()) {
                return (
                    <OperatorDesktopView
                        user={user}
                        deviceInfo={deviceInfo}
                    />
                );
            }
        }

        // Fallback: Vista de operador desktop
        return (
            <OperatorDesktopView
                user={user}
                deviceInfo={deviceInfo}
            />
        );
    };

    return (
        <OperationErrorBoundary>
            <Suspense
                fallback={
                    <LoadingContainer
                        message={MESSAGES.LOADING.UNIFIED_VIEW}
                        fullHeight
                    />
                }
            >
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        bgcolor: theme.palette.background.default
                    }}
                >
                    {renderView()}
                </Box>
            </Suspense>
        </OperationErrorBoundary>
    );
};

export default AdaptiveOperation;
