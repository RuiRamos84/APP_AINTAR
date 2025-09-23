import React, { useState, useMemo } from 'react';
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
    TextField,
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
    Stack
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
    Add
} from '@mui/icons-material';
import { exportToExcel } from './exportUtils';


const DeliveriesTable = ({
    deliveries = [],
    loading = false,
    columns = [],
    onExport,
    onBulkDelivery
}) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterAnchorEl, setFilterAnchorEl] = useState(null);
    const [sortDialogOpen, setSortDialogOpen] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        dateRange: null,
        quantity: null
    });
    const [sortConfig, setSortConfig] = useState({
        type: 'date',
        direction: 'desc',
        group: false
    });

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

        setFilters(prev => ({
            ...prev,
            dateRange: start ? { start, end } : null
        }));
        handleFilterClose();
    };

    const handleQuantityFilter = (range) => {
        setFilters(prev => ({
            ...prev,
            quantity: range
        }));
        handleFilterClose();
    };

    const handleSortChange = (newConfig) => {
        setSortConfig(newConfig);
        setSortDialogOpen(false);
    };

    const handleExport = () => {
        const data = processedData.map(row => {
            const formattedRow = {};
            columns.forEach(column => {
                formattedRow[column.id] = column.render
                    ? column.render(row)
                    : row[column.id];
            });
            return formattedRow;
        });

        exportToExcel(data, columns, 'registos_entregas');
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            dateRange: null,
            quantity: null
        });
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.search) count++;
        if (filters.dateRange) count++;
        if (filters.quantity) count++;
        return count;
    };

    const filterData = (data) => {
        return data.filter(item => {
            // Filtro de texto melhorado
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
                // Assuming item.data is a string like 'YYYY-MM-DD' or a full ISO string.
                // Creating a date object from it might include timezone offsets.
                const itemDate = new Date(new Date(item.data).toDateString()); // Normalize to midnight in local timezone
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
                    default:
                        return false;
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
                return a.tt_epiwhat.localeCompare(b.tt_epiwhat) * dir;
            }
            if (sortConfig.type === 'quantity') {
                return (a.quantity - b.quantity) * dir;
            }
            return 0;
        });

        if (sortConfig.group) {
            return sortedData.sort((a, b) => a.tt_epiwhat.localeCompare(b.tt_epiwhat));
        }
        return sortedData;
    };

    const processedData = useMemo(() => {
        return sortData(filterData(deliveries));
    }, [deliveries, filters, sortConfig]);

    const paginatedData = processedData.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <Paper sx={{ width: '100%', mb: 2 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        size="small"
                        placeholder="Filtrar..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                    <ButtonGroup variant="outlined" size="small">
                        <Tooltip title="Filtrar">
                            <IconButton onClick={handleFilterClick}>
                                <FilterList />
                                {getActiveFiltersCount() > 0 && (
                                    <Chip
                                        label={getActiveFiltersCount()}
                                        size="small"
                                        color="primary"
                                        sx={{ ml: 1, height: 16, minWidth: 16 }}
                                    />
                                )}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ordenar">
                            <IconButton onClick={() => setSortDialogOpen(true)}>
                                <Sort />
                                {(sortConfig.type !== 'date' || sortConfig.group) && (
                                    <Chip
                                        label="1"
                                        size="small"
                                        color="secondary"
                                        sx={{ ml: 1, height: 16, minWidth: 16 }}
                                    />
                                )}
                            </IconButton>
                        </Tooltip>
                    </ButtonGroup>

                    {/* Chips de filtros activos */}
                    <Stack direction="row" spacing={1}>
                        {filters.search && (
                            <Chip
                                label={`Pesquisa: ${filters.search}`}
                                size="small"
                                onDelete={() => setFilters(prev => ({ ...prev, search: '' }))}
                            />
                        )}
                        {filters.dateRange && (
                            <Chip
                                label="Filtro de data activo"
                                size="small"
                                onDelete={() => setFilters(prev => ({ ...prev, dateRange: null }))}
                            />
                        )}
                        {filters.quantity && (
                            <Chip
                                label="Filtro de quantidade activo"
                                size="small"
                                onDelete={() => setFilters(prev => ({ ...prev, quantity: null }))}
                            />
                        )}

                        {/* Chip de ordenação activa */}
                        {(sortConfig.type !== 'date' || sortConfig.group) && (
                            <Chip
                                label={`Ordenação: ${sortConfig.type === 'type' ? 'Por Tipo' :
                                        sortConfig.type === 'quantity' ? 'Por Quantidade' :
                                            'Por Data'
                                    }${sortConfig.group ? ' + Agrupado' : ''}`}
                                size="small"
                                color="secondary"
                                onDelete={() => setSortConfig({ type: 'date', direction: 'desc', group: false })}
                            />
                        )}
                    </Stack>

                    {(getActiveFiltersCount() > 0 || (sortConfig.type !== 'date' || sortConfig.group)) && (
                        <Button
                            variant="text"
                            size="small"
                            onClick={() => {
                                clearFilters();
                                setSortConfig({ type: 'date', direction: 'desc', group: false });
                            }}
                        >
                            Limpar Tudo
                        </Button>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleExport}
                    >
                        Exportar
                    </Button>
                    {onBulkDelivery && (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={onBulkDelivery}
                        >
                            Registar Entrega
                        </Button>
                    )}
                </Box>
            </Box>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columns.map(column => (
                                <TableCell key={column.id}>{column.label}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center">
                                    A carregar...
                                </TableCell>
                            </TableRow>
                        ) : paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center">
                                    Nenhum registo encontrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((row, index) => (
                                <TableRow key={row.id || index}>
                                    {columns.map(column => (
                                        <TableCell key={column.id}>
                                            {column.render ? column.render(row) : row[column.id]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

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
                labelRowsPerPage="Linhas por página:"
            />

            {/* Menu de Filtros */}
            <Menu
                anchorEl={filterAnchorEl}
                open={Boolean(filterAnchorEl)}
                onClose={handleFilterClose}
            >
                <MenuItem disabled>
                    <ListItemText primary="Filtrar por Data" />
                </MenuItem>
                <MenuItem onClick={() => handleDateFilter('today')}>
                    <ListItemIcon><Today fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Hoje" />
                </MenuItem>
                <MenuItem onClick={() => handleDateFilter('week')}>
                    <ListItemIcon><DateRange fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Última Semana" />
                </MenuItem>
                <MenuItem onClick={() => handleDateFilter('month')}>
                    <ListItemIcon><CalendarMonth fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Último Mês" />
                </MenuItem>
                <MenuItem onClick={() => handleDateFilter('all')}>
                    <ListItemIcon><CalendarToday fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Todas as Datas" />
                </MenuItem>
                <Divider />
                <MenuItem disabled>
                    <ListItemText primary="Filtrar por Quantidade" />
                </MenuItem>
                <MenuItem onClick={() => handleQuantityFilter('all')}>
                    <ListItemIcon><Numbers fontSize="small" /></ListItemIcon>
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
            <Dialog
                open={sortDialogOpen}
                onClose={() => setSortDialogOpen(false)}
            >
                <DialogTitle>Opções de Ordenação</DialogTitle>
                <DialogContent>
                    <RadioGroup
                        value={sortConfig.type}
                        onChange={(e) => setSortConfig(prev => ({
                            ...prev,
                            type: e.target.value
                        }))}
                    >
                        <FormControlLabel
                            value="date"
                            control={<Radio />}
                            label="Por Data"
                        />
                        <FormControlLabel
                            value="type"
                            control={<Radio />}
                            label="Por Tipo"
                        />
                        <FormControlLabel
                            value="quantity"
                            control={<Radio />}
                            label="Por Quantidade"
                        />
                    </RadioGroup>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={sortConfig.group}
                                onChange={(e) => setSortConfig(prev => ({
                                    ...prev,
                                    group: e.target.checked
                                }))}
                            />
                        }
                        label="Agrupar por Tipo"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSortDialogOpen(false)}>Cancelar</Button>
                    <Button
                        onClick={() => setSortDialogOpen(false)}
                        variant="contained"
                    >
                        Aplicar
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default DeliveriesTable;