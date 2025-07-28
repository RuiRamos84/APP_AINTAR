// frontend/src/pages/Global/hooks/useRecords.js

import { useState, useEffect, useCallback } from 'react';
import { useGlobal } from '../context/GlobalContext';
import * as InternalService from '../../../services/InternalService';
import { notifySuccess, notifyError } from '../../../components/common/Toaster/ThemedToaster';
import { processWaterVolumeRecords } from '../utils/helpers';

export const useRecords = (recordType) => {
    const { state, dispatch } = useGlobal();
    const [submitting, setSubmitting] = useState(false);

    const getAreaType = useCallback(() => {
        switch (state.selectedArea) {
            case 1: return 'etar';
            case 2: return 'ee';
            case 3: return 'rede';
            case 4: return 'ramal';
            case 5: return 'manutencao';
            case 6: return 'equip';
            default: return null;
        }
    }, [state.selectedArea]);

    const fetchRecords = useCallback(async () => {
        if (!state.selectedArea) return;

        // Para tipos que não precisam de entidade
        const noEntityTypes = ['rede', 'ramal', 'manutencao', 'equip'];
        const areaType = getAreaType();

        if (!noEntityTypes.includes(areaType) && !state.selectedEntity) return;

        dispatch({ type: 'SET_LOADING', payload: true });

        try {
            let response;

            switch (recordType) {
                case 'volume':
                    response = await InternalService.getVolumeRecords(
                        state.selectedArea,
                        state.selectedEntity.pk
                    );
                    dispatch({ type: 'SET_RECORDS', payload: response.volumes || [] });
                    break;

                case 'water_volume':
                    response = await InternalService.getWaterVolumeRecords(
                        state.selectedArea,
                        state.selectedEntity.pk
                    );
                    const processedRecords = processWaterVolumeRecords(response.water_volumes || []);
                    dispatch({ type: 'SET_RECORDS', payload: processedRecords });
                    break;

                case 'energy':
                    response = await InternalService.getEnergyRecords(
                        state.selectedArea,
                        state.selectedEntity.pk
                    );
                    dispatch({ type: 'SET_RECORDS', payload: response.energy || [] });
                    break;

                case 'expense':
                    response = await InternalService.getExpenseRecords(
                        areaType,
                        state.selectedEntity?.pk
                    );
                    dispatch({ type: 'SET_RECORDS', payload: response.expenses || [] });
                    break;

                default:
                    throw new Error(`Tipo de registo inválido: ${recordType}`);
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error.message });
            notifyError(`Erro ao carregar registos de ${recordType}`);
        }
    }, [recordType, state.selectedArea, state.selectedEntity, getAreaType, dispatch]);

    const addRecord = useCallback(async (payload) => {
        setSubmitting(true);

        try {
            const areaType = getAreaType();

            switch (recordType) {
                case 'volume':
                    await InternalService.addVolumeRecord(state.selectedArea, payload);
                    break;

                case 'water_volume':
                    await InternalService.addWaterVolumeRecord(state.selectedArea, payload);
                    break;

                case 'energy':
                    await InternalService.addEnergyRecord(state.selectedArea, payload);
                    break;

                case 'expense':
                    // Para despesas ETAR/EE, adicionar campo específico
                    if (state.selectedEntity) {
                        if (state.selectedArea === 1) {
                            payload.pntt_etar = state.selectedEntity.pk;
                        } else if (state.selectedArea === 2) {
                            payload.pntt_ee = state.selectedEntity.pk;
                        }
                    }
                    await InternalService.addExpenseRecord(areaType, payload);
                    break;

                default:
                    throw new Error(`Tipo de registo inválido: ${recordType}`);
            }

            notifySuccess('Registo adicionado com sucesso');
            await fetchRecords(); // Recarregar dados
            return true;

        } catch (error) {
            notifyError(`Erro ao adicionar registo: ${error.message}`);
            return false;
        } finally {
            setSubmitting(false);
        }
    }, [recordType, state.selectedArea, state.selectedEntity, getAreaType, fetchRecords]);

    // Auto-fetch quando dependências mudam
    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    return {
        records: state.records,
        loading: state.loading,
        error: state.error,
        submitting,
        addRecord,
        fetchRecords
    };
};