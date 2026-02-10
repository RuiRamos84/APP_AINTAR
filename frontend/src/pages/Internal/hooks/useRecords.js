import { useState, useEffect } from "react";
import { useInternalContext } from "../context/InternalContext";
import * as InternalService from "../../../services/InternalService";
import { notifySuccess } from "../../../components/common/Toaster/ThemedToaster";
import { handleApiError } from "../utils/errorHandler";
import { formatDateToString } from "../../../utils/dataUtils";

export function useRecords(recordType) {
    const { state, dispatch } = useInternalContext();
    const { selectedArea, selectedEntity } = state;
    const [newRecord, setNewRecord] = useState({
        date: formatDateToString(new Date())
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchRecords = async () => {
        if (recordType !== "inventario" && !selectedEntity && !["rede", "ramal", "manutencao", "equip"].includes(getTypeByArea(selectedArea))) return;

        dispatch({ type: "FETCH_START" });
        try {
            let response;
            const areaType = getTypeByArea(selectedArea);

            switch (recordType) {
                case "volume":
                    response = await InternalService.getInstallationVolumeRecords(selectedEntity?.pk);
                    dispatch({ type: "FETCH_SUCCESS", payload: response.volumes || [] });
                    break;

                case "water_volume":
                    response = await InternalService.getInstallationWaterVolumeRecords(selectedEntity?.pk);
                    dispatch({ type: "FETCH_SUCCESS", payload: response.water_volumes || [] });
                    break;

                case "energy":
                    response = await InternalService.getInstallationEnergyRecords(selectedEntity?.pk);
                    dispatch({ type: "FETCH_SUCCESS", payload: response.energy || [] });
                    break;

                case "expense":
                    if (selectedArea === 1 || selectedArea === 2) {
                        // Para instalações (ETAR/EE)
                        response = await InternalService.getInstallationExpenseRecords(selectedEntity?.pk);
                    } else {
                        // Para outras áreas (rede, ramal, etc)
                        response = await InternalService.getExpenseRecords(areaType);
                    }
                    dispatch({ type: "FETCH_SUCCESS", payload: response.expenses || [] });
                    break;

                case "incumprimentos":
                    response = await InternalService.getIncumprimentoRecords(selectedEntity?.pk);
                    dispatch({ type: "FETCH_SUCCESS", payload: response.incumprimentos || [] });
                    break;
                case "inventario":
                    try {
                        response = await InternalService.getInventoryRecordsInstalation();
                     // pegar o array correto
                        const recordsArray = response.inventory || [];
                        dispatch({ type: "FETCH_SUCCESS", payload: recordsArray });
                    } catch (error) {
                        console.error("Erro ao buscar inventário:", error);
                        dispatch({ type: "FETCH_ERROR", payload: error.message });
                    }
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

            // Validar se há entidade seleccionada para tipos que exigem
            if (
                (["volume", "water_volume", "energy", "incumprimentos"].includes(recordType) ||
                    (recordType === "expense" && ["etar", "ee"].includes(getTypeByArea(selectedArea))))
                && !selectedEntity
            ) {
                handleApiError(
                    new Error("Entidade não seleccionada"),
                    `Seleccione uma ${selectedArea === 1 ? "ETAR" : "EE"} primeiro`
                );
                return false;
            }

            const areaType = getTypeByArea(selectedArea);

            // Chamar API adequada
            switch (recordType) {
                case "volume":
                    await InternalService.addInstallationVolumeRecord(data);
                    break;

                case "water_volume":
                    await InternalService.addInstallationWaterVolumeRecord(data);
                    break;

                case "energy":
                    await InternalService.addInstallationEnergyRecord(data);
                    break;

                case "expense":
                    if (selectedArea === 1 || selectedArea === 2) {
                        // Para instalações - converter dados
                        const installationData = {
                            ...data,
                            pntt_instalacao: selectedEntity.pk
                        };
                        await InternalService.addInstallationExpenseRecord(installationData);
                    } else {
                        // Para outras áreas
                        await InternalService.addExpenseRecord(areaType, data);
                    }
                    break;

                case "incumprimentos":
                    await InternalService.addIncumprimentoRecord(data);
                    break;
                case "inventario":
                    await InternalService.addInventoryRecord(data);
                    break;

                default:
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
    const updateRecord = async (id, data) => {
        try {
            setSubmitting(true);

            
            

            // Chamar API de update adequada
            switch (recordType) {
            

                case "inventario":
                    await InternalService.updateInventoryRecord(id, data);
                    break;

                default:
                    throw new Error(`Tipo de registo inválido: ${recordType}`);
            }

            notifySuccess(`Registo de ${getRecordTypeName(recordType)} atualizado com sucesso`);
            await fetchRecords();
            return true;
        } catch (error) {
            handleApiError(error, `Erro ao atualizar registo de ${getRecordTypeName(recordType)}`);
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
            case 8: return "inventario";
            
            
            default: return "";
        }
    };

    const getRecordTypeName = (type) => {
        switch (type) {
            case "volume": return "volume";
            case "water_volume": return "volume de água";
            case "energy": return "energia";
            case "expense": return "despesa";
            case "incumprimentos": return "incumprimento";
            case "inventario": return "inventario";
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
        fetchRecords,
        updateRecord
    };
}