// contexts/EpiContext.js
import React, { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const EpiContext = createContext();

export const useEpi = () => useContext(EpiContext);

const fetchEpiDataAPI = async () => {
    const response = await api.get('/epi/data');
    return response.data;
};

export const EpiProvider = ({ children }) => {
    const queryClient = useQueryClient();

    const { data: epiData, isLoading: loading, error, refetch: fetchEpiData } = useQuery({
        queryKey: ['epiData'],
        queryFn: fetchEpiDataAPI,
        staleTime: 1000 * 60 * 30, // Cache de 30 minutos
        initialData: { epi_list: [], epi_shoe_types: [], epi_what_types: [] }
    });

    // Função para invalidar o cache e forçar um refetch da lista de EPIs
    const updateEpiList = () => {
        // Invalida a query 'epiData', o que fará com que o React Query a busque novamente na próxima vez que for necessária.
        queryClient.invalidateQueries({ queryKey: ['epiData'] });
    };

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