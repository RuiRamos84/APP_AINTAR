import React, { useRef, useState } from 'react';
import { Box } from '@mui/material';

const SwipeableCard = ({
    children,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    threshold = 50,        // Distância mínima para considerar swipe
    scrollThreshold = 10   // Tolerância para scroll vertical
}) => {
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [hasMoved, setHasMoved] = useState(false);
    const containerRef = useRef(null);

    const handleStart = (clientX, clientY) => {
        setStartPos({ x: clientX, y: clientY });
        setIsDragging(true);
        setHasMoved(false);
    };

    const handleMove = (clientX, clientY) => {
        if (!isDragging) return;

        const deltaX = Math.abs(clientX - startPos.x);
        const deltaY = Math.abs(clientY - startPos.y);

        // Se houve movimento significativo, marca como moved
        if (deltaX > scrollThreshold || deltaY > scrollThreshold) {
            setHasMoved(true);
        }
    };

    const handleEnd = (clientX, clientY) => {
        if (!isDragging) return;

        const deltaX = clientX - startPos.x;
        const deltaY = clientY - startPos.y;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        setIsDragging(false);

        // Se não houve movimento significativo, é um tap/click simples
        if (!hasMoved && absDeltaX < scrollThreshold && absDeltaY < scrollThreshold) {
            if (onSwipeUp) onSwipeUp();
            return;
        }

        // Ignorar se o movimento vertical for maior que horizontal (scroll)
        if (absDeltaY > absDeltaX && absDeltaY > scrollThreshold) {
            return; // É scroll vertical, não fazer nada
        }

        // Só processar swipes horizontais com distância suficiente
        if (absDeltaX > threshold && absDeltaX > absDeltaY) {
            if (deltaX > 0 && onSwipeRight) {
                onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
                onSwipeLeft();
            }
        }
    };

    // Touch Events
    const handleTouchStart = (e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (e) => {
        if (!isDragging) return;
        const touch = e.changedTouches[0];
        handleEnd(touch.clientX, touch.clientY);
    };

    // Mouse Events (para desktop)
    const handleMouseDown = (e) => {
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = (e) => {
        if (!isDragging) return;
        handleEnd(e.clientX, e.clientY);
    };

    return (
        <Box
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsDragging(false)} // Reset se sair do card
            sx={{
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'pan-y', // Permite scroll vertical mas controla horizontal
                position: 'relative',
                transition: isDragging ? 'none' : 'transform 0.2s ease',
                '&:active': {
                    transform: 'scale(0.98)'
                }
            }}
        >
            {children}
        </Box>
    );
};

export default SwipeableCard;