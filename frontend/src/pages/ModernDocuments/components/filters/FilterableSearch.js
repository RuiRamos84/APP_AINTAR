import React, { useState } from 'react';
import {
    Box,
    TextField,
    InputAdornment,
    IconButton,
    Popover,
    Paper,
    Divider,
    Button,
    Chip,
    Typography,
    Tooltip,
    useTheme
} from '@mui/material';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    FilterList as FilterIcon,
    Sort as SortIcon
} from '@mui/icons-material';

/**
 * Componente de busca com filtros integrados
 * Combina campo de busca e acesso rápido a filtros
 */
const FilterableSearch = ({
    searchTerm = '',
    onSearchChange,
    filters = {},
    onFilterChange,
    onFilterReset,
    sortBy,
    sortDirection,
    onSortChange,
    showFilterButton = true,
    showSortButton = true,
    filterComponent,
    placeholder = 'Pesquisar pedidos...',
    size = 'small',
    fullWidth = true,
    density = 'standard'
}) => {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);
    const [filterType, setFilterType] = useState(null); // 'filter' ou 'sort'

    // Handlers para popover
    const handleOpenFilterMenu = (event, type) => {
        setAnchorEl(event.currentTarget);
        setFilterType(type);
    };

    const handleCloseFilterMenu = () => {
        setAnchorEl(null);
        setFilterType(null);
    };

    // Contar filtros ativos
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    // Função para limpar busca
    const handleClearSearch = () => {
        onSearchChange('');
    };

    // Calcular padding baseado na densidade
    const getPadding = () => {
        switch (density) {
            case 'compact': return 0.5;
            case 'comfortable': return 1.5;
            default: return 1;
        }
    };

    // Renderizar popover de filtros ou ordenação
    const renderFilterPopover = () => {
        const open = Boolean(anchorEl);
        const id = open ? 'filter-popover' : undefined;

        return (
            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleCloseFilterMenu}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <Paper
                    sx={{
                        p: 2,
                        width: 320,
                        maxWidth: '90vw'
                    }}
                >
                    {/* Título do popover */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 1.5
                        }}
                    >
                        <Typography variant="subtitle1">
                            {filterType === 'filter' ? 'Filtros' : 'Ordenação'}
                        </Typography>

                        {filterType === 'filter' && activeFilterCount > 0 && (
                            <Button
                                size="small"
                                onClick={() => {
                                    onFilterReset();
                                    handleCloseFilterMenu();
                                }}
                            >
                                Limpar Filtros
                            </Button>
                        )}
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* Conteúdo do popover */}
                    {filterType === 'filter' && filterComponent}

                    {filterType === 'sort' && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Ordenar por
                            </Typography>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {[
                                    { field: 'regnumber', label: 'Número' },
                                    { field: 'submission', label: 'Data' },
                                    { field: 'ts_entity', label: 'Entidade' },
                                    { field: 'what', label: 'Status' }
                                ].map((option) => (
                                    <Chip
                                        key={option.field}
                                        label={option.label}
                                        color={sortBy === option.field ? 'primary' : 'default'}
                                        onClick={() => onSortChange(option.field)}
                                        icon={
                                            sortBy === option.field ? (
                                                <SortIcon
                                                    fontSize="small"
                                                    sx={{
                                                        transform: sortDirection === 'asc' ? 'none' : 'rotate(180deg)',
                                                        transition: 'transform 0.2s'
                                                    }}
                                                />
                                            ) : null
                                        }
                                        sx={{ m: 0.5 }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Botões de ação */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button onClick={handleCloseFilterMenu}>
                            Fechar
                        </Button>
                    </Box>
                </Paper>
            </Popover>
        );
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                p: getPadding(),
                flexWrap: { xs: 'wrap', sm: 'nowrap' }
            }}
        >
            <TextField
                fullWidth={fullWidth}
                size={size}
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                variant="outlined"
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon color="action" fontSize="small" />
                        </InputAdornment>
                    ),
                    endAdornment: searchTerm ? (
                        <InputAdornment position="end">
                            <IconButton
                                size="small"
                                aria-label="limpar busca"
                                onClick={handleClearSearch}
                                edge="end"
                            >
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ) : null
                }}
                sx={{
                    mr: { xs: 0, sm: 1 },
                    mb: { xs: 1, sm: 0 },
                    flex: { xs: '1 0 100%', sm: 1 }
                }}
            />

            {/* Botões de filtro e ordenação */}
            <Box sx={{ display: 'flex', ml: { xs: 'auto', sm: 0 } }}>
                {showFilterButton && (
                    <Tooltip title="Filtros" arrow>
                        <IconButton
                            color={activeFilterCount > 0 ? 'primary' : 'default'}
                            onClick={(e) => handleOpenFilterMenu(e, 'filter')}
                            size={size}
                            sx={{ position: 'relative' }}
                        >
                            <FilterIcon />
                            {activeFilterCount > 0 && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        backgroundColor: theme.palette.primary.main,
                                        color: theme.palette.primary.contrastText,
                                        borderRadius: '50%',
                                        width: 16,
                                        height: 16,
                                        fontSize: '0.65rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {activeFilterCount}
                                </Box>
                            )}
                        </IconButton>
                    </Tooltip>
                )}

                {showSortButton && (
                    <Tooltip title="Ordenação" arrow>
                        <IconButton
                            color={sortBy !== 'regnumber' ? 'primary' : 'default'}
                            onClick={(e) => handleOpenFilterMenu(e, 'sort')}
                            size={size}
                        >
                            <SortIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {/* Popover de filtros/ordenação */}
            {renderFilterPopover()}
        </Box>
    );
};

export default FilterableSearch;