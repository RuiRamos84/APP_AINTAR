// hooks/useOffline.js
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'operations_offline';

export const useOffline = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingActions, setPendingActions] = useState([]);

    useEffect(() => {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
            try {
                setPendingActions(JSON.parse(cached));
            } catch (e) {
                console.error('Erro cache offline:', e);
            }
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions));
    }, [pendingActions]);

    const addAction = useCallback((type, data) => {
        const action = {
            id: Date.now(),
            type,
            data,
            timestamp: Date.now()
        };
        setPendingActions(prev => [...prev, action]);
    }, []);

    const clearPending = useCallback(() => {
        setPendingActions([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return {
        isOnline,
        pendingActions,
        addAction,
        clearPending
    };
};