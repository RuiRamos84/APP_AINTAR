// frontend/src/pages/Operation/hooks/useOfflineSync.js - MELHORADO
import { useState, useEffect, useCallback } from 'react';
import { Logger } from '../utils/logger';

const STORAGE_KEY = 'operations_offline';

export const useOfflineSync = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingActions, setPendingActions] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Carregar acções pendentes
    useEffect(() => {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
            try {
                setPendingActions(JSON.parse(cached));
            } catch (e) {
                Logger.error('Erro cache offline', { error: e.message });
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

    // Guardar quando muda
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions));
    }, [pendingActions]);

    const addAction = useCallback((type, data) => {
        const action = {
            id: Date.now() + Math.random().toString(36).slice(2),
            type,
            data,
            timestamp: Date.now(),
            retries: 0
        };

        setPendingActions(prev => [...prev, action]);
        Logger.info('Acção offline adicionada', { type, id: action.id });
    }, []);

    const syncActions = useCallback(async (handlers) => {
        if (!isOnline || !pendingActions.length) return;

        setIsSyncing(true);
        Logger.info('Sincronização iniciada', { count: pendingActions.length });

        const results = { success: 0, failed: 0 };

        for (const action of pendingActions) {
            try {
                const handler = handlers[action.type];
                if (!handler) {
                    Logger.warn('Handler não encontrado', { type: action.type });
                    continue;
                }

                await handler(action.data);

                // Remover se sucesso
                setPendingActions(prev => prev.filter(a => a.id !== action.id));
                results.success++;

                Logger.info('Acção sincronizada', {
                    type: action.type,
                    id: action.id
                });

            } catch (error) {
                Logger.error('Erro sincronização', {
                    type: action.type,
                    error: error.message,
                    retries: action.retries
                });

                // Incrementar retries
                setPendingActions(prev => prev.map(a =>
                    a.id === action.id
                        ? { ...a, retries: a.retries + 1 }
                        : a
                ));

                results.failed++;
            }
        }

        setIsSyncing(false);
        Logger.info('Sincronização completa', results);

        return results;
    }, [isOnline, pendingActions]);

    const clearPending = useCallback(() => {
        setPendingActions([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return {
        isOnline,
        pendingActions,
        isSyncing,
        addAction,
        syncActions,
        clearPending
    };
};