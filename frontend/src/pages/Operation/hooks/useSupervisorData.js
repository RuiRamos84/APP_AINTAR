import { useCallback, useMemo } from 'react';
import { useOperationsUnifiedV2 } from './useOperationsUnifiedV2';
import { useOperationsSWR } from '../services/cacheService';
import { useMetaData } from '../../../contexts/MetaDataContext';

/**
 * HOOK PARA DADOS DE SUPERVISOR - OTIMIZADO PARA GRANDE VOLUME
 *
 * Dados principais:
 * - tb_operacaometa (voltas programadas/recorrentes) - 2161 registos
 * - tb_operacao (execuções reais quando operadores completam) - variável
 *
 * Filtros:
 * - Filtro por semana (W1, W2, W3, W4)
 * - Filtro por dia da semana (Segunda, Terça, etc)
 * - Paginação simples
 */
export const useSupervisorData = (options = {}) => {
    const {
        weekFilter = 'all', // 'all', 'W1', 'W2', 'W3', 'W4'
        dayFilter = 'all' // 'all', 'Segunda', 'Terça', 'Quarta', etc
    } = options;

    // Metadados para mapear PKs → Nomes
    const { metaData } = useMetaData();

    // Dados base de operações - voltas programadas (tb_operacaometa)
    const operationsData = useOperationsUnifiedV2({
        autoLoad: true,
        includeMetas: true,
        includeUserTasks: false,
        includeAnalytics: false
    });

    // Dados de execuções reais (tb_operacao) - quando operadores completam tarefas
    const {
        operations: executedOperations,
        isLoading: executionsLoading,
        error: executionsError,
        refresh: refreshExecutions
    } = useOperationsSWR(null, {
        isPaused: () => false // Sempre carregar execuções para supervisor
    });

    // Helper global: tt_operacaodia pode vir como PK (número) ou nome (string)
    const getDiaNome = useCallback((valor) => {
        if (typeof valor === 'string') return valor;
        const dia = metaData?.operacaodia?.find(d => d.pk === valor);
        return dia?.value || '';
    }, [metaData]);

    // Filtrar execuções concluídas E aplicar filtros de semana/dia
    const completedExecutions = useMemo(() => {
        const allMetas = operationsData.metas || [];

        const completed = executedOperations.filter(exec => {
            // Verificar se está realmente concluída (tem valores preenchidos)
            const isCompleted = !!(exec.valuetext && exec.valuetext.trim()) || exec.valuenumb !== null && exec.valuenumb !== undefined;
            return isCompleted;
        });

        // Enriquecer cada execução com tt_operacaodia da meta correspondente
        const enrichedExecutions = completed.map(exec => {
            // Obter dia da semana da execução
            const execDate = exec.data ? new Date(exec.data) : new Date();
            const dayOfWeek = execDate.getDay(); // 0=Domingo, 1=Segunda, 2=Terça, etc

            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const execDayName = dayNames[dayOfWeek];

            // Encontrar TODAS as metas correspondentes a esta execução
            const matchingMetas = allMetas.filter(meta => {
                const sameInstallation = meta.tb_instalacao === exec.tb_instalacao;
                const sameAction = meta.tt_operacaoaccao === exec.tt_operacaoaccao;

                // Verificar operador em comum
                const metaOperators = [meta.ts_operador1, meta.ts_operador2, meta.pk_operador1, meta.pk_operador2].filter(Boolean);
                const execOperators = [exec.ts_operador1, exec.ts_operador2, exec.pk_operador1, exec.pk_operador2].filter(Boolean);

                const hasCommonOperator = metaOperators.some(metaOp =>
                    execOperators.some(execOp => String(execOp) === String(metaOp))
                );

                return sameInstallation && sameAction && hasCommonOperator;
            });

            // Das metas encontradas, escolher a que corresponde ao dia da semana da execução
            const matchingMeta = matchingMetas.find(meta => {
                const diaCompleto = getDiaNome(meta.tt_operacaodia);
                // Ex: "W1 Segunda", "W2 Terça", etc
                return diaCompleto.toLowerCase().includes(execDayName.toLowerCase());
            }) || matchingMetas[0]; // Fallback: primeira meta se não encontrar pelo dia

            return {
                ...exec,
                tt_operacaodia: matchingMeta?.tt_operacaodia || ''
            };
        });

        // Aplicar filtros de semana/dia
        let filtered = enrichedExecutions;

        // Filtro por Semana (W1, W2, W3, W4)
        if (weekFilter !== 'all') {
            filtered = filtered.filter(exec => {
                const dia = getDiaNome(exec.tt_operacaodia);
                return dia.toUpperCase().startsWith(weekFilter.toUpperCase());
            });
        }

        // Filtro por Dia da Semana (Segunda, Terça, etc)
        if (dayFilter !== 'all') {
            filtered = filtered.filter(exec => {
                const dia = getDiaNome(exec.tt_operacaodia);
                return dia.toLowerCase().includes(dayFilter.toLowerCase());
            });
        }

        return filtered;
    }, [executedOperations, operationsData.metas, weekFilter, dayFilter, getDiaNome]);

    // Filtrar metas por semana e dia
    const filteredMetas = useMemo(() => {
        const allMetas = operationsData.metas || [];

        if (!allMetas.length) return [];
        if (!metaData?.operacaodia) {
            return allMetas;
        }

        let filtered = allMetas;

        // Filtro por Semana (W1, W2, W3, W4)
        if (weekFilter !== 'all') {
            filtered = filtered.filter(meta => {
                const diaNome = getDiaNome(meta.tt_operacaodia);
                return diaNome.toUpperCase().startsWith(weekFilter.toUpperCase());
            });
        }

        // Filtro por Dia da Semana (Segunda, Terça, etc)
        if (dayFilter !== 'all') {
            filtered = filtered.filter(meta => {
                const diaNome = getDiaNome(meta.tt_operacaodia);
                return diaNome.toLowerCase().includes(dayFilter.toLowerCase());
            });
        }

        return filtered;
    }, [operationsData.metas, weekFilter, dayFilter, metaData, getDiaNome]);

    // Correlacionar execuções com voltas programadas
    const correlatedData = useMemo(() => {
        // Para cada volta programada, verificar se tem execuções
        const metasWithExecutions = filteredMetas.map(meta => {
            // Buscar execuções que correspondem a esta meta
            // Critérios: mesma instalação, mesma ação, operador em comum
            const relatedExecutions = completedExecutions.filter(execution => {
                const sameInstallation = execution.tb_instalacao === meta.tb_instalacao;
                const sameAction = execution.tt_operacaoaccao === meta.tt_operacaoaccao;

                // Verificar se há operador em comum
                const metaOperators = [meta.ts_operador1, meta.ts_operador2].filter(Boolean);
                const execOperators = [execution.ts_operador1, execution.ts_operador2].filter(Boolean);

                const hasCommonOperator = metaOperators.some(metaOp =>
                    execOperators.some(execOp => execOp === metaOp)
                );

                return sameInstallation && sameAction && hasCommonOperator;
            });

            return {
                ...meta,
                executions: relatedExecutions,
                executionCount: relatedExecutions.length,
                lastExecution: relatedExecutions.length > 0
                    ? relatedExecutions[relatedExecutions.length - 1]
                    : null,
                hasExecutions: relatedExecutions.length > 0
            };
        });

        return metasWithExecutions;
    }, [filteredMetas, completedExecutions]);

    // Analytics COM FILTROS (semana/dia) aplicados
    const analytics = useMemo(() => {
        // USAR filteredMetas (já filtradas por semana/dia), não allMetas
        const totalOperations = filteredMetas.length; // Voltas programadas FILTRADAS
        const completedTasks = completedExecutions.length; // Execuções REAIS (TODAS)
        const pendingTasks = totalOperations - completedTasks;
        const completionRate = totalOperations > 0
            ? Math.round((completedTasks / totalOperations) * 100)
            : 0;

        // Operadores únicos ativos (que têm execuções)
        const activeOperatorsSet = new Set();
        executedOperations.forEach(execution => {
            if (execution.ts_operador1) {
                activeOperatorsSet.add(execution.ts_operador1);
            }
            if (execution.ts_operador2) {
                activeOperatorsSet.add(execution.ts_operador2);
            }
        });

        return {
            overview: {
                totalOperations,
                completedTasks,
                pendingTasks,
                completionRate,
                activeOperators: activeOperatorsSet.size,
                totalExecutions: executedOperations.length
            },
            trends: {
                daily: [],
                weekly: []
            }
        };
    }, [filteredMetas, completedExecutions, executedOperations]);

    // Atividades recentes - Últimas 20 execuções (ordenadas por data)
    const recentActivity = useMemo(() => {
        // Usar execuções reais, ordenadas por data (mais recentes primeiro)
        const sortedExecutions = [...executedOperations]
            .sort((a, b) => {
                const dateA = new Date(a.data_criacao || a.created_at || 0);
                const dateB = new Date(b.data_criacao || b.created_at || 0);
                return dateB - dateA;
            })
            .slice(0, 20);

        return sortedExecutions.map(execution => ({
            id: execution.pk,
            timestamp: execution.data_criacao || execution.created_at || new Date().toISOString(),
            type: 'task_completed',
            description: `${execution.tt_operacaoaccao_nome || execution.tt_operacaoaccao || 'Operação'} - ${execution.tb_instalacao_nome || execution.tb_instalacao || 'Instalação'}`,
            operator: execution.ts_operador1_nome || execution.ts_operador2_nome || 'Operador',
            status: 'completed'
        }));
    }, [executedOperations]);

    // Estatísticas por Operador - METAS FILTRADAS vs EXECUÇÕES REAIS
    const operatorStats = useMemo(() => {
        const operatorMap = {};

        // Helper: Mapear PK → Nome usando metadados.who
        const getOperatorName = (pk) => {
            const operator = metaData?.who?.find(w => w.pk === pk);
            return operator?.name || `Operador #${pk}`;
        };

        // 1. CONTAR METAS PROGRAMADAS FILTRADAS por operador
        filteredMetas.forEach(meta => {
            // Operador1 - ts_operador1 pode ser PK ou nome, verificar
            if (meta.ts_operador1 || meta.pk_operador1) {
                const rawOp1 = meta.ts_operador1 || meta.pk_operador1;
                // Se for numérico, converter para nome
                const operatorName = !isNaN(rawOp1) ? getOperatorName(Number(rawOp1)) : rawOp1;

                if (!operatorMap[operatorName]) {
                    operatorMap[operatorName] = {
                        name: operatorName,
                        totalTasks: 0,
                        completedTasks: 0,
                        pendingTasks: 0,
                        efficiency: 0
                    };
                }
                operatorMap[operatorName].totalTasks++;
            }

            // Operador2
            if (meta.ts_operador2 || meta.pk_operador2) {
                const rawOp2 = meta.ts_operador2 || meta.pk_operador2;
                const operatorName = !isNaN(rawOp2) ? getOperatorName(Number(rawOp2)) : rawOp2;

                if (!operatorMap[operatorName]) {
                    operatorMap[operatorName] = {
                        name: operatorName,
                        totalTasks: 0,
                        completedTasks: 0,
                        pendingTasks: 0,
                        efficiency: 0
                    };
                }
                operatorMap[operatorName].totalTasks++;
            }
        });

        // 2. CONTAR EXECUÇÕES REAIS por operador (podem vir com PK ou nome)
        completedExecutions.forEach((execution) => {
            // Operador1 - converter PK para nome se necessário
            if (execution.ts_operador1 || execution.pk_operador1) {
                const rawOp1 = execution.ts_operador1 || execution.pk_operador1;
                const op1 = !isNaN(rawOp1) ? getOperatorName(Number(rawOp1)) : rawOp1;

                if (operatorMap[op1]) {
                    operatorMap[op1].completedTasks++;
                }
            }

            // Operador2
            if (execution.ts_operador2 || execution.pk_operador2) {
                const rawOp2 = execution.ts_operador2 || execution.pk_operador2;
                const op2 = !isNaN(rawOp2) ? getOperatorName(Number(rawOp2)) : rawOp2;
                if (operatorMap[op2]) {
                    operatorMap[op2].completedTasks++;
                }
            }
        });

        // 3. CALCULAR PENDENTES E EFICIÊNCIA
        Object.values(operatorMap).forEach(operator => {
            operator.pendingTasks = operator.totalTasks - operator.completedTasks;
            operator.efficiency = operator.totalTasks > 0
                ? Math.round((operator.completedTasks / operator.totalTasks) * 100)
                : 0;
        });

        // Filtrar apenas operadores reais (com name como string) e ordenar
        return Object.values(operatorMap)
            .filter(op => op && op.name && typeof op.name === 'string')
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredMetas, completedExecutions, metaData]);

    // Extrair semanas e dias únicos dos METADADOS (mais eficiente e confiável!)
    const availableWeeks = useMemo(() => {
        if (!metaData?.operacaodia) {
            return [];
        }

        const weeks = new Set();
        metaData.operacaodia.forEach(dia => {
            const diaValue = dia.value || '';
            // Extrair W1, W2, etc do início da string
            const weekMatch = diaValue.match(/^(W\d+)/i);
            if (weekMatch) {
                weeks.add(weekMatch[1].toUpperCase());
            }
        });

        return Array.from(weeks).sort();
    }, [metaData]);

    // Extrair dias da semana únicos dos METADADOS
    const availableDays = useMemo(() => {
        if (!metaData?.operacaodia) {
            return [];
        }

        const days = new Set();
        metaData.operacaodia.forEach(dia => {
            const diaValue = dia.value || '';
            // Extrair o dia da semana depois do "W1 ", "W2 ", etc
            const dayMatch = diaValue.match(/W\d+\s+(.+)/i);
            if (dayMatch) {
                days.add(dayMatch[1]);
            }
        });

        return Array.from(days);
    }, [metaData]);

    // Refresh unificado (metas + execuções)
    const refreshAll = useCallback(async () => {
        const promises = [];
        promises.push(operationsData.refresh());
        promises.push(refreshExecutions());
        await Promise.all(promises);
    }, [operationsData, refreshExecutions]);

    // Retornar dados otimizados
    return useMemo(() => ({
        // Analytics (com dados reais de execução!)
        analytics,

        // Atividades (execuções reais)
        recentActivity,

        // Estatísticas de operadores (com eficiência real)
        operatorStats,

        // Dados filtrados (voltas programadas)
        metas: filteredMetas,

        // Dados correlacionados (metas + execuções)
        operations: correlatedData,

        // Execuções brutas
        executions: executedOperations,

        // Opções de filtro
        availableWeeks,
        availableDays,

        // Info sobre filtros e dados
        filterInfo: {
            weekFilter,
            dayFilter,
            totalInDatabase: operationsData.metas?.length || 0,
            showing: filteredMetas.length,
            totalExecutions: executedOperations.length
        },

        // Estados (combinar loading de metas e execuções)
        isLoading: operationsData.isLoading || executionsLoading,
        hasError: !!operationsData.error || !!executionsError,

        // Ações
        refresh: refreshAll,
        createMeta: operationsData.createMeta,
        updateMeta: operationsData.updateMeta,
        deleteMeta: operationsData.deleteMeta
    }), [
        analytics,
        recentActivity,
        operatorStats,
        filteredMetas,
        correlatedData,
        executedOperations,
        availableWeeks,
        availableDays,
        weekFilter,
        dayFilter,
        operationsData,
        executionsLoading,
        executionsError,
        refreshAll
    ]);
};

export default useSupervisorData;
