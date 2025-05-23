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
    // /hooks/useRecords.js (continuação)
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
                (["volume", "energy"].includes(recordType) ||
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

            // Chamar o método correto com base no tipo de registo
            let addFunction;
            switch (recordType) {
                case "volume":
                    addFunction = InternalService.addVolumeRecord;
                    break;
                case "energy":
                    addFunction = InternalService.addEnergyRecord;
                    break;
                case "expense":
                    addFunction = InternalService.addExpenseRecord;
                    break;
                default:
                    throw new Error(`Tipo de registo inválido: ${recordType}`);
            }

            // Executar a função de adição
            await addFunction(areaType, data);
            notifySuccess(`Registo de ${getRecordTypeName(recordType)} adicionado com sucesso`);
            fetchRecords();
            return true;
        } catch (error) {
            handleApiError(error, `Erro ao adicionar registo de ${getRecordTypeName(recordType)}`);
            return false;
        } finally {
            setSubmitting(false);
        }
    };

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