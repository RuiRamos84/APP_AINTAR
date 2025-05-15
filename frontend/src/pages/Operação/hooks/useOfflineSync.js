import { useState, useEffect, useCallback } from 'react';

const useOfflineSync = (namespace = 'default') => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingActions, setPendingActions] = useState([]);
    const [lastSyncTime, setLastSyncTime] = useState(null);

    useEffect(() => {
        const loadPendingActions = () => {
            try {
                const cached = localStorage.getItem(`${namespace}_pendingActions`);
                if (cached) {
                    setPendingActions(JSON.parse(cached));
                }
            } catch (error) {
                console.error('Erro ao carregar ações pendentes:', error);
            }
        };

        loadPendingActions();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [namespace]);

    useEffect(() => {
        try {
            localStorage.setItem(`${namespace}_pendingActions`, JSON.stringify(pendingActions));
        } catch (error) {
            console.error('Erro ao salvar ações pendentes:', error);
        }
    }, [pendingActions, namespace]);

    const addOfflineAction = useCallback((actionType, actionParams, onSuccess = null) => {
        setPendingActions(prev => [
            ...prev,
            {
                type: actionType,
                params: actionParams,
                timestamp: Date.now(),
                id: Date.now() + Math.random().toString(36).substring(2, 9)
            }
        ]);

        if (onSuccess && typeof onSuccess === 'function') {
            onSuccess();
        }
    }, []);

    const removeAction = useCallback((actionId) => {
        setPendingActions(prev => prev.filter(action => action.id !== actionId));
    }, []);

    const syncData = useCallback(async (apiCallbacks) => {
        if (!isOnline || pendingActions.length === 0 || !apiCallbacks) {
            return { success: 0, failed: 0 };
        }

        setIsSyncing(true);
        let successCount = 0;
        let failedCount = 0;

        try {
            const actions = [...pendingActions];

            for (const action of actions) {
                try {
                    if (apiCallbacks[action.type]) {
                        await apiCallbacks[action.type](action.params);
                        removeAction(action.id);
                        successCount++;
                    } else {
                        console.error(`Função não encontrada para ação: ${action.type}`);
                        failedCount++;
                    }
                } catch (error) {
                    console.error(`Erro ao sincronizar ação ${action.type}:`, error);
                    failedCount++;

                    if (error.status === 401 || error.status === 403) {
                        setPendingActions([]);
                        break;
                    }
                }
            }

            setLastSyncTime(Date.now());
            return { success: successCount, failed: failedCount };
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, pendingActions, removeAction]);

    const saveToCache = useCallback((key, data, ttl = 3600000) => {
        try {
            localStorage.setItem(`${namespace}_${key}`, JSON.stringify({
                timestamp: Date.now(),
                expires: Date.now() + ttl,
                data
            }));
        } catch (error) {
            console.error(`Erro ao salvar ${key} em cache:`, error);
        }
    }, [namespace]);

    const loadFromCache = useCallback((key) => {
        try {
            const cached = localStorage.getItem(`${namespace}_${key}`);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                if (Date.now() < parsedCache.expires) {
                    return parsedCache.data;
                }
            }
            return null;
        } catch (error) {
            console.error(`Erro ao carregar ${key} do cache:`, error);
            return null;
        }
    }, [namespace]);

    const clearCache = useCallback((key) => {
        try {
            localStorage.removeItem(`${namespace}_${key}`);
        } catch (error) {
            console.error(`Erro ao limpar cache para ${key}:`, error);
        }
    }, [namespace]);

    return {
        isOnline,
        isSyncing,
        pendingActions,
        lastSyncTime,
        addOfflineAction,
        syncData,
        saveToCache,
        loadFromCache,
        clearCache
    };
};

export default useOfflineSync;