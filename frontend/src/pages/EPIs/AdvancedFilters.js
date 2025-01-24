import React, { useState } from 'react';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Checkbox,
    RadioGroup,
    FormControlLabel,
    Radio,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Today,
    DateRange,
    CalendarMonth,
    CalendarToday,
    ArrowUpward,
    ArrowDownward,
    GroupWork
} from '@mui/icons-material';

const FilterMenu = ({ anchorEl, open, onClose, filters, onFilterChange }) => {
    const handleDateFilterChange = (period) => {
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate = null;
        }

        onFilterChange({
            ...filters,
            dateRange: period === 'all' ? null : { start: startDate, end: now }
        });
        onClose();
    };

    const handleQuantityFilterChange = (range) => {
        onFilterChange({
            ...filters,
            quantity: range
        });
        onClose();
    };

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
        >
            <MenuItem disabled>
                <ListItemText primary="Filtrar por Data" />
            </MenuItem>
            <MenuItem onClick={() => handleDateFilterChange('today')}>
                <ListItemIcon><Today fontSize="small" /></ListItemIcon>
                <ListItemText primary="Hoje" />
            </MenuItem>
            <MenuItem onClick={() => handleDateFilterChange('week')}>
                <ListItemIcon><DateRange fontSize="small" /></ListItemIcon>
                <ListItemText primary="Última Semana" />
            </MenuItem>
            <MenuItem onClick={() => handleDateFilterChange('month')}>
                <ListItemIcon><CalendarMonth fontSize="small" /></ListItemIcon>
                <ListItemText primary="Último Mês" />
            </MenuItem>
            <MenuItem onClick={() => handleDateFilterChange('all')}>
                <ListItemIcon><CalendarToday fontSize="small" /></ListItemIcon>
                <ListItemText primary="Todas as Datas" />
            </MenuItem>
            <Divider />
            <MenuItem disabled>
                <ListItemText primary="Filtrar por Quantidade" />
            </MenuItem>
            <MenuItem onClick={() => handleQuantityFilterChange('all')}>
                <ListItemText primary="Todas" />
            </MenuItem>
            <MenuItem onClick={() => handleQuantityFilterChange('gt1')}>
                <ListItemText primary="Maior que 1" />
            </MenuItem>
            <MenuItem onClick={() => handleQuantityFilterChange('gt5')}>
                <ListItemText primary="Maior que 5" />
            </MenuItem>
        </Menu>
    );
};

const SortDialog = ({ open, onClose, sortConfig, onSortChange }) => {
    const [localSortConfig, setLocalSortConfig] = useState(sortConfig);

    const handleSave = () => {
        onSortChange(localSortConfig);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Opções de Ordenação</DialogTitle>
            <DialogContent>
                <RadioGroup
                    value={localSortConfig.type}
                    onChange={(e) => setLocalSortConfig({
                        ...localSortConfig,
                        type: e.target.value
                    })}
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
                            checked={localSortConfig.group}
                            onChange={(e) => setLocalSortConfig({
                                ...localSortConfig,
                                group: e.target.checked
                            })}
                        />
                    }
                    label="Agrupar por Tipo"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} variant="contained">
                    Aplicar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export { FilterMenu, SortDialog };