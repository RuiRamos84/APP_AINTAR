import React, { useRef, useState } from 'react';
import { Box } from '@mui/material';

const SwipeableCard = ({
    children,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    threshold = 50
}) => {
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const handleStart = (clientX, clientY) => {
        setStartPos({ x: clientX, y: clientY });
        setIsDragging(true);
    };

    const handleEnd = (clientX, clientY) => {
        if (!isDragging) return;

        const deltaX = clientX - startPos.x;
        const deltaY = clientY - startPos.y;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        setIsDragging(false);

        // Tap simples
        if (absDeltaX < 10 && absDeltaY < 10) {
            onSwipeUp?.();
            return;
        }

        // Swipe horizontal
        if (absDeltaX > threshold && absDeltaX > absDeltaY) {
            if (deltaX > 0) onSwipeRight?.();
            else onSwipeLeft?.();
        }
    };

    const handleTouchStart = (e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (e) => {
        const touch = e.changedTouches[0];
        handleEnd(touch.clientX, touch.clientY);
    };

    return (
        <Box
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            sx={{
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'pan-y',
                transition: isDragging ? 'none' : 'transform 0.2s ease',
                '&:active': { transform: 'scale(0.98)' }
            }}
        >
            {children}
        </Box>
    );
};

export default SwipeableCard;