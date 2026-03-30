/**
 * PavimentosPage
 * Gestão e acompanhamento de pavimentações em 3 estados:
 *   Pendentes → Executadas → Concluídas
 */

import { useState } from 'react';
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

import { usePavimentos } from '../hooks/usePavimentos';
import {
  PavimentosStats,
  PavimentosList,
  ConfirmActionDialog,
} from '../components';

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
  const canManage = hasPermission('pav.edit');

  const [tab, setTab] = useState(0);

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
        canManage={canManage}
        actionLoading={current.actionLoading}
        onAction={handleAction}
      />

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
