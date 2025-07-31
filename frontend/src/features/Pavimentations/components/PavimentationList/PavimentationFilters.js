// frontend/src/features/Pavimentations/components/PavimentationList/PavimentationFilters.js

import React, { useState, useCallback } from 'react';
import {
    Box,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    InputAdornment,
    Chip,
    Button,
    Collapse,
    Typography,
    Divider
} from '@mui/material';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    GetApp as ExportIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { FILTER_OPTIONS, StatusUtils } from '../../constants/pavimentationTypes';
import ExportButton from '../common/ExportButton';

/**
 * Componente para filtros e controles da lista de pavimentações
 */
const PavimentationFilters = ({
    filters,
    onChange,
    onReset,
    showExport = true,
    data = [],
    status,
    loading = false,
    onRefresh,
    compact = false,
    sx = {}
}) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);

    const statusConfig = StatusUtils.getStatusConfig(status);

    /**
     * Atualizar filtro específico
     */
    const handleFilterChange = useCallback((field, value) => {
        onChange({
            ...filters,
            [field]: value
        });
    }, [filters, onChange]);

    /**
     * Limpar filtro específico
     */
    const handleClearFilter = useCallback((field) => {
        handleFilterChange(field, field === 'page' ? 0 : '');
    }, [handleFilterChange]);

    /**
     * Verificar se tem filtros ativos
     */
    const hasActiveFilters = filters.search || filters.groupBy;

    /**
     * Obter chips de filtros ativos
     */
    const getActiveFilterChips = () => {
        const chips = [];

        if (filters.search) {
            chips.push({
                label: `Pesquisa: "${filters.search}"`,
                onDelete: () => handleClearFilter('search')
            });
        }

        if (filters.groupBy) {
            const groupOption = FILTER_OPTIONS.GROUP_BY_OPTIONS.find(
                opt => opt.value === filters.groupBy
            );
            chips.push({
                label: `Agrupado por: ${groupOption?.label || filters.groupBy}`,
                onDelete: () => handleClearFilter('groupBy')
            });
        }

        return chips;
    };

    /**
     * Renderizar barra de pesquisa
     */
    const renderSearchBar = () => (
        <TextField
            fullWidth
            size="small"
            placeholder={`Pesquisar pavimentações ${statusConfig.pluralLabel.toLowerCase()}...`}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon color={searchFocused ? 'primary' : 'action'} />
                    </InputAdornment>
                ),
                endAdornment: filters.search && (
                    <InputAdornment position="end">
                        <IconButton
                            size="small"
                            onClick={() => handleClearFilter('search')}
                            edge="end"
                        >
                            <ClearIcon />
                        </IconButton>
                    </InputAdornment>
                )
            }}
            sx={{
                '& .MuiOutlinedInput-root': {
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        backgroundColor: theme.palette.action.hover
                    },
                    '&.Mui-focused': {
                        backgroundColor: theme.palette.background.paper
                    }
                }
            }}
        />
    );

    /**
     * Renderizar controles de agrupamento
     */
    const renderGroupingControls = () => (
        <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Agrupar por</InputLabel>
            <Select
                value={filters.groupBy}
                onChange={(e) => handleFilterChange('groupBy', e.target.value)}
                label="Agrupar por"
            >
                {FILTER_OPTIONS.GROUP_BY_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );

    /**
     * Renderizar controles de ordenação
     */
    const renderSortControls = () => (
        <>
            <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Ordenar por</InputLabel>
                <Select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    label="Ordenar por"
                >
                    {FILTER_OPTIONS.SORT_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Ordem</InputLabel>
                <Select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    label="Ordem"
                >
                    <MenuItem value="asc">A-Z</MenuItem>
                    <MenuItem value="desc">Z-A</MenuItem>
                </Select>
            </FormControl>
        </>
    );

    /**
     * Renderizar botões de ação
     */
    const renderActionButtons = () => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Botão de refresh */}
            <Tooltip title="Atualizar dados">
                <IconButton
                    onClick={onRefresh}
                    disabled={loading}
                    size="small"
                    sx={{
                        backgroundColor: theme.palette.action.hover,
                        '&:hover': {
                            backgroundColor: theme.palette.action.selected
                        }
                    }}
                >
                    <RefreshIcon />
                </IconButton>
            </Tooltip>

            {/* Botão de filtros avançados */}
            <Tooltip title={expanded ? "Ocultar filtros" : "Mostrar filtros"}>
                <IconButton
                    onClick={() => setExpanded(!expanded)}
                    size="small"
                    color={hasActiveFilters || expanded ? 'primary' : 'default'}
                    sx={{
                        backgroundColor: hasActiveFilters || expanded
                            ? theme.palette.primary.main + '20'
                            : theme.palette.action.hover,
                        '&:hover': {
                            backgroundColor: hasActiveFilters || expanded
                                ? theme.palette.primary.main + '30'
                                : theme.palette.action.selected
                        }
                    }}
                >
                    <FilterIcon />
                </IconButton>
            </Tooltip>

            {/* Botão de exportação */}
            {showExport && (
                <ExportButton
                    data={data}
                    status={status}
                    filters={filters}
                    size="small"
                    variant="outlined"
                    startIcon={<ExportIcon />}
                >
                    Exportar
                </ExportButton>
            )}

            {/* Botão de reset (apenas se houver filtros) */}
            {hasActiveFilters && (
                <Button
                    size="small"
                    onClick={onReset}
                    startIcon={<ClearIcon />}
                    sx={{ ml: 1 }}
                >
                    Limpar
                </Button>
            )}
        </Box>
    );

    if (compact) {
        return (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', ...sx }}>
                <Box sx={{ flex: 1, maxWidth: 300 }}>
                    {renderSearchBar()}
                </Box>
                {renderActionButtons()}
            </Box>
        );
    }

    return (
        <Box sx={sx}>
            {/* Linha principal de filtros */}
            <Grid container spacing={2} alignItems="center">
                {/* Barra de pesquisa */}
                <Grid item xs={12} sm={6} md={4}>
                    {renderSearchBar()}
                </Grid>

                {/* Controles de agrupamento */}
                <Grid item xs={12} sm={6} md={3}>
                    {renderGroupingControls()}
                </Grid>

                {/* Botões de ação */}
                <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {renderActionButtons()}
                </Grid>
            </Grid>

            {/* Chips de filtros ativos */}
            {hasActiveFilters && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        Filtros ativos:
                    </Typography>
                    {getActiveFilterChips().map((chip, index) => (
                        <Chip
                            key={index}
                            label={chip.label}
                            onDelete={chip.onDelete}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    ))}
                </Box>
            )}

            {/* Filtros avançados expansíveis */}
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Filtros Avançados
                    </Typography>

                    <Grid container spacing={2} alignItems="center">
                        {/* Controles de ordenação */}
                        <Grid item xs={12} sm={6} md={3}>
                            {renderSortControls()[0]}
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            {renderSortControls()[1]}
                        </Grid>

                        {/* Controles de paginação */}
                        <Grid item xs={12} sm={6} md={2}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Itens por página</InputLabel>
                                <Select
                                    value={filters.rowsPerPage}
                                    onChange={(e) => handleFilterChange('rowsPerPage', e.target.value)}
                                    label="Itens por página"
                                >
                                    <MenuItem value={5}>5</MenuItem>
                                    <MenuItem value={10}>10</MenuItem>
                                    <MenuItem value={25}>25</MenuItem>
                                    <MenuItem value={50}>50</MenuItem>
                                    <MenuItem value={100}>100</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Botão para recolher */}
                        <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                startIcon={<ExpandLessIcon />}
                                onClick={() => setExpanded(false)}
                                size="small"
                            >
                                Ocultar filtros
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Collapse>

            {/* Indicador de resultados */}
            {data.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        {hasActiveFilters ? 'Resultados filtrados' : 'Todos os resultados'}
                    </Typography>

                    {loading && (
                        <Typography variant="caption" color="primary">
                            Atualizando...
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default PavimentationFilters;