import api from "./api";

// Volume Records
export const getVolumeRecords = async (areaId, pk) => {
    try {
        if (!areaId || !pk) {
            throw new Error("Área ou PK inválida.");
        }
        const url = areaId === 1 ? `/etar_volumes/${pk}` : `/ee_volumes/${pk}`;
        // console.log(`Fetching volume records from: ${url}`);
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
        // console.log(`Adding volume record to: ${url} with data:`, data);
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
        console.error("Erro ao buscar registros de energia:", error);
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
        console.error("Erro ao adicionar registro de energia:", error);
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
            case "manutencao":    // <-- Este também estava como "manut"
                url = `/manut_expenses`;  // <-- O endpoint continua o mesmo
                break;
            case "equip":
                url = "/equip_expenses";
                break;
            default:
                throw new Error("Invalid expense type");
        }
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar registros de despesas:", error);
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
            case "manutencao":     // <-- Este estava como "manut"
                url = "/manut_expense";  // <-- O endpoint continua o mesmo
                break;
            case "equip":
                url = "/equip_expense";
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
        console.error("Erro ao buscar registros de intervenção:", error);
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
        console.error("Erro ao adicionar registro de intervenção:", error);
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
        console.error("Erro ao buscar registros de desbloqueio:", error);
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
        console.error("Erro ao adicionar registro de desbloqueio:", error);
        throw error;
    }
};

// Função para atualizar detalhes da entidade
export const updateEntityDetails = async (areaId, pk, data) => {
    try {
        const url = areaId === 1
            ? `/etar_update/${pk}`
            : `/ee_update/${pk}`;

        const response = await api.put(url, data);
        return response.data;
    } catch (error) {
        console.error("Erro ao atualizar detalhes da entidade:", error);
        throw error;
    }
  };

// Versão completa e melhorada da função para criar pedidos internos
export const createInternalRequest = async (data, requestType) => {
    try {
        let url;

        switch (requestType) {
            // ETAR
            case "etar_desmatacao":
                url = "/etar/desmatacao";
                break;
            case "etar_retirada_lamas":
                url = "/etar/retirada_lamas";
                break;
            case "etar_reparacao":
                url = "/etar/reparacao";
                break;
            case "etar_vedacao":
                url = "/etar/vedacao";
                break;
            case "etar_qualidade_ambiental":
                url = "/etar/qualidade_ambiental";
                break;

            // EE
            case "ee_desmatacao":
                url = "/ee/desmatacao";
                break;
            case "ee_retirada_lamas":
                url = "/ee/retirada_lamas";
                break;
            case "ee_reparacao":
                url = "/ee/reparacao";
                break;
            case "ee_vedacao":
                url = "/ee/vedacao";
                break;
            case "ee_qualidade_ambiental":
                url = "/ee/qualidade_ambiental";
                break;

            // Rede
            case "rede_desobstrucao":
                url = "/rede/desobstrucao";
                break;
            case "rede_reparacao_colapso":
                url = "/rede/reparacao_colapso";
                break;

            // Caixas
            case "caixa_desobstrucao":
                url = "/caixas/desobstrucao";
                break;
            case "caixa_reparacao":
                url = "/caixas/reparacao";
                break;
            case "caixa_reparacao_tampa":
                url = "/caixas/reparacao_tampa";
                break;

            // Ramais
            case "ramal_desobstrucao":
                url = "/ramais/desobstrucao";
                break;
            case "ramal_reparacao":
                url = "/ramais/reparacao";
                break;

            // Requisição Interna
            case "requisicao_interna":
                url = "/requisicao_interna";
                break;

            default:
                throw new Error(`Tipo de pedido inválido: ${requestType}`);
        }

        const response = await api.post(url, data);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar pedido interno:", error);
        throw error;
    }
  };
