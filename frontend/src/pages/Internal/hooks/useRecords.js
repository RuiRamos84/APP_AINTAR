import { useState, useEffect } from "react";
import { useInternalContext } from "../context/InternalContext";
import * as InternalService from "../../../services/InternalService";
import { notifySuccess } from "../../../components/common/Toaster/ThemedToaster";
import { handleApiError } from "../utils/errorHandler";
import { formatDateToString } from "../../../utils/dataUtils";

export function useRecords(recordType) {
    const { state, dispatch } = useInternalContext();
    const { selectedArea, selectedEntity } = state;
    // Estado extra só para o caso de veículo atribuído
    const [vehicleData, setVehicleData] = useState({
        vehicles: [],          // lista de todos os veículos
        assignedVehicles: []   // lista de veículos já atribuídos
    });
    const [newRecord, setNewRecord] = useState({
        date: formatDateToString(new Date())
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchRecords = async () => {
        if (recordType !== "inventario" && recordType!=="veiculos" && recordType!="veiculoAtribuido" && recordType!= "manutencaoVeiculos" && !selectedEntity && !["rede", "ramal", "manutencao", "equip"].includes(getTypeByArea(selectedArea))) return;

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
                    response = await InternalService.getInventoryRecords();
                    dispatch({ type: "FETCH_SUCCESS", payload: response.inventory || [] });
                    break;
                case "veiculos":
                    response = await InternalService.getVehicleRecords();
                    dispatch({ type: "FETCH_SUCCESS", payload: response.vehicle || [] });
                    
                    break;
                case "manutencaoVeiculos": {
                    const [maintResponse, vehiclesResponse] = await Promise.all([
                        InternalService.getVehicleMaintenance(),
                        InternalService.getVehicleRecords()
                    ]);
                    setVehicleData({
                        vehicles: vehiclesResponse.vehicle || [],
                        assignedVehicles: []
                    });
                    dispatch({ type: "FETCH_SUCCESS", payload: maintResponse.vehicle_maintenance || [] });
                    break;
                }
                case "veiculoAtribuido":
                const response1 = await InternalService.getVehicleAssignRecords();
                const response2 = await InternalService.getVehicleRecords();

                setVehicleData({
                    vehicles: response2.vehicle || [],
                    assignedVehicles: response1.vehicle_assign || []
                });

                // Opcional: se quiser manter state.records com algo
                dispatch({ type: "FETCH_SUCCESS", payload: response1.vehicle_assign || [] });
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
                case "veiculos":
                    await InternalService.addVehicleRegister(data);
                    break;
                case "manutencaoVeiculos":
                    await InternalService.addVehicleMaintenance(data);
                    break;
                case "veiculoAtribuido":
                    await InternalService.addVehicleAssignRegister(data);
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

            switch (recordType) {
                case "inventario":
                    await InternalService.updateInventoryRecord(id, data);
                    break;
                 case "veiculos":
                    await InternalService.updateVehicleAssignRegister(id,data);
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
            case 9: return "Veiculo";
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
            case "inventario": return "inventário";
            case "veiculos" : return "Veiculo";
            case "manutencaoVeiculos" : return "Manutenção de Veículos";
            case "veiculoAtribuido" : return "Veículo Atribuído";

            
            default: return type;
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [selectedEntity, selectedArea]);

    return {
        records: state.records,
        vehicleData,
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