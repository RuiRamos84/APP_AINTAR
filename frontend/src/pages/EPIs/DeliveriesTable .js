import React, { useState } from 'react';
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
    Tooltip
} from '@mui/material';
import {
    Download,
    FilterList,
    Sort,
    Today,
    DateRange,
    CalendarMonth,
    CalendarToday,
    Numbers
} from '@mui/icons-material';
import { exportToExcel } from './exportUtils';


const DeliveriesTable = ({
    deliveries = [],
    loading = false,
    columns = [],
    onExport
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

        switch (period) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'week':
                start.setDate(now.getDate() - 7);
                break;
            case 'month':
                start.setMonth(now.getMonth() - 1);
                break;
            default:
                start = null;
        }

        setFilters(prev => ({
            ...prev,
            dateRange: start ? { start, end: now } : null
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

    const filterData = (data) => {
        return data.filter(item => {
            // Filtro de texto
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const matches = Object.entries(item).some(([key, value]) => {
                    if (typeof value === 'string') {
                        return value.toLowerCase().includes(searchTerm);
                    }
                    if (typeof value === 'number') {
                        return value.toString().includes(searchTerm);
                    }
                    return false;
                });
                if (!matches) return false;
            }

            // Filtro de data
            if (filters.dateRange) {
                const itemDate = new Date(item.data);
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
        const sorted = [...data].sort((a, b) => {
            switch (sortConfig.type) {
                case 'date':
                    return new Date(b.data) - new Date(a.data);
                case 'type':
                    return a.tt_epiwhat.localeCompare(b.tt_epiwhat);
                case 'quantity':
                    return b.quantity - a.quantity;
                default:
                    return 0;
            }
        });

        if (sortConfig.group) {
            const grouped = {};
            sorted.forEach(item => {
                const key = item.tt_epiwhat;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(item);
            });
            return Object.values(grouped).flat();
        }

        return sorted;
    };

    const processedData = sortData(filterData(deliveries));
    const paginatedData = processedData.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <Paper sx={{ width: '100%', mb: 2 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
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
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ordenar">
                            <IconButton onClick={() => setSortDialogOpen(true)}>
                                <Sort />
                            </IconButton>
                        </Tooltip>
                    </ButtonGroup>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={handleExport}
                >
                    Exportar
                </Button>
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