import React, { useState, useMemo } from 'react';
import {
  Box, Button, Chip, Tabs, Tab, Typography,
  IconButton, Tooltip, Stack, Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as StockIcon,
  AddBox as StockInIcon,
  IndeterminateCheckBox as StockOutIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { useStockItems } from '../hooks/useStockMeta';
import { useStockCurrent } from '../hooks/useStockCurrent';
import { useStockIn } from '../hooks/useStockIn';
import { useStockOut } from '../hooks/useStockOut';
import { useStockItemsCrud } from '../hooks/useStockItemsCrud';
import StockItemFormModal from '../components/StockItemFormModal';
import StockInFormModal from '../components/StockInFormModal';
import StockOutFormModal from '../components/StockOutFormModal';

const Cell = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>{children}</Box>
);

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val.includes('T') ? val : val + 'T00:00:00');
  return isNaN(d) ? '—' : d.toLocaleDateString('pt-PT');
};

const formatNum = (val, decimals = 2) =>
  val != null ? Number(val).toLocaleString('pt-PT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';

// ─── Tab: Stock Atual ─────────────────────────────────────────────────────────
const StockAtualTab = () => {
  const theme = useTheme();
  const { current, isLoading, isError } = useStockCurrent();
  const [search, setSearch] = useState('');
  const filtered = useSearch(current, search);

  const lowStock = useMemo(() => current.filter(r => r.threshold > 0 && Number(r.stock) <= Number(r.threshold)), [current]);

  const columns = [
    {
      field: 'value', headerName: 'Artigo', flex: 1, minWidth: 180,
      renderCell: ({ value }) => (
        <Cell><Typography variant="body2" fontWeight={600}>{value}</Typography></Cell>
      ),
    },
    {
      field: 'tt_stocktype', headerName: 'Categoria', width: 160,
      renderCell: ({ value }) => (
        <Cell>
          <Chip label={value || '—'} size="small" variant="outlined" />
        </Cell>
      ),
    },
    { field: 'tt_unit', headerName: 'Unidade', width: 110, renderCell: ({ value }) => <Cell><Typography variant="body2">{value || '—'}</Typography></Cell> },
    {
      field: 'qin', headerName: 'Entradas', width: 110, type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" color="success.main" fontWeight={500}>{formatNum(value, 0)}</Typography></Cell>,
    },
    {
      field: 'qout', headerName: 'Saídas', width: 110, type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" color="error.main" fontWeight={500}>{formatNum(value, 0)}</Typography></Cell>,
    },
    {
      field: 'stock', headerName: 'Stock Atual', width: 130, type: 'number',
      renderCell: ({ value, row }) => {
        const isLow = row.threshold > 0 && Number(value) <= Number(row.threshold);
        return (
          <Cell>
            <Chip
              label={formatNum(value, 0)}
              size="small"
              color={isLow ? 'error' : 'success'}
              variant={isLow ? 'filled' : 'outlined'}
              icon={isLow ? <WarningIcon /> : undefined}
              sx={{ fontWeight: 700 }}
            />
          </Cell>
        );
      },
    },
    {
      field: 'threshold', headerName: 'Mínimo', width: 100, type: 'number',
      renderCell: ({ value }) => <Cell><Typography variant="body2" color="text.secondary">{value ?? '—'}</Typography></Cell>,
    },
  ];

  if (isError) return <Alert severity="error">Erro ao carregar stock atual.</Alert>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`${current.length} artigos`} size="small" variant="outlined" />
          {lowStock.length > 0 && (
            <Chip icon={<WarningIcon />} label={`${lowStock.length} abaixo do mínimo`} size="small" color="error" />
          )}
        </Stack>
        <SearchBar searchTerm={search} onSearch={setSearch} />
      </Box>
      <DataGrid
        rows={filtered}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.id}
        density="comfortable"
        disableRowSelectionOnClick
        autoHeight
        slots={{ toolbar: GridToolbar }}
        slotProps={{ toolbar: { showQuickFilter: false } }}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        pageSizeOptions={[10, 25, 50]}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{
          border: 'none', borderRadius: 2,
          '& .MuiDataGrid-cell': { py: 1 },
          '& .MuiDataGrid-columnHeader': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
        }}
      />
    </Box>
  );
};

