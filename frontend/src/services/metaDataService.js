import api from './api';

/**
 * Busca os metadados da aplicação.
 * Estes dados são geralmente listas de seleção (dropdowns), tipos, etc.
 * @returns {Promise<Object>} Os metadados.
 */
export const fetchMetaData = async () => {
    try {
        const response = await api.get('/metaData');
        // Assumindo que a API retorna os dados diretamente no corpo da resposta
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar metadados:", error);
        // Lança o erro para que o React Query possa tratá-lo
        throw error;
    }
};