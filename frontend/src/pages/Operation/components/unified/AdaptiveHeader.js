// components/unified/AdaptiveHeader.js
import React from 'react';
import {
    AppBar, Toolbar, Typography, IconButton, Box, Chip, Badge
} from '@mui/material';
import {
    Menu as MenuIcon, Refresh, Person, Business, Smartphone, Computer, Tablet
} from '@mui/icons-material';

const AdaptiveHeader = ({ config, activeLayout, userRole, deviceType }) => {
    const getLayoutIcon = () => {
        switch (activeLayout) {
            case 'mobile-optimized': return <Smartphone fontSize="small" />;
            case 'tablet-hybrid': return <Tablet fontSize="small" />;
            case 'desktop-full': return <Computer fontSize="small" />;
            default: return <Computer fontSize="small" />;
        }
    };

    const getLayoutLabel = () => {
        switch (activeLayout) {
            case 'mobile-optimized': return 'Mobile';
            case 'tablet-hybrid': return 'Tablet';
            case 'desktop-full': return 'Desktop';
            default: return 'Auto';
        }
    };

    const getRoleColor = () => {
        switch (userRole) {
            case 'supervisor': return 'secondary';
            case 'operator': return 'primary';
            case 'manager': return 'error';
            default: return 'default';
        }
    };

    return (
        <AppBar
            position="static"
            elevation={1}
            sx={{
                height: config.headerHeight,
                bgcolor: 'background.paper',
                color: 'text.primary',
                borderBottom: 1,
                borderColor: 'divider'
            }}
        >
            <Toolbar sx={{ minHeight: config.headerHeight }}>
                {/* Menu button (mobile) */}
                {config.showBottomNav && (
                    <IconButton edge="start" sx={{ mr: 2 }}>
                        <MenuIcon />
                    </IconButton>
                )}

                {/* Title */}
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="div" sx={{ fontSize: config.compactMode ? '1.1rem' : '1.25rem' }}>
                        Operações
                    </Typography>
                    {!config.compactMode && (
                        <Typography variant="caption" color="text.secondary">
                            Sistema Adaptativo
                        </Typography>
                    )}
                </Box>

                {/* Status chips */}
                <Box display="flex" gap={1} alignItems="center">
                    {/* Role indicator */}
                    <Chip
                        icon={<Person fontSize="small" />}
                        label={userRole}
                        size="small"
                        color={getRoleColor()}
                        variant="outlined"
                    />

                    {/* Layout indicator */}
                    <Chip
                        icon={getLayoutIcon()}
                        label={getLayoutLabel()}
                        size="small"
                        variant="outlined"
                    />

                    {/* Refresh button */}
                    <IconButton size="small">
                        <Refresh />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default AdaptiveHeader;