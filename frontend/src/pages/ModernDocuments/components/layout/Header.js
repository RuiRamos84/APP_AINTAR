import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Badge,
    Tooltip,
    ToggleButtonGroup,
    ToggleButton,
    Paper,
    Divider,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    useTheme,
    alpha
} from '@mui/material';
import {
    Menu as MenuIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    Sort as SortIcon,
    Add as AddIcon,
    ViewCompact as ViewCompactIcon,
    ViewComfy as ViewComfyIcon,
    ViewAgenda as ViewAgendaIcon,
    Dashboard as DashboardIcon,
    List as ListIcon,
    ViewKanban as KanbanIcon,
    MoreVert as MoreIcon,
    FilterAltOff as FilterOffIcon,
    SortByAlpha as SortingIcon, // Nova importação
    FileDownload as ExportIcon,
    DateRange as DateRangeIcon
} from '@mui/icons-material';

import SearchBar from '../../../../components/common/SearchBar/SearchBar';
import { useUI } from '../../context/UIStateContext';

const Header = ({
    title,
    isMobileView,
    toggleDrawer,
    refreshDocuments,
    isLoading,
    showFilters,
    toggleFilters,
    density,
    setDensity,
    sortBy,
    sortDirection,
    handleSortChange,
    viewMode,
    setViewMode,
    handleOpenCreateModal,
    showSorting, // Novo prop
    toggleSorting, // Nova função
    handleExportToExcel, // Nova função para exportação
}) => {
    const { searchTerm, setSearchTerm, filters } = useUI();
    const theme = useTheme();
    const [actionsMenu, setActionsMenu] = useState(null);

    // Verificar se há filtros ativos
    const hasActiveFilters = Object.values(filters).some(val => val !== '');

    // Menu de ações (para dispositivos móveis)
    const handleOpenActionsMenu = (event) => {
        setActionsMenu(event.currentTarget);
    };

    const handleCloseActionsMenu = () => {
        setActionsMenu(null);
    };

    return (
        <Paper
            elevation={0}
            variant="outlined"
            sx={{
                p: 2,
                mb: 3,
                borderRadius: 1,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', md: 'center' },
                gap: 2,
                bgcolor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.paper, 0.4)
                    : alpha(theme.palette.background.paper, 0.7),
            }}
        >
            {/* Título e menu */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'space-between', md: 'flex-start' }
            }}>
                {isMobileView && (
                    <IconButton
                        edge="start"
                        sx={{ mr: 1.5 }}
                        onClick={() => toggleDrawer(true)}
                        aria-label="Abrir menu"
                        color="primary"
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                <Typography
                    variant={isMobileView ? 'h6' : 'h5'}
                    fontWeight="medium"
                    color="text.primary"
                >
                    {title}
                </Typography>

                {/* Menu de ações móvel */}
                {isMobileView && (
                    <IconButton
                        aria-label="Mais ações"
                        onClick={handleOpenActionsMenu}
                    >
                        <MoreIcon />
                    </IconButton>
                )}
            </Box>

            {/* Pesquisa e controles */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: { xs: 'space-between', md: 'flex-end' },
                    gap: 1.5,
                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                    width: { xs: '100%', md: 'auto' },
                }}
            >
                {/* SearchBar */}
                <SearchBar
                    searchTerm={searchTerm}
                    onSearch={setSearchTerm}
                    placeholder="Pesquisar pedidos..."
                    size="medium"
                />

                {/* Ações em desktop */}
                {!isMobileView && (
                    <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Atualizar dados" arrow>
                                <IconButton
                                    onClick={refreshDocuments}
                                    color="primary"
                                    aria-label="Atualizar dados"
                                    sx={{
                                        animation: isLoading ? 'spin 1s linear infinite' : 'none',
                                        '@keyframes spin': {
                                            '0%': { transform: 'rotate(0deg)' },
                                            '100%': { transform: 'rotate(360deg)' },
                                        },
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                    }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title={showFilters ? "Ocultar filtros" : "Mostrar filtros"} arrow>
                                <Badge
                                    color="primary"
                                    variant="dot"
                                    invisible={!hasActiveFilters}
                                >
                                    <IconButton
                                        onClick={() => toggleFilters(!showFilters)}
                                        color={showFilters ? "primary" : "default"}
                                        aria-label="Filtros"
                                        sx={{
                                            bgcolor: showFilters ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                        }}
                                    >
                                        {showFilters ? <FilterOffIcon /> : <FilterIcon />}
                                    </IconButton>
                                </Badge>
                            </Tooltip>

                            {/* Novo botão para ordenação separada */}
                            <Tooltip title={showSorting ? "Ocultar ordenação" : "Mostrar ordenação"} arrow>
                                <IconButton
                                    onClick={() => toggleSorting(!showSorting)}
                                    color={showSorting ? "primary" : "default"}
                                    aria-label="Ordenação"
                                    sx={{
                                        bgcolor: showSorting ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                    }}
                                >
                                    <SortingIcon />
                                </IconButton>
                            </Tooltip>

                            {/* Botão para exportação Excel */}
                            <Tooltip title="Exportar para Excel" arrow>
                                <IconButton
                                    onClick={handleExportToExcel}
                                    color="primary"
                                    aria-label="Exportar Excel"
                                    sx={{
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                    }}
                                >
                                    <ExportIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Divider orientation="vertical" flexItem />

                        {/* Seletor de visualização */}
                        <ViewModeToggle
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            isMobileView={isMobileView}
                        />

                        {/* Seletor de densidade */}
                        <ToggleButtonGroup
                            size="small"
                            value={density}
                            exclusive
                            onChange={(_, newDensity) => {
                                if (newDensity !== null) setDensity(newDensity);
                            }}
                            aria-label="Densidade da visualização"
                            sx={{
                                bgcolor: alpha(theme.palette.background.paper, 0.3),
                                '& .MuiToggleButton-root.Mui-selected': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main
                                }
                            }}
                        >
                            <ToggleButton value="compact" aria-label="Compacto">
                                <Tooltip title="Compacto" arrow>
                                    <ViewCompactIcon fontSize="small" />
                                </Tooltip>
                            </ToggleButton>
                            <ToggleButton value="standard" aria-label="Padrão">
                                <Tooltip title="Padrão" arrow>
                                    <ViewComfyIcon fontSize="small" />
                                </Tooltip>
                            </ToggleButton>
                            <ToggleButton value="comfortable" aria-label="Confortável">
                                <Tooltip title="Confortável" arrow>
                                    <ViewAgendaIcon fontSize="small" />
                                </Tooltip>
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <Divider orientation="vertical" flexItem />

                        {/* Botão Novo Pedido */}
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={handleOpenCreateModal}
                            aria-label="Novo Pedido"
                            sx={{
                                fontWeight: 500,
                                boxShadow: 2,
                            }}
                        >
                            Novo Pedido
                        </Button>
                    </>
                )}

                {/* Menu para versão móvel */}
                <Menu
                    anchorEl={actionsMenu}
                    open={Boolean(actionsMenu)}
                    onClose={handleCloseActionsMenu}
                >
                    <MenuItem onClick={() => { refreshDocuments(); handleCloseActionsMenu(); }}>
                        <ListItemIcon>
                            <RefreshIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Atualizar dados</ListItemText>
                    </MenuItem>

                    <MenuItem onClick={() => { toggleSorting(); handleCloseActionsMenu(); }}>
                        <ListItemIcon>
                            <SortingIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{showSorting ? "Ocultar ordenação" : "Mostrar ordenação"}</ListItemText>
                    </MenuItem>

                    <MenuItem onClick={() => { handleExportToExcel(); handleCloseActionsMenu(); }}>
                        <ListItemIcon>
                            <ExportIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Exportar para Excel</ListItemText>
                    </MenuItem>
                    
                    <MenuItem onClick={() => { handleSortChange(sortBy); handleCloseActionsMenu(); }}>
                        <ListItemIcon>
                            <SortIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>
                            Ordenação: {sortDirection === 'asc' ? '↑' : '↓'} {sortBy}
                        </ListItemText>
                    </MenuItem>

                    <Divider />

                    <MenuItem onClick={() => { setViewMode('grid'); handleCloseActionsMenu(); }}>
                        <ListItemIcon>
                            <DashboardIcon fontSize="small" color={viewMode === 'grid' ? "primary" : "inherit"} />
                        </ListItemIcon>
                        <ListItemText primary="Vista em Grid" />
                    </MenuItem>

                    <MenuItem onClick={() => { setViewMode('list'); handleCloseActionsMenu(); }}>
                        <ListItemIcon>
                            <ListIcon fontSize="small" color={viewMode === 'list' ? "primary" : "inherit"} />
                        </ListItemIcon>
                        <ListItemText primary="Vista em Lista" />
                    </MenuItem>

                    <MenuItem onClick={() => { setViewMode('kanban'); handleCloseActionsMenu(); }}>
                        <ListItemIcon>
                            <KanbanIcon fontSize="small" color={viewMode === 'kanban' ? "primary" : "inherit"} />
                        </ListItemIcon>
                        <ListItemText primary="Vista Kanban" />
                    </MenuItem>

                    <Divider />

                    <MenuItem onClick={() => { handleOpenCreateModal(); handleCloseActionsMenu(); }}>
                        <ListItemIcon>
                            <AddIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Novo Pedido" primaryTypographyProps={{ color: 'primary' }} />
                    </MenuItem>
                </Menu>
            </Box>
        </Paper>
    );
};

