// hooks/useUserPreferences.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const PREFERENCES_KEY = 'operation_user_preferences';

export const useUserPreferences = () => {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState({
        preferredLayout: 'auto',
        preferredViewMode: null,
        enableNotifications: true,
        autoRefreshInterval: 30000, // 30 segundos
        defaultFilters: {},
        compactMode: false,
        offlineMode: false
    });

    // Carregar preferências do localStorage na inicialização
    useEffect(() => {
        if (user?.user_id) {
            const savedPrefs = localStorage.getItem(`${PREFERENCES_KEY}_${user.user_id}`);
            if (savedPrefs) {
                try {
                    const parsed = JSON.parse(savedPrefs);
                    setPreferences(prev => ({ ...prev, ...parsed }));
                } catch (error) {
                    console.warn('Erro ao carregar preferências:', error);
                }
            }
        }
    }, [user?.user_id]);

    // Função para atualizar preferências
    const updatePreferences = (newPrefs) => {
        const updated = { ...preferences, ...newPrefs };
        setPreferences(updated);

        // Salvar no localStorage
        if (user?.user_id) {
            localStorage.setItem(
                `${PREFERENCES_KEY}_${user.user_id}`,
                JSON.stringify(updated)
            );
        }
    };

    // Função para resetar preferências
    const resetPreferences = () => {
        const defaultPrefs = {
            preferredLayout: 'auto',
            preferredViewMode: null,
            enableNotifications: true,
            autoRefreshInterval: 30000,
            defaultFilters: {},
            compactMode: false,
            offlineMode: false
        };
        setPreferences(defaultPrefs);

        if (user?.user_id) {
            localStorage.removeItem(`${PREFERENCES_KEY}_${user.user_id}`);
        }
    };

    return {
        preferences,
        updatePreferences,
        resetPreferences
    };
};