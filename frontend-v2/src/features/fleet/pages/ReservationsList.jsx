import React, { useCallback, useState, useMemo } from 'react';
import { useSearch } from '@/shared/hooks';
import { Box, Typography, Chip, Avatar, Tooltip, IconButton, TextField } from '@mui/material';
import {
  Edit as EditIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import ConfirmDialog from '@/shared/components/feedback/ConfirmDialog';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { useAuth } from '@/core/contexts/AuthContext';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { useReservations } from '../hooks/useReservations';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenances } from '../hooks/useMaintenances';
import ReservationFormModal from '../components/ReservationFormModal.jsx';
import AvailabilityStrip from '../components/AvailabilityStrip.jsx';

const formatDateTime = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const statusColor = {
  Agendada: 'info',
  'Em curso': 'primary',
  Concluída: 'success',
  Cancelada: 'default',
  Terminada: 'warning',
};

// Wrapper garantindo que todo o conteúdo das células fica centrado verticalmente
const Cell = ({ children, justify = 'flex-start' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: justify, width: '100%' }}>
    {children}
  </Box>
);

const ReservationsList = ({
  searchQuery = '',
  isModalOpen,
  editingReservation,
  onEditReservation,
  onCloseModal,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canManageOthers = hasPermission('fleet.reservations.manage');

  const {
    reservations,
    isLoading,
    cancelReservation,
    isCancelling,
    completeReservation,
    isCompleting,
  } = useReservations();
  const { vehicles } = useVehicles();
  const { maintenances } = useMaintenances();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [returnKm, setReturnKm] = useState('');
  const filteredReservations = useSearch(reservations, searchQuery);

  const canEditRow = useCallback(
    (row) => canManageOthers || row.ts_client === user?.user_id,
    [canManageOthers, user]
  );
  const isActiveState = (row) => row.estado_atual === 'Agendada' || row.estado_atual === 'Em curso';

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelReservation(cancelTarget.pk);
      setCancelTarget(null);
    } catch {
      // Erros tratados pelos toasts no hook
    }
  };

  const handleConfirmComplete = async () => {
    if (!completeTarget) return;
    try {
      await completeReservation({
        id: completeTarget.pk,
        km: returnKm ? parseInt(returnKm, 10) : undefined,
      });
      setCompleteTarget(null);
      setReturnKm('');
    } catch {
      // Erros tratados pelos toasts no hook
    }
  };

  const columns = useMemo(
    () => [
      {
        field: 'licence',
        headerName: 'Matrícula',
        width: 140,
        renderCell: ({ value }) => (
          <Cell>
            {value ? (
              <Chip
                label={value}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700, letterSpacing: 1.2 }}
              />
            ) : (
              <Typography variant="body2" color="text.disabled">
                —
              </Typography>
            )}
          </Cell>
        ),
      },
      {
        field: 'brand',
        headerName: 'Veículo',
        flex: 1,
        minWidth: 160,
        valueGetter: (value, row) => `${row.brand ?? ''} ${row.model ?? ''}`.trim(),
        renderCell: ({ row }) => (
          <Cell>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} lineHeight={1.3} noWrap>
                {row.brand}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.model}
              </Typography>
            </Box>
          </Cell>
        ),
      },
      {
        field: 'client_name',
        headerName: 'Colaborador',
        flex: 1,
        minWidth: 170,
        renderCell: ({ value }) => (
          <Cell>
            {value ? (
              <>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: '0.7rem',
                    bgcolor: 'secondary.main',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(value)}
                </Avatar>
                <Typography variant="body2" sx={{ ml: 1 }} noWrap>
                  {value}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.disabled">
                —
              </Typography>
            )}
          </Cell>
        ),
      },
      {
        field: 'start_time',
        headerName: 'Início',
        width: 160,
        type: 'dateTime',
        valueGetter: (value) => formatDateTime(value),
        renderCell: ({ row }) => {
          const d = formatDateTime(row.start_time);
          return (
            <Cell>
              {d ? (
                <Typography variant="body2">
                  {d.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                </Typography>
              ) : (
                '—'
              )}
            </Cell>
          );
        },
      },
      {
        field: 'end_time',
        headerName: 'Fim previsto',
        width: 160,
        type: 'dateTime',
        valueGetter: (value) => formatDateTime(value),
        renderCell: ({ row }) => {
          const d = formatDateTime(row.end_time);
          return (
            <Cell>
              {d ? (
                <Typography variant="body2">
                  {d.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                </Typography>
              ) : (
                '—'
              )}
            </Cell>
          );
        },
      },
      {
        field: 'destination',
        headerName: 'Destino',
        flex: 1,
        minWidth: 160,
        renderCell: ({ value }) => (
          <Cell>
            <Typography variant="body2" noWrap>
              {value || '—'}
            </Typography>
          </Cell>
        ),
      },
      {
        field: 'estado_atual',
        headerName: 'Estado',
        width: 130,
        renderCell: ({ value }) => (
          <Cell>
            <Chip label={value} size="small" color={statusColor[value] || 'default'} />
          </Cell>
        ),
      },
      {
        field: 'actions',
        headerName: 'Ações',
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          if (!canEditRow(row) || !isActiveState(row)) {
            return (
              <Cell justify="center">
                <Typography variant="body2" color="text.disabled">
                  —
                </Typography>
              </Cell>
            );
          }
          return (
            <Cell justify="center">
              <Tooltip title="Editar reserva">
                <IconButton size="small" onClick={() => onEditReservation(row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Concluir (viatura entregue)">
                <IconButton size="small" color="success" onClick={() => setCompleteTarget(row)}>
                  <CheckIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancelar reserva">
                <IconButton size="small" color="error" onClick={() => setCancelTarget(row)}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Cell>
          );
        },
      },
    ],
    [canEditRow, onEditReservation]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <AvailabilityStrip
        vehicles={vehicles}
        reservations={reservations}
        maintenances={maintenances}
      />

      <DataGrid
        rows={filteredReservations}
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
          sorting: { sortModel: [{ field: 'start_time', sort: 'desc' }] },
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

      <ReservationFormModal
        open={isModalOpen}
        onClose={onCloseModal}
        reservation={editingReservation}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancelar reserva?"
        message={`Esta ação liberta a viatura ${cancelTarget?.licence ?? ''} para o período reservado.`}
        confirmText="Cancelar Reserva"
        confirmColor="error"
        type="warning"
        loading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmDialog
        open={!!completeTarget}
        title="Concluir reserva?"
        message={`Confirma a entrega da viatura ${completeTarget?.licence ?? ''}? Pode indicar o km de retorno (opcional).`}
        confirmText="Concluir"
        confirmColor="success"
        type="success"
        loading={isCompleting}
        onConfirm={handleConfirmComplete}
        onCancel={() => {
          setCompleteTarget(null);
          setReturnKm('');
        }}
      >
        <TextField
          label="Km de retorno"
          type="number"
          fullWidth
          size="small"
          value={returnKm}
          onChange={(e) => setReturnKm(e.target.value)}
        />
      </ConfirmDialog>
    </Box>
  );
};

export default ReservationsList;
