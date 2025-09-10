// components/common/Sidebar/SidebarItem.js
import React, { useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Box,
    Badge,
    Typography,
    Popper,
    Grow,
    Paper,
    MenuList,
    MenuItem,
    ClickAwayListener,
    List,
    useTheme,
    alpha
} from '@mui/material';
import { ArrowForwardIos } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '../../../contexts/SidebarContext';
import { useAuth } from "../../../contexts/AuthContext";

const SidebarItem = React.memo(({
    item,
    isActive,
    onHover,
    onLeave,
    isHovered,
    notificationCount = 0
}) => {
    const theme = useTheme();
    const location = useLocation();
    const { user } = useAuth();
    const {
        sidebarMode,
        openSubmenus,
        toggleSubmenu,
        closeAllSubmenus,
        isCompact
    } = useSidebar();

    const [anchorEl, setAnchorEl] = useState(null);

    // Memoizar conversão de submenu para evitar re-cálculos
    const submenuArray = useMemo(() => {
        return item.submenu ? Object.values(item.submenu) : [];
    }, [item.submenu]);

    // Memoizar estados derivados
    const isSubmenuActive = useMemo(() => {
        return submenuArray.length > 0 && submenuArray.some(
            subItem => subItem.to === location.pathname
        );
    }, [submenuArray, location.pathname]);

    const isItemActive = isActive || isSubmenuActive;
    const hasSubmenu = submenuArray.length > 0;

    // Verificar se ESTE item específico está aberto
    const isOpen = openSubmenus[item.id] || false;
    const popperOpen = Boolean(anchorEl);

    // Função de verificação de acesso memoizada
    const hasAccess = useCallback((rolesAllowed, allowedUserIds = []) => {
        const hasRoleAccess = rolesAllowed ? rolesAllowed.includes(user.profil) : true;
        const hasUserIdAccess = !allowedUserIds || allowedUserIds.length === 0 || allowedUserIds.includes(user.user_id);
        return hasRoleAccess && hasUserIdAccess;
    }, [user.profil, user.user_id]);

    // Memoizar submenu acessível
    const accessibleSubmenu = useMemo(() => {
        return submenuArray.filter(subItem => {
            if (subItem.permissions) {
                if (subItem.permissions.rolesAllowed) {
                    return hasAccess(subItem.permissions.rolesAllowed, subItem.permissions.allowedUserIds);
                }
                return true;
            } else if (subItem.rolesAllowed) {
                return hasAccess(subItem.rolesAllowed, subItem.allowedUserIds);
            }
            return true;
        });
    }, [submenuArray, hasAccess]);

    // Handlers memoizados para evitar re-renders filhos
    const handleClick = useCallback((event) => {
        if (hasSubmenu) {
            if (isCompact) {
                setAnchorEl(prev => prev ? null : event.currentTarget);
            } else {
                toggleSubmenu(item.id);
            }
        } else if (item.onClick) {
            item.onClick();
            closeAllSubmenus();
        }
    }, [hasSubmenu, isCompact, item.id, item.onClick, toggleSubmenu, closeAllSubmenus]);

    const handleClose = useCallback(() => {
        setAnchorEl(null);
    }, []);

    const handleSubmenuItemClick = useCallback((subItem) => {
        if (subItem.onClick) {
            subItem.onClick();
        }
        handleClose();
        closeAllSubmenus();
    }, [handleClose, closeAllSubmenus]);

    // Memoizar estilos para evitar re-cálculos
    const itemStyles = useMemo(() => ({
        borderRadius: 2,
        mx: 1,
        mb: 0.5,
        py: 1.5,
        px: isCompact ? 2.5 : 2,
        minHeight: 52,
        justifyContent: isCompact ? 'center' : 'flex-start',
        background: isItemActive
            ? `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`
            : 'transparent',
        color: isItemActive ? theme.palette.primary.main : 'text.primary',
        border: isItemActive ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : '1px solid transparent',
        '&:hover': {
            background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            transform: 'translateX(4px)',
            color: theme.palette.primary.main
        },
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        overflow: 'hidden'
    }), [isItemActive, isCompact, theme]);

    return (
        <>
            <Tooltip
                title={isCompact ? item.text : ""}
                placement="right"
                disableHoverListener={!isCompact}
                arrow
                componentsProps={{
                    tooltip: {
                        sx: {
                            bgcolor: theme.palette.background.paper,
                            color: theme.palette.text.primary,
                            boxShadow: theme.shadows[8],
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            fontSize: '0.8rem',
                            fontWeight: 500
                        }
                    }
                }}
            >
                <ListItemButton
                    component={item.to && !hasSubmenu ? Link : "div"}
                    to={item.to && !hasSubmenu ? item.to : undefined}
                    onClick={handleClick}
                    onMouseEnter={() => onHover?.(item.id)}
                    onMouseLeave={onLeave}
                    sx={itemStyles}
                >
                    {/* Active indicator bar */}
                    {isItemActive && (
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: 4 }}
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                height: 24,
                                borderRadius: '0 2px 2px 0',
                                background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                            }}
                        />
                    )}

                    {/* Halo effect for active items */}
                    {isItemActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                borderRadius: 8,
                                boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                                zIndex: -1
                            }}
                        />
                    )}

                    {/* Icon with badge */}
                    <ListItemIcon
                        sx={{
                            minWidth: 0,
                            mr: isCompact ? 0 : 2,
                            justifyContent: 'center',
                            color: 'inherit'
                        }}
                    >
                        <Badge
                            badgeContent={item.isBadged ? notificationCount : item.badge}
                            color="secondary"
                            sx={{
                                '& .MuiBadge-badge': {
                                    right: isCompact ? -2 : -6,
                                    top: 4,
                                    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                                }
                            }}
                            invisible={!item.isBadged && !item.badge}
                        >
                            {React.cloneElement(item.icon, {
                                sx: {
                                    fontSize: isCompact ? 24 : 24,
                                    filter: isItemActive ? 'drop-shadow(0 0 2px rgba(0,0,0,0.3))' : 'none'
                                }
                            })}
                        </Badge>
                    </ListItemIcon>

                    {/* Text with animation */}
                    {!isCompact && (
                        <ListItemText
                            primary={
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: isItemActive ? 700 : 500,
                                        fontSize: '0.9rem',
                                        background: isItemActive
                                            ? `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                                            : 'none',
                                        WebkitBackgroundClip: isItemActive ? 'text' : null,
                                        WebkitTextFillColor: isItemActive ? 'transparent' : null,
                                    }}
                                >
                                    {item.text}
                                </Typography>
                            }
                        />
                    )}

                    {/* Arrow for submenu */}
                    {hasSubmenu && !isCompact && (
                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                            <ArrowForwardIos sx={{
                                fontSize: 12,
                                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s',
                                color: isItemActive ? 'primary.main' : 'inherit'
                            }} />
                        </Box>
                    )}

                    {/* Hover expansion effect for compact mode */}
                    {isCompact && isHovered && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            style={{
                                position: 'absolute',
                                left: '100%',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: theme.palette.background.paper,
                                color: theme.palette.text.primary,
                                padding: '8px 16px',
                                borderRadius: 8,
                                boxShadow: theme.shadows[8],
                                whiteSpace: 'nowrap',
                                zIndex: 1300,
                                marginLeft: 12,
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                fontWeight: 500
                            }}
                        >
                            {item.text}
                        </motion.div>
                    )}
                </ListItemButton>
            </Tooltip>

            {/* Submenu expandido - renderiza apenas se for ESTE item que está aberto */}
            <AnimatePresence>
                {hasSubmenu && !isCompact && isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        style={{ overflow: 'hidden' }}
                    >
                        <List sx={{ pl: 1 }}>
                            {accessibleSubmenu.map(subItem => {
                                const isSubItemActive = subItem.to === location.pathname;

                                return (
                                    <ListItemButton
                                        key={subItem.id}
                                        component={subItem.to ? Link : "div"}
                                        to={subItem.to}
                                        onClick={() => handleSubmenuItemClick(subItem)}
                                        sx={{
                                            borderRadius: '0 8px 8px 0',
                                            py: 1.2,
                                            px: 2,
                                            my: 0.5,
                                            mx: 0,
                                            position: 'relative',
                                            bgcolor: isSubItemActive ? 'action.selected' : 'transparent',
                                            color: isSubItemActive ? 'primary.main' : 'text.primary',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                            ...(isSubItemActive && {
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: '20%',
                                                    height: '60%',
                                                    width: 4,
                                                    borderRadius: '0 4px 4px 0',
                                                    bgcolor: 'primary.main',
                                                }
                                            })
                                        }}
                                    >
                                        <ListItemIcon sx={{
                                            minWidth: 0,
                                            mr: 2,
                                            justifyContent: 'center',
                                            color: isSubItemActive ? 'primary.main' : 'inherit'
                                        }}>
                                            {subItem.isBadged ? (
                                                <Badge
                                                    badgeContent={notificationCount}
                                                    color="secondary"
                                                    sx={{
                                                        '& .MuiBadge-badge': {
                                                            right: -6,
                                                            top: 4
                                                        }
                                                    }}
                                                >
                                                    {subItem.icon}
                                                </Badge>
                                            ) : subItem.icon}
                                        </ListItemIcon>

                                        <ListItemText
                                            primary={
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: isSubItemActive ? 600 : 400,
                                                        color: isSubItemActive ? 'primary.main' : 'inherit'
                                                    }}
                                                >
                                                    {subItem.text}
                                                </Typography>
                                            }
                                        />
                                    </ListItemButton>
                                );
                            })}
                        </List>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Popup submenu para modo compacto */}
            {hasSubmenu && isCompact && (
                <Popper
                    open={popperOpen}
                    anchorEl={anchorEl}
                    placement="right-start"
                    transition
                    disablePortal={false}
                    modifiers={[
                        {
                            name: 'offset',
                            options: { offset: [0, 5] },
                        },
                        {
                            name: 'preventOverflow',
                            enabled: true,
                            options: {
                                altAxis: true,
                                rootBoundary: 'document',
                            },
                        }
                    ]}
                    style={{
                        zIndex: 1500,
                        position: 'fixed'
                    }}
                    container={document.body}
                >
                    {({ TransitionProps }) => (
                        <Grow
                            {...TransitionProps}
                            style={{ transformOrigin: 'left top' }}
                        >
                            <Paper
                                elevation={6}
                                sx={{
                                    minWidth: 220,
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                                }}
                            >
                                <ClickAwayListener onClickAway={handleClose}>
                                    <MenuList autoFocusItem={popperOpen}>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                px: 2,
                                                py: 1.5,
                                                fontWeight: 600,
                                                borderBottom: '1px solid',
                                                borderColor: 'divider',
                                                color: isItemActive ? 'primary.main' : 'inherit'
                                            }}
                                        >
                                            {item.text}
                                        </Typography>
                                        {accessibleSubmenu.map((subItem) => {
                                            const isSubItemActive = subItem.to === location.pathname;

                                            return (
                                                <MenuItem
                                                    key={subItem.id}
                                                    component={subItem.to ? Link : 'div'}
                                                    to={subItem.to}
                                                    onClick={() => handleSubmenuItemClick(subItem)}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1.5,
                                                        py: 1,
                                                        px: 2,
                                                        position: 'relative',
                                                        bgcolor: isSubItemActive ? 'action.selected' : 'transparent',
                                                        color: isSubItemActive ? 'primary.main' : 'inherit',
                                                        fontWeight: isSubItemActive ? 600 : 400,
                                                        '&:hover': {
                                                            bgcolor: 'action.hover'
                                                        },
                                                        ...(isSubItemActive && {
                                                            '&::before': {
                                                                content: '""',
                                                                position: 'absolute',
                                                                left: 0,
                                                                top: '20%',
                                                                height: '60%',
                                                                width: 4,
                                                                borderRadius: '0 4px 4px 0',
                                                                bgcolor: 'primary.main',
                                                            }
                                                        })
                                                    }}
                                                >
                                                    <Box sx={{
                                                        color: isSubItemActive ? 'primary.main' : 'inherit'
                                                    }}>
                                                        {subItem.icon}
                                                    </Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: isSubItemActive ? 600 : 400,
                                                            color: isSubItemActive ? 'primary.main' : 'inherit'
                                                        }}
                                                    >
                                                        {subItem.text}
                                                    </Typography>
                                                    {subItem.isBadged && notificationCount > 0 && (
                                                        <Badge
                                                            badgeContent={notificationCount}
                                                            color="secondary"
                                                            sx={{ ml: 'auto' }}
                                                        />
                                                    )}
                                                </MenuItem>
                                            );
                                        })}
                                    </MenuList>
                                </ClickAwayListener>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            )}
        </>
    );
});

// Adicionar displayName para debugging
SidebarItem.displayName = 'SidebarItem';

export default SidebarItem;