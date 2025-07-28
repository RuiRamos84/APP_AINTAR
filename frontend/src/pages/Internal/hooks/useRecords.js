// /hooks/useRecords.js
import { useState, useEffect } from "react";
import { useInternalContext } from "../context/InternalContext";
import * as InternalService from "../../../services/InternalService";
import { notifySuccess } from "../../../components/common/Toaster/ThemedToaster";
import { handleApiError } from "../utils/errorHandler";
import { getCurrentDateTime } from "../../../utils/dataUtils";

export function useRecords(recordType) {
    const { state, dispatch } = useInternalContext();
    const { selectedArea, selectedEntity } = state;
    const [newRecord, setNewRecord] = useState({
        date: getCurrentDateTime()
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchRecords = async () => {
        if (!selectedEntity && !["rede", "ramal", "manutencao", "equip"].includes(getTypeByArea(selectedArea))) return;

        dispatch({ type: "FETCH_START" });
        try {
            let response;
            const areaType = getTypeByArea(selectedArea);

            switch (recordType) {
                case "volume":
                    response = await InternalService.getVolumeRecords(selectedArea, selectedEntity?.pk);
                    dispatch({ type: "FETCH_SUCCESS", payload: response.volumes || [] });
                    break;
                case "water_volume":
                    response = await InternalService.getWaterVolumeRecords(selectedArea, selectedEntity?.pk);
                    dispatch({ type: "FETCH_SUCCESS", payload: response.water_volumes || [] });
                    break;
                case "energy":
                    response = await InternalService.getEnergyRecords(selectedArea, selectedEntity?.pk);
                    dispatch({ type: "FETCH_SUCCESS", payload: response.energy || [] });
                    break;
                case "expense":
                    response = await InternalService.getExpenseRecords(areaType, selectedEntity?.pk);
                    dispatch({ type: "FETCH_SUCCESS", payload: response.expenses || [] });
                    break;
                default:
                    throw new Error(`Tipo de registo inválido: ${recordType}`);
            }
        } catch (error) {
            dispatch({ type: "FETCH_ERROR", payload: error.message });
            handleApiError(error, `Erro ao carregar registos de ${recordType}`);
        }
    };

    const addRecord = async (data) => {
        try {
            setSubmitting(true);

            // Validar se há entidade selecionada para tipos que exigem
            if (
                (["volume", "water_volume", "energy"].includes(recordType) ||
                    (recordType === "expense" && ["etar", "ee"].includes(getTypeByArea(selectedArea))))
                && !selectedEntity
            ) {
                handleApiError(
                    new Error("Entidade não selecionada"),
                    `Selecione uma ${selectedArea === 1 ? "ETAR" : "EE"} primeiro`
                );
                return false;
            }

            const areaType = getTypeByArea(selectedArea);

            // Preparar payload com base no tipo de registo
            let finalPayload = { ...data };

            // Para volume, water_volume e energia, usar selectedArea diretamente
            if (recordType === "volume" || recordType === "energy") {
                await InternalService[`add${capitalizeFirst(recordType)}Record`](selectedArea, finalPayload);
            }
            // Para water_volume, usar função específica
            else if (recordType === "water_volume") {
                await InternalService.addWaterVolumeRecord(selectedArea, finalPayload);
            }
            // Para despesas, usar areaType
            else if (recordType === "expense") {
                await InternalService.addExpenseRecord(areaType, finalPayload);
            } else {
                throw new Error(`Tipo de registo inválido: ${recordType}`);
            }

            notifySuccess(`Registo de ${getRecordTypeName(recordType)} adicionado com sucesso`);
            await fetchRecords();
            return true;
        } catch (error) {
            handleApiError(error, `Erro ao adicionar registo de ${getRecordTypeName(recordType)}`);
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    // Função auxiliar
    const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    const getTypeByArea = (area) => {
        switch (area) {
            case 1: return "etar";
            case 2: return "ee";
            case 3: return "rede";
            case 4: return "ramal";
            case 5: return "manutencao";
            case 6: return "equip";
            default: return "";
        }
    };

    const getRecordTypeName = (type) => {
        switch (type) {
            case "volume": return "volume";
            case "water_volume": return "volume de água";
            case "energy": return "energia";
            case "expense": return "despesa";
            default: return type;
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [selectedEntity, selectedArea]);

    return {
        records: state.records,
        loading: state.loading,
        submitting,
        error: state.error,
        newRecord,
        setNewRecord,
        addRecord,
        fetchRecords
    };
}