import api from "./api";

/**
 * Serviço de Dashboard
 * Integração com a nova estrutura de categorias e views
 */

// Limpar cache do dashboard no backend (força nova leitura da BD)
export const clearDashboardCache = async () => {
    try {
        const response = await api.post('/dashboard/cache/clear');
        return response.data;
    } catch (error) {
        console.error('Erro ao limpar cache do dashboard:', error);
        throw error;
    }
};

// Buscar estrutura do dashboard (categorias e views disponíveis)
export const getDashboardStructure = async () => {
    try {
        const response = await api.get('/dashboard/structure');
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar estrutura do dashboard:', error);
        throw error;
    }
};

// Buscar dados de uma view específica
export const getDashboardViewData = async (viewName, filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.year) params.append('year', filters.year);
        if (filters.month) params.append('month', filters.month);

        const url = `/dashboard/view/${viewName}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error(`Erro ao buscar dados da view ${viewName}:`, error);
        throw error;
    }
};

// Buscar dados de uma categoria específica
export const getDashboardCategoryData = async (category, filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.year) params.append('year', filters.year);
        if (filters.month) params.append('month', filters.month);

        const url = `/dashboard/category/${category}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error(`Erro ao buscar dados da categoria ${category}:`, error);
        throw error;
    }
};

// Buscar todos os dados do dashboard (todas as categorias)
export const getAllDashboardData = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.year) params.append('year', filters.year);
        if (filters.month) params.append('month', filters.month);

        const url = `/dashboard/all${params.toString() ? '?' + params.toString() : ''}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar todos os dados do dashboard:', error);
        throw error;
    }
};

// Buscar dados da landing page do dashboard (todas as views de resumo)
export const getLandingData = async () => {
    try {
        const response = await api.get('/dashboard/landing');
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar dados da landing page:', error);
        throw error;
    }
};

// FUNÇÕES LEGADAS (mantidas para compatibilidade)

// Serviço para buscar dados de uma view específica (versão antiga)
export const getDashboardData = async (viewName, year = null) => {
    console.warn('DEPRECATED: Use getDashboardViewData com filters object');
    try {
        const filters = year ? { year } : {};
        return await getDashboardViewData(viewName, filters);
    } catch (error) {
        console.error(`Erro ao buscar dados do dashboard (${viewName}):`, error);
        return [];
    }
};

// Manter a função original para compatibilidade com código existente
export const fetchDashboardData = async () => {
    console.warn('DEPRECATED: Esta função será descontinuada. Use getAllDashboardData.');
    try {
        const response = await api.get("/operations");
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        throw error;
    }
};