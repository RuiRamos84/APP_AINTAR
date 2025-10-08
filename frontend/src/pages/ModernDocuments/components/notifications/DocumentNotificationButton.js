import React, { useState, useCallback, useEffect } from 'react';
import {
    IconButton,
    Badge,
    Tooltip,
    Box,
    Grow,
    useTheme,
    alpha
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    NotificationsActive as NotificationsActiveIcon
} from '@mui/icons-material';
import { useDocumentNotifications } from '../../contexts/DocumentNotificationContext';
import DocumentNotificationCenter from './DocumentNotificationCenter';

/**
 * Botão de notificações com animações e feedback visual
 * Integra-se perfeitamente com qualquer layout
 */
const DocumentNotificationButton = ({
    size = 'medium',
    color = 'default',
    showLabel = false,
    animate = true,
    sx = {}
}) => {
    const theme = useTheme();
    const {
        unreadCount,
        lastNotificationId,
        setIsVisible
    } = useDocumentNotifications();

    // Debug logs removidos para produção

    const [isOpen, setIsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [lastSeenNotificationId, setLastSeenNotificationId] = useState(null);

    // =========================================================================
    // ANIMATION LOGIC
    // =========================================================================

    // Trigger animation when new notification arrives
    useEffect(() => {
        if (animate && lastNotificationId && lastNotificationId !== lastSeenNotificationId) {
            setIsAnimating(true);
            setLastSeenNotificationId(lastNotificationId);

            // Stop animation after 3 seconds
            const timer = setTimeout(() => setIsAnimating(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [lastNotificationId, lastSeenNotificationId, animate]);

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        setIsVisible(true);
        setIsAnimating(false);
    }, [setIsVisible]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setIsVisible(false);
    }, [setIsVisible]);

    // =========================================================================
    // STYLES
    // =========================================================================

    const getButtonStyles = useCallback(() => {
        const baseStyles = {
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            ...sx
        };

        if (isAnimating) {
            return {
                ...baseStyles,
                animation: 'documentNotificationPulse 2s ease-in-out infinite',
                '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.3)} 0%, transparent 70%)`,
                    animation: 'documentNotificationRipple 2s ease-in-out infinite',
                    zIndex: -1
                }
            };
        }

        if (unreadCount > 0) {
            return {
                ...baseStyles,
                '&:hover': {
                    transform: 'scale(1.1)',
                    '& .MuiBadge-badge': {
                        transform: 'scale(1.2)'
                    }
                }
            };
        }

        return baseStyles;
    }, [isAnimating, unreadCount, theme.palette.primary.main, sx]);

    const getBadgeStyles = useCallback(() => {
        if (isAnimating) {
            return {
                '& .MuiBadge-badge': {
                    animation: 'documentNotificationBadgeBounce 1s ease-in-out infinite',
                    backgroundColor: theme.palette.error.main,
                    color: theme.palette.error.contrastText
                }
            };
        }

        return {
            '& .MuiBadge-badge': {
                transition: 'all 0.3s ease',
                backgroundColor: unreadCount > 0 ? theme.palette.error.main : theme.palette.grey[400]
            }
        };
    }, [isAnimating, unreadCount, theme.palette]);

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <>
            {/* CSS Animations */}
            <style jsx>{`
                @keyframes documentNotificationPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                @keyframes documentNotificationRipple {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2); opacity: 0; }
                }

                @keyframes documentNotificationBadgeBounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-3px); }
                    60% { transform: translateY(-2px); }
                }
            `}</style>

            <Tooltip
                title={
                    unreadCount > 0
                        ? `${unreadCount} nova${unreadCount > 1 ? 's' : ''} notificação${unreadCount > 1 ? 'ões' : ''} de documento${unreadCount > 1 ? 's' : ''}`
                        : 'Notificações de documentos'
                }
                placement="bottom"
                arrow
            >
                <Box sx={{ position: 'relative' }}>
                    <Grow in timeout={500}>
                        <IconButton
                            onClick={handleOpen}
                            color={color}
                            size={size}
                            sx={getButtonStyles()}
                            aria-label="notificações de documentos"
                        >
                            <Badge
                                badgeContent={unreadCount}
                                max={99}
                                sx={getBadgeStyles()}
                                overlap="circular"
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                            >
                                {isAnimating || unreadCount > 0 ? (
                                    <NotificationsActiveIcon
                                        sx={{
                                            color: isAnimating ? theme.palette.primary.main : 'inherit'
                                        }}
                                    />
                                ) : (
                                    <NotificationsIcon />
                                )}
                            </Badge>
                        </IconButton>
                    </Grow>

                    {/* Pulse indicator for high priority notifications */}
                    {isAnimating && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: theme.palette.error.main,
                                animation: 'documentNotificationPulse 1s ease-in-out infinite',
                                zIndex: 10
                            }}
                        />
                    )}
                </Box>
            </Tooltip>

            {/* Notification Center Panel */}
            <DocumentNotificationCenter
                open={isOpen}
                onClose={handleClose}
                anchor="right"
            />
        </>
    );
};

export default DocumentNotificationButton;