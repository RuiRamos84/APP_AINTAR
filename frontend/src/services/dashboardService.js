import api from "./api";

/**
 * Serviço de Dashboard
 * Integração com a nova estrutura de categorias e views
 */

// Buscar estrutura do dashboard (categorias e views disponíveis)
export const getDashboardStructure = async () => {
    try {
        const response = await api.get('/dashboard/structure');
        console.log('Estrutura do dashboard:', response.data);
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
        console.log(`Dados da view ${viewName}:`, response.data);
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
        console.log(`Dados da categoria ${category}:`, response.data);
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
        console.log('Todos os dados do dashboard:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar todos os dados do dashboard:', error);
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