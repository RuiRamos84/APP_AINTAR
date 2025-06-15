// frontend/src/pages/Operation/components/offline/PullToRefresh.js
import React, { useState, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Refresh, ArrowDownward } from '@mui/icons-material';

const PullToRefresh = ({ onRefresh, children, threshold = 60 }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [startY, setStartY] = useState(0);
    const containerRef = useRef(null);

    const handleTouchStart = (e) => {
        if (containerRef.current?.scrollTop === 0) {
            setStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e) => {
        if (containerRef.current?.scrollTop === 0 && startY) {
            const deltaY = e.touches[0].clientY - startY;
            if (deltaY > 0) {
                e.preventDefault();
                setPullDistance(Math.min(deltaY, 100));
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > threshold && !refreshing) {
            setRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
            }
        }
        setPullDistance(0);
        setStartY(0);
    };

    const getIcon = () => {
        if (refreshing) return <CircularProgress size={24} />;
        if (pullDistance > threshold) return <Refresh />;
        return <ArrowDownward />;
    };

    const getMessage = () => {
        if (refreshing) return 'A actualizar...';
        if (pullDistance > threshold) return 'Soltar para actualizar';
        if (pullDistance > 20) return 'Puxar para actualizar';
        return '';
    };

    return (
        <Box
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{
                position: 'relative',
                overflow: 'auto',
                height: '100%'
            }}
        >
            {/* Indicador */}
            {pullDistance > 0 && (
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: `translateX(-50%) translateY(${Math.max(0, pullDistance - 40)}px)`,
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 2
                }}>
                    {getIcon()}
                    <Typography variant="caption" color="text.secondary">
                        {getMessage()}
                    </Typography>
                </Box>
            )}

            {/* Conteúdo */}
            <Box sx={{
                transform: `translateY(${pullDistance > 0 ? pullDistance : 0}px)`,
                transition: refreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none'
            }}>
                {children}
            </Box>
        </Box>
    );
};

export default PullToRefresh;