import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as epiService from '../services/episervice';

export const useDeliveries = (employeeId, type = 'all') => {
    const queryClient = useQueryClient();
    const [pagination, setPagination] = useState({
        page: 0,
        pageSize: 10,
    });

    const queryKey = ['deliveries', employeeId, type, pagination.page, pagination.pageSize];

    const { data, isLoading: loading, error, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!employeeId) return { deliveries: [], total: 0 };

            const response = await epiService.getEpiDeliveries({
                employeeId,
                type,
                page: pagination.page,
                pageSize: pagination.pageSize
            });
            return response;
        },
        enabled: !!employeeId,
        keepPreviousData: true, // Mantém os dados anteriores visíveis durante o fetch de novas páginas
    });

    const { mutate: addDelivery, isLoading: isAdding } = useMutation({
        mutationFn: (deliveryData) => epiService.createEpiDelivery(deliveryData),
        onSuccess: () => {
            // Invalida a query para forçar a atualização da lista
            queryClient.invalidateQueries({ queryKey: ['deliveries', employeeId] });
        },
    });

    return {
        deliveries: data?.deliveries || [],
        loading,
        error,
        pagination,
        total: data?.total || 0,
        refetch,
        addDelivery,
        isAdding,
    };
};