// ─── Tab: Artigos ─────────────────────────────────────────────────────────────
const ArtigosTab = ({ canManage }) => {
  const theme = useTheme();
  const { items, isLoading, isError } = useStockItems();
  const { removeItem } = useStockItemsCrud();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const filtered = useSearch(items, search);

  const handleEdit = (row) => { setSelected(row); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setSelected(null); };

  const columns = [
    { field: 'value', headerName: 'Nome', flex: 1, minWidth: 200, renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600}>{value}</Typography></Cell> },
    { field: 'tt_stocktype', headerName: 'Categoria', width: 160, renderCell: ({ value }) => <Cell><Chip label={value || '—'} size="small" variant="outlined" /></Cell> },
    { field: 'tt_unit', headerName: 'Unidade', width: 120, renderCell: ({ value }) => <Cell><Typography variant="body2">{value || '—'}</Typography></Cell> },
    { field: 'threshold', headerName: 'Stock Mínimo', width: 130, type: 'number', renderCell: ({ value }) => <Cell><Typography variant="body2">{value ?? 0}</Typography></Cell> },
    ...(canManage ? [{
      field: 'actions', headerName: '', width: 90, sortable: false, filterable: false, disableColumnMenu: true,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => handleEdit(row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => removeItem(row.pk)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      ),
    }] : []),
  ];

  if (isError) return <Alert severity="error">Erro ao carregar artigos.</Alert>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip label={`${items.length} artigos`} size="small" variant="outlined" />
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SearchBar searchTerm={search} onSearch={setSearch} />
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setSelected(null); setModalOpen(true); }}>
              Novo Artigo
            </Button>
          )}
        </Stack>
      </Box>
      <DataGrid
        rows={filtered}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.pk}
        density="comfortable"
        disableRowSelectionOnClick
        autoHeight
        slots={{ toolbar: GridToolbar }}
        slotProps={{ toolbar: { showQuickFilter: false } }}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        pageSizeOptions={[10, 25, 50]}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{
          border: 'none', borderRadius: 2,
          '& .MuiDataGrid-cell': { py: 1 },
          '& .MuiDataGrid-columnHeader': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
        }}
      />
      {canManage && <StockItemFormModal open={modalOpen} onClose={handleClose} item={selected} />}
    </Box>
  );
};

// ─── Tab: Entradas ────────────────────────────────────────────────────────────
const EntradasTab = ({ canManage }) => {
  const theme = useTheme();
  const { stockIn, isLoading, isError, removeStockIn } = useStockIn();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const filtered = useSearch(stockIn, search);

  const handleEdit = (row) => { setSelected(row); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setSelected(null); };

  const totalQty = useMemo(() => stockIn.reduce((s, r) => s + Number(r.quantity || 0), 0), [stockIn]);
  const totalVal = useMemo(() => stockIn.reduce((s, r) => s + Number(r.price || 0) * Number(r.quantity || 0), 0), [stockIn]);

  const columns = [
    { field: 'date', headerName: 'Data', width: 130, renderCell: ({ value }) => <Cell><Typography variant="body2">{formatDate(value)}</Typography></Cell> },
    { field: 'tt_stockitem', headerName: 'Artigo', flex: 1, minWidth: 180, renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600}>{value}</Typography></Cell> },
    { field: 'tt_stocktype', headerName: 'Categoria', width: 150, renderCell: ({ value }) => <Cell><Chip label={value || '—'} size="small" variant="outlined" /></Cell> },
    { field: 'tt_unit', headerName: 'Unidade', width: 100, renderCell: ({ value }) => <Cell><Typography variant="body2">{value || '—'}</Typography></Cell> },
    { field: 'quantity', headerName: 'Quantidade', width: 120, type: 'number', renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} color="success.main">{formatNum(value, 0)}</Typography></Cell> },
    { field: 'price', headerName: 'Preço Unit. (€)', width: 140, type: 'number', renderCell: ({ value }) => <Cell><Typography variant="body2">{value != null ? formatNum(value) + ' €' : '—'}</Typography></Cell> },
    ...(canManage ? [{
      field: 'actions', headerName: '', width: 90, sortable: false, filterable: false, disableColumnMenu: true,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => handleEdit(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => removeStockIn(row.pk)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    }] : []),
  ];

  if (isError) return <Alert severity="error">Erro ao carregar entradas de stock.</Alert>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`${stockIn.length} registos`} size="small" variant="outlined" />
          <Chip label={`Total: ${formatNum(totalQty, 0)} unid.`} size="small" color="success" variant="outlined" />
          {totalVal > 0 && <Chip label={`${formatNum(totalVal)} €`} size="small" color="success" />}
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SearchBar searchTerm={search} onSearch={setSearch} />
          {canManage && (
            <Button variant="contained" color="success" startIcon={<StockInIcon />} onClick={() => { setSelected(null); setModalOpen(true); }}>
              Nova Entrada
            </Button>
          )}
        </Stack>
      </Box>
      <DataGrid
        rows={filtered}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.pk}
        density="comfortable"
        disableRowSelectionOnClick
        autoHeight
        slots={{ toolbar: GridToolbar }}
        slotProps={{ toolbar: { showQuickFilter: false } }}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        pageSizeOptions={[10, 25, 50]}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{
          border: 'none', borderRadius: 2,
          '& .MuiDataGrid-cell': { py: 1 },
          '& .MuiDataGrid-columnHeader': { bgcolor: alpha(theme.palette.success.main, 0.04) },
        }}
      />
      {canManage && <StockInFormModal open={modalOpen} onClose={handleClose} entry={selected} />}
    </Box>
  );
};

