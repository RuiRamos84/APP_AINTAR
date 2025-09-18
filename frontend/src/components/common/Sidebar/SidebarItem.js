// components/common/Sidebar/SidebarItem.js - VERSÃO FINAL CORRIGIDA
import React, { useState, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

const iconStyle = {
    fontSize: '24px',
    color: 'inherit',
    strokeWidth: 1.5
};

const SidebarItem = React.memo(({
    item,
    isActive,
    onHover,
    onLeave,
    isHovered,
    notificationCount = 0,
    onItemClick
}) => {
    const theme = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        sidebarMode,
        openSubmenus,
        toggleSubmenu,
        closeAllSubmenus,
        isCompact
    } = useSidebar();

    const [anchorEl, setAnchorEl] = useState(null);

    const submenuArray = useMemo(() => {
        return item.submenu ? Object.values(item.submenu) : [];
    }, [item.submenu]);

    const isSubmenuActive = useMemo(() => {
        return submenuArray.length > 0 && submenuArray.some(
            subItem => subItem.to === location.pathname
        );
    }, [submenuArray, location.pathname]);

    const isItemActive = isActive || isSubmenuActive;
    const hasSubmenu = submenuArray.length > 0;
    const isOpen = openSubmenus[item.id] || false;
    const popperOpen = Boolean(anchorEl);

    const renderIcon = useCallback((IconComponent, props = {}) => {
        if (!IconComponent) return null;

        if (IconComponent.$$typeof && IconComponent.type) {
            const ActualIcon = IconComponent.type;
            return <ActualIcon sx={{ ...iconStyle, ...props }} />;
        }

        if (typeof IconComponent === 'function') {
            return <IconComponent sx={{ ...iconStyle, ...props }} />;
        }

        return null;
    }, []);

    const handleClick = useCallback((event) => {
        // Se o item tem um submenu, a sua única função é abrir/fechar o submenu.
        if (hasSubmenu) {
            event.preventDefault(); // Prevenir qualquer outra ação de clique
            if (isCompact) {
                // No modo compacto, abre um popper.
                setAnchorEl(prev => prev ? null : event.currentTarget);
            } else {
                // No modo expandido, expande/recolhe o submenu.
                toggleSubmenu(item.id);
            }
        // Se não tem submenu, delega a ação para o handler global.
        } else {
            onItemClick?.(item);
        }
    }, [item, hasSubmenu, isCompact, navigate, toggleSubmenu, onItemClick]);

    const handleSubmenuItemClick = useCallback((subItem, event) => {
        if (event) event.preventDefault();

        // Ação principal: Chamar o handler global que sabe o que fazer com o item.
        onItemClick?.(subItem);

        closeAllSubmenus();
        setAnchorEl(null);
    }, [navigate, onItemClick, closeAllSubmenus]);

    const handleClose = useCallback(() => {
        setAnchorEl(null);
    }, []);

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
        overflow: 'hidden',
        cursor: 'pointer'
    }), [isItemActive, isCompact, theme]);

    // console.log('Renderizando SidebarItem:', item.text, 'to:', item.to, 'hasSubmenu:', hasSubmenu);

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
                {/* SEMPRE usar div como component para ter controle total */}
                <ListItemButton
                    component="div"
                    onClick={handleClick}
                    onMouseEnter={() => onHover?.(item.id)}
                    onMouseLeave={onLeave}
                    sx={itemStyles}
                >
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
                            {renderIcon(item.icon, {
                                fontSize: isCompact ? 24 : 24,
                                filter: isItemActive ? 'drop-shadow(0 0 2px rgba(0,0,0,0.3))' : 'none'
                            })}
                        </Badge>
                    </ListItemIcon>

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

            {/* Submenu expandido */}
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
                            {submenuArray.map(subItem => {
                                const isSubItemActive = subItem.to === location.pathname;

                                return (
                                    <ListItemButton
                                        key={subItem.id}
                                        component="div"
                                        onClick={(event) => handleSubmenuItemClick(subItem, event)}
                                        sx={{
                                            borderRadius: '0 8px 8px 0',
                                            py: 1.2,
                                            px: 2,
                                            my: 0.5,
                                            mx: 0,
                                            position: 'relative',
                                            bgcolor: isSubItemActive ? 'action.selected' : 'transparent',
                                            color: isSubItemActive ? 'primary.main' : 'text.primary',
                                            cursor: 'pointer',
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
                                                    {renderIcon(subItem.icon)}
                                                </Badge>
                                            ) : renderIcon(subItem.icon)}
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
                                        {submenuArray.map((subItem) => {
                                            const isSubItemActive = subItem.to === location.pathname;

                                            return (
                                                <MenuItem
                                                    key={subItem.id}
                                                    component="div"
                                                    onClick={(event) => handleSubmenuItemClick(subItem, event)}
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
                                                        cursor: 'pointer',
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
                                                        {renderIcon(subItem.icon)}
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

SidebarItem.displayName = 'SidebarItem';

export default SidebarItem;