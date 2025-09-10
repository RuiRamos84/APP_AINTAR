// contexts/SidebarContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const SidebarContext = createContext();

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar deve ser usado dentro de SidebarProvider');
    }
    return context;
};

export const SidebarProvider = ({ children }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Estado principal da sidebar
    const [sidebarMode, setSidebarMode] = useState(() => {
        const savedMode = localStorage.getItem('sidebarMode');
        const validModes = ['full', 'compact', 'closed'];
        return validModes.includes(savedMode) ? savedMode : (isMobile ? 'closed' : 'compact');
    });

    // Estado para submenus abertos
    const [openSubmenus, setOpenSubmenus] = useState({});

    // Estado para item em hover
    const [hoveredItem, setHoveredItem] = useState(null);

    // Salvar preferência do utilizador (apenas desktop)
    useEffect(() => {
        if (!isMobile) {
            localStorage.setItem('sidebarMode', sidebarMode);
        }
    }, [sidebarMode, isMobile]);

    // Ajustar automaticamente para mobile
    useEffect(() => {
        if (isMobile && sidebarMode !== 'closed') {
            setSidebarMode('closed');
            setOpenSubmenus({}); // Fechar todos os submenus no mobile
        }
    }, [isMobile]);

    // Funções de controle da sidebar
    const toggleSidebar = useCallback(() => {
        if (isMobile) {
            setSidebarMode(prev => prev === 'closed' ? 'full' : 'closed');
        } else {
            // Desktop: toggle apenas entre compact e full
            setSidebarMode(prev => prev === 'full' ? 'compact' : 'full');
        }
    }, [isMobile]);

    const openSidebar = useCallback(() => {
        setSidebarMode('full');
    }, []);

    const closeSidebar = useCallback(() => {
        setSidebarMode(isMobile ? 'closed' : 'compact');
    }, [isMobile]);

    // Funções de controle dos submenus
    const toggleSubmenu = useCallback((itemId) => {
        setOpenSubmenus(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    }, []);

    const closeAllSubmenus = useCallback(() => {
        setOpenSubmenus({});
    }, []);

    const openSubmenu = useCallback((itemId) => {
        setOpenSubmenus(prev => ({
            ...prev,
            [itemId]: true
        }));
    }, []);

    const closeSubmenu = useCallback((itemId) => {
        setOpenSubmenus(prev => ({
            ...prev,
            [itemId]: false
        }));
    }, []);

    // Estados derivados
    const isOpen = sidebarMode !== 'closed';
    const isFullyOpen = sidebarMode === 'full';
    const isCompact = sidebarMode === 'compact';

    const value = {
        // Estados principais
        sidebarMode,
        setSidebarMode,
        openSubmenus,
        setOpenSubmenus,
        hoveredItem,
        setHoveredItem,

        // Funções de controle
        toggleSidebar,
        openSidebar,
        closeSidebar,

        // Controle de submenus
        toggleSubmenu,
        closeAllSubmenus,
        openSubmenu,
        closeSubmenu,

        // Estados derivados
        isMobile,
        isOpen,
        isFullyOpen,
        isCompact
    };

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
};