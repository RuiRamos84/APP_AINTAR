import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Chip,
  Badge,
  Stack,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Add as AddIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  EuroSymbol as EuroIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { useReservations } from '../hooks/useReservations';
import { useMyVehicle } from '../hooks/useMyVehicle';
import { useMaintenances } from '../hooks/useMaintenances';
import { useAssignments } from '../hooks/useAssignments';
import { useVehicleStats } from '../hooks/useVehicleStats';
import FleetOverview from './FleetOverview.jsx';
import VehicleList from './VehicleList.jsx';
import AssignmentsList from './AssignmentsList.jsx';
import MaintenanceList from './MaintenanceList.jsx';
import ReservationsList from './ReservationsList.jsx';
import MyVehicleTab from '../components/MyVehicleTab.jsx';

const formatCurrency = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
};

// Config-driven: cada chip de estatística de veículos é também um filtro clicável (ver VehicleList.jsx)
const VEHICLE_STAT_FILTERS = [
  { key: 'inspExpired', icon: ErrorIcon, color: 'error', label: (n) => `${n} inspeção expirada` },
  { key: 'insurExpired', icon: ErrorIcon, color: 'error', label: (n) => `${n} seguro expirado` },
  {
    key: 'inspWarning',
    icon: WarningIcon,
    color: 'warning',
    label: (n) => `${n} inspeção a expirar`,
  },
  {
    key: 'insurWarning',
    icon: WarningIcon,
    color: 'warning',
    label: (n) => `${n} seguro a expirar`,
  },
  {
    key: 'maintOverdue',
    icon: ErrorIcon,
    color: 'error',
    label: (n) => `${n} manutenção em atraso`,
  },
  {
    key: 'maintWarning',
    icon: WarningIcon,
    color: 'warning',
    label: (n) => `${n} manutenção a aproximar`,
  },
];

