import { useState } from 'react';

/**
 * Hook para detectar gestos de swipe (arrastar) em dispositivos touch
 * Útil para navegação mobile e ações rápidas
 *
 * @param {Function} onSwipeLeft - Callback quando swipe para esquerda
 * @param {Function} onSwipeRight - Callback quando swipe para direita
 * @param {number} threshold - Distância mínima para detectar swipe (padrão: 50px)
 * @returns {Object} - Handlers para touch events
 *
 * @example
 * const swipeHandlers = useSwipe(
 *   () => console.log('Swiped left'),
 *   () => console.log('Swiped right')
 * );
 *
 * <div {...swipeHandlers}>
 *   Swipe me!
 * </div>
 */
export const useSwipe = (onSwipeLeft, onSwipeRight, threshold = 50) => {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    // Reset
    setTouchStart(0);
    setTouchEnd(0);
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};

export default useSwipe;
