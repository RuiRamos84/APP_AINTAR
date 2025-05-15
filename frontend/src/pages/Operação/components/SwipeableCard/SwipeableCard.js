import React, { useState } from 'react';

const SwipeableCard = ({ children, onSwipeRight, onSwipeLeft, onSwipeUp, minDistance = 50 }) => {
    const [touchStart, setTouchStart] = useState(null);
    const [touchCurrent, setTouchCurrent] = useState(null);
    const [swiping, setSwiping] = useState(false);

    const onTouchStart = (e) => {
        setSwiping(false);
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchMove = (e) => {
        if (!touchStart) return;

        setTouchCurrent({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });

        const deltaX = Math.abs(e.targetTouches[0].clientX - touchStart.x);
        const deltaY = Math.abs(e.targetTouches[0].clientY - touchStart.y);

        // Se movimento horizontal é maior que vertical, permitir swipe
        if (deltaX > deltaY && deltaX > 10) {
            e.preventDefault();
            setSwiping(true);
        }
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchCurrent) return;

        const deltaX = touchStart.x - touchCurrent.x;
        const deltaY = touchStart.y - touchCurrent.y;
        const isLeftSwipe = deltaX > minDistance;
        const isRightSwipe = deltaX < -minDistance;
        const isUpSwipe = deltaY > minDistance;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (isRightSwipe && onSwipeRight) {
                onSwipeRight();
            } else if (isLeftSwipe && onSwipeLeft) {
                onSwipeLeft();
            }
        } else if (isUpSwipe && onSwipeUp) {
            onSwipeUp();
        }

        setTouchStart(null);
        setTouchCurrent(null);
        setSwiping(false);
    };

    return (
        <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
                transform: swiping && touchCurrent && touchStart
                    ? `translateX(${(touchCurrent.x - touchStart.x) * 0.5}px)`
                    : 'translateX(0px)',
                transition: swiping ? 'none' : 'transform 0.3s ease'
            }}
        >
            {children}
        </div>
    );
};

export default SwipeableCard;