function TabPanel({ children, activeKey, panelKey }) {
  return (
    <div
      role="tabpanel"
      hidden={activeKey !== panelKey}
      id={`fleet-tabpanel-${panelKey}`}
      aria-labelledby={`fleet-tab-${panelKey}`}
    >
      {activeKey === panelKey && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const FleetDashboard = () => {
  const theme = useTheme();
  const { hasPermission } = usePermissions();
  const canViewOverview = hasPermission('fleet.edit');
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

  // Idem para a tab "Veículos" — chips de filtro ao centro, pesquisa + botão à
  // direita. useVehicleStats é o mesmo hook usado dentro de VehicleList.jsx;
  // React Query deduplica os pedidos, não há chamadas HTTP a mais.
  const { vehicles, counts: vehicleCounts, isLoading: vehiclesLoading } = useVehicleStats();
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [activeVehicleFilter, setActiveVehicleFilter] = useState(null);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Idem para a tab "Atribuições" — só tem contador (sem filtros/toggle).
  const { assignments } = useAssignments();
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

  // "A Minha Viatura" só aparece como tab a quem tem a permissão E tem mesmo
  // uma viatura atual (reserva em curso ou atribuição) — sem isso, não há nada
  // para mostrar. hasPermission já dá bypass total a profil=0 (admin).
  const { vehicle: myVehicle } = useMyVehicle();
  const hasMyVehicle = Boolean(myVehicle);

  // Contador de avarias/manutenções pendentes (estado != Resolvida) para o
  // "responsável" (fleet.edit) ver de imediato, sem abrir a tab, que há algo
  // por tratar — só pedido se a tab sequer estiver disponível. O mesmo
  // `maintenances` serve o badge da tab e o cabeçalho (contador + custo total).
  const { maintenances } = useMaintenances({ enabled: canManageFleet });
  const pendingMaintenanceCount = useMemo(
    () => (canManageFleet ? maintenances.filter((m) => m.ts_maintenancestatus !== 3).length : 0),
    [canManageFleet, maintenances]
  );
  const maintenanceTotalCost = useMemo(
    () =>
      maintenances.reduce((sum, m) => {
        const p = parseFloat(m.price);
        return sum + (isNaN(p) ? 0 : p);
      }, 0),
    [maintenances]
  );
  const [maintenanceSearch, setMaintenanceSearch] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);

  // Notificações de Frota (avaria reportada, manutenção a aproximar, seguro/
  // inspeção/IUC a expirar) trazem ?tab=&vehiclePk= — ver NotificationCenter.jsx.
  // Pré-seleciona a tab e filtra pela matrícula de origem assim que a lista de
  // viaturas estiver pronta, depois limpa os parâmetros (mesmo padrão de
  // TasksPage/DocumentsPage: query param consumido uma vez, não fica na URL).
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (!tabParam) return;
    const vehiclePkParam = searchParams.get('vehiclePk');
    if (vehiclePkParam && vehiclesLoading) return;

    setRequestedTab(tabParam);
    if (vehiclePkParam) {
      const vehicle = vehicles.find((v) => String(v.pk) === vehiclePkParam);
      if (vehicle) {
        if (tabParam === 'maintenance') setMaintenanceSearch(vehicle.licence);
        else setVehicleSearch(vehicle.licence);
      }
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, vehicles, vehiclesLoading, setSearchParams]);

  // Cada tab é gerida pela sua própria permissão — não pela permissão do /fleet
  // (que deixou de existir), para que um condutor comum só com fleet.reservations.view
  // ou só com fleet.myvehicle.view continue a ver a tab que lhe diz respeito.
  const tabs = useMemo(() => {
    const list = [];
    if (canViewOverview) list.push({ key: 'overview', label: 'Visão Geral' });
    if (canManageFleet) list.push({ key: 'vehicles', label: 'Veículos' });
    if (canManageFleet) list.push({ key: 'assignments', label: 'Atribuições (Check-in/out)' });
    if (canManageFleet) {
      list.push({
        key: 'maintenance',
        label:
          pendingMaintenanceCount > 0 ? (
            <Badge color="warning" badgeContent={pendingMaintenanceCount}>
              Manutenções Auto
            </Badge>
          ) : (
            'Manutenções Auto'
          ),
      });
    }
    if (canViewReservations) list.push({ key: 'reservations', label: 'Reservas' });
    if (canViewMyVehicle && hasMyVehicle) list.push({ key: 'myvehicle', label: 'A Minha Viatura' });
    return list;
  }, [
    canViewOverview,
    canManageFleet,
    canViewReservations,
    canViewMyVehicle,
    hasMyVehicle,
    pendingMaintenanceCount,
  ]);

  const activeTab = tabs.some((t) => t.key === requestedTab)
    ? requestedTab
    : (tabs[0]?.key ?? null);
  const isReservationsTab = activeTab === 'reservations';
  const isVehiclesTab = activeTab === 'vehicles';
  const isAssignmentsTab = activeTab === 'assignments';
  const isMaintenanceTab = activeTab === 'maintenance';

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

  const handleOpenNewVehicle = () => {
    setEditingVehicle(null);
    setVehicleModalOpen(true);
  };

  const handleEditVehicle = (row) => {
    setEditingVehicle(row);
    setVehicleModalOpen(true);
  };

  const handleCloseVehicleModal = () => {
    setVehicleModalOpen(false);
    setEditingVehicle(null);
  };

  const handleCloseAssignmentModal = () => setAssignmentModalOpen(false);

  const handleCloseMaintenanceModal = () => setMaintenanceModalOpen(false);

  return (
    <ModulePage
      title="Gestão de Frota"
      icon={CarIcon}
      color={theme.palette.primary.main}
      breadcrumbs={[{ label: 'Início', path: '/' }, { label: 'Frota' }]}
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
          {isVehiclesTab && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              justifyContent="center"
            >
              <Chip
                label={`${vehicles.length} veículos`}
                size="small"
                color={activeVehicleFilter ? 'default' : 'primary'}
                variant={activeVehicleFilter ? 'outlined' : 'filled'}
                onClick={activeVehicleFilter ? () => setActiveVehicleFilter(null) : undefined}
                sx={{ cursor: activeVehicleFilter ? 'pointer' : 'default' }}
              />
              {VEHICLE_STAT_FILTERS.filter((stat) => vehicleCounts[stat.key] > 0).map((stat) => {
                const Icon = stat.icon;
                return (
                  <Chip
                    key={stat.key}
                    icon={<Icon />}
                    label={stat.label(vehicleCounts[stat.key])}
                    size="small"
                    color={stat.color}
                    variant={activeVehicleFilter === stat.key ? 'filled' : 'outlined'}
                    onClick={() =>
                      setActiveVehicleFilter((f) => (f === stat.key ? null : stat.key))
                    }
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                  />
                );
              })}
            </Stack>
          )}
          {isAssignmentsTab && (
            <Chip label={`${assignments.length} registos`} size="small" variant="outlined" />
          )}
          {isMaintenanceTab && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              justifyContent="center"
            >
              <Chip label={`${maintenances.length} registos`} size="small" variant="outlined" />
              {maintenanceTotalCost > 0 && (
                <Chip
                  icon={<EuroIcon sx={{ fontSize: '0.85rem !important' }} />}
                  label={`Total: ${formatCurrency(maintenanceTotalCost)}`}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              )}
              <ToggleButtonGroup
                size="small"
                exclusive
                value={showPendingOnly ? 'pending' : 'all'}
                onChange={(_, v) => v && setShowPendingOnly(v === 'pending')}
              >
                <ToggleButton value="all">Todas</ToggleButton>
                <ToggleButton value="pending">
                  Pendentes{pendingMaintenanceCount > 0 ? ` (${pendingMaintenanceCount})` : ''}
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
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
        {isVehiclesTab && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
            <SearchBar searchTerm={vehicleSearch} onSearch={setVehicleSearch} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNewVehicle}>
              Adicionar Veículo
            </Button>
          </Stack>
        )}
        {isAssignmentsTab && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
            <SearchBar searchTerm={assignmentSearch} onSearch={setAssignmentSearch} />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAssignmentModalOpen(true)}
            >
              Nova Atribuição
            </Button>
          </Stack>
        )}
        {isMaintenanceTab && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
            <SearchBar searchTerm={maintenanceSearch} onSearch={setMaintenanceSearch} />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setMaintenanceModalOpen(true)}
            >
              Nova Intervenção
            </Button>
          </Stack>
        )}
      </Box>

      {canViewOverview && (
        <TabPanel activeKey={activeTab} panelKey="overview">
          <FleetOverview onNavigateTab={setRequestedTab} />
        </TabPanel>
      )}
      {canManageFleet && (
        <TabPanel activeKey={activeTab} panelKey="vehicles">
          <VehicleList
            searchQuery={vehicleSearch}
            activeFilter={activeVehicleFilter}
            isModalOpen={vehicleModalOpen}
            editingVehicle={editingVehicle}
            onEditVehicle={handleEditVehicle}
            onCloseModal={handleCloseVehicleModal}
          />
        </TabPanel>
      )}
      {canManageFleet && (
        <TabPanel activeKey={activeTab} panelKey="assignments">
          <AssignmentsList
            searchQuery={assignmentSearch}
            isModalOpen={assignmentModalOpen}
            onCloseModal={handleCloseAssignmentModal}
          />
        </TabPanel>
      )}
      {canManageFleet && (
        <TabPanel activeKey={activeTab} panelKey="maintenance">
          <MaintenanceList
            searchQuery={maintenanceSearch}
            showPendingOnly={showPendingOnly}
            isModalOpen={maintenanceModalOpen}
            onCloseModal={handleCloseMaintenanceModal}
          />
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
