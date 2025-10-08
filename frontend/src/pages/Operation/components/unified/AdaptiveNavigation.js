// components/unified/AdaptiveNavigation.js
import React from 'react';
import {
    Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton,
    BottomNavigation, BottomNavigationAction, Paper, Box
} from '@mui/material';
import {
    Dashboard, Assignment, People, Analytics, Today, CheckCircle
} from '@mui/icons-material';

const AdaptiveNavigation = ({ config, activeLayout, userRole, position = 'side' }) => {
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    // Definir itens de navegação baseados no role
    const getNavigationItems = () => {
        const baseItems = [
            { label: 'Hoje', icon: <Today />, value: 'today' },
            { label: 'Tarefas', icon: <Assignment />, value: 'tasks' }
        ];

        if (userRole === 'supervisor' || userRole === 'manager') {
            return [
                { label: 'Dashboard', icon: <Dashboard />, value: 'dashboard' },
                { label: 'Metas', icon: <Assignment />, value: 'metas' },
                { label: 'Operadores', icon: <People />, value: 'operators' },
                { label: 'Analytics', icon: <Analytics />, value: 'analytics' }
            ];
        }

        return [
            ...baseItems,
            { label: 'Concluídas', icon: <CheckCircle />, value: 'completed' }
        ];
    };

    const navigationItems = getNavigationItems();

    const handleNavigation = (index) => {
        setSelectedIndex(index);
        // Aqui implementarias a navegação real
        console.log('Navegar para:', navigationItems[index].value);
    };

    // Bottom Navigation (Mobile)
    if (position === 'bottom') {
        return (
            <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
                <BottomNavigation
                    value={selectedIndex}
                    onChange={(event, newValue) => handleNavigation(newValue)}
                    showLabels
                >
                    {navigationItems.map((item, index) => (
                        <BottomNavigationAction
                            key={item.value}
                            label={item.label}
                            icon={item.icon}
                        />
                    ))}
                </BottomNavigation>
            </Paper>
        );
    }

    // Sidebar Navigation (Tablet/Desktop)
    const drawerWidth = config.compactMode ? 60 : 240;

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    position: 'relative',
                    height: '100%',
                    borderRight: 1,
                    borderColor: 'divider'
                },
            }}
        >
            <List sx={{ pt: 0 }}>
                {navigationItems.map((item, index) => (
                    <ListItem key={item.value} disablePadding>
                        <ListItemButton
                            selected={selectedIndex === index}
                            onClick={() => handleNavigation(index)}
                        >
                            <ListItemIcon sx={{ minWidth: config.compactMode ? 'auto' : 56 }}>
                                {item.icon}
                            </ListItemIcon>
                            {!config.compactMode && (
                                <ListItemText primary={item.label} />
                            )}
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Drawer>
    );
};

export default AdaptiveNavigation;