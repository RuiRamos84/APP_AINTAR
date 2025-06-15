// frontend/src/pages/Operation/components/gestures/SwipeableCard.js
import React, { useRef, useState, useCallback } from 'react';
import { Box } from '@mui/material';

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
    const cardRef = useRef(null);
    const [gesture, setGesture] = useState({
        startX: 0,
        startY: 0,
        startTime: 0,
        isDragging: false
    });

    const handleStart = useCallback((e) => {
        if (disabled) return;

        const touch = e.touches?.[0] || e;
        setGesture({
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: Date.now(),
            isDragging: true
        });
    }, [disabled]);

    const handleEnd = useCallback((e) => {
        if (disabled || !gesture.isDragging) return;

        const touch = e.changedTouches?.[0] || e;
        const deltaX = gesture.startX - touch.clientX;
        const deltaY = gesture.startY - touch.clientY;
        const duration = Date.now() - gesture.startTime;

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        setGesture(prev => ({ ...prev, isDragging: false }));

        // Tap ou long press
        if (absX < 10 && absY < 10) {
            if (duration > 500 && onLongPress) {
                onLongPress(e);
            } else if (duration < 300 && onTap) {
                onTap(e);
            }
            return;
        }

        // Swipe
        if (absX > threshold || absY > threshold) {
            if (absX > absY) {
                // Horizontal
                if (deltaX > 0 && onSwipeLeft) onSwipeLeft(e);
                else if (deltaX < 0 && onSwipeRight) onSwipeRight(e);
            } else {
                // Vertical
                if (deltaY > 0 && onSwipeUp) onSwipeUp(e);
                else if (deltaY < 0 && onSwipeDown) onSwipeDown(e);
            }
        }
    }, [disabled, gesture, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onLongPress]);

    return (
        <Box
            ref={cardRef}
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
            onMouseDown={handleStart}
            onMouseUp={handleEnd}
            sx={{
                cursor: gesture.isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'pan-y',
                transition: gesture.isDragging ? 'none' : 'transform 0.2s ease',
                '&:active': { transform: 'scale(0.98)' },
                ...(disabled && { cursor: 'default', pointerEvents: 'none' })
            }}
        >
            {children}
        </Box>
    );
};

export default SwipeableCard;