// ─── Tab: Saídas ──────────────────────────────────────────────────────────────
const SaidasTab = ({ canManage }) => {
  const theme = useTheme();
  const { stockOut, isLoading, isError, removeStockOut } = useStockOut();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const filtered = useSearch(stockOut, search);

  const handleEdit = (row) => { setSelected(row); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setSelected(null); };

  const totalQty = useMemo(() => stockOut.reduce((s, r) => s + Number(r.quantity || 0), 0), [stockOut]);

  const columns = [
    { field: 'date', headerName: 'Data', width: 130, renderCell: ({ value }) => <Cell><Typography variant="body2">{formatDate(value)}</Typography></Cell> },
    { field: 'tt_stockitem', headerName: 'Artigo', flex: 1, minWidth: 180, renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600}>{value}</Typography></Cell> },
    { field: 'tt_stocktype', headerName: 'Categoria', width: 150, renderCell: ({ value }) => <Cell><Chip label={value || '—'} size="small" variant="outlined" /></Cell> },
    { field: 'tt_unit', headerName: 'Unidade', width: 100, renderCell: ({ value }) => <Cell><Typography variant="body2">{value || '—'}</Typography></Cell> },
    { field: 'quantity', headerName: 'Quantidade', width: 120, type: 'number', renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={600} color="error.main">{formatNum(value, 0)}</Typography></Cell> },
    {
      field: 'dest_descr', headerName: 'Destino', flex: 1, minWidth: 160,
      renderCell: ({ value, row }) => {
        const label = value || [row.dest_type, row.dest_place].filter(Boolean).join(' — ') || '—';
        return <Cell><Typography variant="body2" color="text.secondary" noWrap>{label}</Typography></Cell>;
      },
    },
    ...(canManage ? [{
      field: 'actions', headerName: '', width: 90, sortable: false, filterable: false, disableColumnMenu: true,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => handleEdit(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => removeStockOut(row.pk)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    }] : []),
  ];

  if (isError) return <Alert severity="error">Erro ao carregar saídas de stock.</Alert>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`${stockOut.length} registos`} size="small" variant="outlined" />
          <Chip label={`Total saído: ${formatNum(totalQty, 0)} unid.`} size="small" color="error" variant="outlined" />
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SearchBar searchTerm={search} onSearch={setSearch} />
          {canManage && (
            <Button variant="contained" color="error" startIcon={<StockOutIcon />} onClick={() => { setSelected(null); setModalOpen(true); }}>
              Nova Saída
            </Button>
          )}
        </Stack>
      </Box>
      <DataGrid
        rows={filtered}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.pk}
        density="comfortable"
        disableRowSelectionOnClick
        autoHeight
        slots={{ toolbar: GridToolbar }}
        slotProps={{ toolbar: { showQuickFilter: false } }}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        pageSizeOptions={[10, 25, 50]}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{
          border: 'none', borderRadius: 2,
          '& .MuiDataGrid-cell': { py: 1 },
          '& .MuiDataGrid-columnHeader': { bgcolor: alpha(theme.palette.error.main, 0.04) },
        }}
      />
      {canManage && <StockOutFormModal open={modalOpen} onClose={handleClose} entry={selected} />}
    </Box>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const TABS = [
  { label: 'Stock Atual', icon: <StockIcon fontSize="small" /> },
  { label: 'Artigos', icon: <StockIcon fontSize="small" /> },
  { label: 'Entradas', icon: <StockInIcon fontSize="small" /> },
  { label: 'Saídas', icon: <StockOutIcon fontSize="small" /> },
];

const StockPage = () => {
  const [tab, setTab] = useState(0);
  const { hasPermission } = usePermissionContext();
  const canManage = hasPermission('stock.manage');

  return (
    <ModulePage
      title="Gestão de Stock"
      subtitle="Controlo de materiais e consumíveis"
      icon={StockIcon}
      color="#059669"
      breadcrumbs={[{ label: 'Stock' }]}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TABS.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {tab === 0 && <StockAtualTab />}
      {tab === 1 && <ArtigosTab canManage={canManage} />}
      {tab === 2 && <EntradasTab canManage={canManage} />}
      {tab === 3 && <SaidasTab canManage={canManage} />}
    </ModulePage>
  );
};

export default StockPage;
