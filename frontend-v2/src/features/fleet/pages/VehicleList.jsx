import React, { useState, useMemo } from 'react';
import { useSearch } from '@/shared/hooks';
import { Box, Typography, Button, Chip, Avatar, Tooltip, IconButton, Stack } from '@mui/material';
import {
  Add as AddIcon,
  DirectionsCar as CarIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { SearchBar } from '@/shared/components/data';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenances } from '../hooks/useMaintenances';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getNextMaintenanceStatus } from '../utils/maintenanceRules';
import VehicleFormModal from '../components/VehicleFormModal.jsx';
import VehicleOverviewModal from '../components/VehicleOverviewModal.jsx';

const EMPTY_MAINTENANCE_TYPES = [];

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const daysUntil = (dateStr) => {
  const d = parseDate(dateStr);
  return d ? Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24)) : null;
};

// Wrapper garantindo que todo o conteúdo das células fica centrado verticalmente
const Cell = ({ children, justify = 'flex-start' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: justify, width: '100%' }}>
    {children}
  </Box>
);

const DateCell = ({ rawDate }) => {
  const d = parseDate(rawDate);
  if (!d) return <Cell><Typography variant="body2" color="text.disabled">—</Typography></Cell>;
  const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  const label = d.toLocaleDateString('pt-PT');
  if (days < 0) return <Cell><Chip icon={<ErrorIcon />} label={label} size="small" color="error" variant="outlined" sx={{ fontWeight: 600 }} /></Cell>;
  if (days <= 30) return <Cell><Chip icon={<WarningIcon />} label={label} size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} /></Cell>;
  return <Cell><Typography variant="body2">{label}</Typography></Cell>;
};

const formatKm = (km) => (km != null ? `${km.toLocaleString('pt-PT')} km` : null);

const NextMaintenanceCell = ({ vehicle, maintenances, maintenanceTypes }) => {
  const next = getNextMaintenanceStatus(vehicle, maintenances, maintenanceTypes);
  if (!next) return <Cell><Typography variant="body2" color="text.disabled">—</Typography></Cell>;
  const label = next.status === 'overdue' ? `Em atraso (${next.typeName})` : `Brevemente (${next.typeName})`;
  const color = next.status === 'overdue' ? 'error' : 'warning';
  const Icon = next.status === 'overdue' ? ErrorIcon : WarningIcon;
  return (
    <Cell>
      <Tooltip title={
        next.kmSince != null
          ? `${formatKm(Math.round(next.kmSince))} desde a última manutenção deste tipo`
          : `${next.monthsSince} meses desde a última manutenção deste tipo`
      }>
        <Chip icon={<Icon />} label={label} size="small" color={color} variant="outlined" sx={{ fontWeight: 600 }} />
      </Tooltip>
    </Cell>
  );
};

