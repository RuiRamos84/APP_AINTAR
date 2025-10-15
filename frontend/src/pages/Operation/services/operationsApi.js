// services/operationsApi.js
import apiClient from '../../../services/api';

/**
 * API CLIENT PARA OPERAÇÕES
 *
 * Integra com os novos endpoints do backend
 */
export const operationsApi = {
    // Dados estáticos (carregados via metaData)
    getMetaData: () => apiClient.get('/metaData'),

    // Gestão de metas de operação
    getOperacaoMeta: () => apiClient.get('/operacao_meta'),
    createOperacaoMeta: (data) => apiClient.post('/operacao_meta', data),
    getOperacaoMetaById: (id) => apiClient.get(`/operacao_meta/${id}`),
    updateOperacaoMeta: (id, data) => apiClient.put(`/operacao_meta/${id}`, data),
    deleteOperacaoMeta: (id) => apiClient.delete(`/operacao_meta/${id}`),

    // Operações (execuções reais)
    getOperacao: () => apiClient.get('/operacao'),
    getOperacaoSelf: () => apiClient.get('/operacao_self'),
    createOperacao: (data) => apiClient.post('/operacao', data),
    updateOperacao: (operacaoId, data) => apiClient.put(`/operacao/${operacaoId}`, data),
    completeTask: (taskId, completionData) => {
        // Se há foto, enviar como FormData
        if (completionData.photo) {
            const formData = new FormData();
            formData.append('valuetext', completionData.valuetext || '');
            if (completionData.valuememo) {
                formData.append('valuememo', completionData.valuememo);
            }
            formData.append('photo', completionData.photo);

            return apiClient.post(`/operacao_complete/${taskId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
        }

        // Sem foto, enviar como JSON normal
        return apiClient.post(`/operacao_complete/${taskId}`, completionData);
    },
    getAnalysisParameters: (operationId) => apiClient.get(`/operacao_analysis/${operationId}`),
    getReferenceOptions: (refObj) => apiClient.get(`/operacao_reference/${refObj}`),

    // Supervisor - Analytics e Dashboards
    getSupervisorAnalytics: () => apiClient.get('/operacao_supervisor_analytics'),
    getTeamActivity: () => apiClient.get('/operacao_team_activity'),
    getOperatorStats: () => apiClient.get('/operacao_operator_stats'),

    // Controlo de Operações (Supervisor valida tarefas)
    queryOperationControl: (filters) => apiClient.post('/operation_control/query', filters),
    updateOperationControl: (data) => apiClient.post('/operation_control/update', data),
    getMunicipalities: () => apiClient.get('/operation_control/municipalities'),
    getInstallationTypes: () => apiClient.get('/operation_control/installation_types'),
    getInstallations: (municipioId, tipoId) => apiClient.get(`/operation_control/installations?municipio_pk=${municipioId}&tipo_pk=${tipoId}`),

    // Fotos de operações
    getOperationPhotoUrl: (photoPath) => {
        // Normalizar path: trocar \ por /
        const normalizedPath = photoPath.replace(/\\/g, '/');
        return `/operacao_photo/${normalizedPath}`;
    },
    downloadOperationPhoto: (photoPath) => {
        const normalizedPath = photoPath.replace(/\\/g, '/');
        return apiClient.get(`/operacao_photo/${normalizedPath}`, {
            responseType: 'blob'
        });
    },

    // Operações legadas (mantidas para compatibilidade)
    getOperations: () => apiClient.get('/operations'),
    createInternalDocument: (data) => apiClient.post('/internal_document', data),

    // Helper para estruturar dados
    async getAllOperationData() {
        try {
            const [metaRes, operacaoRes, operacaoSelfRes, metaDataRes] = await Promise.all([
                this.getOperacaoMeta(),
                this.getOperacao(),
                this.getOperacaoSelf(),
                this.getMetaData()
            ]);

            return {
                metas: metaRes.data || [],
                operacoes: operacaoRes.data || [],
                minhasTarefas: operacaoSelfRes.data || [],
                metaData: metaDataRes.data || {},
                // Dados estáticos dos metadados
                operacaoDia: metaDataRes.data?.operacaodia || [],
                operacaoAccao: metaDataRes.data?.operacaoaccao || [],
                operacaoModo: metaDataRes.data?.operacamodo || []
            };
        } catch (error) {
            console.error('Erro ao carregar dados de operação:', error);
            throw error;
        }
    }
};

// Export individual functions for direct import
export const getAnalysisParameters = async (operationId) => {
    try {
        const response = await operationsApi.getAnalysisParameters(operationId);
        return response.data || [];
    } catch (error) {
        console.error('Erro ao buscar parâmetros de análise:', error);
        throw error;
    }
};

export const getReferenceOptions = async (refObj) => {
    try {
        const response = await operationsApi.getReferenceOptions(refObj);
        return response.data?.data || [];
    } catch (error) {
        console.error(`Erro ao buscar opções de referência para ${refObj}:`, error);
        throw error;
    }
};

export default operationsApi;