import React, { useState, useMemo } from 'react';
import { useMediaQuery, Box, SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';
import { Computer, Phone, Tablet, ViewModule } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';

// Views específicas
import SupervisorDesktopView from '../supervisor/SupervisorDesktopView';
import OperatorMobileView from '../operator/OperatorMobileView';
import UnifiedResponsiveView from '../unified/UnifiedResponsiveView';

// Hook unificado
import { useOperationsUnified } from '../../hooks/useOperationsUnified';

// Componente de loading global
import LoadingContainer from '../common/LoadingContainer';
import ErrorContainer from '../common/ErrorContainer';

/**
 * COMPONENTE ADAPTATIVO SIMPLIFICADO
 *
 * Características:
 * - Detecção automática inteligente
 * - Fallbacks robustos
 * - Override manual simples
 * - Estados de loading/error centralizados
 */
const AdaptiveOperationView = () => {
    const { user } = useAuth();

    // Detecção de dispositivo simplificada
    const isMobile = useMediaQuery('(max-width:768px)');
    const isTablet = useMediaQuery('(min-width:769px) and (max-width:1024px)');
    const isDesktop = useMediaQuery('(min-width:1025px)');

    // Estado para override manual
    const [forceViewMode, setForceViewMode] = useState(null);

    // Hook unificado com configuração baseada no contexto
    const operationsData = useOperationsUnified({
        autoLoad: true,
        includeMetas: true,
        includeAnalytics: false, // Disable para reduzir chamadas
        includeUserTasks: true,
        refreshInterval: 30 * 60 * 1000 // 30 minutos - muito mais conservador
    });

    // Lógica de decisão simplificada
    const viewConfig = useMemo(() => {
        // Override manual tem prioridade
        if (forceViewMode) {
            return { view: forceViewMode, reason: 'Manual override' };
        }

        // Detectar role do utilizador (simplificado)
        const isSupervisor = user?.permissions?.some(p => p.includes('supervisor')) ||
                            user?.role?.toLowerCase().includes('supervisor');

        // Lógica de decisão baseada em device + role
        if (isMobile) {
            return {
                view: 'operator-mobile',
                reason: 'Mobile device detected'
            };
        }

        if (isDesktop && isSupervisor) {
            return {
                view: 'supervisor-desktop',
                reason: 'Desktop + Supervisor role'
            };
        }

        // Fallback para view unificada
        return {
            view: 'unified-responsive',
            reason: 'Hybrid scenario or fallback'
        };
    }, [forceViewMode, isMobile, isDesktop, user]);

    // Estados de loading e erro centralizados
    if (operationsData.isLoading) {
        return (
            <LoadingContainer
                message="Carregando operações..."
                showProgress={true}
            />
        );
    }

    if (operationsData.hasError) {
        return (
            <ErrorContainer
                error={operationsData.error}
                onRetry={operationsData.refreshAll}
                onClear={operationsData.clearError}
            />
        );
    }

    // Props comuns para todas as views
    const commonProps = {
        operationsData,
        user,
        onViewModeChange: setForceViewMode,
        allowViewSwitch: true,
        deviceInfo: {
            isMobile,
            isTablet,
            isDesktop,
            viewConfig
        }
    };

    // Renderização condicional simplificada
    const renderView = () => {
        switch (viewConfig.view) {
            case 'operator-mobile':
                return <OperatorMobileView {...commonProps} />;

            case 'supervisor-desktop':
                return <SupervisorDesktopView {...commonProps} />;

            case 'unified-responsive':
            default:
                return <UnifiedResponsiveView {...commonProps} />;
        }
    };

    return (
        <Box sx={{ position: 'relative', height: '100vh' }}>
            {renderView()}

            {/* SpeedDial REMOVIDO - causava loop infinito */}
        </Box>
    );
};

export default AdaptiveOperationView;