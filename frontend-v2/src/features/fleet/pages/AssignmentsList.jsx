import React, { useState, useMemo } from 'react';
import { Box, Typography, Button, Chip, Avatar, Stack, Tooltip } from '@mui/material';
import { Add as AddIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { SearchBar } from '@/shared/components/data';
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
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

// Wrapper garantindo que todo o conteúdo das células fica centrado verticalmente
const Cell = ({ children, justify = 'flex-start' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: justify, width: '100%' }}>
    {children}
  </Box>
);

const AssignmentsList = () => {
  const theme = useTheme();
  const { assignments, isLoading } = useAssignments();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedLicence, setSelectedLicence] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLicenceClick = (licence) => {
    setSelectedLicence(licence);
    setHistoryOpen(true);
  };

  const columns = useMemo(() => [
    {
      field: 'data',
      headerName: 'Data',
      width: 130,
      type: 'date',
      valueGetter: (value) => value ? new Date(value + 'T00:00:00') : null,
      renderCell: ({ row }) => {
        const d = parseDate(row.data);
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
      field: 'licence',
      headerName: 'Matrícula',
      width: 140,
      renderCell: ({ value }) => (
        <Cell>
          {value ? (
            <Tooltip title="Ver histórico de atribuições" placement="top">
              <Chip
                label={value}
                size="small" color="primary" variant="outlined"
                onClick={(e) => { e.stopPropagation(); handleLicenceClick(value); }}
                sx={{ fontWeight: 700, letterSpacing: 1.2, cursor: 'pointer' }}
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
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} lineHeight={1.3} noWrap>{row.brand}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{row.model}</Typography>
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
          {value ? (
            <>
              <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: 'secondary.main', flexShrink: 0 }}>
                {getInitials(value)}
              </Avatar>
              <Typography variant="body2" sx={{ ml: 1 }} noWrap>{value}</Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.disabled">—</Typography>
          )}
        </Cell>
      ),
    },
  ], []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`${assignments.length} registos`} size="small" variant="outlined" />
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SearchBar searchTerm={searchQuery} onSearch={setSearchQuery} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)}>
            Nova Atribuição
          </Button>
        </Stack>
      </Box>

      <DataGrid
        rows={assignments}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.pk}
        density="comfortable"
        disableRowSelectionOnClick
        autoHeight
        getRowHeight={() => 'auto'}
        filterModel={{
          items: [],
          quickFilterValues: searchQuery.trim() ? searchQuery.trim().split(/\s+/) : [],
        }}
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

      <AssignmentFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <AssignmentHistoryModal
        open={historyOpen}
        onClose={() => { setHistoryOpen(false); setSelectedLicence(null); }}
        licence={selectedLicence}
        assignments={assignments}
      />
    </Box>
  );
};

export default AssignmentsList;
