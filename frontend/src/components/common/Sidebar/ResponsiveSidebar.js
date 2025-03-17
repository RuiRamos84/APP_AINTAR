import React from 'react';
import { Badge, IconButton, Box } from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import { useSocket } from '../../../contexts/SocketContext';
import { useSidebar } from '../../../contexts/SidebarContext';

const ResponsiveSidebar = ({ children }) => {
    const { sidebarMode, setSidebarMode, isMobile } = useSidebar();
    const { notificationCount, refreshNotifications } = useSocket();
    const isOpen = sidebarMode !== 'closed';

    // Solicitar contagem de notificações ao montar o componente
    React.useEffect(() => {
        const timer = setTimeout(() => {
            refreshNotifications();
        }, 500);

        return () => clearTimeout(timer);
    }, [refreshNotifications]);

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
                        onClick={() => setSidebarMode(isOpen ? 'closed' : 'full')}
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

            {/* Backdrop - Only on mobile */}
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
                    width: isMobile ? (isOpen ? '250px' : '0px') : 'auto',
                    visibility: isMobile && !isOpen ? 'hidden' : 'visible',
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