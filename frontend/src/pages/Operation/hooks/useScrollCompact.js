// frontend/src/pages/Operation/hooks/useScrollCompact.js - NOVO
import { useState, useEffect, useCallback } from 'react';

export const useScrollCompact = (threshold = 50) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [scrollY, setScrollY] = useState(0);

    const handleScroll = useCallback((event) => {
        const scrollTop = event.target.scrollTop;
        setScrollY(scrollTop);
        setIsScrolled(scrollTop > threshold);
    }, [threshold]);

    // Para reset quando componente desmonta ou muda de vista
    const resetScroll = useCallback(() => {
        setIsScrolled(false);
        setScrollY(0);
    }, []);

    return {
        isScrolled,
        scrollY,
        handleScroll,
        resetScroll
    };
};