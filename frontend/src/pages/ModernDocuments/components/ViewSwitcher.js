import React from 'react';
import { Box, Button, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import {
    Dashboard as DashboardIcon,
    List as ListIcon,
    ViewKanban as KanbanIcon
} from '@mui/icons-material';
import { useUI } from '../context/UIStateContext';

/**
 * Componente para alternar entre diferentes modos de visualização
 * Suporta os modos Grid, Lista e Kanban
 */
const ViewSwitcher = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { viewMode, setViewMode } = useUI();

    // Configuração dos botões de visualização
    const viewOptions = [
        {
            value: 'grid',
            label: 'Grid',
            icon: <DashboardIcon fontSize="small" />,
            tooltip: 'Visualização em Grid'
        },
        {
            value: 'list',
            label: 'Lista',
            icon: <ListIcon fontSize="small" />,
            tooltip: 'Visualização em Lista'
        },
        {
            value: 'kanban',
            label: 'Kanban',
            icon: <KanbanIcon fontSize="small" />,
            tooltip: 'Visualização Kanban'
        }
    ];

    return (
        <Box sx={{
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: 0.5,
            boxShadow: 1,
            display: 'flex'
        }}>
            {viewOptions.map((option) => (
                <Tooltip key={option.value} title={option.tooltip} arrow>
                    <Button
                        variant={viewMode === option.value ? 'contained' : 'text'}
                        size="small"
                        onClick={() => setViewMode(option.value)}
                        aria-label={option.tooltip}
                        sx={{
                            minWidth: 0,
                            px: 1,
                            mx: 0.25,
                            minHeight: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '& .MuiButton-startIcon': {
                                margin: 0
                            }
                        }}
                        startIcon={isMobile ? option.icon : null}
                    >
                        {!isMobile && option.icon}
                        {!isMobile && <span style={{ marginLeft: 8 }}>{option.label}</span>}
                    </Button>
                </Tooltip>
            ))}
        </Box>
    );
};

export default ViewSwitcher;