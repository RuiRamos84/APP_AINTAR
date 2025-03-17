import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    ListItem,
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
    List
} from '@mui/material';
import { ArrowForwardIos } from '@mui/icons-material';
import { useSidebar } from '../../../contexts/SidebarContext';
import { useAuth } from "../../../contexts/AuthContext";
import { motion, AnimatePresence } from 'framer-motion';

const SidebarItem = ({
    item,
    notificationCount,
    handleAction
}) => {
    const location = useLocation();
    const { user } = useAuth();
    const { sidebarMode, openSubmenu, setOpenSubmenu } = useSidebar();
    const [anchorEl, setAnchorEl] = useState(null);

    // Verificar se o item atual está ativo
    const isItemActive = item.to === location.pathname;

    // Verificar se algum submenu está ativo (para destacar o item pai)
    const isSubmenuActive = item.submenu && item.submenu.some(
        subItem => subItem.to === location.pathname
    );

    // Estado ativo combinado (próprio item ou qualquer submenu)
    const isActive = isItemActive || isSubmenuActive;

    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isOpen = openSubmenu === item.id;
    const popperOpen = Boolean(anchorEl);

    const handleClick = (event) => {
        if (hasSubmenu) {
            if (sidebarMode === 'compact') {
                // No modo compacto, mostra o popup
                setAnchorEl(anchorEl ? null : event.currentTarget);
            } else {
                // No modo full, expande o submenu normalmente
                setOpenSubmenu(isOpen ? null : item.id);
            }
        } else if (item.onClick) {
            handleAction(item.onClick);
        }
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSubmenuItemClick = (subItem) => {
        if (subItem.onClick) {
            handleAction(subItem.onClick);
        }
        handleClose();
    };

    const hasAccess = (rolesAllowed) => {
        return rolesAllowed.includes(user.profil);
    };

    // Filtrar os submenus com base nas permissões do usuário
    const accessibleSubmenu = item.submenu
        ? item.submenu.filter(subItem => hasAccess(subItem.rolesAllowed))
        : [];

    return (
        <>
            <Tooltip
                title={sidebarMode === 'compact' ? item.text : ""}
                placement="right"
                disableHoverListener={sidebarMode === 'full'}
                arrow
            >
                <ListItem
                    button
                    component={item.to && !hasSubmenu ? Link : "div"}
                    to={item.to && !hasSubmenu ? item.to : undefined}
                    onClick={handleClick}
                    className={`menu-item ${isActive ? "active" : ""} ${isSubmenuActive ? "submenu-active" : ""}`}
                    sx={{
                        borderRadius: '8px',
                        py: 1.2,
                        px: 1.5,
                        my: 0.5,
                        mx: 1,
                        position: 'relative',
                        bgcolor: isActive ? 'action.selected' : 'transparent',
                        color: isActive ? 'primary.main' : 'text.primary',
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                        // Indicador lateral para item ativo
                        ...(isActive && {
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
                    {/* Icon with badge if needed */}
                    <Box sx={{
                        position: 'relative',
                        minWidth: 40,
                        display: 'flex',
                        justifyContent: 'center',
                        color: isActive ? 'primary.main' : 'inherit'
                    }}>
                        {item.isBadged ? (
                            <Badge
                                badgeContent={notificationCount}
                                color="secondary"
                                sx={{
                                    '& .MuiBadge-badge': {
                                        right: sidebarMode === 'compact' ? -2 : -6,
                                        top: 4
                                    }
                                }}
                            >
                                {item.icon}
                            </Badge>
                        ) : item.icon}
                    </Box>

                    {/* Text with animation */}
                    <AnimatePresence>
                        {sidebarMode === 'full' && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <ListItemText
                                    primary={
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                ml: 1,
                                                fontWeight: isActive ? 600 : 400,
                                                color: isActive ? 'primary.main' : 'inherit'
                                            }}
                                        >
                                            {item.text}
                                        </Typography>
                                    }
                                    className="list-item-text"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Arrow for submenu */}
                    {hasSubmenu && sidebarMode === 'full' && (
                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                            <ArrowForwardIos sx={{
                                fontSize: 12,
                                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s',
                                color: isActive ? 'primary.main' : 'inherit'
                            }} />
                        </Box>
                    )}
                </ListItem>
            </Tooltip>

            {/* Submenu expandido no modo full */}
            {hasSubmenu && sidebarMode === 'full' && isOpen && (
                <List sx={{ pl: 1 }}>
                    {accessibleSubmenu.map(subItem => {
                        // Verificar se este submenu está ativo
                        const isSubItemActive = subItem.to === location.pathname;

                        return (
                            <ListItem
                                key={subItem.id}
                                button
                                component={subItem.to ? Link : "div"}
                                to={subItem.to}
                                onClick={() => subItem.onClick && handleAction(subItem.onClick)}
                                className={`menu-item submenu-item ${isSubItemActive ? "active" : ""}`}
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
                                <Box sx={{
                                    position: 'relative',
                                    minWidth: 40,
                                    display: 'flex',
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
                                </Box>

                                <ListItemText
                                    primary={
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                ml: 1,
                                                fontWeight: isSubItemActive ? 600 : 400,
                                                color: isSubItemActive ? 'primary.main' : 'inherit'
                                            }}
                                        >
                                            {subItem.text}
                                        </Typography>
                                    }
                                    className="list-item-text"
                                />
                            </ListItem>
                        );
                    })}
                </List>
            )}

            {/* Popup submenu para modo compacto */}
            {hasSubmenu && sidebarMode === 'compact' && (
                <Popper
                    open={popperOpen}
                    anchorEl={anchorEl}
                    placement="right-start"
                    transition
                    disablePortal={false}
                    modifiers={[
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 5],
                            },
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
                                                color: isActive ? 'primary.main' : 'inherit'
                                            }}
                                        >
                                            {item.text}
                                        </Typography>
                                        {/* Usar a mesma lista filtrada de submenus */}
                                        {accessibleSubmenu.map((subItem) => {
                                            // Verificar se este submenu está ativo
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
                                                        // Indicador lateral para submenu ativo
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
};

export default SidebarItem;