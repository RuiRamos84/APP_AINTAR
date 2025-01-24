import api from "./api";

export const getEpiDeliveries = async ({
    employeeId,
    type = 'all',
    page = 0,
    pageSize = 10
} = {}) => {
    try {
        const response = await api.get('/deliveries', {
            params: {
                employeeId,
                type,
                page,
                pageSize
            }
        });

        if (!employeeId) {
            return response.data;
        }

        // Normalizar IDs para comparação
        const empId = String(employeeId).trim();
        const filteredDeliveries = response.data.deliveries.filter(delivery => {
            const deliveryEmpId = String(delivery.tb_epi).trim();
            const typeMatch = type === 'all' ||
                (type === 'epi' && delivery.what === 1) ||
                (type === 'uniform' && delivery.what === 2);

            return deliveryEmpId === empId && typeMatch;
        });

        return {
            deliveries: filteredDeliveries,
            total: filteredDeliveries.length
        };
    } catch (error) {
        console.error("Erro ao obter registos:", error);
        throw error;
    }
};

export const createEpiDelivery = async (data) => {
    try {
        const response = await api.post('/delivery', {
            ...data,
            pntb_epi: String(data.pntb_epi).trim()
        });
        return response.data;
    } catch (error) {
        console.error("Erro ao criar registo:", error);
        throw error;
    }
};

export const updateEpiPreferences = async (userId, data) => {
    try {
        const response = await api.put(`/preferences/${String(userId).trim()}`, data);
        return response.data;
    } catch (error) {
        console.error("Erro ao atualizar preferências:", error);
        throw error;
    }
};