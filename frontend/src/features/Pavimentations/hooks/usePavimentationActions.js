// frontend/src/features/Pavimentations/hooks/usePavimentationActions.js

import React, { useState, useCallback, useRef } from 'react';
import { pavimentationService } from '../services/pavimentationService';
import { StatusUtils, PAVIMENTATION_ACTIONS } from '../constants/pavimentationTypes';
import {
    notifySuccess,
    notifyError,
    notifyInfo
} from '../../../components/common/Toaster/ThemedToaster';

/**
 * Hook para gerenciar ações em pavimentações
 * @param {Function} onSuccess - Callback de sucesso
 * @param {Function} onError - Callback de erro  
 * @param {Object} options - Opções de configuração
 * @returns {Object} Estado e funções para ações
 */
export const usePavimentationActions = (onSuccess, onError, options = {}) => {
    // Estados
    const [loading, setLoading] = useState(false);
    const [actionHistory, setActionHistory] = useState([]);
    const [pendingActions, setPendingActions] = useState(new Map());

    // Refs para controle
    const abortControllersRef = useRef(new Map());

    // Configurações
    const config = {
        showNotifications: true,
        trackHistory: true,
        allowConcurrent: false,
        timeout: 30000, // 30 segundos
        ...options
    };

    /**
     * Executar ação em uma pavimentação
     * @param {number} pavimentationId - ID da pavimentação
     * @param {string} actionId - ID da ação
     * @param {Object} actionOptions - Opções específicas da ação
     * @returns {Promise<Object>} Resultado da ação
     */
    const executeAction = useCallback(async (pavimentationId, actionId, actionOptions = {}) => {
        try {
            const actionConfig = StatusUtils.getActionConfig(actionId);
            if (!actionConfig) {
                throw new Error(`Ação inválida: ${actionId}`);
            }

            // Verificar se já existe ação pendente
            const actionKey = `${pavimentationId}_${actionId}`;
            if (!config.allowConcurrent && pendingActions.has(actionKey)) {
                throw new Error('Ação já está sendo executada para esta pavimentação');
            }

            // Marcar ação como pendente
            setPendingActions(prev => new Map(prev).set(actionKey, {
                pavimentationId,
                actionId,
                startTime: Date.now(),
                config: actionConfig
            }));

            setLoading(true);

            // Criar controller para cancelamento
            const abortController = new AbortController();
            abortControllersRef.current.set(actionKey, abortController);

            const timeoutId = setTimeout(() => {
                abortController.abort();
            }, config.timeout);

            try {
                console.log(`🎬 Executando ação: ${actionId} na pavimentação ${pavimentationId}`);

                // Executar ação no serviço (com anexos se fornecidos)
                const result = await pavimentationService.executeAction(
                    pavimentationId,
                    actionId,
                    {
                        ...actionOptions,
                        signal: abortController.signal
                    }
                );

                clearTimeout(timeoutId);

                // Registrar no histórico
                if (config.trackHistory) {
                    const historyEntry = {
                        id: Date.now(),
                        pavimentationId,
                        actionId,
                        actionLabel: actionConfig.label,
                        timestamp: new Date(),
                        success: true,
                        result,
                        duration: Date.now() - pendingActions.get(actionKey)?.startTime,
                        hasAttachments: actionOptions.attachments?.length > 0
                    };

                    setActionHistory(prev => [historyEntry, ...prev.slice(0, 99)]);
                }

                // Notificar sucesso
                if (config.showNotifications) {
                    const message = result.attachmentsProcessed > 0
                        ? `${result.message} (${result.attachmentsProcessed} anexo(s) adicionado(s))`
                        : result.message || actionConfig.successMessage;
                    notifySuccess(message);
                }

                // Chamar callback de sucesso
                if (onSuccess) {
                    await onSuccess(pavimentationId, actionId, result);
                }

                console.log(`✅ Ação ${actionId} executada com sucesso`);
                return result;

            } finally {
                clearTimeout(timeoutId);
                abortControllersRef.current.delete(actionKey);
                setPendingActions(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(actionKey);
                    return newMap;
                });
            }

        } catch (error) {
            // Ignorar erros de cancelamento
            if (error.name === 'AbortError') {
                console.log(`Ação ${actionId} cancelada`);
                return null;
            }

            console.error(`Erro ao executar ação ${actionId}:`, error);

            // Registrar erro no histórico
            if (config.trackHistory) {
                const historyEntry = {
                    id: Date.now(),
                    pavimentationId,
                    actionId,
                    actionLabel: StatusUtils.getActionConfig(actionId)?.label || actionId,
                    timestamp: new Date(),
                    success: false,
                    error: error.message,
                    duration: Date.now() - (pendingActions.get(`${pavimentationId}_${actionId}`)?.startTime || Date.now())
                };

                setActionHistory(prev => [historyEntry, ...prev.slice(0, 99)]);
            }

            // Notificar erro
            if (config.showNotifications) {
                const actionConfig = StatusUtils.getActionConfig(actionId);
                const errorMessage = actionConfig?.errorMessage || 'Erro ao executar ação';
                notifyError(`${errorMessage}: ${error.message}`);
            }

            // Chamar callback de erro
            if (onError) {
                await onError(pavimentationId, actionId, error);
            }

            throw error;
        } finally {
            setLoading(false);
        }
    }, [pendingActions, config, onSuccess, onError]);

    /**
     * Executar ação com confirmação
     * @param {number} pavimentationId - ID da pavimentação
     * @param {string} actionId - ID da ação
     * @param {Function} confirmCallback - Função para mostrar confirmação
     * @param {Object} actionOptions - Opções da ação
     * @returns {Promise<Object|null>} Resultado ou null se cancelado
     */
    const executeActionWithConfirmation = useCallback(async (
        pavimentationId,
        actionId,
        confirmCallback,
        actionOptions = {}
    ) => {
        try {
            const actionConfig = StatusUtils.getActionConfig(actionId);
            if (!actionConfig) {
                throw new Error(`Ação inválida: ${actionId}`);
            }

            // Mostrar confirmação se necessário
            if (actionConfig.requiresConfirmation && confirmCallback) {
                const confirmed = await confirmCallback({
                    title: actionConfig.confirmTitle,
                    message: actionConfig.confirmMessage,
                    details: actionConfig.confirmDetails,
                    actionLabel: actionConfig.label,
                    actionColor: actionConfig.color
                });

                if (!confirmed) {
                    console.log('Ação cancelada pelo usuário');
                    return null;
                }
            }

            // Executar ação
            return await executeAction(pavimentationId, actionId, actionOptions);

        } catch (error) {
            console.error('Erro na ação com confirmação:', error);
            throw error;
        }
    }, [executeAction]);

    /**
     * Executar múltiplas ações em lote
     * @param {Array} actions - Array de {pavimentationId, actionId, options}
     * @param {Object} batchOptions - Opções do lote
     * @returns {Promise<Array>} Resultados das ações
     */
    const executeBatchActions = useCallback(async (actions, batchOptions = {}) => {
        const {
            concurrent = false,
            stopOnError = false,
            showProgress = true
        } = batchOptions;

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        if (showProgress && config.showNotifications) {
            notifyInfo(`Executando ${actions.length} ações...`);
        }

        try {
            if (concurrent) {
                // Executar todas as ações em paralelo
                const promises = actions.map(async ({ pavimentationId, actionId, options = {} }) => {
                    try {
                        const result = await executeAction(pavimentationId, actionId, options);
                        successCount++;
                        return { success: true, pavimentationId, actionId, result };
                    } catch (error) {
                        errorCount++;
                        if (stopOnError) throw error;
                        return { success: false, pavimentationId, actionId, error };
                    }
                });

                const batchResults = await Promise.all(promises);
                results.push(...batchResults);

            } else {
                // Executar ações sequencialmente
                for (const { pavimentationId, actionId, options = {} } of actions) {
                    try {
                        const result = await executeAction(pavimentationId, actionId, options);
                        results.push({ success: true, pavimentationId, actionId, result });
                        successCount++;
                    } catch (error) {
                        results.push({ success: false, pavimentationId, actionId, error });
                        errorCount++;

                        if (stopOnError) {
                            throw error;
                        }
                    }
                }
            }

            // Notificar resultado final
            if (showProgress && config.showNotifications) {
                if (errorCount === 0) {
                    notifySuccess(`${successCount} ações executadas com sucesso`);
                } else {
                    notifyError(`${successCount} sucessos, ${errorCount} erros`);
                }
            }

            return results;

        } catch (error) {
            console.error('Erro no lote de ações:', error);
            throw error;
        }
    }, [executeAction, config.showNotifications]);

    /**
     * Cancelar ação em execução
     * @param {number} pavimentationId - ID da pavimentação
     * @param {string} actionId - ID da ação (opcional)
     */
    const cancelAction = useCallback((pavimentationId, actionId = null) => {
        if (actionId) {
            // Cancelar ação específica
            const actionKey = `${pavimentationId}_${actionId}`;
            const controller = abortControllersRef.current.get(actionKey);
            if (controller) {
                controller.abort();
                console.log(`Ação ${actionId} cancelada para pavimentação ${pavimentationId}`);
            }
        } else {
            // Cancelar todas as ações da pavimentação
            Array.from(abortControllersRef.current.keys())
                .filter(key => key.startsWith(`${pavimentationId}_`))
                .forEach(key => {
                    const controller = abortControllersRef.current.get(key);
                    if (controller) {
                        controller.abort();
                    }
                });
            console.log(`Todas as ações canceladas para pavimentação ${pavimentationId}`);
        }
    }, []);

    /**
     * Cancelar todas as ações em execução
     */
    const cancelAllActions = useCallback(() => {
        abortControllersRef.current.forEach(controller => {
            controller.abort();
        });
        abortControllersRef.current.clear();
        setPendingActions(new Map());
        console.log('Todas as ações canceladas');
    }, []);

    /**
     * Verificar se ação está pendente
     * @param {number} pavimentationId - ID da pavimentação
     * @param {string} actionId - ID da ação (opcional)
     * @returns {boolean} Se está pendente
     */
    const isActionPending = useCallback((pavimentationId, actionId = null) => {
        if (actionId) {
            return pendingActions.has(`${pavimentationId}_${actionId}`);
        }

        // Verificar se qualquer ação está pendente para a pavimentação
        return Array.from(pendingActions.keys()).some(key =>
            key.startsWith(`${pavimentationId}_`)
        );
    }, [pendingActions]);

    /**
     * Obter ações disponíveis para um status
     * @param {string} status - Status da pavimentação
     * @returns {Array} Ações disponíveis
     */
    const getAvailableActions = useCallback((status) => {
        const availableActionIds = StatusUtils.getAvailableActions(status);
        return availableActionIds.map(actionId => StatusUtils.getActionConfig(actionId));
    }, []);

    /**
     * Validar se ação é permitida
     * @param {string} currentStatus - Status atual
     * @param {string} actionId - ID da ação
     * @returns {Object} Resultado da validação
     */
    const validateAction = useCallback((currentStatus, actionId) => {
        const actionConfig = StatusUtils.getActionConfig(actionId);
        if (!actionConfig) {
            return { valid: false, reason: 'Ação não encontrada' };
        }

        if (actionConfig.fromStatus !== currentStatus) {
            return {
                valid: false,
                reason: `Ação não disponível para status ${currentStatus}`
            };
        }

        return { valid: true };
    }, []);

    /**
     * Obter estatísticas do histórico
     * @returns {Object} Estatísticas
     */
    const getHistoryStats = useCallback(() => {
        if (!config.trackHistory) return null;

        const total = actionHistory.length;
        const successful = actionHistory.filter(entry => entry.success).length;
        const failed = total - successful;

        const actionCounts = actionHistory.reduce((acc, entry) => {
            acc[entry.actionId] = (acc[entry.actionId] || 0) + 1;
            return acc;
        }, {});

        const averageDuration = actionHistory.length > 0
            ? actionHistory.reduce((sum, entry) => sum + (entry.duration || 0), 0) / actionHistory.length
            : 0;

        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
            actionCounts,
            averageDuration: Math.round(averageDuration)
        };
    }, [actionHistory, config.trackHistory]);

    /**
     * Limpar histórico
     */
    const clearHistory = useCallback(() => {
        setActionHistory([]);
    }, []);

    /**
     * Obter ações pendentes para uma pavimentação específica
     * @param {number} pavimentationId - ID da pavimentação
     * @returns {Array} Ações pendentes
     */
    const getPendingActionsForPavimentation = useCallback((pavimentationId) => {
        return Array.from(pendingActions.entries())
            .filter(([key, _]) => key.startsWith(`${pavimentationId}_`))
            .map(([_, action]) => action);
    }, [pendingActions]);

    // Cleanup ao desmontar
    React.useEffect(() => {
        return () => {
            cancelAllActions();
        };
    }, [cancelAllActions]);

    return {
        // Estados
        loading,
        actionHistory: config.trackHistory ? actionHistory : [],
        pendingActions: Array.from(pendingActions.values()),

        // Ações principais
        executeAction,
        executeActionWithConfirmation,
        executeBatchActions,

        // Controle
        cancelAction,
        cancelAllActions,
        isActionPending,

        // Utilitários
        getAvailableActions,
        validateAction,
        getPendingActionsForPavimentation,

        // Histórico
        getHistoryStats,
        clearHistory,

        // Estado computados
        hasActiveActions: pendingActions.size > 0,
        totalPendingActions: pendingActions.size,

        // Estatísticas (se histórico habilitado)
        ...(config.trackHistory && {
            historyStats: getHistoryStats()
        })
    };
};

/**
 * Hook simplificado para ações básicas
 * @param {Function} onActionComplete - Callback quando ação completa
 * @returns {Object} Funções básicas de ação
 */
export const useSimplePavimentationActions = (onActionComplete) => {
    const { executeActionWithConfirmation, loading, isActionPending } = usePavimentationActions(
        onActionComplete,
        null,
        { showNotifications: true, trackHistory: false }
    );

    return {
        executeAction: executeActionWithConfirmation,
        loading,
        isActionPending
    };
};

export default usePavimentationActions;