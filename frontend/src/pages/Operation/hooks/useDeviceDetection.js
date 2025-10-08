// hooks/useDeviceDetection.js
import { useState, useEffect } from 'react';

export const useDeviceDetection = () => {
    const [deviceInfo, setDeviceInfo] = useState({
        deviceType: 'unknown',
        isTouchDevice: false,
        isPortrait: false,
        screenSize: { width: 0, height: 0 },
        hasPhysicalKeyboard: false,
        isStandalone: false, // PWA mode
        hasNotchOrDynamicIsland: false
    });

    useEffect(() => {
        const detectDevice = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const userAgent = navigator.userAgent.toLowerCase();

            // Detecção de dispositivo
            let deviceType = 'desktop';
            if (width <= 768) {
                deviceType = 'mobile';
            } else if (width <= 1024) {
                deviceType = 'tablet';
            }

            // Detecção específica de dispositivos
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
            const isTablet = /ipad|android.*(?!.*mobile)|kindle|silk/i.test(userAgent);
            const isIOS = /iphone|ipad|ipod/i.test(userAgent);
            const isAndroid = /android/i.test(userAgent);

            // Ajuste baseado em user agent
            if (isMobile && !isTablet) {
                deviceType = 'mobile';
            } else if (isTablet) {
                deviceType = 'tablet';
            }

            // Detecção de touch
            const isTouchDevice = 'ontouchstart' in window ||
                                navigator.maxTouchPoints > 0 ||
                                navigator.msMaxTouchPoints > 0;

            // Orientação
            const isPortrait = height > width;

            // PWA standalone mode
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                               window.navigator.standalone === true;

            // Notch detection (aproximado)
            const hasNotchOrDynamicIsland = isIOS &&
                (screen.height === 812 || screen.height === 896 ||
                 screen.height === 844 || screen.height === 926 ||
                 screen.height === 932); // iPhone X/11/12/13/14 families

            // Teclado físico (heurística)
            const hasPhysicalKeyboard = !isTouchDevice || deviceType === 'desktop';

            setDeviceInfo({
                deviceType,
                isTouchDevice,
                isPortrait,
                screenSize: { width, height },
                hasPhysicalKeyboard,
                isStandalone,
                hasNotchOrDynamicIsland,
                // Extras para debugging
                userAgent,
                isIOS,
                isAndroid,
                isMobile,
                isTablet
            });
        };

        // Detecção inicial
        detectDevice();

        // Re-detectar em mudanças de orientação/resize
        const handleResize = () => {
            setTimeout(detectDevice, 100); // Pequeno delay para stabilizar
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    return deviceInfo;
};