import api from "./api";

// Serviço para buscar dados de uma view específica para o dashboard
export const getDashboardData = async (viewName, year = null) => {
    try {
        let url = `/dashboard/${viewName}`;
        if (year) {
            url += `?year=${year}`;
        }
        const response = await api.get(url);
        console.log(`Dados do dashboard (${viewName}):`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Erro ao buscar dados do dashboard (${viewName}):`, error);
        // Em caso de erro, retornar array vazio para evitar erros no componente
        return [];
    }
};

// Função auxiliar para buscar todos os dados do dashboard de uma vez
export const getAllDashboardData = async (year = null) => {
    try {
        const viewNames = [
            'vbr_document_001',
            'vbr_document_002',
            'vbr_document_003',
            'vbr_document_004',
            'vbr_document_005',
            'vbr_document_006',
            'vbr_document_007',
            'vbr_document_008',
            'vbr_document_009'
        ];

        const promises = viewNames.map(viewName => getDashboardData(viewName, year));
        const results = await Promise.all(promises);

        // Criar um objeto com os resultados, mantendo a estrutura original dos dados
        const data = viewNames.reduce((acc, viewName, index) => {
            acc[viewName] = results[index];
            return acc;
        }, {});

        return data;
    } catch (error) {
        console.error('Erro ao buscar todos os dados do dashboard:', error);
        return {};
    }
};

// Manter a função original para compatibilidade com código existente (será descontinuada)
export const fetchDashboardData = async () => {
    console.warn('DEPRECATED: Esta função será descontinuada. Por favor, use getDashboardData ou getAllDashboardData.');
    try {
        const response = await api.get("/operations"); // Redirecionando para a nova rota
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        throw error;
    }
};