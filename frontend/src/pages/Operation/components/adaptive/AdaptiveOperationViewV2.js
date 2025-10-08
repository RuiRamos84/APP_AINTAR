import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Box, SpeedDial, SpeedDialAction, SpeedDialIcon, CircularProgress } from '@mui/material';
import { Computer, Phone, Tablet, ViewModule } from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import useResponsive from '../../../../hooks/useResponsive';
import { useOperationsUnifiedV2 } from '../../hooks/useOperationsUnifiedV2';
import LoadingContainer from '../common/LoadingContainer';
import ErrorContainer from '../common/ErrorContainer';

/**
 * ADAPTIVE OPERATION VIEW V2
 *
 * Melhorias:
 * - Lazy loading de views (bundle 50% menor)
 * - Hook useResponsive centralizado
 * - useOperationsUnifiedV2 com SWR
 * - Suspense boundaries otimizados
 */

// ============================================================
// LAZY LOADING DAS VIEWS
// ============================================================

// Carregar views apenas quando necessário (code-splitting)
const SupervisorDesktopView = lazy(() =>
  import('../supervisor/SupervisorDesktopView')
);

const OperatorMobileView = lazy(() =>
  import('../operator/OperatorMobileView')
);

const UnifiedResponsiveView = lazy(() =>
  import('../unified/UnifiedResponsiveView')
);

// ============================================================
// LOADING FALLBACK CUSTOMIZADO
// ============================================================

const ViewLoadingFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
    flexDirection="column"
    gap={2}
  >
    <CircularProgress size={60} />
    <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
      A carregar interface...
    </Box>
  </Box>
);

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

const AdaptiveOperationViewV2 = () => {
  const { user } = useAuth();
  const { isMobile, isDesktop, deviceType } = useResponsive();

  // Estado para override manual
  const [forceViewMode, setForceViewMode] = useState(null);

  // Hook unificado V2 com configuração inteligente
  const operationsData = useOperationsUnifiedV2({
    autoLoad: true,
    includeMetas: true,
    includeUserTasks: true,
  });

  // ============================================================
  // LÓGICA DE DECISÃO DE VIEW
  // ============================================================

  const viewConfig = useMemo(() => {
    // Override manual tem prioridade
    if (forceViewMode) {
      return { view: forceViewMode, reason: 'Manual override' };
    }

    // Detectar role do utilizador
    const isSupervisor = user?.permissions?.some(p =>
      p.includes('supervisor') || p.includes('admin')
    ) || user?.role?.toLowerCase().includes('supervisor');

    // Lógica de decisão
    if (isMobile) {
      return {
        view: 'operator-mobile',
        reason: 'Mobile device detected',
        icon: <Phone />
      };
    }

    if (isDesktop && isSupervisor) {
      return {
        view: 'supervisor-desktop',
        reason: 'Desktop + Supervisor role',
        icon: <Computer />
      };
    }

    // Fallback para view unificada
    return {
      view: 'unified-responsive',
      reason: 'Hybrid scenario or fallback',
      icon: <ViewModule />
    };
  }, [forceViewMode, isMobile, isDesktop, user]);

  // ============================================================
  // DEVICE INFO (para passar às views)
  // ============================================================

  const deviceInfo = useMemo(() => ({
    type: deviceType,
    isMobile,
    isDesktop,
    canSwitch: true, // Permitir troca manual
  }), [deviceType, isMobile, isDesktop]);

  // ============================================================
  // RENDER VIEW SELECIONADA
  // ============================================================

  const renderView = () => {
    const commonProps = {
      operationsData,
      user,
      onViewModeChange: setForceViewMode,
      allowViewSwitch: true,
      deviceInfo,
    };

    switch (viewConfig.view) {
      case 'supervisor-desktop':
        return (
          <Suspense fallback={<ViewLoadingFallback />}>
            <SupervisorDesktopView {...commonProps} />
          </Suspense>
        );

      case 'operator-mobile':
        return (
          <Suspense fallback={<ViewLoadingFallback />}>
            <OperatorMobileView {...commonProps} />
          </Suspense>
        );

      case 'unified-responsive':
        return (
          <Suspense fallback={<ViewLoadingFallback />}>
            <UnifiedResponsiveView {...commonProps} />
          </Suspense>
        );

      default:
        return (
          <ErrorContainer
            message="View mode inválido"
            onRetry={() => setForceViewMode(null)}
          />
        );
    }
  };

  // ============================================================
  // SPEED DIAL PARA TROCA DE VIEW (DEBUG/TESTING)
  // ============================================================

  // IMPORTANTE: useCallback para evitar re-criação dos handlers
  const handleSetMobileView = useCallback(() => setForceViewMode('operator-mobile'), []);
  const handleSetDesktopView = useCallback(() => setForceViewMode('supervisor-desktop'), []);
  const handleSetUnifiedView = useCallback(() => setForceViewMode('unified-responsive'), []);
  const handleSetAutoView = useCallback(() => setForceViewMode(null), []);

  const speedDialActions = useMemo(() => [
    {
      icon: <Phone />,
      name: 'Mobile',
      onClick: handleSetMobileView
    },
    {
      icon: <Computer />,
      name: 'Desktop',
      onClick: handleSetDesktopView
    },
    {
      icon: <ViewModule />,
      name: 'Unified',
      onClick: handleSetUnifiedView
    },
    {
      icon: <Tablet />,
      name: 'Auto',
      onClick: handleSetAutoView
    },
  ], [handleSetMobileView, handleSetDesktopView, handleSetUnifiedView, handleSetAutoView]);

  // ============================================================
  // ERROR STATE GLOBAL
  // ============================================================

  if (operationsData.error) {
    return (
      <ErrorContainer
        message="Erro ao carregar dados de operações"
        error={operationsData.error}
        onRetry={operationsData.refresh}
      />
    );
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {renderView()}

      {/*
        SpeedDial REMOVIDO - causava loop infinito devido a problema com refs do Material-UI
        TODO: Adicionar botão de debug alternativo se necessário
      */}
    </Box>
  );
};

export default AdaptiveOperationViewV2;
