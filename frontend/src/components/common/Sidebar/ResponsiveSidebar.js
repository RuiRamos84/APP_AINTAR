import React from 'react';
import { Badge, IconButton, Box } from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import { useSocket } from '../../../contexts/SocketContext';
import { useSidebar } from '../../../contexts/SidebarContext';

const ResponsiveSidebar = ({ children }) => {
    const {
        sidebarMode,
        setSidebarMode,
        isMobile,
        isOpen,
        toggleSidebar
    } = useSidebar();

    const { notificationCount, refreshNotifications } = useSocket();

    // Solicitar contagem de notificações ao montar o componente
    React.useEffect(() => {
        const timer = setTimeout(() => {
            refreshNotifications();
        }, 500);

        return () => clearTimeout(timer);
    }, [refreshNotifications]);

    // Handler para toggle com lógica correta
    const handleToggle = () => {
        if (isMobile) {
            // Mobile: toggle entre 'closed' e 'full'
            setSidebarMode(isOpen ? 'closed' : 'full');
        } else {
            // Desktop: usar o toggle padrão
            toggleSidebar();
        }
    };

    return (
        <>
            {/* Toggle Button with Notification Badge - Only on mobile */}
            {isMobile && (
                <Badge
                    badgeContent={notificationCount}
                    color="secondary"
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    sx={{
                        position: 'fixed',
                        bottom: '20px',
                        left: '20px',
                        zIndex: 1302,
                        '& .MuiBadge-badge': {
                            top: -5,
                            right: -5,
                            border: '2px solid',
                            borderColor: 'background.paper',
                        }
                    }}
                    invisible={notificationCount === 0}
                >
                    <IconButton
                        onClick={handleToggle}
                        sx={{
                            backgroundColor: 'background.paper',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            width: '48px',
                            height: '48px',
                            '&:hover': {
                                backgroundColor: 'action.hover',
                                transform: 'scale(1.1)',
                            },
                        }}
                        aria-label="Toggle Sidebar"
                    >
                        {isOpen ? <CloseIcon /> : <MenuIcon />}
                    </IconButton>
                </Badge>
            )}

            {/* Backdrop - Only on mobile when open */}
            {isMobile && isOpen && (
                <Box
                    onClick={() => setSidebarMode('closed')}
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 1199,
                        transition: 'opacity 0.3s ease-in-out',
                    }}
                />
            )}

            {/* Sidebar Container */}
            <Box
                sx={{
                    position: isMobile ? 'fixed' : 'relative',
                    left: 0,
                    top: 0,
                    height: '100%',
                    zIndex: isMobile ? 1200 : 1,
                    width: (() => {
                        if (isMobile) {
                            return sidebarMode === 'closed' ? '0px' : '250px';
                        }
                        // Desktop
                        switch (sidebarMode) {
                            case 'full': return '240px';
                            case 'compact': return '72px';
                            case 'closed': return '0px';
                            default: return 'auto';
                        }
                    })(),
                    visibility: (isMobile && sidebarMode === 'closed') ? 'hidden' : 'visible',
                    transition: 'width 0.3s ease-in-out',
                    overflow: 'hidden'
                }}
            >
                {children}
            </Box>
        </>
    );
};

export default ResponsiveSidebar;