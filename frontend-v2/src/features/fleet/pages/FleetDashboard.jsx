import React, { useMemo, useState } from 'react';
import { Box, Tabs, Tab, Chip, Badge, Stack, Button } from '@mui/material';
import { DirectionsCar as CarIcon, Add as AddIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { useReservations } from '../hooks/useReservations';
import { useMyVehicle } from '../hooks/useMyVehicle';
import { useMaintenances } from '../hooks/useMaintenances';
import VehicleList from './VehicleList.jsx';
import AssignmentsList from './AssignmentsList.jsx';
import MaintenanceList from './MaintenanceList.jsx';
import ReservationsList from './ReservationsList.jsx';
import MyVehicleTab from '../components/MyVehicleTab.jsx';

function TabPanel({ children, activeKey, panelKey }) {
  return (
    <div
      role="tabpanel"
      hidden={activeKey !== panelKey}
      id={`fleet-tabpanel-${panelKey}`}
      aria-labelledby={`fleet-tab-${panelKey}`}
    >
      {activeKey === panelKey && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const FleetDashboard = () => {
  const theme = useTheme();
  const { hasPermission } = usePermissions();
  const canManageFleet = hasPermission('fleet.view');
  const canViewReservations = hasPermission('fleet.reservations.view');
  const canViewMyVehicle = hasPermission('fleet.myvehicle.view');

  const [requestedTab, setRequestedTab] = useState(null);

  // Estado da tab "Reservas" fica aqui para poder partilhar a mesma linha dos tabs
  // (contador ao centro, pesquisa + botão à direita) — ver ReservationsList.jsx
  const { reservations } = useReservations();
  const [reservationSearch, setReservationSearch] = useState('');
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);

  // "A Minha Viatura" só aparece como tab a quem tem a permissão E tem mesmo
  // uma viatura atual (reserva em curso ou atribuição) — sem isso, não há nada
  // para mostrar. hasPermission já dá bypass total a profil=0 (admin).
  const { vehicle: myVehicle } = useMyVehicle();
  const hasMyVehicle = Boolean(myVehicle);

  // Contador de avarias/manutenções pendentes (estado != Resolvida) para o
  // "responsável" (fleet.edit) ver de imediato, sem abrir a tab, que há algo
  // por tratar — só pedido se a tab sequer estiver disponível.
  const { maintenances } = useMaintenances({ enabled: canManageFleet });
  const pendingMaintenanceCount = useMemo(
    () => (canManageFleet ? maintenances.filter((m) => m.ts_maintenancestatus !== 3).length : 0),
    [canManageFleet, maintenances]
  );

  // Cada tab é gerida pela sua própria permissão — não pela permissão do /fleet
  // (que deixou de existir), para que um condutor comum só com fleet.reservations.view
  // ou só com fleet.myvehicle.view continue a ver a tab que lhe diz respeito.
  const tabs = useMemo(() => {
    const list = [];
    if (canManageFleet) list.push({ key: 'vehicles', label: 'Veículos' });
    if (canManageFleet) list.push({ key: 'assignments', label: 'Atribuições (Check-in/out)' });
    if (canManageFleet) {
      list.push({
        key: 'maintenance',
        label: pendingMaintenanceCount > 0
          ? <Badge color="warning" badgeContent={pendingMaintenanceCount}>Manutenções Auto</Badge>
          : 'Manutenções Auto',
      });
    }
    if (canViewReservations) list.push({ key: 'reservations', label: 'Reservas' });
    if (canViewMyVehicle && hasMyVehicle) list.push({ key: 'myvehicle', label: 'A Minha Viatura' });
    return list;
  }, [canManageFleet, canViewReservations, canViewMyVehicle, hasMyVehicle, pendingMaintenanceCount]);

  const activeTab = tabs.some((t) => t.key === requestedTab) ? requestedTab : tabs[0]?.key ?? null;
  const isReservationsTab = activeTab === 'reservations';

  const handleOpenNewReservation = () => {
    setEditingReservation(null);
    setReservationModalOpen(true);
  };

  const handleEditReservation = (row) => {
    setEditingReservation(row);
    setReservationModalOpen(true);
  };

  const handleCloseReservationModal = () => {
    setReservationModalOpen(false);
    setEditingReservation(null);
  };

  return (
    <ModulePage
      title="Gestão de Frota"
      icon={CarIcon}
      color={theme.palette.primary.main}
      breadcrumbs={[
        { label: 'Início', path: '/' },
        { label: 'Frota' },
      ]}
    >
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          rowGap: 1,
          pb: 1,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setRequestedTab(v)}
          aria-label="fleet tabs"
          sx={{ flexShrink: 0 }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={tab.label} />
          ))}
        </Tabs>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          {isReservationsTab && (
            <Chip label={`${reservations.length} reservas`} size="small" variant="outlined" />
          )}
        </Box>

        {isReservationsTab && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
            <SearchBar searchTerm={reservationSearch} onSearch={setReservationSearch} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNewReservation}>
              Nova Reserva
            </Button>
          </Stack>
        )}
      </Box>

      {canManageFleet && (
        <TabPanel activeKey={activeTab} panelKey="vehicles">
          <VehicleList />
        </TabPanel>
      )}
      {canManageFleet && (
        <TabPanel activeKey={activeTab} panelKey="assignments">
          <AssignmentsList />
        </TabPanel>
      )}
      {canManageFleet && (
        <TabPanel activeKey={activeTab} panelKey="maintenance">
          <MaintenanceList />
        </TabPanel>
      )}
      {canViewReservations && (
        <TabPanel activeKey={activeTab} panelKey="reservations">
          <ReservationsList
            searchQuery={reservationSearch}
            isModalOpen={reservationModalOpen}
            editingReservation={editingReservation}
            onEditReservation={handleEditReservation}
            onCloseModal={handleCloseReservationModal}
          />
        </TabPanel>
      )}
      {canViewMyVehicle && hasMyVehicle && (
        <TabPanel activeKey={activeTab} panelKey="myvehicle">
          <MyVehicleTab />
        </TabPanel>
      )}
    </ModulePage>
  );
};

export default FleetDashboard;
