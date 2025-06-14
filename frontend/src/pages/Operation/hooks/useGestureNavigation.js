import { useState, useCallback, useRef } from 'react';

const useGestureNavigation = (options = {}) => {
    const {
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        onTap,
        onDoubleTap,
        onLongPress,
        minDistance = 50,
        maxTime = 300,
        longPressTime = 500
    } = options;

    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [touchStartTime, setTouchStartTime] = useState(null);
    const [tapCount, setTapCount] = useState(0);
    const [isLongPress, setIsLongPress] = useState(false);

    const longPressTimer = useRef(null);
    const doubleTapTimer = useRef(null);

    const handleTouchStart = useCallback((e) => {
        const touch = e.touches[0];
        setTouchStart({ x: touch.clientX, y: touch.clientY });
        setTouchStartTime(Date.now());
        setIsLongPress(false);

        if (onLongPress) {
            longPressTimer.current = setTimeout(() => {
                setIsLongPress(true);
                onLongPress(e);
            }, longPressTime);
        }
    }, [onLongPress, longPressTime]);

    const handleTouchMove = useCallback((e) => {
        const touch = e.touches[0];
        setTouchEnd({ x: touch.clientX, y: touch.clientY });

        if (touchStart && longPressTimer.current) {
            const deltaX = Math.abs(touch.clientX - touchStart.x);
            const deltaY = Math.abs(touch.clientY - touchStart.y);

            if (deltaX > 10 || deltaY > 10) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        }
    }, [touchStart]);

    const handleTouchEnd = useCallback((e) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (!touchStart || !touchEnd) return;

        const deltaX = touchStart.x - touchEnd.x;
        const deltaY = touchStart.y - touchEnd.y;
        const timeDiff = Date.now() - touchStartTime;

        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Tap simples
        if (absDeltaX < 10 && absDeltaY < 10 && timeDiff < maxTime && !isLongPress) {
            setTapCount(prev => prev + 1);

            if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);

            doubleTapTimer.current = setTimeout(() => {
                if (tapCount + 1 === 1 && onTap) {
                    onTap(e);
                } else if (tapCount + 1 === 2 && onDoubleTap) {
                    onDoubleTap(e);
                }
                setTapCount(0);
            }, 300);
        }
        // Swipe
        else if ((absDeltaX > minDistance || absDeltaY > minDistance) && timeDiff < maxTime) {
            if (absDeltaX > absDeltaY) {
                if (deltaX > 0 && onSwipeLeft) {
                    onSwipeLeft(e, { deltaX, deltaY, timeDiff });
                } else if (deltaX < 0 && onSwipeRight) {
                    onSwipeRight(e, { deltaX, deltaY, timeDiff });
                }
            } else {
                if (deltaY > 0 && onSwipeUp) {
                    onSwipeUp(e, { deltaX, deltaY, timeDiff });
                } else if (deltaY < 0 && onSwipeDown) {
                    onSwipeDown(e, { deltaX, deltaY, timeDiff });
                }
            }
        }

        setTouchStart(null);
        setTouchEnd(null);
        setTouchStartTime(null);
    }, [touchStart, touchEnd, touchStartTime, tapCount, isLongPress, minDistance, maxTime, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap]);

    const resetGesture = useCallback(() => {
        setTouchStart(null);
        setTouchEnd(null);
        setTouchStartTime(null);
        setTapCount(0);
        setIsLongPress(false);
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        if (doubleTapTimer.current) {
            clearTimeout(doubleTapTimer.current);
            doubleTapTimer.current = null;
        }
    }, []);

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        resetGesture
    };
};

export default useGestureNavigation;