const VehicleList = () => {
  const theme = useTheme();
  const { vehicles, isLoading } = useVehicles();
  const { maintenances } = useMaintenances();
  const { data: metaData } = useMetaData();
  const maintenanceTypes = metaData?.maintenancetype || EMPTY_MAINTENANCE_TYPES;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewVehicle, setOverviewVehicle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredVehicles = useSearch(vehicles, searchQuery);

  const handleOpenModal = (vehicle = null) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleOpenOverview = (vehicle) => {
    setOverviewVehicle(vehicle);
    setOverviewOpen(true);
  };

  const columns = useMemo(() => [
    {
      field: 'licence',
      headerName: 'Matrícula',
      width: 140,
      renderCell: ({ value, row }) => (
        <Cell>
          {value ? (
            <Tooltip title="Ver ficha do veículo" placement="top">
              <Chip
                label={value}
                size="small" color="primary" variant="outlined"
                onClick={(e) => { e.stopPropagation(); handleOpenOverview(row); }}
                sx={{ fontWeight: 700, letterSpacing: 1.5, cursor: 'pointer' }}
              />
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.disabled">—</Typography>
          )}
        </Cell>
      ),
    },
    {
      field: 'brand',
      headerName: 'Veículo',
      flex: 1,
      minWidth: 180,
      valueGetter: (value, row) => `${row.brand ?? ''} ${row.model ?? ''}`.trim(),
      renderCell: ({ row }) => (
        <Cell>
          <Avatar sx={{ width: 28, height: 28, flexShrink: 0, bgcolor: alpha(theme.palette.primary.main, 0.12) }}>
            <CarIcon sx={{ fontSize: 15, color: 'primary.main' }} />
          </Avatar>
          <Box sx={{ ml: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} lineHeight={1.3} noWrap>{row.brand}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{row.model}</Typography>
          </Box>
        </Cell>
      ),
    },
    {
      field: 'current_km',
      headerName: 'Km Atual',
      width: 130,
      type: 'number',
      renderCell: ({ value }) => (
        <Cell>
          {value != null
            ? <Typography variant="body2">{formatKm(value)}</Typography>
            : <Typography variant="body2" color="text.disabled">—</Typography>}
        </Cell>
      ),
    },
    {
      field: 'delivery',
      headerName: 'Data de Entrega',
      width: 150,
      type: 'date',
      valueGetter: (value) => value ? new Date(value + 'T00:00:00') : null,
      renderCell: ({ row }) => {
        const d = parseDate(row.delivery);
        return (
          <Cell>
            {d
              ? <Typography variant="body2">{d.toLocaleDateString('pt-PT')}</Typography>
              : <Typography variant="body2" color="text.disabled">—</Typography>
            }
          </Cell>
        );
      },
    },
    {
      field: 'inspection_date',
      headerName: 'Inspeção',
      width: 155,
      type: 'date',
      valueGetter: (value) => value ? new Date(value + 'T00:00:00') : null,
      renderCell: ({ row }) => <DateCell rawDate={row.inspection_date} />,
    },
    {
      field: 'insurance_date',
      headerName: 'Seguro',
      width: 155,
      type: 'date',
      valueGetter: (value) => value ? new Date(value + 'T00:00:00') : null,
      renderCell: ({ row }) => <DateCell rawDate={row.insurance_date} />,
    },
    {
      field: 'iuc_date',
      headerName: 'IUC',
      width: 155,
      type: 'date',
      valueGetter: (value) => value ? new Date(value + 'T00:00:00') : null,
      renderCell: ({ row }) => <DateCell rawDate={row.iuc_date} />,
    },
    {
      field: 'next_maintenance',
      headerName: 'Próxima Manutenção',
      width: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <NextMaintenanceCell vehicle={row} maintenances={maintenances} maintenanceTypes={maintenanceTypes} />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
        <Cell justify="center">
          <Tooltip title="Editar veículo">
            <IconButton size="small" color="primary" onClick={() => handleOpenModal(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Cell>
      ),
    },
  ], [theme, maintenances, maintenanceTypes]);

  const stats = useMemo(() => {
    let inspExpired = 0, inspWarning = 0;
    let insurExpired = 0, insurWarning = 0;
    let maintOverdue = 0, maintWarning = 0;
    vehicles.forEach(v => {
      const insp = daysUntil(v.inspection_date);
      const insur = daysUntil(v.insurance_date);
      const nextMaint = getNextMaintenanceStatus(v, maintenances, maintenanceTypes);
      if (nextMaint?.status === 'overdue') maintOverdue++;
      else if (nextMaint?.status === 'warning') maintWarning++;
      if (insp !== null) {
        if (insp < 0) inspExpired++;
        else if (insp <= 30) inspWarning++;
      }
      if (insur !== null) {
        if (insur < 0) insurExpired++;
        else if (insur <= 30) insurWarning++;
      }
    });
    return { inspExpired, inspWarning, insurExpired, insurWarning, maintOverdue, maintWarning };
  }, [vehicles, maintenances, maintenanceTypes]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip label={`${vehicles.length} veículos`} size="small" variant="outlined" />
          {stats.inspExpired > 0 && (
            <Chip icon={<ErrorIcon />} label={`${stats.inspExpired} inspeção expirada`} size="small" color="error" variant="outlined" />
          )}
          {stats.insurExpired > 0 && (
            <Chip icon={<ErrorIcon />} label={`${stats.insurExpired} seguro expirado`} size="small" color="error" />
          )}
          {stats.inspWarning > 0 && (
            <Chip icon={<WarningIcon />} label={`${stats.inspWarning} inspeção a expirar`} size="small" color="warning" variant="outlined" />
          )}
          {stats.insurWarning > 0 && (
            <Chip icon={<WarningIcon />} label={`${stats.insurWarning} seguro a expirar`} size="small" color="warning" />
          )}
          {stats.maintOverdue > 0 && (
            <Chip icon={<ErrorIcon />} label={`${stats.maintOverdue} manutenção em atraso`} size="small" color="error" variant="outlined" />
          )}
          {stats.maintWarning > 0 && (
            <Chip icon={<WarningIcon />} label={`${stats.maintWarning} manutenção a aproximar`} size="small" color="warning" variant="outlined" />
          )}
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SearchBar searchTerm={searchQuery} onSearch={setSearchQuery} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
            Adicionar Veículo
          </Button>
        </Stack>
      </Box>

      <DataGrid
        rows={filteredVehicles}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.pk}
        density="comfortable"
        disableRowSelectionOnClick
        autoHeight
        getRowHeight={() => 'auto'}
        slots={{ toolbar: GridToolbar }}
        slotProps={{ toolbar: { showQuickFilter: false } }}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{
          border: 'none',
          borderRadius: 2,
          '& .MuiDataGrid-cell': { py: 1.5 },
          '& .MuiDataGrid-columnHeader': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
        }}
      />

      <VehicleFormModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedVehicle(null); }}
        vehicle={selectedVehicle}
      />

      <VehicleOverviewModal
        open={overviewOpen}
        onClose={() => { setOverviewOpen(false); setOverviewVehicle(null); }}
        vehicle={overviewVehicle}
        onEdit={(v) => handleOpenModal(v)}
      />
    </Box>
  );
};

export default VehicleList;
