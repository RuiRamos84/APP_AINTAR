// contexts/EpiContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const EpiContext = createContext();

export const useEpi = () => useContext(EpiContext);

export const EpiProvider = ({ children }) => {
    const [epiData, setEpiData] = useState({
        epi_list: [],
        epi_shoe_types: [],
        epi_what_types: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchEpiData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/epi/data');
            setEpiData(response.data);
        } catch (err) {
            console.error('Erro ao buscar dados de EPI:', err);
            setError(err.response?.data?.error || 'Erro ao carregar dados de EPI');
        } finally {
            setLoading(false);
        }
    }, []);

    const updateEpiList = useCallback(async () => {
        try {
            const response = await api.get('/epi/list');
            setEpiData(prev => ({
                ...prev,
                epi_list: response.data
            }));
        } catch (err) {
            console.error('Erro ao atualizar lista de EPIs:', err);
        }
    }, []);

    return (
        <EpiContext.Provider value={{
            epiData,
            loading,
            error,
            fetchEpiData,
            updateEpiList
        }}>
            {children}
        </EpiContext.Provider>
    );
};