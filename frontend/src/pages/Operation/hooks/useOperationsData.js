import { useState, useEffect, useCallback } from 'react';
import { fetchOperationsData } from '../services/operationsService';

export const useOperationsData = () => {
    const [operationsData, setOperationsData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [associates, setAssociates] = useState(['all']);

    const extractAssociates = useCallback((data) => {
        const associateSet = new Set(['all']);

        Object.values(data).forEach(view => {
            view?.data?.forEach(item => {
                if (item.ts_associate) {
                    associateSet.add(item.ts_associate);
                }
            });
        });

        setAssociates(Array.from(associateSet));
        // console.log("Associates extracted:", Array.from(associateSet));
    }, []);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchOperationsData();
            setOperationsData(response);
            extractAssociates(response);
            // console.log("Operations data loaded:", response);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [extractAssociates]);

    const refetchOperations = useCallback(async () => {
        await loadData(); // ← usar função existente
    }, [loadData]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        operationsData,
        loading,
        error,
        associates,
        refetchOperations,
    };
};

export default useOperationsData;