import React, { useState, useEffect } from 'react';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import { IconButton } from '@mui/material';

const ResponsiveSidebar = ({ children, breakpoint = 768 }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
            if (window.innerWidth >= breakpoint) {
                setIsOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return (
        <>
            {/* Toggle Button - Only on mobile */}
            {isMobile && (
                <IconButton
                    onClick={() => setIsOpen(!isOpen)}
                    sx={{
                        position: 'fixed',
                        bottom: '20px',
                        left: isOpen ? '270px' : '20px', // Ajusta posição com a sidebar
                        zIndex: 1301,
                        backgroundColor: 'background.paper',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        width: '48px',
                        height: '48px',
                        transition: 'left 0.3s ease-in-out',
                        '&:hover': {
                            backgroundColor: 'action.hover',
                            transform: 'scale(1.1)',
                        },
                    }}
                    aria-label="Toggle Sidebar"
                >
                    {isOpen ? <CloseIcon /> : <MenuIcon />}
                </IconButton>
            )}

            {/* Backdrop - Only on mobile */}
            {isMobile && isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 1199,
                        transition: 'opacity 0.3s ease-in-out',
                    }}
                />
            )}

            {/* Sidebar Container */}
            <div
                style={{
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
            </div>
        </>
    );
};

export default ResponsiveSidebar;