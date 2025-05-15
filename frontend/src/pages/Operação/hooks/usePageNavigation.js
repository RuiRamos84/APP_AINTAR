import { useState, useCallback } from 'react';
import useGestureNavigation from './useGestureNavigation';

const usePageNavigation = (pages = [], initialPage = 0) => {
    const [currentPage, setCurrentPage] = useState(initialPage);

    const goToPage = useCallback((pageIndex) => {
        if (pageIndex >= 0 && pageIndex < pages.length) {
            setCurrentPage(pageIndex);
        }
    }, [pages.length]);

    const nextPage = useCallback(() => {
        setCurrentPage(prev => Math.min(prev + 1, pages.length - 1));
    }, [pages.length]);

    const previousPage = useCallback(() => {
        setCurrentPage(prev => Math.max(prev - 1, 0));
    }, []);

    const gestureHandlers = useGestureNavigation({
        onSwipeLeft: nextPage,
        onSwipeRight: previousPage,
        minDistance: 50
    });

    return {
        currentPage,
        totalPages: pages.length,
        goToPage,
        nextPage,
        previousPage,
        gestureHandlers,
        currentPageData: pages[currentPage],
        isFirstPage: currentPage === 0,
        isLastPage: currentPage === pages.length - 1
    };
};

export default usePageNavigation;