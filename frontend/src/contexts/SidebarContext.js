import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const SidebarContext = createContext();

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider = ({ children }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Define apenas dois estados: "full" e "compact"
    const [sidebarMode, setSidebarMode] = useState(() => {
        const savedMode = localStorage.getItem('sidebarMode');
        return savedMode || 'compact'; // Modificado - sempre inicia fechada
    });

    const [openSubmenu, setOpenSubmenu] = useState(null);

    // Guarda preferência do utilizador
    useEffect(() => {
        localStorage.setItem('sidebarMode', sidebarMode);
    }, [sidebarMode]);

    // Ajusta para modo mobile automaticamente
    useEffect(() => {
        if (isMobile && sidebarMode !== 'compact') {
            setSidebarMode('compact');
        }
    }, [isMobile]);

    // Alterna entre dois estados: full <-> compact
    const toggleSidebar = () => {
        setSidebarMode(prev => prev === 'full' ? 'compact' : 'full');
    };

    // Compatibilidade com API antiga
    const isOpen = sidebarMode === 'full';
    const legacyToggleSidebar = () => {
        setSidebarMode(prev => prev === 'full' ? 'compact' : 'full');
    };

    return (
        <SidebarContext.Provider value={{
            sidebarMode,
            setSidebarMode,
            openSubmenu,
            setOpenSubmenu,
            toggleSidebar,
            isMobile,
            // API compatível com código existente
            isOpen,
            legacyToggleSidebar
        }}>
            {children}
        </SidebarContext.Provider>
    );
};