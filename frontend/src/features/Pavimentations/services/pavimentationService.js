// frontend/src/features/Pavimentations/services/pavimentationService.js

import api from '../../../services/api';
import {
    PAVIMENTATION_STATUS,
    PAVIMENTATION_ACTIONS,
    DataHelpers,
    StatusUtils
} from '../constants/pavimentationTypes';

/**
 * Classe de serviço para gerenciar operações de pavimentações
 */
class PavimentationService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Buscar pavimentações por status
     * @param {string} status - Status das pavimentações (pending, executed, completed)
     * @param {Object} options - Opções adicionais
     * @returns {Promise<Array>} Lista de pavimentações
     */
    async getPavimentations(status, options = {}) {
        try {
            const statusConfig = StatusUtils.getStatusConfig(status);
            if (!statusConfig) {
                throw new Error(`Status inválido: ${status}`);
            }

            // Verificar cache se não forçar refresh
            const cacheKey = `pavimentations_${status}`;
            if (!options.forceRefresh && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            console.log(`Buscando pavimentações: ${status}`);
            const response = await api.get(statusConfig.endpoint);

            if (!response.data || !response.data.ramais) {
                throw new Error('Formato de resposta inválido');
            }

            let data = response.data.ramais;

            // Processar dados: calcular totais e adicionar campos derivados
            data = data.map(item => {
                const processed = DataHelpers.calculateTotals(item);

                // Adicionar status atual
                processed.currentStatus = status;

                // Adicionar mês de submissão para agrupamento
                processed.submission_month = DataHelpers.getSubmissionMonth(processed.submission);

                return processed;
            });

            // Salvar no cache
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            console.log(`✅ ${data.length} pavimentações carregadas para status: ${status}`);
            return data;

        } catch (error) {
            console.error('Erro ao buscar pavimentações:', error);
            throw new Error(`Erro ao carregar pavimentações: ${error.message}`);
        }
    }

    /**
     * Executar ação em uma pavimentação
     * @param {number} pavimentationId - ID da pavimentação
     * @param {string} actionId - ID da ação (execute, pay)
     * @returns {Promise<Object>} Resultado da operação
     */
    async executeAction(pavimentationId, actionId) {
        try {
            const actionConfig = StatusUtils.getActionConfig(actionId);
            if (!actionConfig) {
                throw new Error(`Ação inválida: ${actionId}`);
            }

            console.log(`Executando ação ${actionId} na pavimentação ${pavimentationId}`);

            const endpoint = `${actionConfig.endpoint}/${pavimentationId}`;
            const response = await api.put(endpoint);

            if (!response.data) {
                throw new Error('Resposta vazia do servidor');
            }

            // Limpar cache relacionado
            this.clearCache();

            console.log(`✅ Ação ${actionId} executada com sucesso`);
            return {
                success: true,
                message: actionConfig.successMessage,
                data: response.data,
                actionId,
                pavimentationId,
                fromStatus: actionConfig.fromStatus,
                toStatus: actionConfig.toStatus
            };

        } catch (error) {
            console.error('Erro ao executar ação:', error);

            const actionConfig = StatusUtils.getActionConfig(actionId);
            const errorMessage = actionConfig?.errorMessage || 'Erro ao executar ação';

            throw new Error(`${errorMessage}: ${error.message}`);
        }
    }

    /**
     * Exportar pavimentações para Excel
     * @param {string} status - Status das pavimentações
     * @param {Array} data - Dados para exportar (opcional, busca se não fornecido)
     * @param {Object} filters - Filtros aplicados
     * @returns {Promise<Object>} Dados formatados para exportação
     */
    async exportPavimentations(status, data = null, filters = {}) {
        try {
            // Buscar dados se não fornecidos
            if (!data) {
                data = await this.getPavimentations(status);
            }

            // Aplicar filtros se necessário
            let filteredData = [...data];

            if (filters.search) {
                filteredData = this.applySearchFilter(filteredData, filters.search);
            }

            if (filters.groupBy) {
                // Para exportação com agrupamento, manter ordem dos grupos
                const grouped = this.groupData(filteredData, filters.groupBy);
                filteredData = Object.values(grouped).flat();
            }

            // Formatar dados para exportação
            const exportData = filteredData.map(item => ({
                'Número do Pedido': item.regnumber || '',
                'Entidade': item.ts_entity || '',
                'Localidade': item.nut4 || '',
                'Freguesia': item.nut3 || '',
                'Concelho': item.nut2 || '',
                'Morada': item.address || '',
                'Porta': item.door || '',
                'Andar': item.floor || '',
                'Código Postal': item.postal || '',
                'Contacto': item.phone || '',
                'Observações': item.memo || '',
                'Comprimento Total (m)': DataHelpers.formatMeasurement(item.comprimento_total, ''),
                'Área Total (m²)': DataHelpers.formatMeasurement(item.area_total, ''),
                'Comprimento Betuminoso (m)': DataHelpers.formatMeasurement(item.comprimento_bet, ''),
                'Área Betuminoso (m²)': DataHelpers.formatMeasurement(item.area_bet, ''),
                'Comprimento Paralelos (m)': DataHelpers.formatMeasurement(item.comprimento_gra, ''),
                'Área Paralelos (m²)': DataHelpers.formatMeasurement(item.area_gra, ''),
                'Comprimento Pavê (m)': DataHelpers.formatMeasurement(item.comprimento_pav, ''),
                'Área Pavê (m²)': DataHelpers.formatMeasurement(item.area_pav, ''),
                'Data de Submissão': item.submission || '',
                'Status': StatusUtils.getStatusConfig(status)?.label || status
            }));

            const statusConfig = StatusUtils.getStatusConfig(status);
            const filename = `pavimentacoes_${statusConfig.pluralLabel.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;

            return {
                data: exportData,
                filename,
                sheetName: `Pavimentações ${statusConfig.pluralLabel}`,
                totalRecords: data.length,
                filteredRecords: filteredData.length
            };

        } catch (error) {
            console.error('Erro ao exportar pavimentações:', error);
            throw new Error(`Erro ao preparar exportação: ${error.message}`);
        }
    }

    /**
     * Aplicar filtro de pesquisa
     * @param {Array} data - Dados para filtrar
     * @param {string} searchTerm - Termo de pesquisa
     * @returns {Array} Dados filtrados
     */
    applySearchFilter(data, searchTerm) {
        if (!searchTerm || !searchTerm.trim()) return data;

        const term = searchTerm.toLowerCase().trim();

        return data.filter(item => {
            const searchableFields = [
                'regnumber',
                'ts_entity',
                'nut4',
                'nut3',
                'nut2',
                'address',
                'phone',
                'memo'
            ];

            return searchableFields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(term);
            });
        });
    }

    /**
     * Agrupar dados por campo
     * @param {Array} data - Dados para agrupar
     * @param {string} groupByField - Campo para agrupamento
     * @returns {Object} Dados agrupados
     */
    groupData(data, groupByField) {
        if (!groupByField || !Array.isArray(data)) {
            return { '': data };
        }

        const groups = {};

        data.forEach(item => {
            let groupKey;

            switch (groupByField) {
                case 'submission_month':
                    groupKey = item.submission_month || 'Sem data';
                    break;
                default:
                    groupKey = item[groupByField] || 'Sem valor';
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        });

        return groups;
    }

    /**
     * Ordenar dados
     * @param {Array} data - Dados para ordenar
     * @param {string} sortBy - Campo para ordenação
     * @param {string} sortOrder - Direção da ordenação (asc/desc)
     * @returns {Array} Dados ordenados
     */
    sortData(data, sortBy, sortOrder = 'asc') {
        if (!sortBy || !Array.isArray(data)) return data;

        return [...data].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            // Tratamento especial para valores numéricos
            if (['comprimento_total', 'area_total'].includes(sortBy)) {
                aVal = parseFloat(aVal || 0);
                bVal = parseFloat(bVal || 0);
                return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
            }

            // Tratamento especial para datas
            if (sortBy === 'submission') {
                aVal = new Date(aVal || 0);
                bVal = new Date(bVal || 0);
                return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
            }

            // Ordenação alfabética padrão
            aVal = (aVal || '').toString().toLowerCase();
            bVal = (bVal || '').toString().toLowerCase();

            const comparison = aVal.localeCompare(bVal, 'pt-PT');
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Obter estatísticas dos dados
     * @param {Array} data - Dados para analisar
     * @returns {Object} Estatísticas
     */
    getStatistics(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return {
                totalItems: 0,
                totalComprimento: 0,
                totalArea: 0,
                averageComprimento: 0,
                averageArea: 0
            };
        }

        const totalComprimento = data.reduce((sum, item) => {
            return sum + (parseFloat(item.comprimento_total) || 0);
        }, 0);

        const totalArea = data.reduce((sum, item) => {
            return sum + (parseFloat(item.area_total) || 0);
        }, 0);

        return {
            totalItems: data.length,
            totalComprimento: totalComprimento.toFixed(2),
            totalArea: totalArea.toFixed(2),
            averageComprimento: (totalComprimento / data.length).toFixed(2),
            averageArea: (totalArea / data.length).toFixed(2)
        };
    }

    /**
     * Buscar pavimentação por ID
     * @param {number} id - ID da pavimentação
     * @param {string} status - Status atual (para otimizar busca)
     * @returns {Promise<Object|null>} Pavimentação encontrada
     */
    async getPavimentationById(id, status = null) {
        try {
            // Se status fornecido, buscar primeiro no cache desse status
            if (status) {
                const statusData = await this.getPavimentations(status);
                const found = statusData.find(item => item.pk === id);
                if (found) return found;
            }

            // Buscar em todos os status se não encontrado
            const allStatuses = Object.keys(PAVIMENTATION_STATUS).map(key =>
                PAVIMENTATION_STATUS[key].id
            );

            for (const statusId of allStatuses) {
                if (statusId === status) continue; // Já buscamos neste

                try {
                    const statusData = await this.getPavimentations(statusId);
                    const found = statusData.find(item => item.pk === id);
                    if (found) return found;
                } catch (error) {
                    console.warn(`Erro ao buscar em status ${statusId}:`, error);
                }
            }

            return null;
        } catch (error) {
            console.error('Erro ao buscar pavimentação por ID:', error);
            throw error;
        }
    }

    /**
     * Validar dados de pavimentação
     * @param {Object} data - Dados para validar
     * @returns {Object} Resultado da validação
     */
    validatePavimentationData(data) {
        const errors = [];
        const warnings = [];

        // Validações obrigatórias
        if (!data.regnumber) {
            errors.push('Número do pedido é obrigatório');
        }

        if (!data.ts_entity) {
            warnings.push('Entidade não informada');
        }

        // Validações de medidas
        const hasComprimento = DataHelpers.isValidNumber(data.comprimento_total) ||
            DataHelpers.isValidNumber(data.comprimento_bet) ||
            DataHelpers.isValidNumber(data.comprimento_gra) ||
            DataHelpers.isValidNumber(data.comprimento_pav);

        const hasArea = DataHelpers.isValidNumber(data.area_total) ||
            DataHelpers.isValidNumber(data.area_bet) ||
            DataHelpers.isValidNumber(data.area_gra) ||
            DataHelpers.isValidNumber(data.area_pav);

        if (!hasComprimento && !hasArea) {
            warnings.push('Nenhuma medida (comprimento ou área) informada');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            hasWarnings: warnings.length > 0
        };
    }

    /**
     * Limpar cache
     * @param {string} specific - Limpar cache específico (opcional)
     */
    clearCache(specific = null) {
        if (specific) {
            this.cache.delete(specific);
            console.log(`Cache limpo: ${specific}`);
        } else {
            this.cache.clear();
            console.log('Cache completamente limpo');
        }
    }

    /**
     * Obter informações do cache
     * @returns {Object} Informações do cache
     */
    getCacheInfo() {
        const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
            key,
            size: value.data?.length || 0,
            timestamp: value.timestamp,
            age: Date.now() - value.timestamp
        }));

        return {
            totalEntries: this.cache.size,
            entries,
            totalSize: entries.reduce((sum, entry) => sum + entry.size, 0)
        };
    }

    /**
     * Verificar saúde do serviço
     * @returns {Promise<Object>} Status da saúde do serviço
     */
    async healthCheck() {
        try {
            // Testar conectividade básica
            const testResponse = await api.get('/document_ramais');

            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                cache: this.getCacheInfo(),
                apiConnectivity: true,
                lastResponse: testResponse.status === 200
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
                cache: this.getCacheInfo(),
                apiConnectivity: false
            };
        }
    }
    
    applyDateFilter(data, dateStart, dateEnd) {
        if (!dateStart && !dateEnd) return data;

        return data.filter(item => {
            if (!item.submission) return false;
            const itemDate = item.submission.split(' às ')[0];
            if (dateStart && itemDate < dateStart) return false;
            if (dateEnd && itemDate > dateEnd) return false;
            return true;
        });
    }

    multiSort(data, sortFields) {
        if (!sortFields?.length) return data;

        return [...data].sort((a, b) => {
            for (const { field, order } of sortFields) {
                let aVal = a[field];
                let bVal = b[field];

                if (['comprimento_total', 'area_total'].includes(field)) {
                    aVal = parseFloat(aVal || 0);
                    bVal = parseFloat(bVal || 0);
                    const comparison = aVal - bVal;
                    if (comparison !== 0) return order === 'desc' ? -comparison : comparison;
                    continue;
                }

                if (field === 'submission') {
                    aVal = new Date(aVal || 0);
                    bVal = new Date(bVal || 0);
                    const comparison = aVal - bVal;
                    if (comparison !== 0) return order === 'desc' ? -comparison : comparison;
                    continue;
                }

                aVal = (aVal || '').toString().toLowerCase();
                bVal = (bVal || '').toString().toLowerCase();
                const comparison = aVal.localeCompare(bVal, 'pt-PT');
                if (comparison !== 0) return order === 'desc' ? -comparison : comparison;
            }
            return 0;
        });
    }
}

// Instância singleton do serviço
export const pavimentationService = new PavimentationService();

// Exportações adicionais para testes e uso avançado
export { PavimentationService };

export default pavimentationService;