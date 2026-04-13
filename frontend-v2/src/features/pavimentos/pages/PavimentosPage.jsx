/**
 * PavimentosPage
 * Gestão e acompanhamento de pavimentações em 3 estados:
 *   Pendentes → Executadas → Concluídas
 */

import { useState, lazy, Suspense } from 'react';
import { Box, Tab, Tabs, Badge } from '@mui/material';
import {
  Straighten as StraightenIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { SearchBar } from '@/shared/components/data';

import ModulePage from '@/shared/components/layout/ModulePage';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { useAuth } from '@/core/contexts/AuthContext';

import { usePavimentos } from '../hooks/usePavimentos';
import {
  PavimentosStats,
  PavimentosList,
  ConfirmActionDialog,
} from '../components';

const DocumentDetailsModal = lazy(() =>
  import('../../documents/components/details/DocumentDetailsModal')
);

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  {
    index:  0,
    status: 'pending',
    label:  'Pendentes',
    icon:   HourglassEmptyIcon,
    color:  'warning',
  },
  {
    index:  1,
    status: 'executed',
    label:  'Executadas',
    icon:   BuildIcon,
    color:  'info',
  },
  {
    index:  2,
    status: 'completed',
    label:  'Concluídas',
    icon:   CheckCircleIcon,
    color:  'success',
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PavimentosPage() {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const profil = Number(user?.profil ?? -1);

  // Executar (pendente → executada): admin (0) + municípios (2,3,4,5)
  const canExecute = profil === 0 || profil >= 2;
  // Marcar como paga (executada → concluída): apenas AINTAR interno (1) + admin (0)
  const canPay = profil === 0 || profil === 1;

  const [tab, setTab] = useState(0);

  // Document details modal — abrimos imediatamente com os dados do pav que já temos
  const [selectedPav, setSelectedPav] = useState(null);

  const handleViewDocument = (regnumber, pav) => {
    console.log('[PavimentosPage] handleViewDocument →', { regnumber, pav });
    setSelectedPav(pav ?? { pk: null, regnumber });
  };
  const handleCloseDocument = () => setSelectedPav(null);

  // Dialog state
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [dialogAcao,  setDialogAcao]  = useState(null); // 'execute' | 'pay'
  const [dialogPav,   setDialogPav]   = useState(null);

  // Um hook por tab — todos fazem fetch em paralelo
  const pendingData   = usePavimentos('pending');
  const executedData  = usePavimentos('executed');
  const completedData = usePavimentos('completed');

  const tabData = [pendingData, executedData, completedData];
  const current = tabData[tab];

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleTabChange = (_, newTab) => {
    setTab(newTab);
  };

  const handleAction = (pk, acao, pav) => {
    setDialogPav(pav);
    setDialogAcao(acao);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    if (current.actionLoading) return;
    setDialogOpen(false);
    setDialogAcao(null);
    setDialogPav(null);
  };

  const handleDialogConfirm = async (anexos) => {
    if (!dialogPav || !dialogAcao) return;
    await current.executarAcao(dialogPav.pk, dialogAcao, anexos);
    setDialogOpen(false);
    setDialogAcao(null);
    setDialogPav(null);
  };

  // ─── Actions (barra de pesquisa no cabeçalho) ────────────────────────────────

  const actions = (
    <SearchBar
      searchTerm={current.search}
      onSearch={(val) => current.setSearch(val)}
    />
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <ModulePage
      title="Pavimentações"
      subtitle="Gestão e acompanhamento de pavimentações"
      icon={StraightenIcon}
      color="#2196f3"
      breadcrumbs={[{ label: 'Pavimentações' }]}
      actions={actions}
    >
      {/* Tabs de estado */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map(({ index, status, label, icon: Icon, color }) => {
            const count = tabData[index].stats.total;
            return (
              <Tab
                key={status}
                icon={<Icon fontSize="small" />}
                iconPosition="start"
                label={
                  <Badge
                    badgeContent={count}
                    color={color}
                    max={999}
                    sx={{ '& .MuiBadge-badge': { right: -12, top: -4 } }}
                  >
                    {label}
                  </Badge>
                }
                sx={{
                  textTransform: 'none',
                  fontWeight: tab === index ? 700 : 400,
                  minHeight: 48,
                  pr: count > 0 ? 3 : 1,
                }}
              />
            );
          })}
        </Tabs>
      </Box>

      {/* Conteúdo da tab activa */}
      <PavimentosStats stats={current.stats} status={TABS[tab].status} />

      <PavimentosList
        pavimentos={current.pavimentos}
        loading={current.loading}
        status={TABS[tab].status}
        canExecute={canExecute}
        canPay={canPay}
        actionLoading={current.actionLoading}
        onAction={handleAction}
        onViewDocument={handleViewDocument}
      />

      {/* Modal detalhes do pedido — abre imediatamente com dados do pav */}
      <Suspense fallback={null}>
        {selectedPav && (
          <DocumentDetailsModal
            open={!!selectedPav}
            onClose={handleCloseDocument}
            documentData={{ pk: selectedPav.pk, regnumber: selectedPav.regnumber }}
          />
        )}
      </Suspense>

      {/* Dialog de confirmação */}
      <ConfirmActionDialog
        open={dialogOpen}
        acao={dialogAcao}
        pav={dialogPav}
        onClose={handleDialogClose}
        onConfirm={handleDialogConfirm}
        loading={current.actionLoading === dialogPav?.pk}
      />
    </ModulePage>
  );
}
