import api from "./api";

// ==================== FUNÇÕES UNIFICADAS ====================

// Volume Records
export const getInstallationVolumeRecords = async (tbInstalacao) => {
    try {
        if (!tbInstalacao) throw new Error("ID da instalação inválido.");
        const response = await api.get(`/instalacao_volumes/${tbInstalacao}`);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar volumes da instalação:", error);
        throw error;
    }
};
export const getInventoryRecords = async () => {
    try {
        const response = await api.get("/inventory_list");
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar inventário:", error);
        throw error;
    }
};
    


export const addInstallationVolumeRecord = async (data) => {
    try {
        if (!data) throw new Error("Dados inválidos.");
        const response = await api.post("/instalacao_volume", data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar volume da instalação:", error);
        throw error;
    }
};

// Water Volume Records
export const getInstallationWaterVolumeRecords = async (tbInstalacao) => {
    try {
        if (!tbInstalacao) throw new Error("ID da instalação inválido.");
        const response = await api.get(`/instalacao_water_volumes/${tbInstalacao}`);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar volumes de água da instalação:", error);
        throw error;
    }
};

export const addInstallationWaterVolumeRecord = async (data) => {
    try {
        if (!data) throw new Error("Dados inválidos.");
        const response = await api.post("/instalacao_water_volume", data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar volume de água da instalação:", error);
        throw error;
    }
};

// Energy Records
export const getInstallationEnergyRecords = async (tbInstalacao) => {
    try {
        if (!tbInstalacao) throw new Error("ID da instalação inválido.");
        const response = await api.get(`/instalacao_energy/${tbInstalacao}`);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar energia da instalação:", error);
        throw error;
    }
};

export const addInstallationEnergyRecord = async (data) => {
    try {
        if (!data) throw new Error("Dados inválidos.");
        const response = await api.post("/instalacao_energy", data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar energia da instalação:", error);
        throw error;
    }
};

// Expense Records - Unificado
export const getInstallationExpenseRecords = async (tbInstalacao) => {
    try {
        if (!tbInstalacao) throw new Error("ID da instalação inválido.");
        const response = await api.get(`/instalacao_expenses/${tbInstalacao}`);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar despesas da instalação:", error);
        throw error;
    }
};

export const addInstallationExpenseRecord = async (data) => {
    try {
        if (!data) throw new Error("Dados inválidos.");
        const response = await api.post("/instalacao_expense", data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar despesa da instalação:", error);
        throw error;
    }
};

// Expense Records - Outras áreas (rede, ramais, etc)
export const getExpenseRecords = async (type) => {
    try {
        let url;
        switch (type) {
            case "rede": url = `/rede_expenses`; break;
            case "ramal": url = `/ramal_expenses`; break;
            case "manutencao": url = `/manut_expenses`; break;
            case "equip": url = "/equip_expenses"; break;
            default: throw new Error("Tipo de despesa inválido");
        }
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar despesas:", error);
        throw error;
    }
};

export const addExpenseRecord = async (type, data) => {
    try {
        let url;
        switch (type) {
            case "rede": url = "/rede_expense"; break;
            case "ramal": url = "/ramal_expense"; break;
            case "manutencao": url = "/manut_expense"; break;
            case "equip": url = "/equip_expense"; break;
            default: throw new Error("Tipo de despesa inválido");
        }
        const response = await api.post(url, data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar despesa:", error);
        throw error;
    }
};

// Documentos Unificados
export const createInstallationDocument = async (data, documentType) => {
    try {
        let url;
        switch (documentType) {
            case "desmatacao": url = "/instalacao/desmatacao"; break;
            case "retirada_lamas": url = "/instalacao/retirada_lamas"; break;
            case "reparacao": url = "/instalacao/reparacao"; break;
            case "vedacao": url = "/instalacao/vedacao"; break;
            case "qualidade_ambiental": url = "/instalacao/qualidade_ambiental"; break;
            default: throw new Error(`Tipo de documento inválido: ${documentType}`);
        }

        const payload = {
            pnts_associate: data.pnts_associate || null,
            pnmemo: data.pnmemo,
            pnpk_instalacao: data.pnpk_instalacao
        };

        const response = await api.post(url, payload);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar documento para instalação:", error);
        throw error;
    }
};

// ==================== FUNÇÕES COMPATIBILIDADE - WRAPPER ====================

// Volume Records - Wrapper para compatibilidade
export const getVolumeRecords = async (areaId, pk) => {
    return await getInstallationVolumeRecords(pk);
};

export const addVolumeRecord = async (areaId, data) => {
    return await addInstallationVolumeRecord(data);
};

// Water Volume Records - Wrapper
export const getWaterVolumeRecords = async (areaId, pk) => {
    return await getInstallationWaterVolumeRecords(pk);
};

export const addWaterVolumeRecord = async (areaId, data) => {
    return await addInstallationWaterVolumeRecord(data);
};

// Energy Records - Wrapper
export const getEnergyRecords = async (areaId, pk) => {
    return await getInstallationEnergyRecords(pk);
};

export const addEnergyRecord = async (areaId, data) => {
    return await addInstallationEnergyRecord(data);
};

// ==================== OUTRAS FUNÇÕES ====================

export const getEntityDetails = async (areaId, pk) => {
    try {
        if (!areaId || !pk) throw new Error("Área ou PK inválida.");
        const url = areaId === 1 ? `/etar_details/${pk}` : `/ee_details/${pk}`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar detalhes da entidade:", error);
        throw error;
    }
};

export const updateEntityDetails = async (areaId, pk, data) => {
    try {
        const url = areaId === 1 ? `/etar_update/${pk}` : `/ee_update/${pk}`;
        const response = await api.put(url, data);
        return response.data;
    } catch (error) {
        console.error("Erro ao actualizar detalhes da entidade:", error);
        throw error;
    }
};
export const updateInventoryRecord = async (pk, data) => {
    try {
        if (!pk) throw new Error("PK do inventário inválido.");
        if (!data || Object.keys(data).length === 0) {
            throw new Error("Dados inválidos para atualização.");
        }

        const response = await api.put(`/inventory_update/${pk}`, data);
        return response.data;

    } catch (error) {
        console.error("Erro ao atualizar inventário:", error);
        throw error;
    }
};
export const updateVehicleAssignRegister = async (pk, data) => {
    try {
        if (!pk) throw new Error("PK do inventário inválido.");
        if (!data || Object.keys(data).length === 0) {
            throw new Error("Dados inválidos para atualização.");
        }

        const response = await api.put(`/vehicle_update/${pk}`, data);
        return response.data;

    } catch (error) {
        console.error("Erro ao atualizar inventário:", error);
        throw error;
    }
};


export const addMaintenance = async (type, pk) => {
    try {
        let url;
        switch (type) {
            case "etar": url = `/etar_maintenance/${pk}`; break;
            case "ee": url = `/ee_maintenance/${pk}`; break;
            default: throw new Error("Tipo de manutenção inválido");
        }
        const response = await api.post(url);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar manutenção:", error);
        throw error;
    }
};
export const addInventoryRecord = async (data) => {
    try {
        if (!data) throw new Error("Dados inválidos.");
        const response = await api.post("/inventory_create", data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar inventário:", error);
        throw error;
    }
};

export const createInternalRequest = async (data, requestType) => {
    try {
        let url;

        switch (requestType) {
            // Instalações - NOVO FORMATO
            case "instalacao_desmatacao": url = "/instalacao/desmatacao"; break;
            case "instalacao_retirada_lamas": url = "/instalacao/retirada_lamas"; break;
            case "instalacao_reparacao": url = "/instalacao/reparacao"; break;
            case "instalacao_vedacao": url = "/instalacao/vedacao"; break;
            case "instalacao_qualidade_ambiental": url = "/instalacao/qualidade_ambiental"; break;

            // ETAR/EE - COMPATIBILIDADE (converter para instalacao)
            case "etar_desmatacao":
            case "ee_desmatacao":
                url = "/instalacao/desmatacao";
                break;
            case "etar_retirada_lamas":
            case "ee_retirada_lamas":
                url = "/instalacao/retirada_lamas";
                break;
            case "etar_reparacao":
            case "ee_reparacao":
                url = "/instalacao/reparacao";
                break;
            case "etar_vedacao":
            case "ee_vedacao":
                url = "/instalacao/vedacao";
                break;
            case "etar_qualidade_ambiental":
            case "ee_qualidade_ambiental":
                url = "/instalacao/qualidade_ambiental";
                break;

            // Rede
            case "rede_desobstrucao": url = "/rede/desobstrucao"; break;
            case "rede_reparacao_colapso": url = "/rede/reparacao_colapso"; break;

            // Caixas
            case "caixa_desobstrucao": url = "/caixas/desobstrucao"; break;
            case "caixa_reparacao": url = "/caixas/reparacao"; break;
            case "caixa_reparacao_tampa": url = "/caixas/reparacao_tampa"; break;

            // Ramais
            case "ramal_desobstrucao": url = "/ramais/desobstrucao"; break;
            case "ramal_reparacao": url = "/ramais/reparacao"; break;

            // Requisição Interna
            case "requisicao_interna": url = "/requisicao_interna"; break;

            default: throw new Error(`Tipo de pedido inválido: ${requestType}`);
        }

        // Preparar payload
        const payload = {
            pnts_associate: data.pnts_associate || null,
            pnmemo: data.pnmemo
        };

        // Converter campos antigos para novo formato
        if (data.pnpk_etar || data.pnpk_ee) {
            payload.pnpk_instalacao = data.pnpk_etar || data.pnpk_ee;
        } else if (data.pnpk_instalacao) {
            payload.pnpk_instalacao = data.pnpk_instalacao;
        }

        // Campos de localização (para rede/caixas/ramais)
        if (data.pnaddress) payload.pnaddress = data.pnaddress;
        if (data.pnpostal) payload.pnpostal = data.pnpostal;
        if (data.pndoor) payload.pndoor = data.pndoor;
        if (data.pnfloor) payload.pnfloor = data.pnfloor;
        if (data.pnnut1) payload.pnnut1 = data.pnnut1;
        if (data.pnnut2) payload.pnnut2 = data.pnnut2;
        if (data.pnnut3) payload.pnnut3 = data.pnnut3;
        if (data.pnnut4) payload.pnnut4 = data.pnnut4;
        if (data.pnglat !== null && data.pnglat !== undefined && data.pnglat !== "") {
            payload.pnglat = parseFloat(data.pnglat);
        }
        if (data.pnglong !== null && data.pnglong !== undefined && data.pnglong !== "") {
            payload.pnglong = parseFloat(data.pnglong);
        }

        const response = await api.post(url, payload);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar pedido interno:", error);
        throw error;
    }
};

// Incumprimentos
export const getIncumprimentoRecords = async (pk) => {
    try {
        if (!pk) throw new Error("PK inválida.");
        const response = await api.get(`/etar_incumprimentos/${pk}`);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar incumprimentos:", error);
        throw error;
    }
};

export const addIncumprimentoRecord = async (data) => {
    try {
        const response = await api.post("/etar_incumprimento", data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar incumprimento:", error);
        throw error;
    }
};
export const addVehicleRegister = async (data) => {
    try {
        const response = await api.post("/vehicle_create", data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar incumprimento:", error);
        throw error;
    }
};
export const getVehicleRecords = async () => {
    try {
        const response = await api.get("/vehicle_list");
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar lista de veículos:", error);
        throw error;
    }
};

export const addVehicleAssignRegister = async (data) => {
    try {
        const response = await api.post("/vehicle_assign_create", data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar incumprimento:", error);
        throw error;
    }
};
export const getVehicleAssignRecords = async () => {
    try {
        const response = await api.get("/vehicle_assign_list");
        
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar lista de veículos:", error);
        throw error;
    }
};
export const addVehicleMaintenance = async (data) => {
    try {
        const response = await api.post("/vehicle_maintenance_create", data);
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar incumprimento:", error);
        throw error;
    }
};
export const getVehicleMaintenance = async () => {
    try {
        const response = await api.get("/vehicle_maintenance_list");
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar lista de veículos:", error);
        throw error;
    }
};
