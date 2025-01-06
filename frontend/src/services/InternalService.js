import api from "./api";

// Volume Records
export const getVolumeRecords = async (areaId, pk) => {
    try {
        if (!areaId || !pk) {
            throw new Error("Área ou PK inválida.");
        }
        const url = areaId === 1 ? `/etar_volumes/${pk}` : `/ee_volumes/${pk}`;
        console.log(`Fetching volume records from: ${url}`);
        const response = await api.get(url);
        // console.log(response.data)
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar registros de volume:", error);
        throw error;
    }
};

export const addVolumeRecord = async (areaId, data) => {
    try {
        if (!areaId || !data) {
            throw new Error("Dados ou área inválidos.");
        }
        const url = areaId === 1 ? `/etar_volume` : `/ee_volume`;
        console.log(`Adding volume record to: ${url} with data:`, data);
        const response = await api.post(url, data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar registro de volume:", error);
        throw error;
    }
};

// Energy Records
export const getEnergyRecords = async (areaId, pk) => {
    try {
        const url = areaId === 1
            ? `/etar_energy/${pk}`
            : `/ee_energy/${pk}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const addEnergyRecord = async (areaId, data) => {
    try {
        const url = areaId === 1
            ? `/etar_energy`
            : `/ee_energy`;
        const response = await api.post(url, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Expense Records
export const getExpenseRecords = async (type, pk) => {
    try {
        let url;
        switch (type) {
            case "etar":
                url = `/etar_expenses/${pk}`;
                break;
            case "ee":
                url = `/ee_expenses/${pk}`;
                break;
            case "rede":
                url = `/rede_expenses`;
                break;
            case "ramal":
                url = `/ramal_expenses`;
                break;
            default:
                throw new Error("Invalid expense type");
        }
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const addExpenseRecord = async (type, data) => {
    try {
        let url;

        switch (type) {
            case "etar":
                url = "/etar_expense";
                break;
            case "ee":
                url = "/ee_expense";
                break;
            case "rede":
                url = "/rede_expense";
                break;
            case "ramal":
                url = "/ramal_expense";
                break;
            default:
                throw new Error("Invalid expense type");
        }

        const response = await api.post(url, data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar registro de despesas:", error);
        throw error;
    }
};


export const getEntityDetails = async (areaId, pk) => {
    try {
        if (!areaId || !pk) {
            throw new Error("Área ou PK inválida.");
        }
        const url = areaId === 1 ? `/etar_details/${pk}` : `/ee_details/${pk}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar detalhes da entidade:", error);
        throw error;
    }
};

export const addMaintenance = async (type, pk) => {
    try {
        let url;
        switch (type) {
            case "etar":
                url = `/etar_maintenance/${pk}`;
                break;
            case "ee":
                url = `/ee_maintenance/${pk}`;
                break;
            default:
                throw new Error("Tipo de manutenção inválido");
        }
        const response = await api.post(url);
        console.log(response.data)
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar manutenção:", error);
        throw error;
    }
};

// Adicionar ao InternalService.js
export const getInterventionRecords = async (type, pk) => {
    try {
        let url = type === "etar" ? `/etar_intervention/${pk}` :
            type === "ee" ? `/ee_intervention/${pk}` : null;
        if (!url) throw new Error("Invalid type");
        return await api.get(url);
    } catch (error) {
        throw error;
    }
};

export const addInterventionRecord = async (type, data) => {
    try {
        let url = type === "etar" ? "/etar_intervention" :
            type === "ee" ? "/ee_intervention" : null;
        if (!url) throw new Error("Invalid type");
        return await api.post(url, data);
    } catch (error) {
        throw error;
    }
};

export const getUnblockingRecords = async (type, pk) => {
    try {
        let url = type === "rede" ? `/rede_unblocking/${pk}` :
            type === "ramal" ? `/ramal_unblocking/${pk}` : null;
        if (!url) throw new Error("Invalid type");
        return await api.get(url);
    } catch (error) {
        throw error;
    }
};

export const addUnblockingRecord = async (type, data) => {
    try {
        let url = type === "rede" ? "/rede_unblocking" :
            type === "ramal" ? "/ramal_unblocking" : null;
        if (!url) throw new Error("Invalid type");
        return await api.post(url, data);
    } catch (error) {
        throw error;
    }
};