import React, { useRef, useState } from 'react';
import { Box } from '@mui/material';
import useGestureNavigation from '../../hooks/useGestureNavigation';

const SwipeableCard = ({
    children,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onLongPress,
    threshold = 50,
    disabled = false
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const cardRef = useRef(null);

    const gestureHandlers = useGestureNavigation({
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        onTap,
        onLongPress,
        minDistance: threshold
    });

    const handleTouchStart = (e) => {
        if (disabled) return;
        setIsDragging(true);
        gestureHandlers.onTouchStart(e);
    };

    const handleTouchMove = (e) => {
        if (disabled) return;
        gestureHandlers.onTouchMove(e);
    };

    const handleTouchEnd = (e) => {
        if (disabled) return;
        setIsDragging(false);
        gestureHandlers.onTouchEnd(e);
    };

    const handleMouseDown = (e) => {
        if (disabled) return;
        setIsDragging(true);
        // Converter mouse para touch event
        const touch = { clientX: e.clientX, clientY: e.clientY };
        gestureHandlers.onTouchStart({ touches: [touch] });
    };

    return (
        <Box
            ref={cardRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            sx={{
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'pan-y',
                transition: isDragging ? 'none' : 'transform 0.2s ease',
                '&:active': { transform: 'scale(0.98)' },
                ...(disabled && {
                    cursor: 'default',
                    pointerEvents: 'none'
                })
            }}
        >
            {children}
        </Box>
    );
};

export default SwipeableCard;