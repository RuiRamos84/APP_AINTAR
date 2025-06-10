// import { useState, useEffect, useCallback } from 'react';

// /**
//  * Hook para gerenciar sincronização offline de operações
//  * @param {string} namespace - Namespace para separar diferentes tipos de dados em cache
//  * @returns {Object} Retorna estado e funções para gerenciar a sincronização
//  */
// const useOfflineSync = (namespace = 'default') => {
//     const [isOnline, setIsOnline] = useState(navigator.onLine);
//     const [isSyncing, setIsSyncing] = useState(false);
//     const [pendingActions, setPendingActions] = useState([]);
//     const [lastSyncTime, setLastSyncTime] = useState(null);

//     // Carregar ações pendentes no início
//     useEffect(() => {
//         const loadPendingActions = () => {
//             try {
//                 const cached = localStorage.getItem(`${namespace}_pendingActions`);
//                 if (cached) {
//                     setPendingActions(JSON.parse(cached));
//                 }
//             } catch (error) {
//                 console.error('Erro ao carregar ações pendentes:', error);
//             }
//         };

//         loadPendingActions();

//         // Monitorar estado da conexão
//         const handleOnline = () => setIsOnline(true);
//         const handleOffline = () => setIsOnline(false);

//         window.addEventListener('online', handleOnline);
//         window.addEventListener('offline', handleOffline);

//         return () => {
//             window.removeEventListener('online', handleOnline);
//             window.removeEventListener('offline', handleOffline);
//         };
//     }, [namespace]);

//     // Salvar ações pendentes quando mudam
//     useEffect(() => {
//         try {
//             localStorage.setItem(`${namespace}_pendingActions`, JSON.stringify(pendingActions));
//         } catch (error) {
//             console.error('Erro ao salvar ações pendentes:', error);
//         }
//     }, [pendingActions, namespace]);

//     /**
//      * Adiciona uma ação para ser executada quando online
//      * @param {string} actionType - Tipo de ação (ex: 'addDocumentStep')
//      * @param {Object} actionParams - Parâmetros da ação
//      * @param {Function} onSuccess - Callback opcional a ser executado localmente
//      */
//     const addOfflineAction = useCallback((actionType, actionParams, onSuccess = null) => {
//         setPendingActions(prev => [
//             ...prev,
//             {
//                 type: actionType,
//                 params: actionParams,
//                 timestamp: Date.now(),
//                 id: Date.now() + Math.random().toString(36).substring(2, 9)
//             }
//         ]);

//         // Se houver um callback de sucesso, executá-lo para atualização imediata da UI
//         if (onSuccess && typeof onSuccess === 'function') {
//             onSuccess();
//         }
//     }, []);

//     /**
//      * Remove uma ação da lista de pendentes
//      * @param {string} actionId - ID da ação a ser removida
//      */
//     const removeAction = useCallback((actionId) => {
//         setPendingActions(prev => prev.filter(action => action.id !== actionId));
//     }, []);

//     /**
//      * Tenta sincronizar ações pendentes quando estiver online
//      * @param {Object} apiCallbacks - Objeto com funções para realizar chamadas API
//      * @returns {Promise<{success: number, failed: number}>} Resultado da sincronização
//      */
//     const syncData = useCallback(async (apiCallbacks) => {
//         if (!isOnline || pendingActions.length === 0 || !apiCallbacks) {
//             return { success: 0, failed: 0 };
//         }

//         setIsSyncing(true);
//         let successCount = 0;
//         let failedCount = 0;

//         try {
//             // Copiar para não modificar durante a iteração
//             const actions = [...pendingActions];

//             for (const action of actions) {
//                 try {
//                     // Verificar se existe uma função correspondente
//                     if (apiCallbacks[action.type]) {
//                         await apiCallbacks[action.type](action.params);
//                         removeAction(action.id);
//                         successCount++;
//                     } else {
//                         console.error(`Função não encontrada para ação: ${action.type}`);
//                         failedCount++;
//                     }
//                 } catch (error) {
//                     console.error(`Erro ao sincronizar ação ${action.type}:`, error);
//                     failedCount++;

//                     // Se o erro for de autorização, remover todas as ações pendentes
//                     if (error.status === 401 || error.status === 403) {
//                         setPendingActions([]);
//                         break;
//                     }
//                 }
//             }

//             setLastSyncTime(Date.now());
//             return { success: successCount, failed: failedCount };
//         } finally {
//             setIsSyncing(false);
//         }
//     }, [isOnline, pendingActions, removeAction]);

//     /**
//      * Salva dados no cache local
//      * @param {string} key - Chave para armazenar os dados
//      * @param {any} data - Dados a serem armazenados
//      * @param {number} ttl - Tempo de vida em milissegundos (padrão: 1 hora)
//      */
//     const saveToCache = useCallback((key, data, ttl = 3600000) => {
//         try {
//             localStorage.setItem(`${namespace}_${key}`, JSON.stringify({
//                 timestamp: Date.now(),
//                 expires: Date.now() + ttl,
//                 data
//             }));
//         } catch (error) {
//             console.error(`Erro ao salvar ${key} em cache:`, error);
//         }
//     }, [namespace]);

//     /**
//      * Carrega dados do cache local
//      * @param {string} key - Chave para recuperar os dados
//      * @returns {any|null} Dados armazenados ou null se expirado/não encontrado
//      */
//     const loadFromCache = useCallback((key) => {
//         try {
//             const cached = localStorage.getItem(`${namespace}_${key}`);
//             if (cached) {
//                 const parsedCache = JSON.parse(cached);
//                 // Verificar se o cache expirou
//                 if (Date.now() < parsedCache.expires) {
//                     return parsedCache.data;
//                 }
//             }
//             return null;
//         } catch (error) {
//             console.error(`Erro ao carregar ${key} do cache:`, error);
//             return null;
//         }
//     }, [namespace]);

//     /**
//      * Limpa o cache para uma chave específica
//      * @param {string} key - Chave para limpar o cache
//      */
//     const clearCache = useCallback((key) => {
//         try {
//             localStorage.removeItem(`${namespace}_${key}`);
//         } catch (error) {
//             console.error(`Erro ao limpar cache para ${key}:`, error);
//         }
//     }, [namespace]);

//     return {
//         isOnline,
//         isSyncing,
//         pendingActions,
//         lastSyncTime,
//         addOfflineAction,
//         syncData,
//         saveToCache,
//         loadFromCache,
//         clearCache
//     };
// };

// export default useOfflineSync;