import api from '../../../services/api';

const API_BASE_URL = '';

export const fetchOperationsData = async (page = 1, pageSize = 50) => {
    try {
        const response = await api.get('/operations', {
            params: {
                page,
                page_size: pageSize
            }
        });
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar dados de operações:', error);
        throw error;
    }
};

export const updateOperation = async (operationId, data) => {
    try {
        const response = await api.put(`/operations/${operationId}`, data);
        return response.data;
    } catch (error) {
        console.error('Erro ao atualizar operação:', error);
        throw error;
    }
};

export const completeOperation = async (operationId, completionData) => {
    try {
        const response = await api.post(
            `/add_document_step/${operationId}`,
            completionData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('Erro ao concluir operação:', error);
        throw error;
    }
};

export const addOperationStep = async (operationId, stepData) => {
    try {
        const response = await api.post(
            `/add_document_step/${operationId}`,
            stepData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('Erro ao adicionar passo:', error);
        throw error;
    }
};

export const uploadAttachment = async (operationId, file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post(
            `/operations/${operationId}/attachments`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Erro ao enviar anexo:', error);
        throw error;
    }
};