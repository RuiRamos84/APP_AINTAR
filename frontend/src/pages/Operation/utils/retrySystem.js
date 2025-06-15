// frontend/src/pages/Operation/utils/retrySystem.js
class RetrySystem {
    static async execute(fn, options = {}) {
        const {
            maxRetries = 3,
            delay = 1000,
            backoff = 2,
            condition = () => true
        } = options;

        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                return await fn();
            } catch (error) {
                attempt++;

                // Não retry se unauthorized ou forbidden
                if (error.response?.status === 401 || error.response?.status === 403) {
                    throw error;
                }

                // Só retry se condição verdadeira
                if (!condition(error) || attempt > maxRetries) {
                    throw error;
                }

                // Delay exponencial
                const waitTime = delay * Math.pow(backoff, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    static isNetworkError(error) {
        return !error.response || error.code === 'NETWORK_ERROR';
    }
}

export { RetrySystem };

// frontend/src/pages/Operation/services/operationsService.js - ATUALIZADO
import api from '../../../services/api';
import { RetrySystem } from '../utils/retrySystem';

export const fetchOperationsData = async (page = 1, pageSize = 50) => {
    return RetrySystem.execute(
        () => api.get('/operations', { params: { page, page_size: pageSize } }),
        {
            maxRetries: 3,
            condition: RetrySystem.isNetworkError
        }
    ).then(response => response.data);
};

export const completeOperation = async (operationId, completionData) => {
    return RetrySystem.execute(
        () => api.post(`/add_document_step/${operationId}`, completionData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        {
            maxRetries: 2,
            delay: 500,
            condition: (error) => RetrySystem.isNetworkError(error) && error.response?.status !== 422
        }
    ).then(response => response.data);
};