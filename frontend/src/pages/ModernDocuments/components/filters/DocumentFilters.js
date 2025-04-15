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
    Chip,
    Stack,
    Tooltip,
    Divider,
    Badge
} from '@mui/material';
import {
    FilterAlt as FilterIcon,
    Clear as ClearIcon,
    Sort as SortIcon,
    Schedule as ScheduleIcon,
    KeyboardArrowDown as ExpandMoreIcon,
    KeyboardArrowUp as ExpandLessIcon,
    Notifications as NotificationIcon,
    AccountTree as TypeIcon,
    LocationCity as AssociateIcon,
    Assignment as DocumentIcon,
    Person as CreatorIcon
} from '@mui/icons-material';

const DocumentFilters = ({
    open,
    filters,
    sortBy,
    sortDirection,
    metaData,
    onFilterChange,
    onResetFilters,
    onSortChange,
    density = 'standard',
}) => {
    const theme = useTheme();
    const hasFilters = Object.values(filters).some(val => val !== '');
    const hasStatusOptions = metaData?.what && Array.isArray(metaData.what);
    const hasAssociateOptions = metaData?.associates && Array.isArray(metaData.associates);
    const hasTypeOptions = metaData?.types && Array.isArray(metaData.types);
    const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

    // Configurações baseadas na densidade
    const getPaperPadding = () => density === 'compact' ? 1.5 : density === 'comfortable' ? 3 : 2;
    const getSpacing = () => density === 'compact' ? 1.5 : density === 'comfortable' ? 3 : 2;
    const getElementSize = () => density === 'compact' ? 'small' : density === 'comfortable' ? 'medium' : 'small';

    // Opções de ordenação com ícones
    const sortOptions = [
        { field: 'submission', label: 'Data', icon: <ScheduleIcon fontSize="small" /> },
        { field: 'regnumber', label: 'Número', icon: <DocumentIcon fontSize="small" /> },
        { field: 'ts_entity', label: 'Entidade', icon: <AssociateIcon fontSize="small" /> },
        { field: 'what', label: 'Status', icon: <FilterIcon fontSize="small" /> },
        { field: 'tt_type', label: 'Tipo', icon: <TypeIcon fontSize="small" /> },
        { field: 'creator', label: 'Criador', icon: <CreatorIcon fontSize="small" /> },
    ];

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

                <Grid container spacing={getSpacing()}>
                    {/* Status Filter */}
                    <Grid item xs={12} sm={6} md={3}>
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
                    <Grid item xs={12} sm={6} md={3}>
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
                    <Grid item xs={12} sm={6} md={3}>
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
                    <Grid item xs={12} sm={6} md={3}>
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

                <Divider sx={{ my: 2 }} />

                {/* Ordenação em chips */}
                <Box>
                    <Typography variant="subtitle1" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <SortIcon sx={{ mr: 1 }} />
                        Ordenação
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {sortOptions.map(({ field, label, icon }) => (
                            <Chip
                                key={field}
                                label={label}
                                icon={icon}
                                variant={sortBy === field ? "filled" : "outlined"}
                                color={sortBy === field ? "primary" : "default"}
                                onClick={() => onSortChange(field)}
                                deleteIcon={sortBy === field ? (
                                    sortDirection === 'asc' ? <ExpandLessIcon /> : <ExpandMoreIcon />
                                ) : undefined}
                                onDelete={sortBy === field ? () => onSortChange(field) : undefined}
                                sx={{ fontWeight: sortBy === field ? 'medium' : 'normal' }}
                            />
                        ))}
                    </Stack>
                </Box>
            </Paper>
        </Collapse>
    );
};

export default DocumentFilters;