import { useState, useEffect, useCallback } from 'react';
import { fetchOperationsData } from '../services/operationsService';
import useOfflineSync from './useOfflineSync';

export const useOperationsData = (pageSize = 20) => {
    const [operationsData, setOperationsData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [associates, setAssociates] = useState(["all"]);
    const [hasMore, setHasMore] = useState(true);

    const {
        isOnline,
        saveToCache,
        loadFromCache,
        pendingActions,
        addOfflineAction
    } = useOfflineSync('operations');

    const loadData = useCallback(async (pageNum = 1, reset = false) => {
        setLoading(true);

        try {
            // Tentar cache offline primeiro
            if (!isOnline) {
                const cachedData = loadFromCache('operationsData');
                if (cachedData) {
                    if (reset) {
                        setOperationsData(cachedData);
                    } else {
                        setOperationsData(prev => ({ ...prev, ...cachedData }));
                    }
                    extractAssociates(cachedData);
                    setLoading(false);
                    return;
                }
            }

            // Carregar da API
            const response = await fetchOperationsData(pageNum, pageSize);

            if (response) {
                saveToCache('operationsData', response);

                if (reset) {
                    setOperationsData(response);
                } else {
                    setOperationsData(prev => {
                        const merged = { ...prev };

                        Object.keys(response).forEach(viewKey => {
                            if (!merged[viewKey]) {
                                merged[viewKey] = response[viewKey];
                            } else if (response[viewKey]?.data) {
                                const existingIds = new Set(merged[viewKey].data.map(item => item.pk));
                                const newItems = response[viewKey].data.filter(item => !existingIds.has(item.pk));

                                merged[viewKey] = {
                                    ...response[viewKey],
                                    data: [...merged[viewKey].data, ...newItems]
                                };
                            }
                        });

                        return merged;
                    });
                }

                extractAssociates(response);

                let allEmpty = true;
                Object.keys(response).forEach(viewKey => {
                    if (response[viewKey]?.data?.length > 0) {
                        allEmpty = false;
                    }
                });
                setHasMore(!allEmpty);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError('Não foi possível carregar dados de operações.');

            const cachedData = loadFromCache('operationsData');
            if (cachedData) {
                if (reset) {
                    setOperationsData(cachedData);
                } else {
                    setOperationsData(prev => ({ ...prev, ...cachedData }));
                }
                extractAssociates(cachedData);
            }
        } finally {
            setLoading(false);
        }
    }, [isOnline, loadFromCache, saveToCache, pageSize]);

    const extractAssociates = useCallback((data) => {
        const associateSet = new Set(["all"]);

        Object.values(data).forEach(view => {
            if (view?.data?.length > 0) {
                view.data.forEach(item => {
                    if (item.ts_associate) {
                        associateSet.add(item.ts_associate);
                    }
                });
            }
        });

        setAssociates(Array.from(associateSet));
    }, []);

    useEffect(() => {
        loadData(1, true);
    }, [loadData]);

    const loadMore = useCallback(() => {
        if (loading || !hasMore) return;

        const nextPage = page + 1;
        setPage(nextPage);
        loadData(nextPage);
    }, [loading, hasMore, page, loadData]);

    const updateLocalData = useCallback((viewKey, itemPk, updateFn) => {
        setOperationsData(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData));

            if (newData[viewKey]?.data) {
                const itemIndex = newData[viewKey].data.findIndex(item => item.pk === itemPk);

                if (itemIndex !== -1) {
                    newData[viewKey].data[itemIndex] = updateFn(newData[viewKey].data[itemIndex]);
                }
            }

            saveToCache('operationsData', newData);
            return newData;
        });
    }, [saveToCache]);

    return {
        operationsData,
        loading,
        error,
        associates,
        page,
        hasMore,
        loadMore,
        updateLocalData,
        refreshData: () => loadData(1, true),
        isOnline,
        pendingActions,
        addOfflineAction
    };
};

export default useOperationsData;