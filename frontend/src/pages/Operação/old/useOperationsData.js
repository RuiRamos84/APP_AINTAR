// import { useState, useEffect, useCallback } from 'react';
// import { fetchOperationsData } from '../services/operationsService';
// import useOfflineSync from './useOfflineSync';

// /**
//  * Hook para gerenciar dados de operações com paginação e cache offline
//  * @param {number} pageSize - Tamanho da página para paginação
//  * @returns {Object} - Dados e funções para gerenciar operações
//  */
// export const useOperationsData = (pageSize = 20) => {
//     const [operationsData, setOperationsData] = useState({});
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [page, setPage] = useState(1);
//     const [associates, setAssociates] = useState(["all"]);
//     const [hasMore, setHasMore] = useState(true);

//     // Hook de sincronização offline
//     const {
//         isOnline,
//         saveToCache,
//         loadFromCache,
//         pendingActions,
//         addOfflineAction
//     } = useOfflineSync('operations');

//     // Função para carregar dados da API ou do cache
//     const loadData = useCallback(async (pageNum = 1, reset = false) => {
//         setLoading(true);

//         try {
//             // Tentar carregar dados do cache primeiro se offline
//             if (!isOnline) {
//                 const cachedData = loadFromCache('operationsData');
//                 if (cachedData) {
//                     if (reset) {
//                         setOperationsData(cachedData);
//                     } else {
//                         setOperationsData(prev => ({ ...prev, ...cachedData }));
//                     }
//                     // Extrair lista de associados dos dados em cache
//                     extractAssociates(cachedData);
//                     setLoading(false);
//                     return;
//                 }
//             }

//             // Se online ou não há cache, carregar da API
//             const response = await fetchOperationsData(pageNum, pageSize);

//             // Processar a resposta
//             if (response) {
//                 // Guardar em cache
//                 saveToCache('operationsData', response);

//                 if (reset) {
//                     setOperationsData(response);
//                 } else {
//                     // Mesclar paginação
//                     setOperationsData(prev => {
//                         const merged = { ...prev };

//                         // Para cada vista, mesclar dados
//                         Object.keys(response).forEach(viewKey => {
//                             if (!merged[viewKey]) {
//                                 merged[viewKey] = response[viewKey];
//                             } else if (response[viewKey]?.data) {
//                                 // Mesclar dados garantindo que não há duplicatas
//                                 const existingIds = new Set(merged[viewKey].data.map(item => item.pk));
//                                 const newItems = response[viewKey].data.filter(item => !existingIds.has(item.pk));

//                                 merged[viewKey] = {
//                                     ...response[viewKey],
//                                     data: [...merged[viewKey].data, ...newItems]
//                                 };
//                             }
//                         });

//                         return merged;
//                     });
//                 }

//                 // Extrair lista de associados
//                 extractAssociates(response);

//                 // Verificar se há mais dados para carregar
//                 let allEmpty = true;
//                 Object.keys(response).forEach(viewKey => {
//                     if (response[viewKey]?.data?.length > 0) {
//                         allEmpty = false;
//                     }
//                 });

//                 setHasMore(!allEmpty);
//             } else {
//                 setHasMore(false);
//             }
//         } catch (err) {
//             console.error('Erro ao carregar dados de operações:', err);
//             setError('Não foi possível carregar dados de operações. Verifique sua conexão.');

//             // Tentar usar cache mesmo com erro
//             const cachedData = loadFromCache('operationsData');
//             if (cachedData) {
//                 if (reset) {
//                     setOperationsData(cachedData);
//                 } else {
//                     setOperationsData(prev => ({ ...prev, ...cachedData }));
//                 }
//                 extractAssociates(cachedData);
//             }
//         } finally {
//             setLoading(false);
//         }
//     }, [isOnline, loadFromCache, saveToCache, pageSize]);

//     // Extrair lista única de associados dos dados
//     const extractAssociates = useCallback((data) => {
//         const associateSet = new Set(["all"]);

//         Object.values(data).forEach(view => {
//             if (view?.data?.length > 0) {
//                 view.data.forEach(item => {
//                     if (item.ts_associate) {
//                         associateSet.add(item.ts_associate);
//                     }
//                 });
//             }
//         });

//         setAssociates(Array.from(associateSet));
//     }, []);

//     // Carregar dados iniciais
//     useEffect(() => {
//         loadData(1, true);
//     }, [loadData]);

//     // Função para carregar mais dados (paginação)
//     const loadMore = useCallback(() => {
//         if (loading || !hasMore) return;

//         const nextPage = page + 1;
//         setPage(nextPage);
//         loadData(nextPage);
//     }, [loading, hasMore, page, loadData]);

//     // Função para atualizar dados localmente quando offline
//     const updateLocalData = useCallback((viewKey, itemPk, updateFn) => {
//         setOperationsData(prevData => {
//             // Clone profundo para garantir que a mudança é detectada pelo React
//             const newData = JSON.parse(JSON.stringify(prevData));

//             if (newData[viewKey]?.data) {
//                 const itemIndex = newData[viewKey].data.findIndex(item => item.pk === itemPk);

//                 if (itemIndex !== -1) {
//                     // Aplicar a função de atualização ao item
//                     newData[viewKey].data[itemIndex] = updateFn(newData[viewKey].data[itemIndex]);
//                 }
//             }

//             // Atualizar no cache também
//             saveToCache('operationsData', newData);

//             return newData;
//         });
//     }, [saveToCache]);

//     return {
//         operationsData,
//         loading,
//         error,
//         associates,
//         page,
//         hasMore,
//         loadMore,
//         updateLocalData,
//         refreshData: () => loadData(1, true),
//         isOnline,
//         pendingActions,
//         addOfflineAction
//     };
// };

// export default useOperationsData;