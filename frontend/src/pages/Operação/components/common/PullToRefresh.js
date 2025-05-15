import React, { useState, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Refresh } from '@mui/icons-material';

const PullToRefresh = ({ onRefresh, children }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [touchStartY, setTouchStartY] = useState(0);
    const containerRef = useRef(null);

    const handleTouchStart = (e) => {
        if (containerRef.current?.scrollTop === 0) {
            setTouchStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e) => {
        if (containerRef.current?.scrollTop === 0 && touchStartY) {
            const deltaY = e.touches[0].clientY - touchStartY;
            if (deltaY > 0) {
                e.preventDefault();
                setPullDistance(Math.min(deltaY, 100));
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > 50) {
            setRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
            }
        }
        setPullDistance(0);
        setTouchStartY(0);
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
            {pullDistance > 0 && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: `translateX(-50%) translateY(${pullDistance - 40}px)`,
                        zIndex: 1
                    }}
                >
                    {refreshing ? (
                        <CircularProgress size={24} />
                    ) : (
                        <Refresh sx={{
                            transform: `rotate(${pullDistance * 3.6}deg)`,
                            transition: 'transform 0.1s'
                        }} />
                    )}
                </Box>
            )}
            <Box
                sx={{
                    transform: `translateY(${pullDistance > 0 ? pullDistance : 0}px)`,
                    transition: refreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none'
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

export default PullToRefresh;