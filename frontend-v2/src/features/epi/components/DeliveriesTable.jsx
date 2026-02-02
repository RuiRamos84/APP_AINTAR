/**
 * DeliveriesTable - Tabela de entregas de EPI/Fardamento
 *
 * Tabela com filtros, ordenação, paginação e ações
 * Reutilizável para EPIs e Fardamento
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  TablePagination,
  IconButton,
  Box,
  ButtonGroup,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  Tooltip,
  Chip,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Download,
  FilterList,
  Sort,
  Today,
  DateRange,
  CalendarMonth,
  CalendarToday,
  Numbers,
  Add,
  Edit,
  Cancel,
} from '@mui/icons-material';
import { SearchBar } from '@/shared/components/data';
import { useEpi } from '../hooks/useEpi';
import DeliveryFormModal from './DeliveryFormModal';
import EditDeliveryDialog from './EditDeliveryDialog';
import CancelDeliveryDialog from './CancelDeliveryDialog';
import { exportToExcel } from '../utils/exportUtils';

const DeliveriesTable = ({ type = 'epi' }) => {
  const {
    selectedEmployee,
    deliveries,
    loadingDeliveries,
    epiTypes,
    uniformTypes,
    fetchDeliveries,
  } = useEpi();

  // State para dialogs
  const [bulkDeliveryOpen, setBulkDeliveryOpen] = useState(false);
  const [editDelivery, setEditDelivery] = useState(null);
  const [cancelDelivery, setCancelDelivery] = useState(null);

  // State para tabela
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    dateRange: null,
    quantity: null,
  });
  const [sortConfig, setSortConfig] = useState({
    type: 'date',
    direction: 'desc',
    group: false,
  });

  // Buscar entregas quando colaborador mudar
  useEffect(() => {
    if (selectedEmployee) {
      fetchDeliveries(selectedEmployee.pk, type);
    }
  }, [selectedEmployee?.pk, type]);

  // Tipos de equipamento baseado no type
  const equipmentTypes = type === 'epi' ? epiTypes : uniformTypes;

  // Handlers de filtro
  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleDateFilter = (period) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        end = now;
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        end = now;
        break;
      default:
        start = null;
        end = null;
    }

    setFilters((prev) => ({
      ...prev,
      dateRange: start ? { start, end } : null,
    }));
    handleFilterClose();
  };

  const handleQuantityFilter = (range) => {
    setFilters((prev) => ({
      ...prev,
      quantity: range === 'all' ? null : range,
    }));
    handleFilterClose();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      dateRange: null,
      quantity: null,
    });
    setSortConfig({ type: 'date', direction: 'desc', group: false });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.dateRange) count++;
    if (filters.quantity) count++;
    return count;
  };

  // Filtragem e ordenação
  const filterData = (data) => {
    return data.filter((item) => {
      // Filtrar por tipo (EPI ou Fardamento)
      const whatType = type === 'epi' ? 1 : 2;
      if (item.what !== whatType) return false;

      // Filtro de texto
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matches =
          item.tt_epiwhat?.toLowerCase().includes(searchTerm) ||
          item.dim?.toLowerCase().includes(searchTerm) ||
          item.memo?.toLowerCase().includes(searchTerm) ||
          item.quantity?.toString().includes(searchTerm) ||
          new Date(item.data).toLocaleDateString('pt-PT').includes(searchTerm);

        if (!matches) return false;
      }

      // Filtro de data
      if (filters.dateRange) {
        const itemDate = new Date(new Date(item.data).toDateString());
        if (itemDate < filters.dateRange.start || itemDate > filters.dateRange.end) {
          return false;
        }
      }

      // Filtro de quantidade
      if (filters.quantity) {
        const qty = Number(item.quantity);
        switch (filters.quantity) {
          case 'gt1':
            if (qty <= 1) return false;
            break;
          case 'gt5':
            if (qty <= 5) return false;
            break;
        }
      }

      return true;
    });
  };

  const sortData = (data) => {
    const sortedData = [...data];

    sortedData.sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      if (sortConfig.type === 'date') {
        return (new Date(a.data) - new Date(b.data)) * dir;
      }
      if (sortConfig.type === 'type') {
        return (a.tt_epiwhat || '').localeCompare(b.tt_epiwhat || '') * dir;
      }
      if (sortConfig.type === 'quantity') {
        return (a.quantity - b.quantity) * dir;
      }
      return 0;
    });

    if (sortConfig.group) {
      return sortedData.sort((a, b) => (a.tt_epiwhat || '').localeCompare(b.tt_epiwhat || ''));
    }
    return sortedData;
  };

  const processedData = useMemo(() => {
    return sortData(filterData(deliveries));
  }, [deliveries, filters, sortConfig, type]);

  const paginatedData = processedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Formatação de data
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-PT');
  };

  // Exportar para Excel
  const handleExport = () => {
    const data = processedData.map((row) => ({
      Data: formatDate(row.data),
      Tipo: row.tt_epiwhat,
      Tamanho: row.dim || '-',
      Quantidade: row.quantity,
      Observações: row.memo || '-',
      Anulado: row.returned ? formatDate(row.returned) : 'Não',
    }));

    const fileName = type === 'epi' ? 'entregas_epi' : 'entregas_fardamento';
    exportToExcel(data, fileName);
  };

  // Callback após criar entrega
  const handleDeliverySuccess = () => {
    setBulkDeliveryOpen(false);
    if (selectedEmployee) {
      fetchDeliveries(selectedEmployee.pk, type);
    }
  };

  // Callback após editar entrega
  const handleEditSuccess = () => {
    setEditDelivery(null);
    if (selectedEmployee) {
      fetchDeliveries(selectedEmployee.pk, type);
    }
  };

  // Callback após anular entrega
  const handleCancelSuccess = () => {
    setCancelDelivery(null);
    if (selectedEmployee) {
      fetchDeliveries(selectedEmployee.pk, type);
    }
  };

  if (!selectedEmployee) {
    return null;
  }

  return (
    <Paper sx={{ width: '100%' }}>
      {/* Toolbar */}
      <Box
        sx={{ p: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Campo de pesquisa */}
          <SearchBar
            searchTerm={filters.search}
            onSearch={(value) => setFilters((prev) => ({ ...prev, search: value }))}
          />

          {/* Botões de filtro e ordenação */}
          <ButtonGroup variant="outlined" size="small">
            <Tooltip title="Filtrar">
              <IconButton onClick={handleFilterClick}>
                <FilterList />
                {getActiveFiltersCount() > 0 && (
                  <Chip
                    label={getActiveFiltersCount()}
                    size="small"
                    color="primary"
                    sx={{ ml: 0.5, height: 16, minWidth: 16, fontSize: '0.65rem' }}
                  />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Ordenar">
              <IconButton onClick={() => setSortDialogOpen(true)}>
                <Sort />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          {/* Chips de filtros ativos */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {filters.dateRange && (
              <Chip
                label="Filtro de data"
                size="small"
                onDelete={() => setFilters((prev) => ({ ...prev, dateRange: null }))}
              />
            )}
            {filters.quantity && (
              <Chip
                label="Filtro de quantidade"
                size="small"
                onDelete={() => setFilters((prev) => ({ ...prev, quantity: null }))}
              />
            )}
            {(sortConfig.type !== 'date' || sortConfig.group) && (
              <Chip
                label={`Ordem: ${
                  sortConfig.type === 'type'
                    ? 'Tipo'
                    : sortConfig.type === 'quantity'
                      ? 'Quantidade'
                      : 'Data'
                }${sortConfig.group ? ' (Agrupado)' : ''}`}
                size="small"
                color="secondary"
                onDelete={() => setSortConfig({ type: 'date', direction: 'desc', group: false })}
              />
            )}
          </Stack>

          {getActiveFiltersCount() > 0 && (
            <Button variant="text" size="small" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          )}
        </Box>

        {/* Botões de ação */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>
            Exportar
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setBulkDeliveryOpen(true)}
          >
            Registar Entrega
          </Button>
        </Box>
      </Box>

      {/* Tabela */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Tamanho</TableCell>
              <TableCell align="center">Qtd.</TableCell>
              <TableCell>Observações</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingDeliveries ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    A carregar...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum registo encontrado
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow
                  key={row.pk}
                  sx={{
                    opacity: row.returned ? 0.5 : 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell>{formatDate(row.data)}</TableCell>
                  <TableCell>{row.tt_epiwhat}</TableCell>
                  <TableCell>{row.dim || '-'}</TableCell>
                  <TableCell align="center">{row.quantity}</TableCell>
                  <TableCell>
                    {row.returned ? (
                      <Chip
                        label={`Anulado: ${formatDate(row.returned)}`}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    ) : (
                      row.memo || '-'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title={row.returned ? 'Entrega anulada' : 'Editar'}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setEditDelivery(row)}
                            disabled={!!row.returned}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={row.returned ? 'Entrega anulada' : 'Anular'}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setCancelDelivery(row)}
                            disabled={!!row.returned}
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginação */}
      <TablePagination
        component="div"
        count={processedData.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />

      {/* Menu de Filtros */}
      <Menu anchorEl={filterAnchorEl} open={Boolean(filterAnchorEl)} onClose={handleFilterClose}>
        <MenuItem disabled>
          <ListItemText primary="Filtrar por Data" />
        </MenuItem>
        <MenuItem onClick={() => handleDateFilter('today')}>
          <ListItemIcon>
            <Today fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Hoje" />
        </MenuItem>
        <MenuItem onClick={() => handleDateFilter('week')}>
          <ListItemIcon>
            <DateRange fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Última Semana" />
        </MenuItem>
        <MenuItem onClick={() => handleDateFilter('month')}>
          <ListItemIcon>
            <CalendarMonth fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Último Mês" />
        </MenuItem>
        <MenuItem onClick={() => handleDateFilter('all')}>
          <ListItemIcon>
            <CalendarToday fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Todas as Datas" />
        </MenuItem>
        <Divider />
        <MenuItem disabled>
          <ListItemText primary="Filtrar por Quantidade" />
        </MenuItem>
        <MenuItem onClick={() => handleQuantityFilter('all')}>
          <ListItemIcon>
            <Numbers fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Todas" />
        </MenuItem>
        <MenuItem onClick={() => handleQuantityFilter('gt1')}>
          <ListItemText primary="Maior que 1" />
        </MenuItem>
        <MenuItem onClick={() => handleQuantityFilter('gt5')}>
          <ListItemText primary="Maior que 5" />
        </MenuItem>
      </Menu>

      {/* Dialog de Ordenação */}
      <Dialog open={sortDialogOpen} onClose={() => setSortDialogOpen(false)}>
        <DialogTitle>Opções de Ordenação</DialogTitle>
        <DialogContent>
          <RadioGroup
            value={sortConfig.type}
            onChange={(e) =>
              setSortConfig((prev) => ({
                ...prev,
                type: e.target.value,
              }))
            }
          >
            <FormControlLabel value="date" control={<Radio />} label="Por Data" />
            <FormControlLabel value="type" control={<Radio />} label="Por Tipo" />
            <FormControlLabel value="quantity" control={<Radio />} label="Por Quantidade" />
          </RadioGroup>
          <Divider sx={{ my: 2 }} />
          <FormControlLabel
            control={
              <Checkbox
                checked={sortConfig.direction === 'asc'}
                onChange={(e) =>
                  setSortConfig((prev) => ({
                    ...prev,
                    direction: e.target.checked ? 'asc' : 'desc',
                  }))
                }
              />
            }
            label="Ordem Crescente"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={sortConfig.group}
                onChange={(e) =>
                  setSortConfig((prev) => ({
                    ...prev,
                    group: e.target.checked,
                  }))
                }
              />
            }
            label="Agrupar por Tipo"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSortDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialogs */}
      <DeliveryFormModal
        open={bulkDeliveryOpen}
        onClose={() => setBulkDeliveryOpen(false)}
        onSuccess={handleDeliverySuccess}
        type={type}
        equipmentTypes={equipmentTypes}
      />

      <EditDeliveryDialog
        open={!!editDelivery}
        onClose={() => setEditDelivery(null)}
        delivery={editDelivery}
        onSuccess={handleEditSuccess}
      />

      <CancelDeliveryDialog
        open={!!cancelDelivery}
        onClose={() => setCancelDelivery(null)}
        delivery={cancelDelivery}
        onSuccess={handleCancelSuccess}
      />
    </Paper>
  );
};

export default DeliveriesTable;
