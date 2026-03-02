import React, { useState, useMemo } from 'react';
import { Box, Typography, Button, Chip, Stack, Tooltip } from '@mui/material';
import { Add as AddIcon, EuroSymbol as EuroIcon } from '@mui/icons-material';
import { SearchBar } from '@/shared/components/data';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { useMaintenances } from '../hooks/useMaintenances';
import MaintenanceFormModal from '../components/MaintenanceFormModal.jsx';
import MaintenanceHistoryModal from '../components/MaintenanceHistoryModal.jsx';

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const getTypeColor = (type) => {
  if (!type) return 'default';
  const t = type.toLowerCase();
  if (t.includes('pneu')) return 'warning';
  if (t.includes('revisão') || t.includes('revisao') || t.includes('inspeção')) return 'info';
  if (t.includes('acidente') || t.includes('colisão')) return 'error';
  if (t.includes('óleo') || t.includes('oleo') || t.includes('filtro')) return 'success';
  return 'default';
};

const formatCurrency = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
};

// Wrapper garantindo que todo o conteúdo das células fica centrado verticalmente
const Cell = ({ children, justify = 'flex-start' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: justify, width: '100%' }}>
    {children}
  </Box>
);

const MaintenanceList = () => {
  const theme = useTheme();
  const { maintenances, isLoading } = useMaintenances();
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
            <Tooltip title="Ver histórico de manutenções" placement="top">
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
      width: 180,
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
      field: 'tt_maintenancetype',
      headerName: 'Tipo',
      width: 170,
      renderCell: ({ value }) => (
        <Cell>
          {value
            ? <Chip label={value} size="small" color={getTypeColor(value)} sx={{ maxWidth: 160 }} />
            : <Typography variant="body2" color="text.disabled">—</Typography>
          }
        </Cell>
      ),
    },
    {
      field: 'price',
      headerName: 'Custo',
      width: 120,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrency(value) ?? '',
      renderCell: ({ value }) => {
        const f = formatCurrency(value);
        return (
          <Cell justify="flex-end">
            {f
              ? <Typography variant="body2" fontWeight={600}>{f}</Typography>
              : <Typography variant="body2" color="text.disabled">—</Typography>
            }
          </Cell>
        );
      },
    },
    {
      field: 'memo',
      headerName: 'Descrição',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ value }) => (
        <Cell>
          {value
            ? <Typography variant="body2" color="text.secondary" sx={{
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', whiteSpace: 'normal', lineHeight: 1.4,
              }}>
                {value}
              </Typography>
            : <Typography variant="body2" color="text.disabled">—</Typography>
          }
        </Cell>
      ),
    },
  ], []);

  const totalCost = useMemo(() =>
    maintenances.reduce((sum, m) => {
      const p = parseFloat(m.price);
      return sum + (isNaN(p) ? 0 : p);
    }, 0),
  [maintenances]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip label={`${maintenances.length} registos`} size="small" variant="outlined" />
          {totalCost > 0 && (
            <Chip
              icon={<EuroIcon sx={{ fontSize: '0.85rem !important' }} />}
              label={`Total: ${formatCurrency(totalCost)}`}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SearchBar searchTerm={searchQuery} onSearch={setSearchQuery} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)}>
            Nova Intervenção
          </Button>
        </Stack>
      </Box>

      <DataGrid
        rows={maintenances}
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

      <MaintenanceFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <MaintenanceHistoryModal
        open={historyOpen}
        onClose={() => { setHistoryOpen(false); setSelectedLicence(null); }}
        licence={selectedLicence}
        maintenances={maintenances}
      />
    </Box>
  );
};

export default MaintenanceList;
