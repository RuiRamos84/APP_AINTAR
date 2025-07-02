import React from 'react';
import {
    Box,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Grid,
    useTheme,
    Collapse,
    alpha,
    Divider,
    Badge,
    TextField,
    InputAdornment
} from '@mui/material';
import {
    FilterAlt as FilterIcon,
    Clear as ClearIcon,
    Schedule as ScheduleIcon,
    KeyboardArrowDown as ExpandMoreIcon,
    Notifications as NotificationIcon,
    AccountTree as TypeIcon,
    LocationCity as AssociateIcon,
    Assignment as DocumentIcon,
    Person as CreatorIcon,
    DateRange as DateRangeIcon,
    FileDownload as ExportIcon
} from '@mui/icons-material';

const DocumentFilters = ({
    open,
    filters,
    metaData,
    onFilterChange,
    onResetFilters,
    density = 'standard',
    onExportExcel,
    dateRange,
    onDateRangeChange
}) => {
    const theme = useTheme();
    const hasFilters = Object.values(filters).some(val => val !== '') ||
        (dateRange.startDate !== null || dateRange.endDate !== null);
    const hasStatusOptions = metaData?.what && Array.isArray(metaData.what);
    const hasAssociateOptions = metaData?.associates && Array.isArray(metaData.associates);
    const hasTypeOptions = metaData?.types && Array.isArray(metaData.types);
    const activeFiltersCount = Object.values(filters).filter(v => v !== '').length +
        ((dateRange.startDate ? 1 : 0) + (dateRange.endDate ? 1 : 0));

    // Configurações baseadas na densidade
    const getPaperPadding = () => density === 'compact' ? 1.5 : density === 'comfortable' ? 3 : 2;
    const getSpacing = () => density === 'compact' ? 1.5 : density === 'comfortable' ? 3 : 2;
    const getElementSize = () => density === 'compact' ? 'small' : density === 'comfortable' ? 'medium' : 'small';

    // Handle date change
    const handleDateChange = (type, event) => {
        const dateValue = event.target.value;
        console.log(`Data ${type} alterada para:`, dateValue);

        onDateRangeChange({
            ...dateRange,
            [type]: dateValue || null
        });
    };

    return (
        <Collapse in={open} timeout="auto">
            <Paper
                variant="outlined"
                sx={{
                    p: getPaperPadding(),
                    mb: 2,
                    bgcolor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.background.paper, 0.5)
                        : alpha(theme.palette.grey[50], 0.9),
                    borderRadius: 1,
                    boxShadow: hasFilters ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
                    position: 'relative'
                }}
            >
                {/* Badge para indicar filtros ativos */}
                {activeFiltersCount > 0 && (
                    <Badge
                        badgeContent={activeFiltersCount}
                        color="primary"
                        sx={{ position: 'absolute', top: -8, right: -8 }}
                    />
                )}

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography
                        variant="subtitle1"
                        fontWeight="medium"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            color: hasFilters ? theme.palette.primary.main : 'inherit'
                        }}
                    >
                        <FilterIcon sx={{ mr: 1, color: hasFilters ? theme.palette.primary.main : theme.palette.text.secondary }} />
                        Filtros
                    </Typography>

                    <Box display="flex" gap={1}>
                        <Button
                            size={getElementSize()}
                            variant="outlined"
                            color="primary"
                            startIcon={<ExportIcon />}
                            onClick={onExportExcel}
                        >
                            Exportar Excel
                        </Button>
                        <Button
                            size={getElementSize()}
                            variant={hasFilters ? "outlined" : "text"}
                            color="primary"
                            startIcon={<ClearIcon />}
                            onClick={onResetFilters}
                            disabled={!hasFilters}
                        >
                            Limpar filtros
                        </Button>
                    </Box>
                </Box>

                <Grid container spacing={getSpacing()}>
                    {/* Status Filter */}
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <FormControl size={getElementSize()} fullWidth variant="outlined">
                            <InputLabel id="status-filter-label">Status</InputLabel>
                            <Select
                                labelId="status-filter-label"
                                name="status"
                                value={filters?.status ?? ''}
                                onChange={onFilterChange}
                                label="Status"
                                IconComponent={ExpandMoreIcon}
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: filters?.status ? theme.palette.primary.main : undefined,
                                    }
                                }}
                            >
                                <MenuItem value=""><em>Todos os estados</em></MenuItem>
                                {hasStatusOptions && metaData.what
                                    .sort((a, b) => a.pk - b.pk)
                                    .map(status => (
                                        <MenuItem key={status.pk} value={status.pk}>
                                            {status.step}
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Associate Filter */}
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <FormControl size={getElementSize()} fullWidth variant="outlined">
                            <InputLabel id="associate-filter-label">Associado</InputLabel>
                            <Select
                                labelId="associate-filter-label"
                                name="associate"
                                value={filters?.associate ?? ''}
                                onChange={onFilterChange}
                                label="Associado"
                                IconComponent={ExpandMoreIcon}
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: filters?.associate ? theme.palette.primary.main : undefined,
                                    }
                                }}
                            >
                                <MenuItem value=""><em>Todos os associados</em></MenuItem>
                                {hasAssociateOptions && metaData.associates.map(associate => (
                                    <MenuItem key={associate.pk} value={associate.pk}>
                                        {associate.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Type Filter */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <FormControl size={getElementSize()} fullWidth variant="outlined">
                            <InputLabel id="type-filter-label">Tipo de Pedido</InputLabel>
                            <Select
                                labelId="type-filter-label"
                                name="type"
                                value={filters?.type ?? ''}
                                onChange={onFilterChange}
                                label="Tipo de Pedido"
                                IconComponent={ExpandMoreIcon}
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: filters?.type ? theme.palette.primary.main : undefined,
                                    }
                                }}
                            >
                                <MenuItem value=""><em>Todos os tipos</em></MenuItem>
                                {hasTypeOptions && metaData.types
                                    .sort((a, b) => a.tt_doctype_value.localeCompare(b.tt_doctype_value))
                                    .map(type => (
                                        <MenuItem key={type.pk} value={type.pk}>
                                            {type.tt_doctype_value}
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Notification Filter */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <FormControl size={getElementSize()} fullWidth variant="outlined">
                            <InputLabel id="notification-filter-label">Notificações</InputLabel>
                            <Select
                                labelId="notification-filter-label"
                                name="notification"
                                value={filters?.notification ?? ''}
                                onChange={onFilterChange}
                                label="Notificações"
                                IconComponent={ExpandMoreIcon}
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: filters?.notification ? theme.palette.primary.main : undefined,
                                    }
                                }}
                                startAdornment={filters?.notification ? <NotificationIcon color="primary" sx={{ ml: 1 }} /> : null}
                            >
                                <MenuItem value=""><em>Todas</em></MenuItem>
                                <MenuItem value="1">
                                    <Box display="flex" alignItems="center">
                                        <NotificationIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
                                        Com Notificação
                                    </Box>
                                </MenuItem>
                                <MenuItem value="0">Sem Notificação</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 3, mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <DateRangeIcon sx={{ mr: 1 }} />
                        Filtrar por data
                    </Typography>

                    <Grid container spacing={getSpacing()}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                label="Data inicial"
                                type="date"
                                value={dateRange.startDate || ''}
                                onChange={(e) => handleDateChange('startDate', e)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size={getElementSize()}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <ScheduleIcon fontSize="small" color={dateRange.startDate ? "primary" : "inherit"} />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': {
                                            borderColor: dateRange.startDate ? theme.palette.primary.main : undefined,
                                        },
                                    },
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                label="Data final"
                                type="date"
                                value={dateRange.endDate || ''}
                                onChange={(e) => handleDateChange('endDate', e)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size={getElementSize()}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <ScheduleIcon fontSize="small" color={dateRange.endDate ? "primary" : "inherit"} />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': {
                                            borderColor: dateRange.endDate ? theme.palette.primary.main : undefined,
                                        },
                                    },
                                }}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Collapse>
    );
};

export default DocumentFilters;