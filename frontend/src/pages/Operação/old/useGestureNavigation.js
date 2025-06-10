// import { useState, useCallback, useRef } from 'react';

// /**
//  * Hook personalizado para navegação por gestos em dispositivos touch
//  * @param {Object} options - Opções de configuração
//  * @param {Function} options.onSwipeLeft - Callback para swipe à esquerda
//  * @param {Function} options.onSwipeRight - Callback para swipe à direita
//  * @param {Function} options.onSwipeUp - Callback para swipe para cima
//  * @param {Function} options.onSwipeDown - Callback para swipe para baixo
//  * @param {Function} options.onTap - Callback para toque simples
//  * @param {Function} options.onDoubleTap - Callback para toque duplo
//  * @param {Function} options.onLongPress - Callback para pressão longa
//  * @param {number} options.minDistance - Distância mínima para considerar swipe (padrão: 50)
//  * @param {number} options.maxTime - Tempo máximo para gestos rápidos (padrão: 300ms)
//  * @param {number} options.longPressTime - Tempo para considerar pressão longa (padrão: 500ms)
//  */
// const useGestureNavigation = (options = {}) => {
//     const {
//         onSwipeLeft,
//         onSwipeRight,
//         onSwipeUp,
//         onSwipeDown,
//         onTap,
//         onDoubleTap,
//         onLongPress,
//         minDistance = 50,
//         maxTime = 300,
//         longPressTime = 500
//     } = options;

//     const [touchStart, setTouchStart] = useState(null);
//     const [touchEnd, setTouchEnd] = useState(null);
//     const [touchStartTime, setTouchStartTime] = useState(null);
//     const [tapCount, setTapCount] = useState(0);
//     const [isLongPress, setIsLongPress] = useState(false);

//     const longPressTimer = useRef(null);
//     const doubleTapTimer = useRef(null);

//     const handleTouchStart = useCallback((e) => {
//         const touch = e.touches[0];
//         setTouchStart({
//             x: touch.clientX,
//             y: touch.clientY
//         });
//         setTouchStartTime(Date.now());
//         setIsLongPress(false);

//         // Configurar timer para pressão longa
//         if (onLongPress) {
//             longPressTimer.current = setTimeout(() => {
//                 setIsLongPress(true);
//                 onLongPress(e);
//             }, longPressTime);
//         }
//     }, [onLongPress, longPressTime]);

//     const handleTouchMove = useCallback((e) => {
//         const touch = e.touches[0];
//         setTouchEnd({
//             x: touch.clientX,
//             y: touch.clientY
//         });

//         // Se movimento muito grande, cancelar pressão longa
//         if (touchStart && longPressTimer.current) {
//             const deltaX = Math.abs(touch.clientX - touchStart.x);
//             const deltaY = Math.abs(touch.clientY - touchStart.y);

//             if (deltaX > 10 || deltaY > 10) {
//                 clearTimeout(longPressTimer.current);
//                 longPressTimer.current = null;
//             }
//         }
//     }, [touchStart]);

//     const handleTouchEnd = useCallback((e) => {
//         // Limpar timer de pressão longa
//         if (longPressTimer.current) {
//             clearTimeout(longPressTimer.current);
//             longPressTimer.current = null;
//         }

//         if (!touchStart || !touchEnd) return;

//         const deltaX = touchStart.x - touchEnd.x;
//         const deltaY = touchStart.y - touchEnd.y;
//         const timeDiff = Date.now() - touchStartTime;

//         const absDeltaX = Math.abs(deltaX);
//         const absDeltaY = Math.abs(deltaY);

//         // Se não houve movimento significativo, é um toque
//         if (absDeltaX < 10 && absDeltaY < 10 && timeDiff < maxTime && !isLongPress) {
//             // Toque simples ou duplo
//             setTapCount(prev => prev + 1);

//             if (doubleTapTimer.current) {
//                 clearTimeout(doubleTapTimer.current);
//             }

//             doubleTapTimer.current = setTimeout(() => {
//                 if (tapCount + 1 === 1 && onTap) {
//                     onTap(e);
//                 } else if (tapCount + 1 === 2 && onDoubleTap) {
//                     onDoubleTap(e);
//                 }
//                 setTapCount(0);
//             }, 300);
//         }
//         // Se houve movimento significativo, é um swipe
//         else if ((absDeltaX > minDistance || absDeltaY > minDistance) && timeDiff < maxTime) {
//             // Determinar direção do swipe
//             if (absDeltaX > absDeltaY) {
//                 // Swipe horizontal
//                 if (deltaX > 0 && onSwipeLeft) {
//                     onSwipeLeft(e, { deltaX, deltaY, timeDiff });
//                 } else if (deltaX < 0 && onSwipeRight) {
//                     onSwipeRight(e, { deltaX, deltaY, timeDiff });
//                 }
//             } else {
//                 // Swipe vertical
//                 if (deltaY > 0 && onSwipeUp) {
//                     onSwipeUp(e, { deltaX, deltaY, timeDiff });
//                 } else if (deltaY < 0 && onSwipeDown) {
//                     onSwipeDown(e, { deltaX, deltaY, timeDiff });
//                 }
//             }
//         }

//         // Reset
//         setTouchStart(null);
//         setTouchEnd(null);
//         setTouchStartTime(null);
//     }, [touchStart, touchEnd, touchStartTime, tapCount, isLongPress, minDistance, maxTime, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap]);

//     // Retornar os handlers para serem aplicados a um elemento
//     return {
//         onTouchStart: handleTouchStart,
//         onTouchMove: handleTouchMove,
//         onTouchEnd: handleTouchEnd,
//         // Métodos auxiliares
//         resetGesture: () => {
//             setTouchStart(null);
//             setTouchEnd(null);
//             setTouchStartTime(null);
//             setTapCount(0);
//             setIsLongPress(false);
//             if (longPressTimer.current) {
//                 clearTimeout(longPressTimer.current);
//                 longPressTimer.current = null;
//             }
//             if (doubleTapTimer.current) {
//                 clearTimeout(doubleTapTimer.current);
//                 doubleTapTimer.current = null;
//             }
//         }
//     };
// };

// // Hook para navegação entre páginas
// export const usePageNavigation = (pages = [], initialPage = 0) => {
//     const [currentPage, setCurrentPage] = useState(initialPage);

//     const goToPage = useCallback((pageIndex) => {
//         if (pageIndex >= 0 && pageIndex < pages.length) {
//             setCurrentPage(pageIndex);
//         }
//     }, [pages.length]);

//     const nextPage = useCallback(() => {
//         setCurrentPage(prev => Math.min(prev + 1, pages.length - 1));
//     }, [pages.length]);

//     const previousPage = useCallback(() => {
//         setCurrentPage(prev => Math.max(prev - 1, 0));
//     }, []);

//     const gestureHandlers = useGestureNavigation({
//         onSwipeLeft: nextPage,
//         onSwipeRight: previousPage,
//         minDistance: 50
//     });

//     return {
//         currentPage,
//         totalPages: pages.length,
//         goToPage,
//         nextPage,
//         previousPage,
//         gestureHandlers,
//         // Dados da página atual
//         currentPageData: pages[currentPage],
//         // Status
//         isFirstPage: currentPage === 0,
//         isLastPage: currentPage === pages.length - 1
//     };
// };

// export default useGestureNavigation;