const ViewModeToggle = ({ viewMode, setViewMode, isMobileView }) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.3),
                borderRadius: 1,
                p: 0.5,
                display: 'flex',
                boxShadow: 1,
            }}
        >
            <Tooltip title="Visualização em Grid" arrow>
                <Button
                    variant={viewMode === 'grid' ? 'contained' : 'text'}
                    size="small"
                    onClick={() => setViewMode('grid')}
                    aria-label="Visualização em Grid"
                    sx={{ px: 1.5, py: 0.75, mx: 0.5 }}
                >
                    <DashboardIcon fontSize="small" />
                    {!isMobileView && <span style={{ marginLeft: 8 }}>Grid</span>}
                </Button>
            </Tooltip>

            <Tooltip title="Visualização em Lista" arrow>
                <Button
                    variant={viewMode === 'list' ? 'contained' : 'text'}
                    size="small"
                    onClick={() => setViewMode('list')}
                    aria-label="Visualização em Lista"
                    sx={{ px: 1.5, py: 0.75, mx: 0.5 }}
                >
                    <ListIcon fontSize="small" />
                    {!isMobileView && <span style={{ marginLeft: 8 }}>Lista</span>}
                </Button>
            </Tooltip>

            <Tooltip title="Visualização Kanban" arrow>
                <Button
                    variant={viewMode === 'kanban' ? 'contained' : 'text'}
                    size="small"
                    onClick={() => setViewMode('kanban')}
                    aria-label="Visualização Kanban"
                    sx={{ px: 1.5, py: 0.75, mx: 0.5 }}
                >
                    <KanbanIcon fontSize="small" />
                    {!isMobileView && <span style={{ marginLeft: 8 }}>Kanban</span>}
                </Button>
            </Tooltip>
        </Box>
    );
};

Header.propTypes = {
    title: PropTypes.string.isRequired,
    isMobileView: PropTypes.bool.isRequired,
    toggleDrawer: PropTypes.func.isRequired,
    refreshDocuments: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
    showFilters: PropTypes.bool,
    toggleFilters: PropTypes.func.isRequired,
    density: PropTypes.string,
    setDensity: PropTypes.func.isRequired,
    sortBy: PropTypes.string,
    sortDirection: PropTypes.string,
    handleSortChange: PropTypes.func.isRequired,
    viewMode: PropTypes.string,
    setViewMode: PropTypes.func.isRequired,
    handleOpenCreateModal: PropTypes.func.isRequired,
    showSorting: PropTypes.bool, // Nova prop
    toggleSorting: PropTypes.func.isRequired, // Nova função
    handleExportToExcel: PropTypes.func.isRequired, // Nova função
};

ViewModeToggle.propTypes = {
    viewMode: PropTypes.string.isRequired,
    setViewMode: PropTypes.func.isRequired,
    isMobileView: PropTypes.bool.isRequired,
};

export default Header;