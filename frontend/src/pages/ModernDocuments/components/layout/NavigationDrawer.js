import React from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Drawer,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Badge,
    ToggleButtonGroup,
    ToggleButton,
} from '@mui/material';
import {
    Close as CloseIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    Add as AddIcon,
    Description as DocumentIcon,
    AssignmentOutlined as AssignmentIcon,
    TimelineOutlined as TimelineIcon,
    Dashboard as DashboardIcon,
    List as ListIcon,
    ViewKanban as KanbanIcon,
    ViewCompact as ViewCompactIcon,
    ViewComfy as ViewComfyIcon,
    ViewAgenda as ViewAgendaIcon,
} from '@mui/icons-material';

const NavigationDrawer = ({
    open,
    onClose,
    tabs,
    activeTab,
    setActiveTab,
    handleOpenCreateModal,
    refreshDocuments,
    toggleFilters,
    density,
    setDensity,
    viewMode,
    setViewMode,
}) => {
    const getIcon = (iconName) => {
        switch (iconName) {
            case 'DocumentIcon':
                return <DocumentIcon />;
            case 'AssignmentIcon':
                return <AssignmentIcon />;
            case 'TimelineIcon':
                return <TimelineIcon />;
            default:
                return <DocumentIcon />;
        }
    };

    return (
        <Drawer anchor="left" open={open} onClose={onClose}>
            <Box sx={{ width: 280 }} role="presentation">
                <Box
                    sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Typography variant="h6">Gestão de Pedidos</Typography>
                    <IconButton onClick={onClose} aria-label="Fechar menu">
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Divider />

                <List>
                    {tabs.map((tab, index) => (
                        <ListItem
                            button
                            key={index}
                            selected={activeTab === index}
                            onClick={() => {
                                setActiveTab(index);
                                onClose();
                            }}
                        >
                            <ListItemIcon>
                                {tab.badge > 0 ? (
                                    <Badge badgeContent={tab.badge} color="error">
                                        {getIcon(tab.icon)}
                                    </Badge>
                                ) : (
                                    getIcon(tab.icon)
                                )}
                            </ListItemIcon>
                            <ListItemText primary={tab.label} />
                        </ListItem>
                    ))}
                </List>

                <Divider />

                <List>
                    <ListItem button onClick={handleOpenCreateModal}>
                        <ListItemIcon>
                            <AddIcon />
                        </ListItemIcon>
                        <ListItemText primary="Novo Pedido" />
                    </ListItem>

                    <ListItem button onClick={refreshDocuments}>
                        <ListItemIcon>
                            <RefreshIcon />
                        </ListItemIcon>
                        <ListItemText primary="Atualizar" />
                    </ListItem>

                    <ListItem button onClick={toggleFilters}>
                        <ListItemIcon>
                            <FilterIcon />
                        </ListItemIcon>
                        <ListItemText primary="Filtros" />
                    </ListItem>
                </List>

                <Divider />

                <List
                    subheader={
                        <Box sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline" color="text.secondary">
                                Visualização
                            </Typography>
                        </Box>
                    }
                >
                    <ListItem>
                        <ToggleButtonGroup
                            size="small"
                            value={density}
                            exclusive
                            onChange={(_, newDensity) => {
                                if (newDensity !== null) setDensity(newDensity);
                            }}
                            aria-label="Densidade da visualização"
                            sx={{ mx: 'auto' }}
                        >
                            <ToggleButton value="compact" aria-label="Compacto">
                                <ViewCompactIcon fontSize="small" />
                            </ToggleButton>
                            <ToggleButton value="standard" aria-label="Padrão">
                                <ViewComfyIcon fontSize="small" />
                            </ToggleButton>
                            <ToggleButton value="comfortable" aria-label="Confortável">
                                <ViewAgendaIcon fontSize="small" />
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </ListItem>

                    <ListItem>
                        <ToggleButtonGroup
                            size="small"
                            value={viewMode}
                            exclusive
                            onChange={(_, newViewMode) => {
                                if (newViewMode) {
                                    setViewMode(newViewMode);
                                    onClose();
                                }
                            }}
                            aria-label="Modo de visualização"
                            sx={{ mx: 'auto' }}
                        >
                            <ToggleButton value="grid" aria-label="Grid">
                                <DashboardIcon fontSize="small" />
                            </ToggleButton>
                            <ToggleButton value="list" aria-label="Lista">
                                <ListIcon fontSize="small" />
                            </ToggleButton>
                            <ToggleButton value="kanban" aria-label="Kanban">
                                <KanbanIcon fontSize="small" />
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </ListItem>
                </List>
            </Box>
        </Drawer>
    );
};

NavigationDrawer.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    tabs: PropTypes.array.isRequired,
    activeTab: PropTypes.number.isRequired,
    setActiveTab: PropTypes.func.isRequired,
    handleOpenCreateModal: PropTypes.func.isRequired,
    refreshDocuments: PropTypes.func.isRequired,
    toggleFilters: PropTypes.func.isRequired,
    density: PropTypes.string.isRequired,
    setDensity: PropTypes.func.isRequired,
    viewMode: PropTypes.string.isRequired,
    setViewMode: PropTypes.func.isRequired,
};

export default NavigationDrawer;
