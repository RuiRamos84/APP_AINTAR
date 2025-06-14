import { useState, useEffect, useCallback } from 'react';

const useOfflineSync = (namespace = 'default') => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingActions, setPendingActions] = useState([]);

    useEffect(() => {
        const loadPending = () => {
            try {
                const cached = localStorage.getItem(`${namespace}_pending`);
                if (cached) setPendingActions(JSON.parse(cached));
            } catch (error) {
                console.error('Erro cache:', error);
            }
        };

        loadPending();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [namespace]);

    // Salvar em cache quando mudam
    useEffect(() => {
        try {
            localStorage.setItem(`${namespace}_pending`, JSON.stringify(pendingActions));
        } catch (error) {
            console.error('Erro salvar cache:', error);
        }
    }, [pendingActions, namespace]);

    const addAction = useCallback((type, params, onSuccess = null) => {
        const action = {
            type,
            params,
            timestamp: Date.now(),
            id: Date.now() + Math.random().toString(36).substring(2, 9)
        };

        setPendingActions(prev => [...prev, action]);
        onSuccess?.();
    }, []);

    const removeAction = useCallback((actionId) => {
        setPendingActions(prev => prev.filter(action => action.id !== actionId));
    }, []);

    const syncActions = useCallback(async (apiCallbacks) => {
        if (!isOnline || !pendingActions.length || !apiCallbacks) return { success: 0, failed: 0 };

        let success = 0;
        let failed = 0;

        for (const action of pendingActions) {
            try {
                if (apiCallbacks[action.type]) {
                    await apiCallbacks[action.type](action.params);
                    removeAction(action.id);
                    success++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error(`Erro sync ${action.type}:`, error);
                failed++;
            }
        }

        return { success, failed };
    }, [isOnline, pendingActions, removeAction]);

    return {
        isOnline,
        pendingActions,
        addAction,
        syncActions,
        hasPending: pendingActions.length > 0
    };
};

export default useOfflineSync;