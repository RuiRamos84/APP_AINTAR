// components/common/Sidebar/MainSidebar.js - VERSÃO SIMPLIFICADA (SEM PERMISSÕES ASYNC)
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Box,
    List,
    Divider,
    IconButton,
    Typography,
    useTheme,
    alpha,
    Avatar,
    Switch,
    Tooltip,
    Badge,
    Drawer,
    Menu,
    MenuItem
} from '@mui/material';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Menu as MenuIcon,
    Brightness4 as DarkIcon,
    Brightness7 as LightIcon,
    BeachAccess as VacationIcon,
    Work as WorkIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    Lock as LockIcon,
    MoreVert as MoreIcon,
    Home as HomeIcon,
    Assignment as TaskIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '../../../contexts/SidebarContext';
import { useAuth } from "../../../contexts/AuthContext";
import SidebarItem from './SidebarItem';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { useRouteConfig } from './useRouteConfig';
import { useModal } from '../../../contexts/ModalContext';
import UnifiedNotificationCenter from './UnifiedNotificationCenter';
import { notifySuccess } from "../../common/Toaster/ThemedToaster";
import logo from "../../../assets/images/logo.png";

const MainSidebar = () => {
    const theme = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const {
        sidebarMode,
        setSidebarMode,
        toggleSidebar,
        isMobile,
        isOpen,
        isCompact
    } = useSidebar();
    const { user, logoutUser, toggleDarkMode, toggleVacationStatus } = useAuth();
    const { initialized: permissionsInitialized, hasPermission } = usePermissionContext();
    const { openModal } = useModal();

    const [hoveredItem, setHoveredItem] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
    const { getAccessibleSidebarItems } = useRouteConfig();

    // Carregar itens da sidebar DEPOIS que as permissões estiverem prontas
    useEffect(() => {
        const loadItems = () => {
            // Só carrega se o utilizador existir E as permissões estiverem inicializadas
            if (user && permissionsInitialized) {
                const accessibleItems = getAccessibleSidebarItems();
                setMenuItems(accessibleItems);
            } else if (!user) { // Limpar se o utilizador fizer logout
                setMenuItems([]);
            }
        };
        loadItems();
    }, [user, permissionsInitialized, getAccessibleSidebarItems]);

    // Agrupar por categoria
    const groupedItems = useMemo(() => {
        const groups = {};

        // Verificação segura se menuItems é array
        if (Array.isArray(menuItems)) {
            menuItems.forEach((item) => {
                const category = item.category || 'Geral';
                if (!groups[category]) groups[category] = [];
                groups[category].push(item);
            });
        }

        return groups;
    }, [menuItems]);

    // Handlers
    const handleItemHover = useCallback((itemId) => setHoveredItem(itemId), []);
    const handleItemLeave = useCallback(() => setHoveredItem(null), []);
    const handleToggleSidebar = useCallback(() => toggleSidebar(), [toggleSidebar]);
    const handleToggleDarkMode = useCallback(async () => { await toggleDarkMode(); }, [toggleDarkMode]);
    const handleToggleVacation = useCallback(async () => { await toggleVacationStatus(); }, [toggleVacationStatus]);
    const handleBackdropClick = useCallback(() => { if (isMobile) setSidebarMode('closed'); }, [isMobile, setSidebarMode]);

    const handleProfileClick = useCallback((event) => {
        setProfileMenuAnchor(event.currentTarget);
    }, []);

    const handleProfileMenuClose = useCallback(() => {
        setProfileMenuAnchor(null);
    }, []);

    const handleLogout = useCallback(() => {
        logoutUser();
        notifySuccess("Logout realizado");
        handleProfileMenuClose();
        navigate("/login");
    }, [logoutUser, navigate, handleProfileMenuClose]);

    const handleNavigate = useCallback((path) => {
        navigate(path);
        handleProfileMenuClose();
    }, [navigate, handleProfileMenuClose]);

    const handleItemClick = useCallback((item) => {
        // 1. Se for uma ação definida (como abrir um modal)
        if (item.action) {
            if (item.action === 'openModal' && item.actionPayload) {
                openModal(item.actionPayload);
            }
            // Outras ações podem ser adicionadas aqui
            return;
        }
        // 2. Se for uma função de clique personalizada
        if (typeof item.onClick === 'function') {
            item.onClick();
        } else if (item.to) { // 3. Se for uma rota de navegação
            navigate(item.to);
        }
    }, [navigate, openModal]);

    const isDarkMode = user?.dark_mode;
    const sidebarWidth = isCompact ? 72 : 300;

    // 1. Verificar se os itens chegam ao MainSidebar
    // console.log('menuItems no MainSidebar:', menuItems);

    // 2. Verificar se os itens têm estrutura correcta
    // console.log('Primeiro item:', menuItems[0]);

    // 3. Verificar groupedItems
    // console.log('groupedItems:', groupedItems);

    const sidebarBody = (
        <motion.div
            animate={{ width: sidebarWidth }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${theme.palette.background.paper} 100%)`,
                boxShadow: theme.shadows[10],
                borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Header com Logo */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 64,
                px: isCompact ? 1 : 2,
                cursor: 'pointer'
            }}
                onClick={() => navigate('/')}
            >
                <AnimatePresence mode="wait">
                    {isCompact ? (
                        <motion.div
                            key="compact-logo"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Box
                                component="img"
                                src={logo}
                                alt="Logo"
                                sx={{
                                    height: 62,
                                    width: 142,
                                    objectFit: 'contain',
                                    clipPath: 'inset(0 64% 0 0)',
                                    transform: 'translateX(30%)',
                                }}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="full-logo"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <img
                                src={logo}
                                alt="Logo"
                                style={{
                                    height: 32,
                                    objectFit: 'contain'
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>

            <Divider sx={{ opacity: 0.2 }} />

            {/* Perfil + Notificações */}
            <Box sx={{ p: isCompact ? 1 : 2 }}>
                {/* Notificações - apenas mostrar se tiver permissão para tarefas */}
                {permissionsInitialized && hasPermission(200) && (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: isCompact ? 'center' : 'flex-end',
                        mb: 1
                    }}>
                        <UnifiedNotificationCenter />
                    </Box>
                )}

                {/* Perfil */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: isCompact ? 'column' : 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        p: 1,
                        borderRadius: 2,
                        '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.05) }
                    }}
                    onClick={handleProfileClick}
                >
                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                            user?.vacation ? (
                                <VacationIcon color="warning" sx={{ fontSize: isCompact ? 12 : 16 }} />
                            ) : (
                                <WorkIcon color="success" sx={{ fontSize: isCompact ? 12 : 16 }} />
                            )
                        }
                    >
                        <Avatar
                            src={user?.avatar}
                            sx={{
                                width: isCompact ? 32 : 40,
                                height: isCompact ? 32 : 40,
                                mr: isCompact ? 0 : 1.5,
                                border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                                boxShadow: theme.shadows[2]
                            }}
                        >
                            {user?.user_name?.charAt(0)?.toUpperCase() || 'U'}
                        </Avatar>
                    </Badge>

                    <AnimatePresence>
                        {!isCompact && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                style={{ flexGrow: 1, overflow: 'hidden' }}
                            >
                                <Typography variant="body2" noWrap fontWeight="600">
                                    {user?.user_name || 'Utilizador'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {user?.email || ''}
                                </Typography>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!isCompact && (
                        <IconButton
                            size="small"
                            onClick={handleProfileClick}
                            sx={{
                                '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.1) }
                            }}
                        >
                            <MoreIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            </Box>

            <Divider sx={{ opacity: 0.2 }} />

            {/* Navegação */}
            <Box sx={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                py: 1,
                scrollbarWidth: 'thin'
            }}>
                {Object.entries(groupedItems).map(([category, items]) => (
                    <Box key={category} sx={{ mb: isCompact ? 1 : 2 }}>
                        <List disablePadding>
                            {items.map((item) => (
                                <SidebarItem
                                    key={item.id}
                                    item={item}
                                    isActive={location.pathname === item.to}
                                    onHover={handleItemHover}
                                    onLeave={handleItemLeave}
                                    isHovered={hoveredItem === item.id}
                                    onItemClick={handleItemClick}
                                />
                            ))}
                        </List>
                    </Box>
                ))}
            </Box>

            {/* Footer */}
            <Box sx={{
                flex: '0 0 auto',
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                backgroundColor: theme.palette.background.paper
            }}>
                <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
                    <IconButton
                        onClick={handleToggleSidebar}
                        sx={{
                            backgroundColor: alpha(theme.palette.primary.main, 0.2),
                            width: 32,
                            height: 32,
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.3),
                                transform: 'scale(1.1)'
                            },
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {isCompact ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                    </IconButton>
                </Box>

                <AnimatePresence>
                    {!isCompact && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Box sx={{ pb: 1, px: 2, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                    v2.0
                                </Typography>
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>

            {/* Menu do perfil */}
            <Menu
                anchorEl={profileMenuAnchor}
                open={Boolean(profileMenuAnchor)}
                onClose={handleProfileMenuClose}
                anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
                transformOrigin={{ vertical: 'center', horizontal: 'left' }}
                PaperProps={{
                    sx: { minWidth: 250 }
                }}
            >
                <MenuItem onClick={() => handleNavigate('/user-info')}>
                    <PersonIcon sx={{ mr: 1 }} fontSize="small" />
                    Perfil
                </MenuItem>
                <MenuItem onClick={() => handleNavigate('/change-password')}>
                    <LockIcon sx={{ mr: 1 }} fontSize="small" />
                    Alterar Password
                </MenuItem>

                <Divider sx={{ my: 1 }} />

                <MenuItem onClick={handleToggleDarkMode} sx={{ justifyContent: 'space-between', py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {isDarkMode ? <DarkIcon sx={{ mr: 1 }} fontSize="small" color="primary" /> : <LightIcon sx={{ mr: 1 }} fontSize="small" />}
                        Modo Escuro
                    </Box>
                    <Switch
                        checked={isDarkMode}
                        onChange={handleToggleDarkMode}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                    />
                </MenuItem>

                <MenuItem onClick={handleToggleVacation} sx={{ justifyContent: 'space-between', py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {user?.vacation ?
                            <VacationIcon sx={{ mr: 1 }} fontSize="small" color="warning" /> :
                            <WorkIcon sx={{ mr: 1 }} fontSize="small" />
                        }
                        {user?.vacation ? 'Férias' : 'Trabalho'}
                    </Box>
                    <Switch
                        checked={user?.vacation}
                        onChange={handleToggleVacation}
                        size="small"
                        color="warning"
                        onClick={(e) => e.stopPropagation()}
                    />
                </MenuItem>

                <Divider sx={{ my: 1 }} />

                <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                    Logout
                </MenuItem>
            </Menu>
        </motion.div>
    );

    if (isMobile) {
        return (
            <>
                <IconButton
                    onClick={handleToggleSidebar}
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        left: 20,
                        zIndex: 1302,
                        backgroundColor: 'background.paper',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        width: 48,
                        height: 48,
                        '&:hover': {
                            backgroundColor: 'action.hover',
                            transform: 'scale(1.1)'
                        }
                    }}
                >
                    <MenuIcon />
                </IconButton>

                <Drawer
                    anchor="left"
                    open={isOpen}
                    onClose={handleBackdropClick}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        '& .MuiDrawer-paper': {
                            width: sidebarWidth,
                            border: 'none'
                        }
                    }}
                >
                    {sidebarBody}
                </Drawer>
            </>
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, zIndex: 1200 }}>
            {sidebarBody}
        </Box>
    );
};

export default MainSidebar;