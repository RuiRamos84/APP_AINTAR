import { useState, useEffect, useCallback } from 'react';
import * as epiService from '../services/episervice';

export const useDeliveries = (employeeId, type = 'all') => {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 0,
        pageSize: 10,
        total: 0
    });

    const fetchDeliveries = useCallback(async () => {
        if (!employeeId) return;

        try {
            setLoading(true);
            setError(null);

            const response = await epiService.getEpiDeliveries({
                employeeId,
                type,
                page: pagination.page,
                pageSize: pagination.pageSize
            });

            // Reset deliveries quando mudar o funcionário
            if (pagination.page === 0) {
                setDeliveries(response.deliveries);
            } else {
                setDeliveries(prev => [...prev, ...response.deliveries]);
            }

            setPagination(prev => ({
                ...prev,
                total: response.total
            }));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [employeeId, type, pagination.page, pagination.pageSize]);

    // Reset pagination quando mudar o funcionário ou tipo
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 0 }));
    }, [employeeId, type]);

    useEffect(() => {
        fetchDeliveries();
    }, [fetchDeliveries]);

    return {
        deliveries,
        loading,
        error,
        pagination,
        setPagination,
        refetch: fetchDeliveries,
        addDelivery: async (data) => {
            const newDelivery = await epiService.createEpiDelivery(data);
            setDeliveries(prev => [newDelivery, ...prev]);
            return newDelivery;
        }
    };
};