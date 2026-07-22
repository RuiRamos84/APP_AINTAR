import React, { useState, useMemo } from 'react';
import { useSearch } from '@/shared/hooks';
import { Box, Typography, Chip, Avatar, Tooltip, IconButton } from '@mui/material';
import { KeyboardReturn as ReturnIcon } from '@mui/icons-material';
import ConfirmDialog from '@/shared/components/feedback/ConfirmDialog';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { useAssignments } from '../hooks/useAssignments';
import AssignmentFormModal from '../components/AssignmentFormModal.jsx';
import AssignmentHistoryModal from '../components/AssignmentHistoryModal.jsx';

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
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

// Wrapper garantindo que todo o conteúdo das células fica centrado verticalmente
const Cell = ({ children, justify = 'flex-start' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: justify, width: '100%' }}>
    {children}
  </Box>
);

const AssignmentsList = ({ searchQuery = '', isModalOpen, onCloseModal }) => {
  const theme = useTheme();
  const { assignments, isLoading, returnToPool, isReturning } = useAssignments();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedLicence, setSelectedLicence] = useState(null);
  const [returnTarget, setReturnTarget] = useState(null);
  const filteredAssignments = useSearch(assignments, searchQuery);

  const handleConfirmReturn = async () => {
    if (!returnTarget) return;
    try {
      await returnToPool(returnTarget.tb_vehicle);
      setReturnTarget(null);
    } catch {
      // Erros tratados pelos toasts no hook
    }
  };

  const handleLicenceClick = (licence) => {
    setSelectedLicence(licence);
    setHistoryOpen(true);
  };

  const columns = useMemo(
    () => [
      {
        field: 'data',
        headerName: 'Data',
        width: 130,
        type: 'date',
        valueGetter: (value) => (value ? new Date(value + 'T00:00:00') : null),
        renderCell: ({ row }) => {
          const d = parseDate(row.data);
          return (
            <Cell>
              {d ? (
                <Typography variant="body2">{d.toLocaleDateString('pt-PT')}</Typography>
              ) : (
                <Typography variant="body2" color="text.disabled">
                  —
                </Typography>
              )}
            </Cell>
          );
        },
      },
      {
        field: 'licence',
        headerName: 'Matrícula',
        width: 140,
        renderCell: ({ value }) => (
          <Cell>
            {value ? (
              <Tooltip title="Ver histórico de atribuições" placement="top">
                <Chip
                  label={value}
                  size="small"
                  color="primary"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLicenceClick(value);
                  }}
                  sx={{ fontWeight: 700, letterSpacing: 1.2, cursor: 'pointer' }}
                />
              </Tooltip>
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
        minWidth: 180,
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
        field: 'ts_client',
        headerName: 'Condutor',
        flex: 1,
        minWidth: 180,
        renderCell: ({ value }) => (
          <Cell>
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
          </Cell>
        ),
      },
      {
        field: 'estado',
        headerName: 'Estado',
        width: 160,
        renderCell: ({ row }) => {
          if (row.is_current) {
            return (
              <Cell>
                <Chip label="Ativa" size="small" color="success" variant="outlined" />
              </Cell>
            );
          }
          if (row.end_date) {
            const d = parseDate(row.end_date);
            return (
              <Cell>
                <Chip
                  label={`Devolvida em ${d ? d.toLocaleDateString('pt-PT') : row.end_date}`}
                  size="small"
                  variant="outlined"
                />
              </Cell>
            );
          }
          return (
            <Cell>
              <Chip label="Substituída" size="small" variant="outlined" color="default" />
            </Cell>
          );
        },
      },
      {
        field: 'actions',
        headerName: 'Ações',
        width: 110,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          if (!row.is_current) {
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
              <Tooltip title="Devolver à pool">
                <IconButton size="small" color="warning" onClick={() => setReturnTarget(row)}>
                  <ReturnIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Cell>
          );
        },
      },
    ],
    []
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <DataGrid
        rows={filteredAssignments}
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
          sorting: { sortModel: [{ field: 'data', sort: 'desc' }] },
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

      <AssignmentFormModal open={isModalOpen} onClose={onCloseModal} />

      <AssignmentHistoryModal
        open={historyOpen}
        onClose={() => {
          setHistoryOpen(false);
          setSelectedLicence(null);
        }}
        licence={selectedLicence}
        assignments={assignments}
      />

      <ConfirmDialog
        open={!!returnTarget}
        title="Devolver à pool?"
        message={`A viatura ${returnTarget?.licence ?? ''} deixa de estar atribuída a ${returnTarget?.ts_client ?? ''} e passa a ficar disponível para reserva.`}
        confirmText="Devolver à Pool"
        confirmColor="warning"
        type="warning"
        loading={isReturning}
        onConfirm={handleConfirmReturn}
        onCancel={() => setReturnTarget(null)}
      />
    </Box>
  );
};

export default AssignmentsList;
